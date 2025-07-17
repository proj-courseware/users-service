import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  EmailVerificationService,
  DEFAULT_EMAIL_VERIFICATION_CONFIG,
  type IEmailVerificationService,
  type EmailVerificationConfig,
} from "@/services/email-verification.service";
import { MockDbUserRepository } from "@/repositories/mockdb/user.mockdb.repository";
import type { IUserRepository } from "@/repositories/user.repository";
import type { CreateUserType } from "@/schemas/user.schema";
import { BadRequestError, NotFoundError } from "@/errors";

describe("EmailVerificationService", () => {
  let emailVerificationService: IEmailVerificationService;
  let userRepository: IUserRepository;

  // Test user data
  const testUserData: CreateUserType = {
    firstName: "John",
    lastName: "Doe",
    primaryEmail: "john.doe@example.com",
    passwordHash: "hashed_password_123",
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
  };

  beforeEach(async () => {
    userRepository = new MockDbUserRepository();
    emailVerificationService = new EmailVerificationService(userRepository);

    // Clear any existing users
    (userRepository as MockDbUserRepository).clear();
  });

  describe("constructor", () => {
    it("should initialize with default configuration", () => {
      const service = new EmailVerificationService(userRepository);
      expect(service).toBeDefined();
    });

    it("should initialize with custom configuration", () => {
      const customConfig: Partial<EmailVerificationConfig> = {
        tokenExpiryHours: 48,
        tokenLength: 128,
        maxResendAttempts: 5,
        resendCooldownMinutes: 10,
      };

      const service = new EmailVerificationService(
        userRepository,
        customConfig
      );
      expect(service).toBeDefined();
    });
  });

  describe("generateVerificationToken", () => {
    it("should generate verification token for valid user and email", async () => {
      // Create a user
      const user = await userRepository.create(testUserData);

      // Generate verification token
      const result = await emailVerificationService.generateVerificationToken(
        user.id,
        "john.doe@example.com"
      );

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.token.length).toBeGreaterThan(32);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.emailAddress).toBe("john.doe@example.com");
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should throw error for non-existent user", async () => {
      await expect(
        emailVerificationService.generateVerificationToken(
          "non-existent-user-id",
          "test@example.com"
        )
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw error for email not belonging to user", async () => {
      // Create a user
      const user = await userRepository.create(testUserData);

      await expect(
        emailVerificationService.generateVerificationToken(
          user.id,
          "other@example.com"
        )
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw error for already verified email", async () => {
      // Create a user with verified email
      const userData = {
        ...testUserData,
        emails: [
          {
            emailAddress: "john.doe@example.com",
            isVerified: true,
            addedAt: new Date(),
          },
        ],
      };
      const user = await userRepository.create(userData);

      await expect(
        emailVerificationService.generateVerificationToken(
          user.id,
          "john.doe@example.com"
        )
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw error for missing parameters", async () => {
      await expect(
        emailVerificationService.generateVerificationToken(
          "",
          "test@example.com"
        )
      ).rejects.toThrow(BadRequestError);

      await expect(
        emailVerificationService.generateVerificationToken("user-id", "")
      ).rejects.toThrow(BadRequestError);
    });

    it("should use custom configuration", async () => {
      const customConfig: Partial<EmailVerificationConfig> = {
        tokenExpiryHours: 48,
        tokenLength: 128,
      };

      const user = await userRepository.create(testUserData);

      const result = await emailVerificationService.generateVerificationToken(
        user.id,
        "john.doe@example.com",
        customConfig
      );

      expect(result.token.length).toBe(128);

      // Check that expiry is approximately 48 hours from now
      const expectedExpiry = Date.now() + 48 * 60 * 60 * 1000;
      const timeDiff = Math.abs(result.expiresAt.getTime() - expectedExpiry);
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });
  });

  describe("verifyEmailToken", () => {
    it("should verify valid token and mark email as verified", async () => {
      // Create user and generate token
      const user = await userRepository.create(testUserData);
      const tokenResult =
        await emailVerificationService.generateVerificationToken(
          user.id,
          "john.doe@example.com"
        );

      // Verify the token
      const result = await emailVerificationService.verifyEmailToken(
        tokenResult.token
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("successfully verified");
      expect(result.user).toBeDefined();
      expect(result.user!.emails[0].isVerified).toBe(true);
      expect(result.user!.emails[0].verificationToken).toBeUndefined();
    });

    it("should return failure for invalid token format", async () => {
      const result = await emailVerificationService.verifyEmailToken("invalid");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid verification token format");
    });

    it("should return failure for non-existent token", async () => {
      const validFormatToken = "a".repeat(64); // Valid format but doesn't exist

      const result =
        await emailVerificationService.verifyEmailToken(validFormatToken);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid or expired verification token");
    });

    it("should return failure for expired token", async () => {
      // Create fresh user for this test
      const freshUserData = {
        ...testUserData,
        primaryEmail: "expired-test@example.com",
        emails: [
          {
            emailAddress: "expired-test@example.com",
            isVerified: false,
            addedAt: new Date(),
          },
        ],
      };
      const user = await userRepository.create(freshUserData);
      const customConfig = { tokenExpiryHours: -1 }; // Expired immediately

      const tokenResult =
        await emailVerificationService.generateVerificationToken(
          user.id,
          "expired-test@example.com",
          customConfig
        );

      const result = await emailVerificationService.verifyEmailToken(
        tokenResult.token
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("expired");
    });

    it("should return failure for already verified email", async () => {
      // Create fresh user for this test
      const freshUserData = {
        ...testUserData,
        primaryEmail: "already-verified@example.com",
        emails: [
          {
            emailAddress: "already-verified@example.com",
            isVerified: false,
            addedAt: new Date(),
          },
        ],
      };
      const user = await userRepository.create(freshUserData);
      const tokenResult =
        await emailVerificationService.generateVerificationToken(
          user.id,
          "already-verified@example.com"
        );

      // First verification should succeed
      const firstResult = await emailVerificationService.verifyEmailToken(
        tokenResult.token
      );
      expect(firstResult.success).toBe(true);

      // Second verification should fail (token is cleared after verification)
      const secondResult = await emailVerificationService.verifyEmailToken(
        tokenResult.token
      );
      expect(secondResult.success).toBe(false);
      expect(secondResult.message).toContain(
        "Invalid or expired verification token"
      );
    });
  });

  describe("resendVerificationEmail", () => {
    it("should resend verification email for valid user and email", async () => {
      const freshUserData = {
        ...testUserData,
        primaryEmail: "resend@example.com",
        emails: [
          {
            emailAddress: "resend@example.com",
            isVerified: false,
            addedAt: new Date(),
          },
        ],
      };
      const user = await userRepository.create(freshUserData);

      const result = await emailVerificationService.resendVerificationEmail(
        user.id,
        "resend@example.com"
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("resent successfully");
      expect(result.emailAddress).toBe("resend@example.com");
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it("should throw error for non-existent user", async () => {
      await expect(
        emailVerificationService.resendVerificationEmail(
          "non-existent-user-id",
          "test@example.com"
        )
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw error for email not belonging to user", async () => {
      const user = await userRepository.create(testUserData);

      await expect(
        emailVerificationService.resendVerificationEmail(
          user.id,
          "other@example.com"
        )
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw error for already verified email", async () => {
      const userData = {
        ...testUserData,
        emails: [
          {
            emailAddress: "john.doe@example.com",
            isVerified: true,
            addedAt: new Date(),
          },
        ],
      };
      const user = await userRepository.create(userData);

      await expect(
        emailVerificationService.resendVerificationEmail(
          user.id,
          "john.doe@example.com"
        )
      ).rejects.toThrow(BadRequestError);
    });

    it("should enforce cooldown period", async () => {
      const freshUserData = {
        ...testUserData,
        primaryEmail: "cooldown@example.com",
        emails: [
          {
            emailAddress: "cooldown@example.com",
            isVerified: false,
            addedAt: new Date(),
          },
        ],
      };
      const user = await userRepository.create(freshUserData);
      const customConfig = { resendCooldownMinutes: 60 }; // 1 hour cooldown

      // First request should succeed
      const firstResult =
        await emailVerificationService.resendVerificationEmail(
          user.id,
          "cooldown@example.com",
          customConfig
        );
      expect(firstResult.success).toBe(true);

      // Second request within cooldown should fail
      await expect(
        emailVerificationService.resendVerificationEmail(
          user.id,
          "cooldown@example.com",
          customConfig
        )
      ).rejects.toThrow(BadRequestError);
    });

    it("should allow resend after cooldown period", async () => {
      const freshUserData = {
        ...testUserData,
        primaryEmail: "nocooldown@example.com",
        emails: [
          {
            emailAddress: "nocooldown@example.com",
            isVerified: false,
            addedAt: new Date(),
          },
        ],
      };
      const user = await userRepository.create(freshUserData);
      const customConfig = { resendCooldownMinutes: 0 }; // No cooldown

      // First request
      const firstResult =
        await emailVerificationService.resendVerificationEmail(
          user.id,
          "nocooldown@example.com",
          customConfig
        );
      expect(firstResult.success).toBe(true);

      // Second request should also succeed with no cooldown
      const secondResult =
        await emailVerificationService.resendVerificationEmail(
          user.id,
          "nocooldown@example.com",
          customConfig
        );
      expect(secondResult.success).toBe(true);
    });
  });

  describe("isTokenExpired", () => {
    it("should return true for expired date", () => {
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago
      const result = emailVerificationService.isTokenExpired(expiredDate);
      expect(result).toBe(true);
    });

    it("should return false for future date", () => {
      const futureDate = new Date(Date.now() + 1000); // 1 second from now
      const result = emailVerificationService.isTokenExpired(futureDate);
      expect(result).toBe(false);
    });
  });

  describe("isTokenValid", () => {
    it("should return true for valid token format", () => {
      const validToken = "a".repeat(64);
      const result = emailVerificationService.isTokenValid(validToken);
      expect(result).toBe(true);
    });

    it("should return false for invalid token formats", () => {
      // Too short
      expect(emailVerificationService.isTokenValid("short")).toBe(false);

      // Too long
      expect(emailVerificationService.isTokenValid("a".repeat(200))).toBe(
        false
      );

      // Invalid characters
      expect(emailVerificationService.isTokenValid("invalid@token#")).toBe(
        false
      );

      // Empty string
      expect(emailVerificationService.isTokenValid("")).toBe(false);

      // Not a string
      expect(emailVerificationService.isTokenValid(null as any)).toBe(false);
    });
  });

  describe("generateSecureToken", () => {
    it("should generate token with default length", () => {
      const token = emailVerificationService.generateSecureToken();
      expect(token.length).toBe(DEFAULT_EMAIL_VERIFICATION_CONFIG.tokenLength);
      expect(emailVerificationService.isTokenValid(token)).toBe(true);
    });

    it("should generate token with custom length", () => {
      const customLength = 128;
      const token = emailVerificationService.generateSecureToken(customLength);
      expect(token.length).toBe(customLength);
      expect(emailVerificationService.isTokenValid(token)).toBe(true);
    });

    it("should generate unique tokens", () => {
      const token1 = emailVerificationService.generateSecureToken();
      const token2 = emailVerificationService.generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe("findUserByVerificationToken", () => {
    it("should find user by verification token", async () => {
      const freshUserData = {
        ...testUserData,
        primaryEmail: "finduser@example.com",
        emails: [
          {
            emailAddress: "finduser@example.com",
            isVerified: false,
            addedAt: new Date(),
          },
        ],
      };
      const user = await userRepository.create(freshUserData);
      const tokenResult =
        await emailVerificationService.generateVerificationToken(
          user.id,
          "finduser@example.com"
        );

      const foundUser =
        await emailVerificationService.findUserByVerificationToken(
          tokenResult.token
        );

      expect(foundUser).toBeDefined();
      expect(foundUser!.id).toBe(user.id);
    });

    it("should return null for non-existent token", async () => {
      const foundUser =
        await emailVerificationService.findUserByVerificationToken(
          "non-existent-token"
        );
      expect(foundUser).toBeNull();
    });
  });

  describe("getTokenInfo", () => {
    it("should return token information for valid token", async () => {
      const freshUserData = {
        ...testUserData,
        primaryEmail: "tokeninfo@example.com",
        emails: [
          {
            emailAddress: "tokeninfo@example.com",
            isVerified: false,
            addedAt: new Date(),
          },
        ],
      };
      const user = await userRepository.create(freshUserData);
      const tokenResult =
        await emailVerificationService.generateVerificationToken(
          user.id,
          "tokeninfo@example.com"
        );

      const tokenInfo = await emailVerificationService.getTokenInfo(
        tokenResult.token
      );

      expect(tokenInfo).toBeDefined();
      expect(tokenInfo!.emailAddress).toBe("tokeninfo@example.com");
      expect(tokenInfo!.expiresAt).toBeInstanceOf(Date);
      expect(tokenInfo!.isExpired).toBe(false);
    });

    it("should return null for invalid token", async () => {
      const tokenInfo = await emailVerificationService.getTokenInfo("invalid");
      expect(tokenInfo).toBeNull();
    });

    it("should correctly identify expired tokens", async () => {
      const freshUserData = {
        ...testUserData,
        primaryEmail: "expiredinfo@example.com",
        emails: [
          {
            emailAddress: "expiredinfo@example.com",
            isVerified: false,
            addedAt: new Date(),
          },
        ],
      };
      const user = await userRepository.create(freshUserData);
      const customConfig = { tokenExpiryHours: -1 }; // Expired immediately

      const tokenResult =
        await emailVerificationService.generateVerificationToken(
          user.id,
          "expiredinfo@example.com",
          customConfig
        );

      const tokenInfo = await emailVerificationService.getTokenInfo(
        tokenResult.token
      );

      expect(tokenInfo).toBeDefined();
      expect(tokenInfo!.isExpired).toBe(true);
    });
  });

  describe("cleanupExpiredTokens", () => {
    it("should clean up expired verification tokens", async () => {
      // Create users with expired tokens
      const user1Data = {
        ...testUserData,
        primaryEmail: "cleanup1@example.com",
        emails: [
          {
            emailAddress: "cleanup1@example.com",
            isVerified: false,
            addedAt: new Date(),
          },
        ],
      };
      const user2Data = {
        ...testUserData,
        primaryEmail: "cleanup2@example.com",
        emails: [
          {
            emailAddress: "cleanup2@example.com",
            isVerified: false,
            addedAt: new Date(),
          },
        ],
      };

      const user1 = await userRepository.create(user1Data);
      const user2 = await userRepository.create(user2Data);

      // Generate expired tokens
      const customConfig = { tokenExpiryHours: -1 };
      await emailVerificationService.generateVerificationToken(
        user1.id,
        "cleanup1@example.com",
        customConfig
      );
      await emailVerificationService.generateVerificationToken(
        user2.id,
        "cleanup2@example.com",
        customConfig
      );

      // Clean up expired tokens
      const cleanedCount =
        await emailVerificationService.cleanupExpiredTokens();

      expect(cleanedCount).toBeGreaterThan(0);

      // Verify tokens are cleared
      const updatedUser1 = await userRepository.findById(user1.id);
      const updatedUser2 = await userRepository.findById(user2.id);

      expect(updatedUser1!.emails[0].verificationToken).toBeUndefined();
      expect(updatedUser2!.emails[0].verificationToken).toBeUndefined();
    });

    it("should not affect non-expired tokens", async () => {
      const freshUserData = {
        ...testUserData,
        primaryEmail: "nonexpired@example.com",
        emails: [
          {
            emailAddress: "nonexpired@example.com",
            isVerified: false,
            addedAt: new Date(),
          },
        ],
      };
      const user = await userRepository.create(freshUserData);
      const tokenResult =
        await emailVerificationService.generateVerificationToken(
          user.id,
          "nonexpired@example.com"
        );

      // Clean up expired tokens
      const cleanedCount =
        await emailVerificationService.cleanupExpiredTokens();

      // Non-expired token should remain
      const updatedUser = await userRepository.findById(user.id);
      expect(updatedUser!.emails[0].verificationToken).toBe(tokenResult.token);
    });

    it("should handle cleanup errors gracefully", async () => {
      // Mock repository to throw error
      const errorRepository = {
        ...userRepository,
        findMany: vi.fn().mockRejectedValue(new Error("Database error")),
      };

      const service = new EmailVerificationService(errorRepository as any);

      await expect(service.cleanupExpiredTokens()).rejects.toThrow(
        "Failed to cleanup expired tokens"
      );
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle concurrent token generation for same email", async () => {
      const freshUserData = {
        ...testUserData,
        primaryEmail: "concurrent@example.com",
        emails: [
          {
            emailAddress: "concurrent@example.com",
            isVerified: false,
            addedAt: new Date(),
          },
        ],
      };
      const user = await userRepository.create(freshUserData);

      // Generate multiple tokens concurrently
      const promises = Array(5)
        .fill(null)
        .map(() =>
          emailVerificationService.generateVerificationToken(
            user.id,
            "concurrent@example.com"
          )
        );

      const results = await Promise.allSettled(promises);

      // All should succeed and generate unique tokens
      const successResults = results.filter((r) => r.status === "fulfilled");
      expect(successResults.length).toBe(5);

      const tokens = successResults.map((r: any) => r.value.token);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(5); // All tokens should be unique
    });

    it("should handle very long email addresses", async () => {
      const longEmail = "a".repeat(100) + "@example.com";
      const userData = {
        ...testUserData,
        primaryEmail: longEmail,
        emails: [
          {
            emailAddress: longEmail,
            isVerified: false,
            addedAt: new Date(),
          },
        ],
      };
      const user = await userRepository.create(userData);

      const result = await emailVerificationService.generateVerificationToken(
        user.id,
        longEmail
      );

      expect(result.emailAddress).toBe(longEmail);
    });

    it("should handle users with multiple emails", async () => {
      const userData = {
        ...testUserData,
        emails: [
          {
            emailAddress: "john.doe@example.com",
            isVerified: false,
            addedAt: new Date(),
          },
          {
            emailAddress: "john.work@company.com",
            isVerified: false,
            addedAt: new Date(),
          },
        ],
      };
      const user = await userRepository.create(userData);

      // Generate tokens for both emails
      const result1 = await emailVerificationService.generateVerificationToken(
        user.id,
        "john.doe@example.com"
      );
      const result2 = await emailVerificationService.generateVerificationToken(
        user.id,
        "john.work@company.com"
      );

      expect(result1.token).not.toBe(result2.token);
      expect(result1.emailAddress).toBe("john.doe@example.com");
      expect(result2.emailAddress).toBe("john.work@company.com");

      // Both tokens should be verifiable
      const verify1 = await emailVerificationService.verifyEmailToken(
        result1.token
      );
      const verify2 = await emailVerificationService.verifyEmailToken(
        result2.token
      );

      expect(verify1.success).toBe(true);
      expect(verify2.success).toBe(true);
    });
  });
});
