import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import {
  BadRequestError,
  NotFoundError,
} from "@/errors";
import type { IUserRepository } from "@/repositories/user.repository";
import type {
  UserType,
} from "@/schemas/user.schema";

// Email verification result interfaces
export interface EmailVerificationResult {
  success: boolean;
  message: string;
  user?: UserType;
}

export interface EmailVerificationTokenResult {
  token: string;
  expiresAt: Date;
  emailAddress: string;
}

export interface ResendVerificationResult {
  success: boolean;
  message: string;
  emailAddress: string;
  expiresAt: Date;
}

// Email verification service configuration
export interface EmailVerificationConfig {
  tokenExpiryHours: number;
  tokenLength: number;
  maxResendAttempts: number;
  resendCooldownMinutes: number;
}

// Default configuration
export const DEFAULT_EMAIL_VERIFICATION_CONFIG: EmailVerificationConfig = {
  tokenExpiryHours: 24, // 24 hours to verify email
  tokenLength: 64, // Length of verification token
  maxResendAttempts: 3, // Maximum resends per hour
  resendCooldownMinutes: 5, // Minimum time between resends
};

// Email verification service interface
export interface IEmailVerificationService {
  generateVerificationToken(
    userId: string,
    emailAddress: string,
    config?: Partial<EmailVerificationConfig>,
  ): Promise<EmailVerificationTokenResult>;
  verifyEmailToken(
    token: string,
    config?: Partial<EmailVerificationConfig>,
  ): Promise<EmailVerificationResult>;
  resendVerificationEmail(
    userId: string,
    emailAddress: string,
    config?: Partial<EmailVerificationConfig>,
  ): Promise<ResendVerificationResult>;
  isTokenExpired(expiresAt: Date): boolean;
  isTokenValid(token: string): boolean;
  generateSecureToken(length?: number): string;
  findUserByVerificationToken(token: string): Promise<UserType | null>;
}

// Main email verification service implementation
export class EmailVerificationService implements IEmailVerificationService {
  private readonly config: EmailVerificationConfig;

  constructor(
    private readonly userRepository: IUserRepository,
    config?: Partial<EmailVerificationConfig>,
  ) {
    this.config = { ...DEFAULT_EMAIL_VERIFICATION_CONFIG, ...config };
  }

  /**
   * Generate a verification token for a user's email address
   * @param userId - User ID to generate token for
   * @param emailAddress - Email address to verify
   * @param config - Optional configuration overrides
   * @returns Verification token result with token and expiry
   */
  async generateVerificationToken(
    userId: string,
    emailAddress: string,
    config?: Partial<EmailVerificationConfig>,
  ): Promise<EmailVerificationTokenResult> {
    const activeConfig = { ...this.config, ...config };

    // 1. Validate input
    if (!userId || !emailAddress) {
      throw new BadRequestError("User ID and email address are required");
    }

    // 2. Find user and validate they exist
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // 3. Check if email exists for this user
    const emailObj = user.emails.find(
      (email) => email.emailAddress === emailAddress,
    );
    if (!emailObj) {
      throw new BadRequestError(
        "Email address not found for this user. Please add the email first.",
      );
    }

    // 4. Check if email is already verified
    if (emailObj.isVerified) {
      throw new BadRequestError("Email address is already verified");
    }

    // 5. Generate secure token and expiry
    const token = this.generateSecureToken(activeConfig.tokenLength);
    const expiresAt = new Date(
      Date.now() + activeConfig.tokenExpiryHours * 60 * 60 * 1000,
    );

    // 6. Update user with verification token
    await this.userRepository.updateEmailVerificationToken(
      userId,
      emailAddress,
      token,
      expiresAt,
    );

    return {
      token,
      expiresAt,
      emailAddress,
    };
  }

  /**
   * Verify an email using a verification token
   * @param token - Verification token to validate
   * @param config - Optional configuration overrides
   * @returns Verification result with success status and user data
   */
  async verifyEmailToken(
    token: string,
  ): Promise<EmailVerificationResult> {
    // 1. Validate token format
    if (!this.isTokenValid(token)) {
      return {
        success: false,
        message: "Invalid verification token format",
      };
    }

    // 2. Find user by verification token
    const user = await this.findUserByVerificationToken(token);
    if (!user) {
      return {
        success: false,
        message: "Invalid or expired verification token",
      };
    }

    // 3. Find the email object with this token
    const emailObj = user.emails.find(
      (email) => email.verificationToken === token,
    );
    if (!emailObj) {
      return {
        success: false,
        message: "Verification token not found",
      };
    }

    // 4. Check if token is expired
    if (
      emailObj.verificationTokenExpiresAt &&
      this.isTokenExpired(emailObj.verificationTokenExpiresAt)
    ) {
      return {
        success: false,
        message: "Verification token has expired. Please request a new one.",
      };
    }

    // 5. Check if email is already verified
    if (emailObj.isVerified) {
      return {
        success: false,
        message: "Email address is already verified",
      };
    }

    // 6. Mark email as verified and clear token
    await this.userRepository.verifyEmail(user.id, emailObj.emailAddress);

    // 7. Get updated user data
    const updatedUser = await this.userRepository.findById(user.id);
    if (!updatedUser) {
      throw new NotFoundError("User not found after verification");
    }

    return {
      success: true,
      message: "Email address successfully verified",
      user: updatedUser,
    };
  }

