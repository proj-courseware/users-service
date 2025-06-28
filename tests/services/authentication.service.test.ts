import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";
import {
  AuthenticationService,
  type IAuthenticationService,
  type AuthServiceConfig,
  DEFAULT_AUTH_CONFIG,
} from "@/services/authentication.service";
import {
  UnauthenticatedError,
  InvalidCredentialsError,
  UserAlreadyExistsError,
  AccountLockedError,
  EmailNotVerifiedError,
  NotFoundError,
  BadRequestError,
} from "@/errors";
import type { IUserRepository } from "@/repositories/user.repository";
import type { IPasswordService } from "@/services/password.service";
import type { IJWTService } from "@/services/jwt.service";
import type {
  UserType,
  RegisterUserType,
  LoginCredentialsType,
  JWTPayloadType,
  RefreshJWTPayloadType,
} from "@/schemas/user.schema";

// Test data
const testUser: UserType = {
  id: "test-user-123",
  firstName: "John",
  lastName: "Doe",
  primaryEmail: "john.doe@example.com",
  passwordHash: "hashed-password",
  globalRole: "student",
  emails: [
    {
      emailAddress: "john.doe@example.com",
      isVerified: true,
      addedAt: new Date(),
    },
  ],
  socialIdentities: [],
  lastLoginAt: new Date(),
  passwordLastChangedAt: new Date(),
  isAccountLocked: false,
  failedLoginAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const unverifiedUser: UserType = {
  ...testUser,
  id: "unverified-user-456",
  primaryEmail: "unverified@example.com",
  emails: [
    {
      emailAddress: "unverified@example.com",
      isVerified: false,
      verificationToken: "test-token",
      verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      addedAt: new Date(),
    },
  ],
};

const lockedUser: UserType = {
  ...testUser,
  id: "locked-user-789",
  primaryEmail: "locked@example.com",
  isAccountLocked: true,
  failedLoginAttempts: 5,
  emails: [
    {
      emailAddress: "locked@example.com",
      isVerified: true,
      addedAt: new Date(),
    },
  ],
};

const registerData: RegisterUserType = {
  email: "newuser@example.com",
  password: "SecurePass123!",
  firstName: "Jane",
  lastName: "Smith",
};

const loginCredentials: LoginCredentialsType = {
  email: "john.doe@example.com",
  password: "SecurePass123!",
};

const mockJWTPayload: JWTPayloadType = {
  userId: testUser.id,
  email: testUser.primaryEmail,
  role: testUser.globalRole,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
};

const mockRefreshPayload: RefreshJWTPayloadType = {
  userId: testUser.id,
  type: "refresh",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 604800, // 7 days
};

// Mock implementations
const createMockUserRepository = (): jest.Mocked<IUserRepository> => ({
  create: vi.fn(),
  findById: vi.fn(),
  findByEmail: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findBySocialIdentity: vi.fn(),
  findByVerificationToken: vi.fn(),
  addEmail: vi.fn(),
  verifyEmail: vi.fn(),
  removeEmail: vi.fn(),
  setPrimaryEmail: vi.fn(),
  linkSocialIdentity: vi.fn(),
  unlinkSocialIdentity: vi.fn(),
  updatePassword: vi.fn(),
  updateLoginAttempts: vi.fn(),
  unlockAccount: vi.fn(),
  updateLastLogin: vi.fn(),
  findAll: vi.fn(),
});

const createMockPasswordService = (): jest.Mocked<IPasswordService> => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  validatePasswordStrength: vi.fn(),
  generateSecurePassword: vi.fn(),
});

const createMockJWTService = (): jest.Mocked<IJWTService> => ({
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  verifyAccessToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
  decodeToken: vi.fn(),
  generateTokenPair: vi.fn(),
  extractUserIdFromToken: vi.fn(),
  isTokenExpired: vi.fn(),
  getTokenExpiry: vi.fn(),
  getTokenRemainingTime: vi.fn(),
});

