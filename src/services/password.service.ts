import argon2 from "argon2";
import { z } from "zod";
import { env } from "@/env";
import { BaseService } from "@/events/base.service";

// Password policy schema
export const passwordPolicySchema = z.object({
  minLength: z.number().min(4).max(128).default(8),
  requireUppercase: z.boolean().default(true),
  requireLowercase: z.boolean().default(true),
  requireNumbers: z.boolean().default(true),
  requireSpecialChars: z.boolean().default(true),
  maxLength: z.number().min(8).max(256).default(128),
});

export type PasswordPolicyType = z.infer<typeof passwordPolicySchema>;

// Password validation result schema
export const passwordValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()),
});

export type PasswordValidationResultType = z.infer<
  typeof passwordValidationResultSchema
>;

// Default password policy (fallback)
export const DEFAULT_PASSWORD_POLICY: PasswordPolicyType = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLength: 128,
};

// Environment-based password policy
export const getEnvironmentPasswordPolicy = (): PasswordPolicyType => {
  return {
    minLength: env.PASSWORD_MIN_LENGTH,
    maxLength: env.PASSWORD_MAX_LENGTH,
    requireUppercase: env.PASSWORD_REQUIRE_UPPERCASE,
    requireLowercase: env.PASSWORD_REQUIRE_LOWERCASE,
    requireNumbers: env.PASSWORD_REQUIRE_NUMBERS,
    requireSpecialChars: env.PASSWORD_REQUIRE_SPECIAL_CHARS,
  };
};

// Password service interface
export interface IPasswordService {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  validatePasswordStrength(
    password: string,
    policy?: PasswordPolicyType,
  ): PasswordValidationResultType;
  generateSecurePassword(length?: number): string;
  getCurrentPasswordPolicy(): PasswordPolicyType;
  validatePasswordPolicy(policy: PasswordPolicyType): { isValid: boolean; errors: string[] };
}

// Password service implementation using Argon2id
export class PasswordService extends BaseService implements IPasswordService {
  private readonly argon2Options = {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64MB
    timeCost: 3,
    parallelism: 1,
  };

  constructor() {
    super("password");
  }

  /**
   * Hash a password using Argon2id
   * @param password - Plain text password to hash
   * @returns Promise that resolves to hashed password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      return await argon2.hash(password, this.argon2Options);
    } catch (error) {
      throw new Error(
        `Failed to hash password: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Verify a password against its hash
   * @param password - Plain text password to verify
   * @param hash - Stored password hash
   * @returns Promise that resolves to true if password matches
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      // Log error but don't expose details for security
      console.error("Password verification error:", error);
      return false;
    }
  }

  /**
   * Validate password strength against policy
   * @param password - Password to validate
   * @param policy - Password policy to check against (uses default if not provided)
   * @returns Validation result with isValid flag and error messages
   */
  validatePasswordStrength(
    password: string,
    policy?: PasswordPolicyType,
  ): PasswordValidationResultType {
    const activePolicy = policy || this.getCurrentPasswordPolicy();
    const errors: string[] = [];

    // Check minimum length
    if (password.length < activePolicy.minLength) {
      errors.push(
        `Password must be at least ${activePolicy.minLength} characters long`,
      );
    }

    // Check maximum length
    if (password.length > activePolicy.maxLength) {
      errors.push(
        `Password must be no more than ${activePolicy.maxLength} characters long`,
      );
    }

    // Check uppercase requirement
    if (activePolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    // Check lowercase requirement
    if (activePolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    // Check numbers requirement
    if (activePolicy.requireNumbers && !/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    // Check special characters requirement
    if (
      activePolicy.requireSpecialChars &&
      !/[!@#$%^&*(),.?":{}|<>]/.test(password)
    ) {
      errors.push(
        'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)',
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate a secure random password
   * @param length - Length of password to generate (default: 16)
   * @returns Randomly generated secure password
   */
  generateSecurePassword(length: number = 16): string {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const specialChars = '!@#$%^&*(),.?":{}|<>';

    const allChars = lowercase + uppercase + numbers + specialChars;

    // Ensure at least one character from each required category
    let password = "";
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];

    // Fill remaining length with random characters
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password to avoid predictable patterns
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  /**
   * Get the current password policy (from environment or default)
   * @returns Current password policy configuration
   */
  getCurrentPasswordPolicy(): PasswordPolicyType {
    try {
      return getEnvironmentPasswordPolicy();
    } catch (error) {
      console.warn("Failed to load environment password policy, using default:", error);
      return DEFAULT_PASSWORD_POLICY;
    }
  }

  /**
   * Validate a password policy configuration
   * @param policy - Password policy to validate
   * @returns Validation result with isValid flag and error messages
   */
  validatePasswordPolicy(policy: PasswordPolicyType): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate min/max length consistency
    if (policy.minLength > policy.maxLength) {
      errors.push("Minimum length cannot be greater than maximum length");
    }

    // Validate length bounds
    if (policy.minLength < 4) {
      errors.push("Minimum length must be at least 4 characters");
    }

    if (policy.maxLength > 256) {
      errors.push("Maximum length cannot exceed 256 characters");
    }

    if (policy.minLength > 128) {
      errors.push("Minimum length cannot exceed 128 characters");
    }

    if (policy.maxLength < 8) {
      errors.push("Maximum length must be at least 8 characters");
    }

    // Validate that the policy is achievable
    let requiredCharTypes = 0;
    if (policy.requireUppercase) requiredCharTypes++;
    if (policy.requireLowercase) requiredCharTypes++;
    if (policy.requireNumbers) requiredCharTypes++;
    if (policy.requireSpecialChars) requiredCharTypes++;

    if (requiredCharTypes > policy.minLength) {
      errors.push(
        `Minimum length (${policy.minLength}) must be at least ${requiredCharTypes} to accommodate all required character types`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
