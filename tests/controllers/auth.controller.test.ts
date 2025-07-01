import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthController } from "@/controllers/auth.controller";
import type { IAuthenticationService } from "@/services/authentication.service";
import type { IEmailVerificationService } from "@/services/email-verification.service";
import type { IEmailService } from "@/services/email.service";
import type {
  RegisterUserType,
  LoginCredentialsType,
  UserType,
} from "@/schemas/user.schema";
import type { AppEnv } from "@/schemas/app-env.schema";
import { BadRequestError } from "@/errors";

// Mock context interface
interface MockContextConfig {
  validatedBody?: any;
  headers?: Record<string, string>;
  json?: any;
}

const createMockContext = (config: MockContextConfig = {}) => {
  const mockJson = vi.fn((data) => data);
  const mockReq = {
    json: vi.fn().mockResolvedValue(config.json || {}),
    header: vi.fn((headerName: string) => config.headers?.[headerName]),
  };

  return {
    var: {
      validatedBody: config.validatedBody || {},
    },
    req: mockReq,
    json: mockJson,
  } as any;
};

// Mock user data
const mockUser: UserType = {
  id: "user-123",
  firstName: "John",
  lastName: "Doe",
  primaryEmail: "john.doe@example.com",
  passwordHash: "hashed_password",
  globalRole: "student",
  emails: [
    {
      emailAddress: "john.doe@example.com",
      isVerified: false,
      addedAt: new Date(),
    },
  ],
  socialIdentities: [],
  isAccountLocked: false,
  failedLoginAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("AuthController", () => {
  let authController: AuthController;
  let mockAuthService: IAuthenticationService;
  let mockEmailVerificationService: IEmailVerificationService;
  let mockEmailService: IEmailService;

  beforeEach(() => {
    // Create mock services
    mockAuthService = {
      register: vi.fn(),
      loginWithPassword: vi.fn(),
      refreshTokens: vi.fn(),
      verifyAccessToken: vi.fn(),
      getUserFromToken: vi.fn(),
      unlockAccount: vi.fn(),
      changePassword: vi.fn(),
      resetFailedAttempts: vi.fn(),
      authenticateUserByToken: vi.fn(),
    } as any;

    mockEmailVerificationService = {
      generateVerificationToken: vi.fn(),
      verifyEmailToken: vi.fn(),
      resendVerificationEmail: vi.fn(),
      isTokenExpired: vi.fn(),
      isTokenValid: vi.fn(),
      generateSecureToken: vi.fn(),
      findUserByVerificationToken: vi.fn(),
      getTokenInfo: vi.fn(),
      cleanupExpiredTokens: vi.fn(),
    } as any;

    mockEmailService = {
      sendVerificationEmail: vi.fn(),
      sendPasswordResetEmail: vi.fn(),
      sendWelcomeEmail: vi.fn(),
      sendRawEmail: vi.fn(),
      isHealthy: vi.fn(),
    } as any;

    authController = new AuthController({
      authenticationService: mockAuthService,
      emailVerificationService: mockEmailVerificationService,
      emailService: mockEmailService,
    });
  });

  describe("register", () => {
    it("should register user successfully without email verification", async () => {
      const registerData: RegisterUserType = {
        email: "john.doe@example.com",
        password: "SecurePass123!",
        firstName: "John",
        lastName: "Doe",
      };

      const registrationResult = {
        user: mockUser,
        message: "Registration successful",
        requiresEmailVerification: false,
      };

      mockAuthService.register = vi.fn().mockResolvedValue(registrationResult);

      const context = createMockContext({ validatedBody: registerData });
      const response = await authController.register(context);

      expect(mockAuthService.register).toHaveBeenCalledWith(registerData);
      expect(response).toEqual({
        success: true,
        message: registrationResult.message,
        user: mockUser,
        requiresEmailVerification: false,
      });
    });

    it("should register user successfully with email verification", async () => {
      const registerData: RegisterUserType = {
        email: "john.doe@example.com",
        password: "SecurePass123!",
        firstName: "John",
        lastName: "Doe",
      };

      const registrationResult = {
        user: mockUser,
        message: "Registration successful. Please verify your email.",
        requiresEmailVerification: true,
      };

      const verificationResult = {
        token: "verification_token_123",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        emailAddress: "john.doe@example.com",
      };

      mockAuthService.register = vi.fn().mockResolvedValue(registrationResult);
      mockEmailVerificationService.generateVerificationToken = vi
        .fn()
        .mockResolvedValue(verificationResult);
      mockEmailService.sendVerificationEmail = vi.fn().mockResolvedValue({
        success: true,
        messageId: "email_message_123",
      });

      const context = createMockContext({ validatedBody: registerData });
      const response = await authController.register(context);

      expect(mockAuthService.register).toHaveBeenCalledWith(registerData);
      expect(
        mockEmailVerificationService.generateVerificationToken,
      ).toHaveBeenCalledWith(mockUser.id, mockUser.primaryEmail);
      expect(response).toMatchObject({
        success: true,
        message: registrationResult.message,
        user: mockUser,
        requiresEmailVerification: true,
        verificationEmailSent: true,
      });
    });

    it("should handle verification token generation failure gracefully", async () => {
      const registerData: RegisterUserType = {
        email: "john.doe@example.com",
        password: "SecurePass123!",
        firstName: "John",
        lastName: "Doe",
      };

      const registrationResult = {
        user: mockUser,
        message: "Registration successful. Please verify your email.",
        requiresEmailVerification: true,
      };

      mockAuthService.register = vi.fn().mockResolvedValue(registrationResult);
      mockEmailVerificationService.generateVerificationToken = vi
        .fn()
        .mockRejectedValue(new Error("Email service unavailable"));

      const context = createMockContext({ validatedBody: registerData });
      const response = await authController.register(context);

      expect(response).toMatchObject({
        success: true,
        message: registrationResult.message,
        user: mockUser,
        requiresEmailVerification: true,
        verificationEmailSent: false,
      });
    });
  });

  describe("login", () => {
    it("should login user successfully", async () => {
      const loginData: LoginCredentialsType = {
        email: "john.doe@example.com",
        password: "SecurePass123!",
      };

      const loginResult = {
        user: mockUser,
        accessToken: "access_token_123",
        refreshToken: "refresh_token_123",
      };

      mockAuthService.loginWithPassword = vi
        .fn()
        .mockResolvedValue(loginResult);

      const context = createMockContext({ validatedBody: loginData });
      const response = await authController.login(context);

      expect(mockAuthService.loginWithPassword).toHaveBeenCalledWith(loginData);
      expect(response).toEqual({
        success: true,
        message: "Login successful",
        user: mockUser,
        accessToken: "access_token_123",
        refreshToken: "refresh_token_123",
      });
    });

    it("should login user successfully without tokens", async () => {
      const loginData: LoginCredentialsType = {
        email: "john.doe@example.com",
        password: "SecurePass123!",
      };

      const loginResult = {
        user: mockUser,
      };

      mockAuthService.loginWithPassword = vi
        .fn()
        .mockResolvedValue(loginResult);

      const context = createMockContext({ validatedBody: loginData });
      const response = await authController.login(context);

      expect(response).toEqual({
        success: true,
        message: "Login successful",
        user: mockUser,
      });
    });
  });

  describe("refreshToken", () => {
    it("should refresh tokens successfully", async () => {
      const refreshResult = {
        accessToken: "new_access_token",
        refreshToken: "new_refresh_token",
      };

      mockAuthService.refreshTokens = vi.fn().mockResolvedValue(refreshResult);

      const context = createMockContext({
        json: { refreshToken: "old_refresh_token" },
      });
      const response = await authController.refreshToken(context);

      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
        "old_refresh_token",
      );
      expect(response).toEqual({
        success: true,
        message: "Tokens refreshed successfully",
        accessToken: "new_access_token",
        refreshToken: "new_refresh_token",
      });
    });

    it("should throw error when refresh token is missing", async () => {
      const context = createMockContext({ json: {} });

      await expect(authController.refreshToken(context)).rejects.toThrow(
        BadRequestError,
      );
    });
  });

  describe("verifyEmail", () => {
    it("should verify email successfully", async () => {
      const verificationResult = {
        success: true,
        message: "Email verified successfully",
        user: mockUser,
      };

      mockEmailVerificationService.verifyEmailToken = vi
        .fn()
        .mockResolvedValue(verificationResult);

      const context = createMockContext({
        json: { token: "verification_token_123" },
      });
      const response = await authController.verifyEmail(context);

      expect(
        mockEmailVerificationService.verifyEmailToken,
      ).toHaveBeenCalledWith("verification_token_123");
      expect(response).toEqual({
        success: true,
        message: "Email verified successfully",
        user: mockUser,
      });
    });

    it("should throw error when verification fails", async () => {
      const verificationResult = {
        success: false,
        message: "Invalid verification token",
      };

      mockEmailVerificationService.verifyEmailToken = vi
        .fn()
        .mockResolvedValue(verificationResult);

      const context = createMockContext({
        json: { token: "invalid_token" },
      });

      await expect(authController.verifyEmail(context)).rejects.toThrow(
        BadRequestError,
      );
    });

    it("should throw error when token is missing", async () => {
      const context = createMockContext({ json: {} });

      await expect(authController.verifyEmail(context)).rejects.toThrow(
        BadRequestError,
      );
    });
  });

  describe("resendVerification", () => {
    it("should resend verification email successfully", async () => {
      const resendResult = {
        success: true,
        message: "Verification email resent successfully",
        emailAddress: "john.doe@example.com",
        expiresAt: new Date(),
      };

      mockEmailVerificationService.resendVerificationEmail = vi
        .fn()
        .mockResolvedValue(resendResult);

      const context = createMockContext({
        json: { userId: "user-123", emailAddress: "john.doe@example.com" },
      });
      const response = await authController.resendVerification(context);

      expect(
        mockEmailVerificationService.resendVerificationEmail,
      ).toHaveBeenCalledWith("user-123", "john.doe@example.com");
      expect(response).toMatchObject({
        success: true,
        message: resendResult.message,
        emailAddress: resendResult.emailAddress,
      });
    });

    it("should throw error when required fields are missing", async () => {
      const context = createMockContext({ json: { userId: "user-123" } });

      await expect(authController.resendVerification(context)).rejects.toThrow(
        BadRequestError,
      );
    });
  });

  describe("me", () => {
    it("should return user info from token", async () => {
      mockAuthService.getUserFromToken = vi.fn().mockResolvedValue(mockUser);

      const context = createMockContext({
        headers: { Authorization: "Bearer valid_token_123" },
      });
      const response = await authController.me(context);

      expect(mockAuthService.getUserFromToken).toHaveBeenCalledWith(
        "valid_token_123",
      );
      expect(response).toEqual({
        success: true,
        user: mockUser,
      });
    });

    it("should throw error when authorization header is missing", async () => {
      const context = createMockContext();

      await expect(authController.me(context)).rejects.toThrow(BadRequestError);
    });

    it("should throw error when token format is invalid", async () => {
      const context = createMockContext({
        headers: { Authorization: "Invalid format" },
      });

      await expect(authController.me(context)).rejects.toThrow(BadRequestError);
    });
  });

  describe("logout", () => {
    it("should return logout success message", async () => {
      const context = createMockContext();
      const response = await authController.logout(context);

      expect(response).toEqual({
        success: true,
        message:
          "Logged out successfully. Please remove the access token from your client.",
      });
    });
  });

  describe("tokenInfo", () => {
    it("should return token information", async () => {
      const tokenPayload = {
        userId: "user-123",
        email: "john.doe@example.com",
        role: "student" as const,
        iat: Math.floor(Date.now() / 1000) - 100,
        exp: Math.floor(Date.now() / 1000) + 900,
      };

      mockAuthService.verifyAccessToken = vi
        .fn()
        .mockResolvedValue(tokenPayload);

      const context = createMockContext({
        headers: { Authorization: "Bearer valid_token_123" },
      });
      const response = await authController.tokenInfo(context);

      expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith(
        "valid_token_123",
      );
      expect(response).toMatchObject({
        success: true,
        tokenInfo: {
          userId: "user-123",
          email: "john.doe@example.com",
          role: "student",
          isExpired: false,
        },
      });
    });

    it("should throw error for invalid token", async () => {
      mockAuthService.verifyAccessToken = vi
        .fn()
        .mockRejectedValue(new Error("Invalid token"));

      const context = createMockContext({
        headers: { Authorization: "Bearer invalid_token" },
      });

      await expect(authController.tokenInfo(context)).rejects.toThrow(
        BadRequestError,
      );
    });
  });

  describe("health", () => {
    it("should return health status", async () => {
      const context = createMockContext();
      const response = await authController.health(context);

      expect(response).toMatchObject({
        success: true,
        service: "authentication",
        status: "operational",
      });
      expect(response.timestamp).toBeDefined();
    });
  });
});