describe("AuthenticationService", () => {
  let authService: IAuthenticationService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockPasswordService: jest.Mocked<IPasswordService>;
  let mockJWTService: jest.Mocked<IJWTService>;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    mockPasswordService = createMockPasswordService();
    mockJWTService = createMockJWTService();

    authService = new AuthenticationService(
      mockUserRepository,
      mockPasswordService,
      mockJWTService,
    );

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe("register", () => {
    beforeEach(() => {
      mockPasswordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockPasswordService.hashPassword.mockResolvedValue("hashed-password");
      mockUserRepository.create.mockResolvedValue(testUser);
    });

    it("should successfully register a new user", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await authService.register(registerData);

      expect(result.user).toBeDefined();
      expect(result.requiresEmailVerification).toBe(true);
      expect(result.message).toContain("verify");

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        registerData.email,
      );
      expect(mockPasswordService.validatePasswordStrength).toHaveBeenCalledWith(
        registerData.password,
      );
      expect(mockPasswordService.hashPassword).toHaveBeenCalledWith(
        registerData.password,
      );
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    it("should register user without email verification when disabled", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await authService.register(registerData, {
        requireEmailVerification: false,
      });

      expect(result.requiresEmailVerification).toBe(false);
      expect(result.message).not.toContain("verify");
    });

    it("should throw error if user already exists", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(testUser);

      await expect(authService.register(registerData)).rejects.toThrow(
        UserAlreadyExistsError,
      );
    });

    it("should throw error for weak password", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPasswordService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ["Password too weak"],
      });

      await expect(authService.register(registerData)).rejects.toThrow(
        BadRequestError,
      );
    });

    it("should throw error for missing email", async () => {
      const invalidData = { ...registerData, email: "" };

      await expect(authService.register(invalidData)).rejects.toThrow(
        BadRequestError,
      );
    });

    it("should throw error for missing password", async () => {
      const invalidData = { ...registerData, password: "" };

      await expect(authService.register(invalidData)).rejects.toThrow(
        BadRequestError,
      );
    });

    it("should sanitize user data in response", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await authService.register(registerData);

      expect((result.user as any).passwordHash).toBeUndefined();
      expect(result.user.emails[0].verificationToken).toBeUndefined();
    });
  });

  describe("loginWithPassword", () => {
    beforeEach(() => {
      mockPasswordService.verifyPassword.mockResolvedValue(true);
      mockJWTService.generateTokenPair.mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });
    });

    it("should successfully login with valid credentials", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(testUser);

      const result = await authService.loginWithPassword(loginCredentials);

      expect(result.user).toBeDefined();
      expect(result.accessToken).toBe("access-token");
      expect(result.refreshToken).toBe("refresh-token");

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        loginCredentials.email,
      );
      expect(mockPasswordService.verifyPassword).toHaveBeenCalledWith(
        loginCredentials.password,
        testUser.passwordHash,
      );
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(
        testUser.id,
      );
      expect(mockJWTService.generateTokenPair).toHaveBeenCalledWith(testUser);
    });

    it("should login without tokens when token mode is disabled", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(testUser);

      const result = await authService.loginWithPassword(loginCredentials, {
        tokenMode: false,
      });

      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeUndefined();
      expect(result.refreshToken).toBeUndefined();
      expect(mockJWTService.generateTokenPair).not.toHaveBeenCalled();
    });

    it("should throw error for non-existent user", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.loginWithPassword(loginCredentials),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it("should throw error for locked account", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(lockedUser);

      await expect(
        authService.loginWithPassword(loginCredentials),
      ).rejects.toThrow(AccountLockedError);
    });

    it("should throw error for unverified email when verification is required", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(unverifiedUser);

      await expect(
        authService.loginWithPassword(loginCredentials),
      ).rejects.toThrow(EmailNotVerifiedError);
    });

    it("should allow login with unverified email when verification is disabled", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(unverifiedUser);

      const result = await authService.loginWithPassword(
        { ...loginCredentials, email: unverifiedUser.primaryEmail },
        { requireEmailVerification: false },
      );

      expect(result.user).toBeDefined();
    });

    it("should throw error for incorrect password", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(testUser);
      mockPasswordService.verifyPassword.mockResolvedValue(false);

      await expect(
        authService.loginWithPassword(loginCredentials),
      ).rejects.toThrow(InvalidCredentialsError);

      expect(mockUserRepository.updateLoginAttempts).toHaveBeenCalled();
    });

    it("should throw error for social login account without password", async () => {
      const socialUser = { ...testUser, passwordHash: undefined };
      mockUserRepository.findByEmail.mockResolvedValue(socialUser);

      await expect(
        authService.loginWithPassword(loginCredentials),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it("should reset failed attempts on successful login", async () => {
      const userWithFailedAttempts = { ...testUser, failedLoginAttempts: 3 };
      mockUserRepository.findByEmail.mockResolvedValue(userWithFailedAttempts);

      await authService.loginWithPassword(loginCredentials);

      expect(mockUserRepository.updateLoginAttempts).toHaveBeenCalledWith(
        loginCredentials.email,
        0,
        false,
      );
    });

    it("should sanitize user data in response", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(testUser);

      const result = await authService.loginWithPassword(loginCredentials);

      expect((result.user as any).passwordHash).toBeUndefined();
    });
  });

  describe("refreshTokens", () => {
    const refreshToken = "valid-refresh-token";

    it("should successfully refresh tokens", async () => {
      mockJWTService.verifyRefreshToken.mockResolvedValue(mockRefreshPayload);
      mockUserRepository.findById.mockResolvedValue(testUser);
      mockJWTService.generateTokenPair.mockResolvedValue({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      });

      const result = await authService.refreshTokens(refreshToken);

      expect(result.accessToken).toBe("new-access-token");
      expect(result.refreshToken).toBe("new-refresh-token");

      expect(mockJWTService.verifyRefreshToken).toHaveBeenCalledWith(
        refreshToken,
      );
      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        mockRefreshPayload.userId,
      );
      expect(mockJWTService.generateTokenPair).toHaveBeenCalledWith(testUser);
    });

    it("should throw error for invalid refresh token", async () => {
      mockJWTService.verifyRefreshToken.mockRejectedValue(
        new UnauthenticatedError("Invalid token"),
      );

      await expect(authService.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthenticatedError,
      );
    });

    it("should throw error if user no longer exists", async () => {
      mockJWTService.verifyRefreshToken.mockResolvedValue(mockRefreshPayload);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthenticatedError,
      );
    });

    it("should throw error if user account is locked", async () => {
      mockJWTService.verifyRefreshToken.mockResolvedValue(mockRefreshPayload);
      mockUserRepository.findById.mockResolvedValue(lockedUser);

      await expect(authService.refreshTokens(refreshToken)).rejects.toThrow(
        AccountLockedError,
      );
    });
  });

  describe("verifyAccessToken", () => {
    const accessToken = "valid-access-token";

    it("should successfully verify access token", async () => {
      mockJWTService.verifyAccessToken.mockResolvedValue(mockJWTPayload);

      const result = await authService.verifyAccessToken(accessToken);

      expect(result).toEqual(mockJWTPayload);
      expect(mockJWTService.verifyAccessToken).toHaveBeenCalledWith(
        accessToken,
      );
    });

    it("should throw error for invalid access token", async () => {
      mockJWTService.verifyAccessToken.mockRejectedValue(
        new UnauthenticatedError("Invalid token"),
      );

      await expect(authService.verifyAccessToken(accessToken)).rejects.toThrow(
        UnauthenticatedError,
      );
    });
  });

  describe("getUserFromToken", () => {
    const accessToken = "valid-access-token";

    it("should successfully get user from token", async () => {
      mockJWTService.verifyAccessToken.mockResolvedValue(mockJWTPayload);
      mockUserRepository.findById.mockResolvedValue(testUser);

      const result = await authService.getUserFromToken(accessToken);

      expect(result.id).toBe(testUser.id);
      expect((result as any).passwordHash).toBeUndefined();

      expect(mockJWTService.verifyAccessToken).toHaveBeenCalledWith(
        accessToken,
      );
      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        mockJWTPayload.userId,
      );
    });

    it("should throw error if user no longer exists", async () => {
      mockJWTService.verifyAccessToken.mockResolvedValue(mockJWTPayload);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.getUserFromToken(accessToken)).rejects.toThrow(
        UnauthenticatedError,
      );
    });

    it("should throw error if user account is locked", async () => {
      mockJWTService.verifyAccessToken.mockResolvedValue(mockJWTPayload);
      mockUserRepository.findById.mockResolvedValue(lockedUser);

      await expect(authService.getUserFromToken(accessToken)).rejects.toThrow(
        AccountLockedError,
      );
    });
  });

  describe("unlockAccount", () => {
    it("should successfully unlock account", async () => {
      mockUserRepository.findById.mockResolvedValue(lockedUser);

      await authService.unlockAccount(lockedUser.id);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(lockedUser.id);
      expect(mockUserRepository.unlockAccount).toHaveBeenCalledWith(
        lockedUser.id,
      );
    });

    it("should throw error if user not found", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        authService.unlockAccount("non-existent-id"),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("changePassword", () => {
    const userId = testUser.id;
    const currentPassword = "OldPassword123!";
    const newPassword = "NewPassword456!";

    beforeEach(() => {
      mockPasswordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockPasswordService.hashPassword.mockResolvedValue("new-hashed-password");
    });

    it("should successfully change password", async () => {
      mockUserRepository.findById.mockResolvedValue(testUser);
      mockPasswordService.verifyPassword.mockResolvedValue(true);

      await authService.changePassword(userId, currentPassword, newPassword);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockPasswordService.verifyPassword).toHaveBeenCalledWith(
        currentPassword,
        testUser.passwordHash,
      );
      expect(mockPasswordService.validatePasswordStrength).toHaveBeenCalledWith(
        newPassword,
      );
      expect(mockPasswordService.hashPassword).toHaveBeenCalledWith(
        newPassword,
      );
      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(
        userId,
        "new-hashed-password",
      );
    });

    it("should throw error if user not found", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        authService.changePassword(userId, currentPassword, newPassword),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw error for social login account", async () => {
      const socialUser = { ...testUser, passwordHash: undefined };
      mockUserRepository.findById.mockResolvedValue(socialUser);

      await expect(
        authService.changePassword(userId, currentPassword, newPassword),
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw error for incorrect current password", async () => {
      mockUserRepository.findById.mockResolvedValue(testUser);
      mockPasswordService.verifyPassword.mockResolvedValue(false);

      await expect(
        authService.changePassword(userId, currentPassword, newPassword),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it("should throw error for weak new password", async () => {
      mockUserRepository.findById.mockResolvedValue(testUser);
      mockPasswordService.verifyPassword.mockResolvedValue(true);
      mockPasswordService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ["Password too weak"],
      });

      await expect(
        authService.changePassword(userId, currentPassword, newPassword),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("resetFailedAttempts", () => {
    it("should reset failed attempts", async () => {
      await authService.resetFailedAttempts(testUser.primaryEmail);

      expect(mockUserRepository.updateLoginAttempts).toHaveBeenCalledWith(
        testUser.primaryEmail,
        0,
        false,
      );
    });
  });

  describe("configuration options", () => {
    it("should use custom configuration", async () => {
      const customConfig: Partial<AuthServiceConfig> = {
        maxFailedAttempts: 3,
        requireEmailVerification: false,
        tokenMode: false,
      };

      const customAuthService = new AuthenticationService(
        mockUserRepository,
        mockPasswordService,
        mockJWTService,
        customConfig,
      );

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPasswordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockPasswordService.hashPassword.mockResolvedValue("hashed-password");
      mockUserRepository.create.mockResolvedValue(testUser);

      const result = await customAuthService.register(registerData);

      expect(result.requiresEmailVerification).toBe(false);
    });

    it("should merge default and custom configuration", () => {
      const customConfig: Partial<AuthServiceConfig> = {
        maxFailedAttempts: 10,
      };

      const customAuthService = new AuthenticationService(
        mockUserRepository,
        mockPasswordService,
        mockJWTService,
        customConfig,
      );

      // Access private config through any to test merging
      const config = (customAuthService as any).config;
      expect(config.maxFailedAttempts).toBe(10);
      expect(config.requireEmailVerification).toBe(
        DEFAULT_AUTH_CONFIG.requireEmailVerification,
      );
    });
  });

  describe("legacy compatibility", () => {
    it("should support legacy authenticateUserByToken method", async () => {
      mockJWTService.verifyAccessToken.mockResolvedValue(mockJWTPayload);

      const result = await authService.authenticateUserByToken("test-token");

      expect(result.userId).toBe(mockJWTPayload.userId);
      expect(result.globalRole).toBe(mockJWTPayload.role);
      expect(result.primaryEmail).toBe(mockJWTPayload.email);
    });
  });

  describe("account lockout logic", () => {
    it("should lock account after max failed attempts", async () => {
      const userWithAttempts = { ...testUser, failedLoginAttempts: 4 }; // One less than max (5)
      mockUserRepository.findByEmail.mockResolvedValue(userWithAttempts);
      mockPasswordService.verifyPassword.mockResolvedValue(false);

      await expect(
        authService.loginWithPassword(loginCredentials),
      ).rejects.toThrow(InvalidCredentialsError);

      expect(mockUserRepository.updateLoginAttempts).toHaveBeenCalledWith(
        loginCredentials.email,
        5, // Should reach max
        true, // Should lock account
      );
    });

    it("should increment attempts without locking if under max", async () => {
      const userWithAttempts = { ...testUser, failedLoginAttempts: 2 };
      mockUserRepository.findByEmail.mockResolvedValue(userWithAttempts);
      mockPasswordService.verifyPassword.mockResolvedValue(false);

      await expect(
        authService.loginWithPassword(loginCredentials),
      ).rejects.toThrow(InvalidCredentialsError);

      expect(mockUserRepository.updateLoginAttempts).toHaveBeenCalledWith(
        loginCredentials.email,
        3, // Should increment
        false, // Should not lock account
      );
    });
  });
});
