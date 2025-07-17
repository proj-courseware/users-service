import { v4 as uuidv4 } from "uuid";
import {
  UnauthenticatedError,
  InvalidCredentialsError,
  UserAlreadyExistsError,
  AccountLockedError,
  EmailNotVerifiedError,
  NotFoundError,
  BadRequestError,
} from "@/errors";
import { BaseService } from "@/events/base.service";
import type { IUserRepository } from "@/repositories/user.repository";
import type { IPasswordService } from "@/services/password.service";
import type { IJWTService } from "@/services/jwt.service";
import type { IRefreshTokenRepository } from "@/repositories/refresh-token.repository";
import type {
  UserType,
  CreateUserType,
  RegisterUserType,
  LoginCredentialsType,
  RefreshJWTPayloadType,
  JWTPayloadType,
  EmailObjectType,
} from "@/schemas/user.schema";
import crypto from "crypto";

// Authentication result interfaces
export interface AuthenticationResult {
  user: UserType;
  accessToken?: string;
  refreshToken?: string;
}

export interface TokenRefreshResult {
  accessToken: string;
  refreshToken: string;
}

export interface RegistrationResult {
  user: UserType;
  message: string;
  requiresEmailVerification: boolean;
}

// Authentication service configuration
export interface AuthServiceConfig {
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  requireEmailVerification: boolean;
  tokenMode: boolean; // true for JWT tokens, false for session-based
  progressiveLockout: boolean; // Enable progressive lockout
  maxProgressiveLockoutHours: number; // Maximum lockout duration in hours
}

// Default configuration
export const DEFAULT_AUTH_CONFIG: AuthServiceConfig = {
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 30,
  requireEmailVerification: true,
  tokenMode: true,
  progressiveLockout: true,
  maxProgressiveLockoutHours: 24,
};

// Authentication service interface
export interface IAuthenticationService {
  register(
    data: RegisterUserType,
    config?: Partial<AuthServiceConfig>
  ): Promise<RegistrationResult>;
  loginWithPassword(
    credentials: LoginCredentialsType,
    config?: Partial<AuthServiceConfig>
  ): Promise<AuthenticationResult>;
  refreshTokens(refreshToken: string): Promise<TokenRefreshResult>;
  verifyAccessToken(accessToken: string): Promise<JWTPayloadType>;
  unlockAccount(userId: string): Promise<void>;
  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void>;
  resetFailedAttempts(email: string): Promise<void>;
  getUserFromToken(accessToken: string): Promise<UserType>;
  logout(refreshToken: string): Promise<void>;
}

