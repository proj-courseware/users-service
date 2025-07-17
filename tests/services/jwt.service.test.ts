import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import jwt from "jsonwebtoken";
import { JWTService, type IJWTService } from "@/services/jwt.service";
import { UnauthenticatedError } from "@/errors";
import type {
  UserType,
  JWTPayloadType,
  RefreshJWTPayloadType,
} from "@/schemas/user.schema";

// Test user data
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

const adminUser: UserType = {
  ...testUser,
  id: "admin-user-456",
  primaryEmail: "admin@example.com",
  globalRole: "admin",
  emails: [
    {
      emailAddress: "admin@example.com",
      isVerified: true,
      addedAt: new Date(),
    },
  ],
};

describe("JWTService", () => {
  let jwtService: IJWTService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    // Store original env
    originalEnv = { ...process.env };

    // Set test environment variables
    process.env.JWT_ACCESS_SECRET =
      "test-access-secret-32-chars-minimum-length";
    process.env.JWT_REFRESH_SECRET =
      "test-refresh-secret-32-chars-minimum-length";
    process.env.JWT_ACCESS_EXPIRY_MINUTES = "15";
    process.env.JWT_REFRESH_EXPIRY_DAYS = "7";
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  beforeEach(() => {
    jwtService = new JWTService();
  });

  describe("generateAccessToken", () => {
    it("should generate a valid access token", async () => {
      const token = await jwtService.generateAccessToken(testUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT format: header.payload.signature
    });

    it("should generate token with correct payload structure", async () => {
      const token = await jwtService.generateAccessToken(testUser);
      const decoded = jwt.decode(token) as JWTPayloadType;

      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.email).toBe(testUser.primaryEmail);
      expect(decoded.role).toBe(testUser.globalRole);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it("should generate token with 15-minute expiry by default", async () => {
      const beforeGeneration = Math.floor(Date.now() / 1000);
      const token = await jwtService.generateAccessToken(testUser);
      const decoded = jwt.decode(token) as JWTPayloadType;

      const expectedExpiry = beforeGeneration + 15 * 60; // 15 minutes
      expect(decoded.exp).toBeCloseTo(expectedExpiry, 5); // Allow 5 second variance
    });

    it("should generate different tokens for the same user", async () => {
      const token1 = await jwtService.generateAccessToken(testUser);
      // Add small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const token2 = await jwtService.generateAccessToken(testUser);

      expect(token1).not.toBe(token2);
    });

    it("should generate tokens with different user data", async () => {
      const userToken = await jwtService.generateAccessToken(testUser);
      const adminToken = await jwtService.generateAccessToken(adminUser);

      const userDecoded = jwt.decode(userToken) as JWTPayloadType;
      const adminDecoded = jwt.decode(adminToken) as JWTPayloadType;

      expect(userDecoded.userId).toBe(testUser.id);
      expect(adminDecoded.userId).toBe(adminUser.id);
      expect(userDecoded.role).toBe("student");
      expect(adminDecoded.role).toBe("admin");
    });

    it("should allow custom expiry override", async () => {
      const customExpirySeconds = 3600; // 1 hour
      const token = await jwtService.generateAccessToken(testUser, {
        expiryOverride: customExpirySeconds,
      });

      const decoded = jwt.decode(token) as JWTPayloadType;
      const expectedExpiry = decoded.iat + customExpirySeconds;

      expect(decoded.exp).toBe(expectedExpiry);
    });

    it("should handle custom algorithm option", async () => {
      const token = await jwtService.generateAccessToken(testUser, {
        algorithm: "HS512",
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
    });

    it("should handle custom audience and issuer", async () => {
      const token = await jwtService.generateAccessToken(testUser, {
        audience: "test-audience",
        issuer: "test-issuer",
      });

      const decoded = jwt.decode(token, { complete: true }) as any;
      expect(decoded.payload.aud).toBe("test-audience");
      expect(decoded.payload.iss).toBe("test-issuer");
    });
  });

  describe("generateRefreshToken", () => {
    it("should generate a valid refresh token", async () => {
      const token = await jwtService.generateRefreshToken(testUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });

    it("should generate token with correct refresh payload structure", async () => {
      const token = await jwtService.generateRefreshToken(testUser);
      const decoded = jwt.decode(token) as RefreshJWTPayloadType;

      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.type).toBe("refresh");
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it("should generate token with 7-day expiry by default", async () => {
      const beforeGeneration = Math.floor(Date.now() / 1000);
      const token = await jwtService.generateRefreshToken(testUser);
      const decoded = jwt.decode(token) as RefreshJWTPayloadType;

      const expectedExpiry = beforeGeneration + 7 * 24 * 60 * 60; // 7 days
      expect(decoded.exp).toBeCloseTo(expectedExpiry, 5);
    });

    it("should allow custom expiry override", async () => {
      const customExpirySeconds = 86400; // 1 day
      const token = await jwtService.generateRefreshToken(testUser, {
        expiryOverride: customExpirySeconds,
      });

      const decoded = jwt.decode(token) as RefreshJWTPayloadType;
      const expectedExpiry = decoded.iat + customExpirySeconds;

      expect(decoded.exp).toBe(expectedExpiry);
    });
  });

  describe("verifyAccessToken", () => {
    it("should verify valid access token", async () => {
      const token = await jwtService.generateAccessToken(testUser);
      const verified = await jwtService.verifyAccessToken(token);

      expect(verified.userId).toBe(testUser.id);
      expect(verified.email).toBe(testUser.primaryEmail);
      expect(verified.role).toBe(testUser.globalRole);
    });

    it("should reject invalid access token", async () => {
      const invalidToken = "invalid.token.here";

      await expect(jwtService.verifyAccessToken(invalidToken)).rejects.toThrow(
        UnauthenticatedError
      );
    });

    it("should reject token with wrong secret", async () => {
      const wrongToken = jwt.sign(
        {
          userId: testUser.id,
          email: testUser.primaryEmail,
          role: testUser.globalRole,
        },
        "wrong-secret"
      );

      await expect(jwtService.verifyAccessToken(wrongToken)).rejects.toThrow(
        UnauthenticatedError
      );
    });

    it("should reject expired access token", async () => {
      const expiredToken = jwt.sign(
        {
          userId: testUser.id,
          email: testUser.primaryEmail,
          role: testUser.globalRole,
          iat: Math.floor(Date.now() / 1000) - 3600,
          exp: Math.floor(Date.now() / 1000) - 1800, // Expired 30 minutes ago
        },
        process.env.JWT_ACCESS_SECRET!
      );

      await expect(jwtService.verifyAccessToken(expiredToken)).rejects.toThrow(
        UnauthenticatedError
      );
    });

    it("should reject token with invalid payload structure", async () => {
      const invalidPayloadToken = jwt.sign(
        { invalidPayload: true },
        process.env.JWT_ACCESS_SECRET!
      );

      await expect(
        jwtService.verifyAccessToken(invalidPayloadToken)
      ).rejects.toThrow(UnauthenticatedError);
    });

    it("should reject token with missing required fields", async () => {
      const incompleteToken = jwt.sign(
        { userId: testUser.id }, // Missing email and role
        process.env.JWT_ACCESS_SECRET!
      );

      await expect(
        jwtService.verifyAccessToken(incompleteToken)
      ).rejects.toThrow(UnauthenticatedError);
    });
  });

  describe("verifyRefreshToken", () => {
    it("should verify valid refresh token", async () => {
      const token = await jwtService.generateRefreshToken(testUser);
      const verified = await jwtService.verifyRefreshToken(token);

      expect(verified.userId).toBe(testUser.id);
      expect(verified.type).toBe("refresh");
    });

    it("should reject invalid refresh token", async () => {
      const invalidToken = "invalid.refresh.token";

      await expect(jwtService.verifyRefreshToken(invalidToken)).rejects.toThrow(
        UnauthenticatedError
      );
    });

    it("should reject access token when expecting refresh token", async () => {
      const accessToken = await jwtService.generateAccessToken(testUser);

      await expect(jwtService.verifyRefreshToken(accessToken)).rejects.toThrow(
        UnauthenticatedError
      );
    });

    it("should reject refresh token with wrong secret", async () => {
      const wrongToken = jwt.sign(
        { userId: testUser.id, type: "refresh" },
        "wrong-refresh-secret"
      );

      await expect(jwtService.verifyRefreshToken(wrongToken)).rejects.toThrow(
        UnauthenticatedError
      );
    });

    it("should reject expired refresh token", async () => {
      const expiredToken = jwt.sign(
        {
          userId: testUser.id,
          type: "refresh",
          iat: Math.floor(Date.now() / 1000) - 3600,
          exp: Math.floor(Date.now() / 1000) - 1800,
        },
        process.env.JWT_REFRESH_SECRET!
      );

      await expect(jwtService.verifyRefreshToken(expiredToken)).rejects.toThrow(
        UnauthenticatedError
      );
    });
  });

  describe("decodeToken", () => {
    it("should decode valid token without verification", async () => {
      const token = await jwtService.generateAccessToken(testUser);
      const decoded = jwtService.decodeToken(token) as JWTPayloadType;

      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.email).toBe(testUser.primaryEmail);
    });

    it("should return null for invalid token", () => {
      const decoded = jwtService.decodeToken("invalid.token");
      expect(decoded).toBeNull();
    });

    it("should decode token even with wrong secret", () => {
      const token = jwt.sign({ test: "data" }, "any-secret");
      const decoded = jwtService.decodeToken(token);

      expect(decoded).toBeDefined();
      expect((decoded as any).test).toBe("data");
    });
  });

  describe("generateTokenPair", () => {
    it("should generate both access and refresh tokens", async () => {
      const { accessToken, refreshToken } =
        await jwtService.generateTokenPair(testUser);

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(accessToken).not.toBe(refreshToken);
    });

    it("should generate valid token pair", async () => {
      const { accessToken, refreshToken } =
        await jwtService.generateTokenPair(testUser);

      const accessDecoded = await jwtService.verifyAccessToken(accessToken);
      const refreshDecoded = await jwtService.verifyRefreshToken(refreshToken);

      expect(accessDecoded.userId).toBe(testUser.id);
      expect(refreshDecoded.userId).toBe(testUser.id);
    });

    it("should apply options to both tokens", async () => {
      const customExpiry = 1800; // 30 minutes
      const { accessToken, refreshToken } = await jwtService.generateTokenPair(
        testUser,
        {
          expiryOverride: customExpiry,
        }
      );

      const accessDecoded = jwt.decode(accessToken) as JWTPayloadType;
      const refreshDecoded = jwt.decode(refreshToken) as RefreshJWTPayloadType;

      expect(accessDecoded.exp - accessDecoded.iat).toBe(customExpiry);
      expect(refreshDecoded.exp - refreshDecoded.iat).toBe(customExpiry);
    });
  });

  describe("utility methods", () => {
    describe("extractUserIdFromToken", () => {
      it("should extract user ID from valid token", async () => {
        const token = await jwtService.generateAccessToken(testUser);
        const userId = jwtService.extractUserIdFromToken(token);

        expect(userId).toBe(testUser.id);
      });

      it("should return null for invalid token", () => {
        const userId = jwtService.extractUserIdFromToken("invalid.token");
        expect(userId).toBeNull();
      });

      it("should extract user ID from refresh token", async () => {
        const token = await jwtService.generateRefreshToken(testUser);
        const userId = jwtService.extractUserIdFromToken(token);

        expect(userId).toBe(testUser.id);
      });
    });

    describe("isTokenExpired", () => {
      it("should return false for valid non-expired token", async () => {
        const token = await jwtService.generateAccessToken(testUser);
        const isExpired = jwtService.isTokenExpired(token);

        expect(isExpired).toBe(false);
      });

      it("should return true for expired token", () => {
        const expiredToken = jwt.sign(
          {
            userId: testUser.id,
            exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
          },
          process.env.JWT_ACCESS_SECRET!
        );

        const isExpired = jwtService.isTokenExpired(expiredToken);
        expect(isExpired).toBe(true);
      });

      it("should return true for invalid token", () => {
        const isExpired = jwtService.isTokenExpired("invalid.token");
        expect(isExpired).toBe(true);
      });
    });

    describe("getTokenExpiry", () => {
      it("should return correct expiry date", async () => {
        const beforeGeneration = new Date();
        const token = await jwtService.generateAccessToken(testUser);
        const expiry = jwtService.getTokenExpiry(token);

        expect(expiry).toBeInstanceOf(Date);
        expect(expiry!.getTime()).toBeGreaterThan(beforeGeneration.getTime());
      });

      it("should return null for invalid token", () => {
        const expiry = jwtService.getTokenExpiry("invalid.token");
        expect(expiry).toBeNull();
      });
    });

    describe("getTokenRemainingTime", () => {
      it("should return remaining time in seconds", async () => {
        const token = await jwtService.generateAccessToken(testUser);
        const remaining = jwtService.getTokenRemainingTime(token);

        expect(remaining).toBeGreaterThan(0);
        expect(remaining).toBeLessThanOrEqual(15 * 60); // Should be <= 15 minutes
      });

      it("should return 0 for expired token", () => {
        const expiredToken = jwt.sign(
          {
            userId: testUser.id,
            exp: Math.floor(Date.now() / 1000) - 3600,
          },
          process.env.JWT_ACCESS_SECRET!
        );

        const remaining = jwtService.getTokenRemainingTime(expiredToken);
        expect(remaining).toBe(0);
      });

      it("should return 0 for invalid token", () => {
        const remaining = jwtService.getTokenRemainingTime("invalid.token");
        expect(remaining).toBe(0);
      });
    });
  });

  describe("error handling", () => {
    it("should throw UnauthenticatedError for malformed tokens", async () => {
      await expect(jwtService.verifyAccessToken("not.a.jwt")).rejects.toThrow(
        UnauthenticatedError
      );
    });

    it("should throw UnauthenticatedError for tokens with invalid signatures", async () => {
      const token = jwt.sign({ userId: testUser.id }, "wrong-secret");

      await expect(jwtService.verifyAccessToken(token)).rejects.toThrow(
        UnauthenticatedError
      );
    });

    it("should include cause in error details", async () => {
      try {
        await jwtService.verifyAccessToken("invalid.token");
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthenticatedError);
        expect((error as UnauthenticatedError).cause).toBeDefined();
      }
    });
  });

  describe("integration scenarios", () => {
    it("should handle token rotation scenario", async () => {
      // Generate initial token pair
      const { accessToken: oldAccessToken, refreshToken } =
        await jwtService.generateTokenPair(testUser);

      // Verify initial tokens work
      await expect(
        jwtService.verifyAccessToken(oldAccessToken)
      ).resolves.toBeDefined();
      await expect(
        jwtService.verifyRefreshToken(refreshToken)
      ).resolves.toBeDefined();

      // Simulate token rotation - generate new access token
      const newAccessToken = await jwtService.generateAccessToken(testUser);

      // Both old and new access tokens should be valid (until old expires)
      await expect(
        jwtService.verifyAccessToken(oldAccessToken)
      ).resolves.toBeDefined();
      await expect(
        jwtService.verifyAccessToken(newAccessToken)
      ).resolves.toBeDefined();

      // Refresh token should still be valid
      await expect(
        jwtService.verifyRefreshToken(refreshToken)
      ).resolves.toBeDefined();
    });

    it("should handle different user roles correctly", async () => {
      const studentTokens = await jwtService.generateTokenPair(testUser);
      const adminTokens = await jwtService.generateTokenPair(adminUser);

      const studentPayload = await jwtService.verifyAccessToken(
        studentTokens.accessToken
      );
      const adminPayload = await jwtService.verifyAccessToken(
        adminTokens.accessToken
      );

      expect(studentPayload.role).toBe("student");
      expect(adminPayload.role).toBe("admin");
      expect(studentPayload.userId).not.toBe(adminPayload.userId);
    });

    it("should maintain token independence", async () => {
      const tokens1 = await jwtService.generateTokenPair(testUser);
      // Add small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const tokens2 = await jwtService.generateTokenPair(testUser);

      // All tokens should be different
      expect(tokens1.accessToken).not.toBe(tokens2.accessToken);
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);

      // But all should be valid for the same user
      const payload1 = await jwtService.verifyAccessToken(tokens1.accessToken);
      const payload2 = await jwtService.verifyAccessToken(tokens2.accessToken);

      expect(payload1.userId).toBe(payload2.userId);
      expect(payload1.email).toBe(payload2.email);
    });
  });
});
