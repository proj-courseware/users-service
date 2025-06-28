import { v4 as uuidv4 } from "uuid";
import { 
  UnauthenticatedError, 
  InvalidCredentialsError, 
  UserAlreadyExistsError, 
  AccountLockedError, 
  EmailNotVerifiedError,
  NotFoundError,
  BadRequestError
} from "@/errors";
import type { IUserRepository } from "@/repositories/user.repository";
import type { IPasswordService } from "@/services/password.service";
import type { IJWTService } from "@/services/jwt.service";
import type {
  UserType,
  CreateUserType,
  RegisterUserType,
  LoginCredentialsType,
  RefreshJWTPayloadType,
  JWTPayloadType,
  EmailObjectType,
} from "@/schemas/user.schema";

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
}

// Default configuration
export const DEFAULT_AUTH_CONFIG: AuthServiceConfig = {
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 30,
  requireEmailVerification: true,
  tokenMode: true,
};

// Authentication service interface
export interface IAuthenticationService {
  register(data: RegisterUserType, config?: Partial<AuthServiceConfig>): Promise<RegistrationResult>;
  loginWithPassword(credentials: LoginCredentialsType, config?: Partial<AuthServiceConfig>): Promise<AuthenticationResult>;
  refreshTokens(refreshToken: string): Promise<TokenRefreshResult>;
  verifyAccessToken(accessToken: string): Promise<JWTPayloadType>;
  unlockAccount(userId: string): Promise<void>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  resetFailedAttempts(email: string): Promise<void>;
  getUserFromToken(accessToken: string): Promise<UserType>;
}

// Main authentication service implementation
export class AuthenticationService implements IAuthenticationService {
  private readonly config: AuthServiceConfig;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordService: IPasswordService,
    private readonly jwtService: IJWTService,
    config?: Partial<AuthServiceConfig>,
  ) {
    this.config = { ...DEFAULT_AUTH_CONFIG, ...config };
  }

  /**
   * Register a new user with email and password
   * @param data Registration data (email, password, firstName, lastName)
   * @param config Optional configuration overrides
   * @returns Registration result with user data and verification requirements
   */
  async register(
    data: RegisterUserType,
    config?: Partial<AuthServiceConfig>,
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
    const passwordValidation = this.passwordService.validatePasswordStrength(data.password);
    if (!passwordValidation.isValid) {
      throw new BadRequestError(`Password validation failed: ${passwordValidation.errors.join(", ")}`);
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

    // 7. TODO: Send verification email (will be implemented in Email Verification Service)
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
    config?: Partial<AuthServiceConfig>,
  ): Promise<AuthenticationResult> {
    const activeConfig = { ...this.config, ...config };

    // 1. Find user by email
    const user = await this.userRepository.findByEmail(credentials.email);
    if (!user) {
      throw new InvalidCredentialsError("Invalid email or password");
    }

    // 2. Check account status
    if (user.isAccountLocked) {
      throw new AccountLockedError(`Account is locked due to too many failed login attempts. Please try again later or contact support.`);
    }

    // 3. Check email verification if required
    if (activeConfig.requireEmailVerification) {
      const primaryEmailObj = user.emails.find(e => e.emailAddress === user.primaryEmail);
      if (!primaryEmailObj?.isVerified) {
        throw new EmailNotVerifiedError("Please verify your email before logging in");
      }
    }

    // 4. Verify password
    if (!user.passwordHash) {
      throw new InvalidCredentialsError("This account uses social login. Please use the appropriate login method.");
    }

    const isPasswordValid = await this.passwordService.verifyPassword(
      credentials.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      // Increment failed login attempts
      await this.handleFailedLogin(user, activeConfig);
      throw new InvalidCredentialsError("Invalid email or password");
    }

    // 5. Reset failed login attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await this.resetFailedAttempts(credentials.email);
    }

    // 6. Update last login time
    await this.userRepository.updateLastLogin(user.id);

    // 7. Generate tokens if in token mode
    let accessToken: string | undefined;
    let refreshToken: string | undefined;

    if (activeConfig.tokenMode) {
      const tokens = await this.jwtService.generateTokenPair(user);
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
    }

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
      throw new UnauthenticatedError("Invalid or expired refresh token", { cause: error });
    }

    // 2. Find user to ensure they still exist and are active
    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new UnauthenticatedError("User associated with token no longer exists");
    }

    if (user.isAccountLocked) {
      throw new AccountLockedError("Account is locked");
    }

    // 3. Generate new token pair (token rotation for security)
    const newTokens = await this.jwtService.generateTokenPair(user);

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
      throw new UnauthenticatedError("User associated with token no longer exists");
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
    newPassword: string,
  ): Promise<void> {
    // 1. Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (!user.passwordHash) {
      throw new BadRequestError("This account uses social login and cannot change password");
    }

    // 2. Verify current password
    const isCurrentPasswordValid = await this.passwordService.verifyPassword(
      currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new InvalidCredentialsError("Current password is incorrect");
    }

    // 3. Validate new password strength
    const passwordValidation = this.passwordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestError(`New password validation failed: ${passwordValidation.errors.join(", ")}`);
    }

    // 4. Hash and update new password
    const newPasswordHash = await this.passwordService.hashPassword(newPassword);
    await this.userRepository.updatePassword(userId, newPasswordHash);
  }

  /**
   * Reset failed login attempts for a user
   * @param email User email
   */
  async resetFailedAttempts(email: string): Promise<void> {
    await this.userRepository.updateLoginAttempts(email, 0, false);
  }

  /**
   * Handle failed login attempt with account lockout logic
   * @param user User who failed login
   * @param config Authentication configuration
   */
  private async handleFailedLogin(
    user: UserType,
    config: AuthServiceConfig,
  ): Promise<void> {
    const newAttempts = user.failedLoginAttempts + 1;
    const shouldLockAccount = newAttempts >= config.maxFailedAttempts;

    await this.userRepository.updateLoginAttempts(
      user.primaryEmail,
      newAttempts,
      shouldLockAccount,
    );
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
   * Remove sensitive data from user object
   * @param user User object to sanitize
   * @returns Sanitized user object without sensitive fields
   */
  private sanitizeUserData(user: UserType): UserType {
    const sanitized = { ...user };
    delete (sanitized as Partial<UserType>).passwordHash;
    
    // Remove verification tokens from emails
    sanitized.emails = sanitized.emails.map(email => ({
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
    globalRole: string; 
    primaryEmail: string; 
  }> {
    const payload = await this.verifyAccessToken(token);
    
    return {
      userId: payload.userId,
      globalRole: payload.role,
      primaryEmail: payload.email,
    };
  }
}