  /**
   * Resend verification email for a user's email address
   * @param userId - User ID to resend verification for
   * @param emailAddress - Email address to resend verification for
   * @param config - Optional configuration overrides
   * @returns Resend result with new token information
   */
  async resendVerificationEmail(
    userId: string,
    emailAddress: string,
    config?: Partial<EmailVerificationConfig>,
  ): Promise<ResendVerificationResult> {
    const activeConfig = { ...this.config, ...config };

    // 1. Validate input
    if (!userId || !emailAddress) {
      throw new BadRequestError("User ID and email address are required");
    }

    // 2. Find user and validate they exist
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // 3. Check if email exists for this user
    const emailObj = user.emails.find(
      (email) => email.emailAddress === emailAddress,
    );
    if (!emailObj) {
      throw new BadRequestError(
        "Email address not found for this user. Please add the email first.",
      );
    }

    // 4. Check if email is already verified
    if (emailObj.isVerified) {
      throw new BadRequestError("Email address is already verified");
    }

    // 5. Check cooldown period if there's an existing token
    if (
      emailObj.verificationToken &&
      emailObj.verificationTokenExpiresAt &&
      !this.isTokenExpired(emailObj.verificationTokenExpiresAt)
    ) {
      // Check if enough time has passed since last token generation
      const tokenAge =
        Date.now() - 
        (emailObj.verificationTokenExpiresAt.getTime() - 
         activeConfig.tokenExpiryHours * 60 * 60 * 1000);
      const cooldownMs = activeConfig.resendCooldownMinutes * 60 * 1000;
      
      if (tokenAge < cooldownMs) {
        const remainingMinutes = Math.ceil((cooldownMs - tokenAge) / 60000);
        throw new BadRequestError(
          `Please wait ${remainingMinutes} minutes before requesting another verification email`,
        );
      }
    }

    // 6. Generate new token and expiry
    const token = this.generateSecureToken(activeConfig.tokenLength);
    const expiresAt = new Date(
      Date.now() + activeConfig.tokenExpiryHours * 60 * 60 * 1000,
    );

    // 7. Update user with new verification token
    await this.userRepository.updateEmailVerificationToken(
      userId,
      emailAddress,
      token,
      expiresAt,
    );

    return {
      success: true,
      message: "Verification email resent successfully",
      emailAddress,
      expiresAt,
    };
  }

  /**
   * Check if a verification token is expired
   * @param expiresAt - Token expiry date
   * @returns True if token is expired
   */
  isTokenExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Validate token format and structure
   * @param token - Token to validate
   * @returns True if token format is valid
   */
  isTokenValid(token: string): boolean {
    // Check if token exists and has reasonable length
    if (!token || typeof token !== "string") {
      return false;
    }

    // Check minimum and maximum length constraints
    if (token.length < 32 || token.length > 128) {
      return false;
    }

    // Check if token contains only valid characters (hex or alphanumeric)
    const validTokenPattern = /^[a-zA-Z0-9-]+$/;
    return validTokenPattern.test(token);
  }

  /**
   * Generate a cryptographically secure verification token
   * @param length - Length of token to generate (default from config)
   * @returns Secure random token string
   */
  generateSecureToken(length?: number): string {
    const tokenLength = length || this.config.tokenLength;
    
    // Use combination of UUID and crypto random for maximum entropy
    const uuid = uuidv4().replace(/-/g, "");
    const randomBytes = crypto.randomBytes(Math.ceil(tokenLength / 2));
    const randomHex = randomBytes.toString("hex");
    
    // Combine and truncate to desired length
    const combined = uuid + randomHex;
    return combined.substring(0, tokenLength);
  }

  /**
   * Find user by verification token (internal helper)
   * @param token - Verification token to search for
   * @returns User object or null if not found
   */
  async findUserByVerificationToken(token: string): Promise<UserType | null> {
    try {
      // Use repository method to find user by verification token
      return await this.userRepository.findByEmailVerificationToken(token);
    } catch (error) {
      // Log error for debugging but don't expose internal details
      console.warn("Error finding user by verification token:", error);
      return null;
    }
  }

  /**
   * Get verification token information without verifying
   * @param token - Verification token to inspect
   * @returns Token information or null if invalid
   */
  async getTokenInfo(token: string): Promise<{
    emailAddress: string;
    expiresAt: Date;
    isExpired: boolean;
  } | null> {
    if (!this.isTokenValid(token)) {
      return null;
    }

    const user = await this.findUserByVerificationToken(token);
    if (!user) {
      return null;
    }

    const emailObj = user.emails.find(
      (email) => email.verificationToken === token,
    );
    if (!emailObj || !emailObj.verificationTokenExpiresAt) {
      return null;
    }

    return {
      emailAddress: emailObj.emailAddress,
      expiresAt: emailObj.verificationTokenExpiresAt,
      isExpired: this.isTokenExpired(emailObj.verificationTokenExpiresAt),
    };
  }

  /**
   * Clean up expired verification tokens (maintenance operation)
   * @param config - Optional configuration overrides
   * @returns Number of tokens cleaned up
   */
  async cleanupExpiredTokens(): Promise<number> {
    let cleanedCount = 0;

    try {
      // Get all users (this could be optimized with a specific query)
      const users = await this.userRepository.findMany({}, 1000); // Limit for safety
      
      for (const user of users) {
        let hasExpiredTokens = false;
        
        for (const email of user.emails) {
          if (
            email.verificationToken &&
            email.verificationTokenExpiresAt &&
            this.isTokenExpired(email.verificationTokenExpiresAt)
          ) {
            hasExpiredTokens = true;
            break;
          }
        }
        
        if (hasExpiredTokens) {
          // Clear expired tokens for this user
          await this.userRepository.clearExpiredVerificationTokens(user.id);
          cleanedCount++;
        }
      }
      
      return cleanedCount;
    } catch (error) {
      console.error("Error cleaning up expired verification tokens:", error);
      throw new Error("Failed to cleanup expired tokens");
    }
  }
}