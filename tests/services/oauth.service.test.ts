import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OAuthService } from "@/services/oauth.service";

vi.mock("@/env", () => ({
  env: {
    GOOGLE_CLIENT_ID: "google_client_id",
    GOOGLE_CLIENT_SECRET: "google_client_secret",
    GOOGLE_REDIRECT_URI: "http://localhost:3000/auth/google/callback",
    GITHUB_CLIENT_ID: "github_client_id",
    GITHUB_CLIENT_SECRET: "github_client_secret",
    GITHUB_REDIRECT_URI: "http://localhost:3000/auth/github/callback",
    LINKEDIN_CLIENT_ID: "linkedin_client_id",
    LINKEDIN_CLIENT_SECRET: "linkedin_client_secret",
    LINKEDIN_REDIRECT_URI: "http://localhost:3000/auth/linkedin/callback",
  },
}));

global.fetch = vi.fn();

describe("OAuthService", () => {
  let oauthService: OAuthService;
  const mockFetch = global.fetch as any;

  beforeEach(() => {
    oauthService = new OAuthService();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Provider Availability", () => {
    it("should identify enabled providers correctly", () => {
      expect(oauthService.isProviderEnabled("google")).toBe(true);
      expect(oauthService.isProviderEnabled("github")).toBe(true);
      expect(oauthService.isProviderEnabled("linkedin")).toBe(true);
    });

    it("should return all enabled providers", () => {
      const enabledProviders = oauthService.getEnabledProviders();
      expect(enabledProviders).toEqual(["google", "github", "linkedin"]);
    });
  });

  describe("Authorization URL Generation", () => {
    it("should generate Google authorization URL correctly", () => {
      const result = oauthService.generateAuthorizationUrl("google");

      expect(result.url).toContain(
        "https://accounts.google.com/o/oauth2/v2/auth",
      );
      expect(result.url).toContain("client_id=google_client_id");
      expect(result.url).toContain(
        "redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fgoogle%2Fcallback",
      );
      expect(result.url).toContain("scope=openid");
      expect(result.url).toContain("response_type=code");
      expect(result.url).toContain("access_type=offline");
      expect(result.url).toContain("prompt=consent");
      expect(result.state).toBeTruthy();
    });

    it("should generate GitHub authorization URL correctly", () => {
      const result = oauthService.generateAuthorizationUrl("github");

      expect(result.url).toContain("https://github.com/login/oauth/authorize");
      expect(result.url).toContain("client_id=github_client_id");
      expect(result.url).toContain(
        "redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fgithub%2Fcallback",
      );
      expect(result.url).toContain("scope=user%3Aemail");
      expect(result.url).toContain("allow_signup=true");
      expect(result.state).toBeTruthy();
    });

    it("should generate LinkedIn authorization URL correctly", () => {
      const result = oauthService.generateAuthorizationUrl("linkedin");

      expect(result.url).toContain(
        "https://www.linkedin.com/oauth/v2/authorization",
      );
      expect(result.url).toContain("client_id=linkedin_client_id");
      expect(result.url).toContain(
        "redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Flinkedin%2Fcallback",
      );
      expect(result.url).toContain("scope=openid");
      expect(result.url).toContain("response_type=code");
      expect(result.state).toBeTruthy();
    });

    it("should include redirectTo in state when provided", () => {
      const redirectTo = "http://localhost:3001/dashboard";
      const result = oauthService.generateAuthorizationUrl(
        "google",
        redirectTo,
      );

      const stateData = oauthService.validateState(result.state);
      expect(stateData.redirectTo).toBe(redirectTo);
    });

    it("should throw error for disabled provider", async () => {
      vi.resetModules();
      vi.doMock("@/env", () => ({
        env: {
          GOOGLE_CLIENT_ID: "",
          GOOGLE_CLIENT_SECRET: "",
          GOOGLE_REDIRECT_URI: "",
          GITHUB_CLIENT_ID: "github_client_id",
          GITHUB_CLIENT_SECRET: "github_client_secret",
          GITHUB_REDIRECT_URI: "http://localhost:3000/auth/github/callback",
          LINKEDIN_CLIENT_ID: "linkedin_client_id",
          LINKEDIN_CLIENT_SECRET: "linkedin_client_secret",
          LINKEDIN_REDIRECT_URI: "http://localhost:3000/auth/linkedin/callback",
        },
      }));

      const { OAuthService: MockOAuthService } = await import(
        "@/services/oauth.service"
      );
      const mockServiceWithoutGoogle = new MockOAuthService();

      expect(() => {
        mockServiceWithoutGoogle.generateAuthorizationUrl("google");
      }).toThrow("OAuth provider 'google' is not enabled");
    });
  });

  describe("State Validation", () => {
    it("should validate valid state correctly", () => {
      const result = oauthService.generateAuthorizationUrl("google");
      const stateData = oauthService.validateState(result.state);

      expect(stateData.provider).toBe("google");
      expect(stateData.timestamp).toBeTruthy();
      expect(stateData.nonce).toBeTruthy();
    });

    it("should throw error for expired state", () => {
      vi.setSystemTime(new Date("2023-01-01T00:00:00Z"));
      const result = oauthService.generateAuthorizationUrl("google");

      vi.setSystemTime(new Date("2023-01-01T00:15:00Z"));

      expect(() => {
        oauthService.validateState(result.state);
      }).toThrow("State has expired");
    });

    it("should throw error for invalid state format", () => {
      expect(() => {
        oauthService.validateState("invalid_state");
      }).toThrow("Invalid state parameter");
    });

    it("should throw error for tampered state", () => {
      const tamperedState = Buffer.from("invalid json").toString("base64url");

      expect(() => {
        oauthService.validateState(tamperedState);
      }).toThrow("Invalid state parameter");
    });
  });

  describe("Google OAuth Flow", () => {
    const mockGoogleTokenResponse = {
      access_token: "google_access_token",
      token_type: "Bearer",
      expires_in: 3600,
    };

    const mockGoogleUserInfo = {
      sub: "google_user_id",
      email: "user@example.com",
      name: "John Doe",
      given_name: "John",
      family_name: "Doe",
      picture: "https://example.com/avatar.jpg",
    };

    it("should handle Google OAuth callback successfully", async () => {
      const authUrl = oauthService.generateAuthorizationUrl("google");

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGoogleTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGoogleUserInfo),
        });

      const userInfo = await oauthService.handleCallback(
        "google",
        "auth_code",
        authUrl.state,
      );

      expect(userInfo).toEqual({
        id: "google_user_id",
        email: "user@example.com",
        name: "John Doe",
        firstName: "John",
        lastName: "Doe",
        picture: "https://example.com/avatar.jpg",
        provider: "google",
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        "https://oauth2.googleapis.com/token",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }),
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "https://openidconnect.googleapis.com/v1/userinfo",
        expect.objectContaining({
          headers: { Authorization: "Bearer google_access_token" },
        }),
      );
    });

    it("should handle Google token exchange failure", async () => {
      const authUrl = oauthService.generateAuthorizationUrl("google");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Invalid grant"),
      });

      await expect(
        oauthService.handleCallback("google", "invalid_code", authUrl.state),
      ).rejects.toThrow("Google token exchange failed: 400 Invalid grant");
    });

    it("should handle Google user info fetch failure", async () => {
      const authUrl = oauthService.generateAuthorizationUrl("google");

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGoogleTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: () => Promise.resolve("Unauthorized"),
        });

      await expect(
        oauthService.handleCallback("google", "auth_code", authUrl.state),
      ).rejects.toThrow("Google user info fetch failed: 401 Unauthorized");
    });
  });

  describe("GitHub OAuth Flow", () => {
    const mockGitHubTokenResponse = {
      access_token: "github_access_token",
      token_type: "bearer",
      scope: "user:email",
    };

    const mockGitHubUserInfo = {
      id: 12345,
      login: "johndoe",
      name: "John Doe",
      avatar_url: "https://avatars.githubusercontent.com/u/12345",
    };

    const mockGitHubEmails = [
      {
        email: "user@example.com",
        primary: true,
        verified: true,
      },
    ];

    it("should handle GitHub OAuth callback successfully", async () => {
      const authUrl = oauthService.generateAuthorizationUrl("github");

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGitHubTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGitHubUserInfo),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGitHubEmails),
        });

      const userInfo = await oauthService.handleCallback(
        "github",
        "auth_code",
        authUrl.state,
      );

      expect(userInfo).toEqual({
        id: "12345",
        email: "user@example.com",
        name: "John Doe",
        firstName: "John",
        lastName: "Doe",
        picture: "https://avatars.githubusercontent.com/u/12345",
        provider: "github",
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should handle GitHub user with no full name", async () => {
      const authUrl = oauthService.generateAuthorizationUrl("github");

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGitHubTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockGitHubUserInfo,
              name: null,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGitHubEmails),
        });

      const userInfo = await oauthService.handleCallback(
        "github",
        "auth_code",
        authUrl.state,
      );

      expect(userInfo.name).toBe("johndoe");
      expect(userInfo.firstName).toBe("johndoe");
      expect(userInfo.lastName).toBeUndefined();
    });

    it("should throw error when no verified primary email", async () => {
      const authUrl = oauthService.generateAuthorizationUrl("github");

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGitHubTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGitHubUserInfo),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                email: "user@example.com",
                primary: false,
                verified: true,
              },
            ]),
        });

      await expect(
        oauthService.handleCallback("github", "auth_code", authUrl.state),
      ).rejects.toThrow("No verified primary email found in GitHub account");
    });
  });

  describe("LinkedIn OAuth Flow", () => {
    const mockLinkedInTokenResponse = {
      access_token: "linkedin_access_token",
      token_type: "Bearer",
      expires_in: 5184000,
    };

    const mockLinkedInUserInfo = {
      sub: "linkedin_user_id",
      email: "user@example.com",
      name: "John Doe",
      given_name: "John",
      family_name: "Doe",
      picture: "https://media.licdn.com/dms/image/photo.jpg",
    };

    it("should handle LinkedIn OAuth callback successfully", async () => {
      const authUrl = oauthService.generateAuthorizationUrl("linkedin");

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockLinkedInTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockLinkedInUserInfo),
        });

      const userInfo = await oauthService.handleCallback(
        "linkedin",
        "auth_code",
        authUrl.state,
      );

      expect(userInfo).toEqual({
        id: "linkedin_user_id",
        email: "user@example.com",
        name: "John Doe",
        firstName: "John",
        lastName: "Doe",
        picture: "https://media.licdn.com/dms/image/photo.jpg",
        provider: "linkedin",
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        "https://www.linkedin.com/oauth/v2/accessToken",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }),
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "https://api.linkedin.com/v2/userinfo",
        expect.objectContaining({
          headers: { Authorization: "Bearer linkedin_access_token" },
        }),
      );
    });
  });

  describe("Callback Error Handling", () => {
    it("should throw error for provider mismatch in state", async () => {
      const authUrl = oauthService.generateAuthorizationUrl("google");

      await expect(
        oauthService.handleCallback("github", "auth_code", authUrl.state),
      ).rejects.toThrow("State provider mismatch");
    });

    it("should throw error for disabled provider in callback", async () => {
      vi.resetModules();
      vi.doMock("@/env", () => ({
        env: {
          GOOGLE_CLIENT_ID: "",
          GOOGLE_CLIENT_SECRET: "",
          GOOGLE_REDIRECT_URI: "",
          GITHUB_CLIENT_ID: "github_client_id",
          GITHUB_CLIENT_SECRET: "github_client_secret",
          GITHUB_REDIRECT_URI: "http://localhost:3000/auth/github/callback",
          LINKEDIN_CLIENT_ID: "linkedin_client_id",
          LINKEDIN_CLIENT_SECRET: "linkedin_client_secret",
          LINKEDIN_REDIRECT_URI: "http://localhost:3000/auth/linkedin/callback",
        },
      }));

      const { OAuthService: MockOAuthService } = await import(
        "@/services/oauth.service"
      );
      const disabledService = new MockOAuthService();

      // Generate a valid state to avoid state validation errors before the provider check
      const validState = Buffer.from(
        JSON.stringify({
          provider: "google",
          timestamp: Date.now(),
          nonce: "test-nonce",
        }),
      ).toString("base64url");

      await expect(
        disabledService.handleCallback("google", "code", validState),
      ).rejects.toThrow("OAuth provider 'google' is not enabled");
    });
  });

  describe("Provider Configuration Validation", () => {
    it("should validate OAuth config schema", () => {
      expect(() => new OAuthService()).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle network errors gracefully", async () => {
      const authUrl = oauthService.generateAuthorizationUrl("google");

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        oauthService.handleCallback("google", "auth_code", authUrl.state),
      ).rejects.toThrow("Network error");
    });

    it("should handle invalid JSON responses", async () => {
      const authUrl = oauthService.generateAuthorizationUrl("google");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      await expect(
        oauthService.handleCallback("google", "auth_code", authUrl.state),
      ).rejects.toThrow("Invalid JSON");
    });
  });
});
