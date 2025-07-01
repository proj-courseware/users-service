import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { AppEnv } from "@/schemas/app-env.schema";
import { OAuthController } from "@/controllers/oauth.controller";
import { createOAuthRouter } from "@/routes/oauth.router";
import { createAuthMiddleware } from "@/middlewares/auth.middleware";
import { globalErrorHandler } from "@/errors";
import type { IUserRepository } from "@/repositories/user.repository";
import type { IJWTService } from "@/services/jwt.service";
import type { IOAuthService } from "@/services/oauth.service";
import type { IAuthenticationService } from "@/services/authentication.service";
import type { UserType } from "@/schemas/user.schema";
import {
  ValidationError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "@/errors";

describe("OAuthController", () => {
  let controller: OAuthController;
  let app: Hono<AppEnv>;
  let mockUserRepository: IUserRepository;
  let mockJwtService: IJWTService;
  let mockOAuthService: IOAuthService;
  let mockAuthService: IAuthenticationService;

  const mockUser: UserType = {
    id: "user123",
    firstName: "John",
    lastName: "Doe",
    primaryEmail: "john@example.com",
    emails: [
      {
        emailAddress: "john@example.com",
        isVerified: true,
        addedAt: new Date(),
      },
    ],
    passwordHash: "hashed_password",
    globalRole: "student",
    socialIdentities: [],
    isAccountLocked: false,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOAuthUserInfo = {
    id: "google123",
    email: "john@example.com",
    name: "John Doe",
    firstName: "John",
    lastName: "Doe",
    picture: "https://example.com/avatar.jpg",
    provider: "google" as const,
  };

  // Helper function to create a custom OAuth router with mocked auth middleware
  function createTestOAuthRouter(oauthController: OAuthController) {
    const router = new Hono<AppEnv>();
    const mockAuthMiddleware = createAuthMiddleware({
      authenticationService: mockAuthService,
    });

    router.get("/providers", async (c) => {
      return oauthController.getEnabledProviders(c);
    });

    router.get("/:provider", async (c) => {
      return oauthController.initiateOAuth(c);
    });

    router.get("/:provider/callback", async (c) => {
      return oauthController.handleOAuthCallback(c);
    });

    router.delete("/:provider", mockAuthMiddleware, async (c) => {
      return oauthController.unlinkOAuthProvider(c);
    });

    router.onError(globalErrorHandler);
    return router;
  }

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      linkSocialIdentity: vi.fn(),
      unlinkSocialIdentity: vi.fn(),
    } as any;

    mockJwtService = {
      generateTokenPair: vi.fn(),
    } as any;

    mockOAuthService = {
      isProviderEnabled: vi.fn(),
      generateAuthorizationUrl: vi.fn(),
      handleCallback: vi.fn(),
      validateState: vi.fn(),
      getEnabledProviders: vi.fn(),
    } as any;

    mockAuthService = {
      authenticateUserByToken: vi.fn(),
    } as any;

    controller = new OAuthController(
      mockUserRepository,
      mockJwtService,
      mockOAuthService,
      mockAuthService,
    );

    app = new Hono<AppEnv>();
    app.route("/oauth", createTestOAuthRouter(controller));
    app.onError(globalErrorHandler);
  });

  describe("GET /oauth/providers", () => {
    it("should return enabled OAuth providers", async () => {
      vi.mocked(mockOAuthService.getEnabledProviders).mockReturnValue([
        "google",
        "github",
      ]);

      const res = await app.request("/oauth/providers");
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.providers).toHaveLength(2);
      expect(data.providers[0]).toEqual({
        name: "google",
        displayName: "Google",
        authUrl: "/auth/oauth/google",
      });
      expect(data.providers[1]).toEqual({
        name: "github",
        displayName: "GitHub",
        authUrl: "/auth/oauth/github",
      });
      expect(data.count).toBe(2);
    });

    it("should return empty array when no providers enabled", async () => {
      vi.mocked(mockOAuthService.getEnabledProviders).mockReturnValue([]);

      const res = await app.request("/oauth/providers");
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.providers).toHaveLength(0);
      expect(data.count).toBe(0);
    });
  });

  describe("GET /oauth/:provider", () => {
    it("should redirect to OAuth provider authorization URL", async () => {
      vi.mocked(mockOAuthService.isProviderEnabled).mockReturnValue(true);
      vi.mocked(mockOAuthService.generateAuthorizationUrl).mockReturnValue({
        url: "https://accounts.google.com/oauth/authorize?client_id=123",
        state: "encoded_state",
      });

      const res = await app.request("/oauth/google");

      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe(
        "https://accounts.google.com/oauth/authorize?client_id=123",
      );
      expect(mockOAuthService.generateAuthorizationUrl).toHaveBeenCalledWith(
        "google",
        undefined,
      );
    });

    it("should include redirectTo in authorization URL", async () => {
      vi.mocked(mockOAuthService.isProviderEnabled).mockReturnValue(true);
      vi.mocked(mockOAuthService.generateAuthorizationUrl).mockReturnValue({
        url: "https://accounts.google.com/oauth/authorize?client_id=123",
        state: "encoded_state",
      });

      const redirectTo = "http://localhost:3001/dashboard";
      const res = await app.request(
        `/oauth/google?redirectTo=${encodeURIComponent(redirectTo)}`,
      );

      expect(res.status).toBe(302);
      expect(mockOAuthService.generateAuthorizationUrl).toHaveBeenCalledWith(
        "google",
        redirectTo,
      );
    });

    it("should return 404 for disabled provider", async () => {
      vi.mocked(mockOAuthService.isProviderEnabled).mockReturnValue(false);

      const res = await app.request("/oauth/google");

      expect(res.status).toBe(404);
    });

    it("should return 400 for invalid provider", async () => {
      const res = await app.request("/oauth/invalid");

      expect(res.status).toBe(400);
    });
  });

  describe("GET /oauth/:provider/callback", () => {
    const mockState = "encoded_state";
    const mockCode = "auth_code";

    beforeEach(() => {
      vi.mocked(mockOAuthService.isProviderEnabled).mockReturnValue(true);
      vi.mocked(mockOAuthService.handleCallback).mockResolvedValue(
        mockOAuthUserInfo,
      );
      vi.mocked(mockOAuthService.validateState).mockReturnValue({
        provider: "google",
        timestamp: Date.now(),
        nonce: "random_nonce",
        redirectTo: undefined,
      });
      vi.mocked(mockJwtService.generateTokenPair).mockResolvedValue({
        accessToken: "access_token",
        refreshToken: "refresh_token",
      });
    });

    it("should handle OAuth callback for existing user", async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(mockUser);

      const res = await app.request(
        `/oauth/google/callback?code=${mockCode}&state=${mockState}`,
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe("OAuth authentication successful");
      expect(data.tokens.accessToken).toBe("access_token");
      expect(data.tokens.refreshToken).toBe("refresh_token");
      expect(data.user.id).toBe("user123");
      expect(data.user.provider).toBe("google");
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        "john@example.com",
      );
    });

    it("should link social identity for existing user without it", async () => {
      const userWithoutSocial = { ...mockUser, socialIdentities: [] };
      const userWithSocial = {
        ...mockUser,
        socialIdentities: [
          {
            provider: "google",
            providerId: "google123",
            email: "john@example.com",
            displayName: "John Doe",
            profileUrl: "https://example.com/avatar.jpg",
          },
        ],
      };

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(
        userWithoutSocial,
      );
      vi.mocked(mockUserRepository.linkSocialIdentity).mockResolvedValue(
        userWithSocial,
      );

      const res = await app.request(
        `/oauth/google/callback?code=${mockCode}&state=${mockState}`,
      );

      expect(res.status).toBe(200);
      expect(mockUserRepository.linkSocialIdentity).toHaveBeenCalledWith(
        "user123",
        {
          provider: "google",
          providerId: "google123",
          email: "john@example.com",
          displayName: "John Doe",
          profileUrl: "https://example.com/avatar.jpg",
        },
      );
    });

    it("should create new user for OAuth-only registration", async () => {
      const newUser = { ...mockUser, id: "newuser123" };

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockUserRepository.create).mockResolvedValue(newUser);

      const res = await app.request(
        `/oauth/google/callback?code=${mockCode}&state=${mockState}`,
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.user.id).toBe("newuser123");
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        primaryEmail: "john@example.com",
        emails: [
          {
            emailAddress: "john@example.com",
            isVerified: true,
            addedAt: expect.any(Date),
          },
        ],
        globalRole: "student",
        failedLoginAttempts: 0,
        isAccountLocked: false,
        socialIdentities: [
          {
            provider: "google",
            providerUserId: "google123",
            email: "john@example.com",
            name: "John Doe",
            linkedAt: expect.any(Date),
          },
        ],
      });
    });

    it("should handle OAuth callback with redirectTo", async () => {
      const redirectTo = "http://localhost:3001/dashboard";
      vi.mocked(mockOAuthService.validateState).mockReturnValue({
        provider: "google",
        timestamp: Date.now(),
        nonce: "random_nonce",
        redirectTo,
      });
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(mockUser);

      const res = await app.request(
        `/oauth/google/callback?code=${mockCode}&state=${mockState}`,
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.redirectTo).toBe(redirectTo);
    });

    it("should return 409 for provider ID mismatch", async () => {
      const userWithDifferentSocial = {
        ...mockUser,
        socialIdentities: [
          {
            provider: "google",
            providerId: "different_id",
            email: "john@example.com",
            displayName: "John Doe",
          },
        ],
      };

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(
        userWithDifferentSocial,
      );

      const res = await app.request(
        `/oauth/google/callback?code=${mockCode}&state=${mockState}`,
      );

      expect(res.status).toBe(409);
    });

    it("should return 401 for OAuth error", async () => {
      const res = await app.request(
        `/oauth/google/callback?error=access_denied&error_description=User denied access&state=${mockState}`,
      );

      expect(res.status).toBe(401);
    });

    it("should return 404 for disabled provider", async () => {
      vi.mocked(mockOAuthService.isProviderEnabled).mockReturnValue(false);

      const res = await app.request(
        `/oauth/google/callback?code=${mockCode}&state=${mockState}`,
      );

      expect(res.status).toBe(404);
    });

    it("should return 400 for missing code", async () => {
      const res = await app.request(
        `/oauth/google/callback?state=${mockState}`,
      );

      expect(res.status).toBe(400);
    });

    it("should return 400 for missing state", async () => {
      const res = await app.request(`/oauth/google/callback?code=${mockCode}`);

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /oauth/:provider", () => {
    const mockAuthenticatedUser = {
      userId: "user123",
      email: "john@example.com",
      globalRole: "student" as const,
    };

    beforeEach(() => {
      app.use("/oauth/:provider", async (c, next) => {
        c.set("user", mockAuthenticatedUser);
        await next();
      });
    });

    it("should unlink OAuth provider successfully", async () => {
      const userWithMultipleSocial = {
        ...mockUser,
        socialIdentities: [
          {
            provider: "google",
            providerUserId: "google123",
            email: "john@example.com",
            name: "John Doe",
            linkedAt: new Date(),
          },
          {
            provider: "github",
            providerUserId: "github456",
            email: "john@example.com",
            name: "John Doe",
            linkedAt: new Date(),
          },
        ],
      };

      // Mock authentication
      vi.mocked(mockAuthService.authenticateUserByToken).mockResolvedValue({
        userId: "user123",
        globalRole: "student",
      });

      vi.mocked(mockUserRepository.findById).mockResolvedValue(
        userWithMultipleSocial,
      );
      vi.mocked(mockUserRepository.unlinkSocialIdentity).mockResolvedValue(
        undefined,
      );

      const res = await app.request("/oauth/google", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer valid-token",
        },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe("Google account unlinked successfully");
      expect(data.provider).toBe("google");
      expect(mockUserRepository.unlinkSocialIdentity).toHaveBeenCalledWith(
        "user123",
        "google",
        "google123",
      );
    });

    it("should prevent unlinking the only authentication method", async () => {
      const userWithOnlySocial = {
        ...mockUser,
        passwordHash: null,
        socialIdentities: [
          {
            provider: "google",
            providerId: "google123",
            email: "john@example.com",
            displayName: "John Doe",
          },
        ],
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(
        userWithOnlySocial,
      );

      const res = await app.request("/oauth/google", { method: "DELETE" });

      expect(res.status).toBe(409);
    });

    it("should return 404 for non-linked provider", async () => {
      const userWithoutGoogle = {
        ...mockUser,
        socialIdentities: [
          {
            provider: "github",
            providerId: "github456",
            email: "john@example.com",
            displayName: "John Doe",
          },
        ],
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(
        userWithoutGoogle,
      );

      const res = await app.request("/oauth/google", { method: "DELETE" });

      expect(res.status).toBe(404);
    });

    it("should return 401 for unauthenticated request", async () => {
      const unauthenticatedApp = new Hono<AppEnv>();
      unauthenticatedApp.route("/oauth", createOAuthRouter(controller));

      const res = await unauthenticatedApp.request("/oauth/google", {
        method: "DELETE",
      });

      expect(res.status).toBe(401);
    });

    it("should return 404 for non-existent user", async () => {
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      const res = await app.request("/oauth/google", { method: "DELETE" });

      expect(res.status).toBe(404);
    });

    it("should return 400 for invalid provider", async () => {
      const res = await app.request("/oauth/invalid", { method: "DELETE" });

      expect(res.status).toBe(400);
    });
  });

  describe("Provider Display Names", () => {
    it("should return correct display names for all providers", async () => {
      vi.mocked(mockOAuthService.getEnabledProviders).mockReturnValue([
        "google",
        "github",
        "linkedin",
      ]);

      const res = await app.request("/oauth/providers");
      const data = await res.json();

      expect(data.providers).toEqual([
        {
          name: "google",
          displayName: "Google",
          authUrl: "/auth/oauth/google",
        },
        {
          name: "github",
          displayName: "GitHub",
          authUrl: "/auth/oauth/github",
        },
        {
          name: "linkedin",
          displayName: "LinkedIn",
          authUrl: "/auth/oauth/linkedin",
        },
      ]);
    });
  });

  describe("Error Handling", () => {
    it("should handle OAuth service errors", async () => {
      vi.mocked(mockOAuthService.isProviderEnabled).mockReturnValue(true);
      vi.mocked(mockOAuthService.handleCallback).mockRejectedValue(
        new Error("OAuth service error"),
      );

      const res = await app.request(
        "/oauth/google/callback?code=test&state=test",
      );

      expect(res.status).toBe(500);
    });

    it("should handle user repository errors", async () => {
      vi.mocked(mockOAuthService.isProviderEnabled).mockReturnValue(true);
      vi.mocked(mockOAuthService.handleCallback).mockResolvedValue(
        mockOAuthUserInfo,
      );
      vi.mocked(mockOAuthService.validateState).mockReturnValue({
        provider: "google",
        timestamp: Date.now(),
        nonce: "random_nonce",
      });
      vi.mocked(mockUserRepository.findByEmail).mockRejectedValue(
        new Error("Database error"),
      );

      const res = await app.request(
        "/oauth/google/callback?code=test&state=test",
      );

      expect(res.status).toBe(500);
    });
  });
});