// Main authentication service implementation
export class AuthenticationService
  extends BaseService
  implements IAuthenticationService
{
  private readonly config: AuthServiceConfig;
  private readonly refreshTokenRepository: IRefreshTokenRepository;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordService: IPasswordService,
    private readonly jwtService: IJWTService,
    refreshTokenRepository: IRefreshTokenRepository,
    config?: Partial<AuthServiceConfig>
  ) {
    super("authentication");
    this.config = { ...DEFAULT_AUTH_CONFIG, ...config };
    this.refreshTokenRepository = refreshTokenRepository;
  }

  /**
   * Register a new user with email and password
   * @param data Registration data (email, password, firstName, lastName)
   * @param config Optional configuration overrides
   * @returns Registration result with user data and verification requirements
   */
  async register(
    data: RegisterUserType,
    config?: Partial<AuthServiceConfig>
  ): Promise<RegistrationResult> {
    const activeConfig = { ...this.config, ...config };

    // 1. Validate input data (Zod validation should happen at controller level)
    if (!data.email || !data.password) {
      throw new BadRequestError("Email and password are required");
    }

    // 2. Check if user already exists
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new UserAlreadyExistsError("A user with this email already exists");
    }

    // 3. Validate password strength
    const passwordValidation = this.passwordService.validatePasswordStrength(
      data.password
    );
    if (!passwordValidation.isValid) {
      throw new BadRequestError(
        `Password validation failed: ${passwordValidation.errors.join(", ")}`
      );
    }

    // 4. Hash password
    const passwordHash = await this.passwordService.hashPassword(data.password);

    // 5. Generate email verification token if required
    const verificationToken = activeConfig.requireEmailVerification
      ? this.generateVerificationToken()
      : undefined;
    const verificationExpiry = verificationToken
      ? new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      : undefined;

    // 6. Create user with verification token
    const emailObject: EmailObjectType = {
      emailAddress: data.email,
      isVerified: !activeConfig.requireEmailVerification, // Auto-verify if not required
      verificationToken,
      verificationTokenExpiresAt: verificationExpiry,
      addedAt: new Date(),
    };

    const userData: CreateUserType = {
      firstName: data.firstName,
      lastName: data.lastName,
      primaryEmail: data.email,
      passwordHash,
      globalRole: "student", // Default role
      emails: [emailObject],
      socialIdentities: [],
      lastLoginAt: undefined,
      passwordLastChangedAt: new Date(),
      isAccountLocked: false,
      failedLoginAttempts: 0,
    };

    const user = await this.userRepository.create(userData);

    // 7. Emit user registration event
    this.emitEvent(
      "registered",
      {
        userId: user.id,
        email: user.primaryEmail,
        globalRole: user.globalRole,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      {
        user: { userId: user.id, email: user.primaryEmail },
      }
    );

    // 8. TODO: Send verification email (will be implemented in Email Verification Service)
    const message = activeConfig.requireEmailVerification
      ? "Registration successful. Please check your email to verify your account."
      : "Registration successful. You can now log in.";

    return {
      user: this.sanitizeUserData(user),
      message,
      requiresEmailVerification: activeConfig.requireEmailVerification,
    };
  }

  /**
   * Authenticate user with email and password
   * @param credentials Login credentials (email, password)
   * @param config Optional configuration overrides
   * @returns Authentication result with user data and optional tokens
   */
  async loginWithPassword(
    credentials: LoginCredentialsType,
    config?: Partial<AuthServiceConfig>
  ): Promise<AuthenticationResult> {
    const activeConfig = { ...this.config, ...config };

    // 1. Find user by email
    const user = await this.userRepository.findByEmail(credentials.email);
    if (!user) {
      throw new InvalidCredentialsError("Invalid email or password");
    }

    // 2. Check account status - use time-aware lockout check
    const isCurrentlyLocked =
      await this.userRepository.isAccountCurrentlyLocked(credentials.email);
    if (isCurrentlyLocked) {
      let lockMessage =
        "Account is locked due to too many failed login attempts.";

      if (user.accountLockedUntil) {
        const lockUntilFormatted = user.accountLockedUntil.toLocaleString();
        lockMessage += ` Account will be unlocked at ${lockUntilFormatted}.`;
      } else {
        lockMessage += " Please contact support to unlock your account.";
      }

      throw new AccountLockedError(lockMessage);
    }

    // 3. Auto-unlock account if lockout has expired
    if (user.isAccountLocked && !isCurrentlyLocked) {
      await this.userRepository.updateLoginAttempts(
        credentials.email,
        0,
        false
      );
    }

    // 4. Check email verification if required
    if (activeConfig.requireEmailVerification) {
      const primaryEmailObj = user.emails.find(
        (e) => e.emailAddress === user.primaryEmail
      );
      if (!primaryEmailObj?.isVerified) {
        throw new EmailNotVerifiedError(
          "Please verify your email before logging in"
        );
      }
    }

    // 5. Verify password
    if (!user.passwordHash) {
      throw new InvalidCredentialsError(
        "This account uses social login. Please use the appropriate login method."
      );
    }

    const isPasswordValid = await this.passwordService.verifyPassword(
      credentials.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      // Increment failed login attempts
      await this.handleFailedLogin(user, activeConfig);
      throw new InvalidCredentialsError("Invalid email or password");
    }

    // 6. Reset failed login attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await this.resetFailedAttempts(credentials.email);
    }

    // 7. Update last login time
    await this.userRepository.updateLastLogin(user.id);

    // 8. Generate tokens if in token mode
    let accessToken: string | undefined;
    let refreshToken: string | undefined;

    if (activeConfig.tokenMode) {
      const tokens = await this.jwtService.generateTokenPair(user);
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
      // Store refresh token in DB
      if (refreshToken) {
        const payload = await this.jwtService.verifyRefreshToken(refreshToken);
        await this.refreshTokenRepository.create({
          tokenHash: this.hashToken(refreshToken),
          userId: user.id,
          expiresAt: new Date(payload.exp * 1000),
          isRevoked: false,
          userAgent: undefined, // Optionally extract from request
          ipAddress: undefined, // Optionally extract from request
        });
      }
    }

    // 9. Emit login event
    this.emitEvent(
      "login",
      {
        userId: user.id,
        email: user.primaryEmail,
        sessionId: accessToken ? "jwt-" + uuidv4() : undefined,
        tokenType: activeConfig.tokenMode ? "access" : undefined,
      },
      {
        user: { userId: user.id, email: user.primaryEmail },
      }
    );

    return {
      user: this.sanitizeUserData(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh JWT tokens using a valid refresh token
   * @param refreshToken Valid refresh token
   * @returns New token pair
   */
  async refreshTokens(refreshToken: string): Promise<TokenRefreshResult> {
    // 1. Verify refresh token
    let payload: RefreshJWTPayloadType;
    try {
      payload = await this.jwtService.verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new UnauthenticatedError("Invalid or expired refresh token", {
        cause: error,
      });
    }
    // 2. Check token in DB
    const tokenHash = this.hashToken(refreshToken);
    const storedToken =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);
    if (
      !storedToken ||
      storedToken.isRevoked ||
      storedToken.expiresAt < new Date()
    ) {
      throw new UnauthenticatedError(
        "Refresh token has been revoked or expired"
      );
    }
    // 3. Find user
    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new UnauthenticatedError(
        "User associated with token no longer exists"
      );
    }
    if (user.isAccountLocked) {
      throw new AccountLockedError("Account is locked");
    }
    // 4. Generate new token pair (token rotation)
    const newTokens = await this.jwtService.generateTokenPair(user);
    // 5. Store new refresh token and revoke old one
    const newPayload = await this.jwtService.verifyRefreshToken(
      newTokens.refreshToken
    );
    await this.refreshTokenRepository.revokeById(storedToken.id);
    await this.refreshTokenRepository.create({
      tokenHash: this.hashToken(newTokens.refreshToken),
      userId: user.id,
      expiresAt: new Date(newPayload.exp * 1000),
      isRevoked: false,
      userAgent: undefined,
      ipAddress: undefined,
    });
    // 6. Emit token refresh event
    this.emitEvent(
      "token_refreshed",
      {
        userId: user.id,
        email: user.primaryEmail,
        tokenType: "refresh",
      },
      {
        user: { userId: user.id, email: user.primaryEmail },
      }
    );
    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    };
  }

  /**
   * Verify an access token and return its payload
   * @param accessToken JWT access token to verify
   * @returns Verified token payload
   */
  async verifyAccessToken(accessToken: string): Promise<JWTPayloadType> {
    return await this.jwtService.verifyAccessToken(accessToken);
  }

  /**
   * Get user data from a valid access token
   * @param accessToken JWT access token
   * @returns User data
   */
  async getUserFromToken(accessToken: string): Promise<UserType> {
    const payload = await this.verifyAccessToken(accessToken);

    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new UnauthenticatedError(
        "User associated with token no longer exists"
      );
    }

    if (user.isAccountLocked) {
      throw new AccountLockedError("Account is locked");
    }

    return this.sanitizeUserData(user);
  }

  /**
   * Unlock a user account (admin operation)
   * @param userId User ID to unlock
   */
  async unlockAccount(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    await this.userRepository.unlockAccount(userId);
  }

  /**
   * Change user password with current password verification
   * @param userId User ID
   * @param currentPassword Current password for verification
   * @param newPassword New password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // 1. Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (!user.passwordHash) {
      throw new BadRequestError(
        "This account uses social login and cannot change password"
      );
    }

    // 2. Verify current password
    const isCurrentPasswordValid = await this.passwordService.verifyPassword(
      currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new InvalidCredentialsError("Current password is incorrect");
    }

    // 3. Validate new password strength
    const passwordValidation =
      this.passwordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestError(
        `New password validation failed: ${passwordValidation.errors.join(", ")}`
      );
    }

    // 4. Hash and update new password
    const newPasswordHash =
      await this.passwordService.hashPassword(newPassword);
    await this.userRepository.updatePassword(userId, newPasswordHash);
    // Revoke all refresh tokens for this user
    await this.refreshTokenRepository.revokeAllForUser(userId);

    // 5. Emit password change event
    this.emitEvent(
      "password_changed",
      {
        userId: user.id,
        email: user.primaryEmail,
      },
      {
        user: { userId: user.id, email: user.primaryEmail },
      }
    );
  }

  /**
   * Reset failed login attempts for a user
   * @param email User email
   */
  async resetFailedAttempts(email: string): Promise<void> {
    await this.userRepository.updateLoginAttempts(email, 0, false);
  }

  /**
   * Handle failed login attempt with progressive lockout logic
   * @param user User who failed login
   * @param config Authentication configuration
   */
  private async handleFailedLogin(
    user: UserType,
    config: AuthServiceConfig
  ): Promise<void> {
    const newAttempts = user.failedLoginAttempts + 1;
    const shouldLockAccount = newAttempts >= config.maxFailedAttempts;

    if (shouldLockAccount && config.progressiveLockout) {
      // Calculate progressive lockout duration
      const lockoutDuration = this.calculateProgressiveLockoutDuration(
        newAttempts,
        config
      );
      const lockUntil = new Date(Date.now() + lockoutDuration);

      await this.userRepository.updateLoginAttempts(
        user.primaryEmail,
        newAttempts,
        true,
        lockUntil
      );

      // Emit account locked event
      this.emitEvent(
        "account_locked",
        {
          userId: user.id,
          email: user.primaryEmail,
          lockoutDuration,
          failedAttempts: newAttempts,
          reason: "Too many failed login attempts",
        },
        {
          user: { userId: user.id, email: user.primaryEmail },
        }
      );
    } else if (shouldLockAccount) {
      // Standard lockout (fixed duration)
      const lockUntil = new Date(
        Date.now() + config.lockoutDurationMinutes * 60 * 1000
      );

      await this.userRepository.updateLoginAttempts(
        user.primaryEmail,
        newAttempts,
        true,
        lockUntil
      );

      // Emit account locked event
      this.emitEvent(
        "account_locked",
        {
          userId: user.id,
          email: user.primaryEmail,
          lockoutDuration: config.lockoutDurationMinutes * 60 * 1000,
          failedAttempts: newAttempts,
          reason: "Too many failed login attempts",
        },
        {
          user: { userId: user.id, email: user.primaryEmail },
        }
      );
    } else {
      // Just update failed attempts count
      await this.userRepository.updateLoginAttempts(
        user.primaryEmail,
        newAttempts,
        false
      );

      // Emit failed login attempt event
      this.emitEvent(
        "failed_login_attempt",
        {
          userId: user.id,
          email: user.primaryEmail,
          failedAttempts: newAttempts,
        },
        {
          user: { userId: user.id, email: user.primaryEmail },
        }
      );
    }
  }

  /**
   * Calculate progressive lockout duration based on failed attempts
   * First lockout = base duration, then exponential backoff: 2^(lockout_number - 1) * baseDuration
   * @param attempts Number of failed attempts
   * @param config Authentication configuration
   * @returns Lockout duration in milliseconds
   */
  private calculateProgressiveLockoutDuration(
    attempts: number,
    config: AuthServiceConfig
  ): number {
    const baseAttempts = config.maxFailedAttempts;
    const excessAttempts = Math.max(0, attempts - baseAttempts);

    // First lockout uses base duration, then exponential backoff
    // excessAttempts = 0 -> multiplier = 1 (base duration)
    // excessAttempts = 1 -> multiplier = 2 (double)
    // excessAttempts = 2 -> multiplier = 4 (quadruple)
    const multiplier = Math.pow(2, excessAttempts);
    const baseDurationMs = config.lockoutDurationMinutes * 60 * 1000;
    const calculatedDuration = multiplier * baseDurationMs;

    // Cap at maximum lockout duration
    const maxDurationMs = config.maxProgressiveLockoutHours * 60 * 60 * 1000;

    return Math.min(calculatedDuration, maxDurationMs);
  }

  /**
   * Generate a secure verification token
   * @returns Random verification token
   */
  private generateVerificationToken(): string {
    // Generate a secure random token (could be enhanced with crypto.randomBytes)
    return uuidv4() + uuidv4().replace(/-/g, "");
  }

  /**
   * Hash a refresh token using SHA-256
   *
   * We use a fast hash (SHA-256) instead of a slow hash (like bcrypt/argon2) because:
   * - Refresh tokens are high-entropy, random secrets (not user-chosen passwords)
   * - The main goal is to prevent database leaks from exposing usable tokens
   * - Fast lookup is important for authentication performance
   * - Slow hashes are necessary for passwords to prevent brute-force, but not for random tokens
   *
   * This is a deliberate security design decision and is standard practice for token storage.
   */
  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Remove sensitive data from user object
   * @param user User object to sanitize
   * @returns Sanitized user object without sensitive fields
   */
  private sanitizeUserData(user: UserType): UserType {
    const sanitized = { ...user };
    delete (sanitized as Partial<UserType>).passwordHash;

    // Remove verification tokens from emails
    sanitized.emails = sanitized.emails.map((email) => ({
      ...email,
      verificationToken: undefined,
      verificationTokenExpiresAt: undefined,
    }));

    return sanitized;
  }

  /**
   * Legacy method for backward compatibility - authenticates user by token
   * This will be removed once all controllers are updated
   * @deprecated Use verifyAccessToken and getUserFromToken instead
   */
  async authenticateUserByToken(token: string): Promise<{
    userId: string;
    globalRole: "student" | "teacher" | "admin" | "user";
    primaryEmail: string;
  }> {
    const payload = await this.verifyAccessToken(token);

    return {
      userId: payload.userId,
      globalRole: payload.role as "student" | "teacher" | "admin" | "user",
      primaryEmail: payload.email,
    };
  }

  /**
   * Logout by revoking a specific refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const storedToken =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);
    if (storedToken && !storedToken.isRevoked) {
      await this.refreshTokenRepository.revokeById(storedToken.id);
    }
  }
}
