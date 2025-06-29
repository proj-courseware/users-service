import crypto from "node:crypto";
import { env } from "@/env";
import { BaseService } from "@/events/base.service";
import type {
  OAuthProvider,
  OAuthUserInfo,
  OAuthState,
  OAuthConfig,
  OAuthTokenResponse,
  OAuthAuthorizationURL,
} from "@/schemas/oauth.schema";
import {
  oauthStateSchema,
  oauthUserInfoSchema,
  oauthConfigSchema,
} from "@/schemas/oauth.schema";

export interface IOAuthProvider {
  getAuthorizationUrl(state: string): string;
  exchangeCodeForToken(code: string): Promise<OAuthTokenResponse>;
  getUserInfo(accessToken: string): Promise<OAuthUserInfo>;
}

export interface IOAuthService {
  generateAuthorizationUrl(
    provider: OAuthProvider,
    redirectTo?: string,
  ): OAuthAuthorizationURL;
  handleCallback(
    provider: OAuthProvider,
    code: string,
    state: string,
  ): Promise<OAuthUserInfo>;
  validateState(stateString: string): OAuthState;
  isProviderEnabled(provider: OAuthProvider): boolean;
  getEnabledProviders(): OAuthProvider[];
}

class GoogleOAuthProvider implements IOAuthProvider {
  private config: OAuthConfig;

  constructor() {
    this.config = oauthConfigSchema.parse({
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
      redirectUri: env.GOOGLE_REDIRECT_URI!,
      scope: "openid email profile",
    });
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scope,
      state,
      access_type: "offline",
      prompt: "consent",
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<OAuthTokenResponse> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Google token exchange failed: ${response.status} ${errorText}`,
      );
    }

    return response.json();
  }

  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    const response = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Google user info fetch failed: ${response.status} ${errorText}`,
      );
    }

    const data = await response.json();

    return oauthUserInfoSchema.parse({
      id: data.sub,
      email: data.email,
      name: data.name,
      firstName: data.given_name,
      lastName: data.family_name,
      picture: data.picture,
      provider: "google" as const,
    });
  }
}

class GitHubOAuthProvider implements IOAuthProvider {
  private config: OAuthConfig;

  constructor() {
    this.config = oauthConfigSchema.parse({
      clientId: env.GITHUB_CLIENT_ID!,
      clientSecret: env.GITHUB_CLIENT_SECRET!,
      redirectUri: env.GITHUB_REDIRECT_URI!,
      scope: "user:email read:user",
    });
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scope,
      state,
      allow_signup: "true",
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<OAuthTokenResponse> {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GitHub token exchange failed: ${response.status} ${errorText}`,
      );
    }

    return response.json();
  }

  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    const [userResponse, emailsResponse] = await Promise.all([
      fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }),
      fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }),
    ]);

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      throw new Error(
        `GitHub user info fetch failed: ${userResponse.status} ${errorText}`,
      );
    }

    if (!emailsResponse.ok) {
      const errorText = await emailsResponse.text();
      throw new Error(
        `GitHub emails fetch failed: ${emailsResponse.status} ${errorText}`,
      );
    }

    const userData = await userResponse.json();
    const emailsData = await emailsResponse.json();

    const primaryEmail = emailsData.find(
      (email: any) => email.primary && email.verified,
    );

    if (!primaryEmail) {
      throw new Error("No verified primary email found in GitHub account");
    }

    const nameParts = userData.name?.split(" ") || [];
    const firstName = nameParts[0] || userData.login;
    const lastName = nameParts.slice(1).join(" ") || "";

    return oauthUserInfoSchema.parse({
      id: userData.id.toString(),
      email: primaryEmail.email,
      name: userData.name || userData.login,
      firstName,
      lastName: lastName || undefined,
      picture: userData.avatar_url,
      provider: "github" as const,
    });
  }
}

class LinkedInOAuthProvider implements IOAuthProvider {
  private config: OAuthConfig;

  constructor() {
    this.config = oauthConfigSchema.parse({
      clientId: env.LINKEDIN_CLIENT_ID!,
      clientSecret: env.LINKEDIN_CLIENT_SECRET!,
      redirectUri: env.LINKEDIN_REDIRECT_URI!,
      scope: "openid profile email",
    });
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state,
      scope: this.config.scope,
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<OAuthTokenResponse> {
    const response = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `LinkedIn token exchange failed: ${response.status} ${errorText}`,
      );
    }

    return response.json();
  }

  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    const response = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `LinkedIn user info fetch failed: ${response.status} ${errorText}`,
      );
    }

    const data = await response.json();

    return oauthUserInfoSchema.parse({
      id: data.sub,
      email: data.email,
      name: data.name,
      firstName: data.given_name,
      lastName: data.family_name,
      picture: data.picture,
      provider: "linkedin" as const,
    });
  }
}

export class OAuthService extends BaseService implements IOAuthService {
  private providers: Map<OAuthProvider, IOAuthProvider>;

  constructor() {
    super("oauth");
    this.providers = new Map();

    if (this.isProviderEnabled("google")) {
      this.providers.set("google", new GoogleOAuthProvider());
    }

    if (this.isProviderEnabled("github")) {
      this.providers.set("github", new GitHubOAuthProvider());
    }

    if (this.isProviderEnabled("linkedin")) {
      this.providers.set("linkedin", new LinkedInOAuthProvider());
    }
  }

  generateAuthorizationUrl(
    provider: OAuthProvider,
    redirectTo?: string,
  ): OAuthAuthorizationURL {
    const oauthProvider = this.providers.get(provider);
    if (!oauthProvider) {
      throw new Error(`OAuth provider '${provider}' is not enabled`);
    }

    const state: OAuthState = {
      provider,
      redirectTo,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString("hex"),
    };

    const stateString = Buffer.from(JSON.stringify(state)).toString("base64url");
    const url = oauthProvider.getAuthorizationUrl(stateString);

    return {
      url,
      state: stateString,
    };
  }

  async handleCallback(
    provider: OAuthProvider,
    code: string,
    state: string,
  ): Promise<OAuthUserInfo> {
    const oauthProvider = this.providers.get(provider);
    if (!oauthProvider) {
      throw new Error(`OAuth provider '${provider}' is not enabled`);
    }

    const stateData = this.validateState(state);

    if (stateData.provider !== provider) {
      throw new Error("State provider mismatch");
    }

    const tokenResponse = await oauthProvider.exchangeCodeForToken(code);
    const userInfo = await oauthProvider.getUserInfo(tokenResponse.access_token);

    return userInfo;
  }

  // Event emission methods for OAuth controllers to use
  emitOAuthLogin(userInfo: OAuthUserInfo, userId: string, isNewUser: boolean) {
    this.emitEvent("oauth_login", {
      userId,
      provider: userInfo.provider,
      providerUserId: userInfo.id,
      email: userInfo.email,
      isNewUser,
    }, {
      user: { userId, email: userInfo.email }
    });
  }

  emitAccountLinked(userInfo: OAuthUserInfo, userId: string) {
    this.emitEvent("oauth_account_linked", {
      userId,
      provider: userInfo.provider,
      providerUserId: userInfo.id,
      email: userInfo.email,
    }, {
      user: { userId, email: userInfo.email }
    });
  }

  emitAccountUnlinked(provider: OAuthProvider, providerUserId: string, userId: string, email: string) {
    this.emitEvent("oauth_account_unlinked", {
      userId,
      provider,
      providerUserId,
      email,
    }, {
      user: { userId, email }
    });
  }

  validateState(stateString: string): OAuthState {
    try {
      const decoded = Buffer.from(stateString, "base64url").toString("utf-8");
      const stateData = JSON.parse(decoded);
      const validatedState = oauthStateSchema.parse(stateData);

      const maxAge = 10 * 60 * 1000;
      if (Date.now() - validatedState.timestamp > maxAge) {
        throw new Error("State has expired");
      }

      return validatedState;
    } catch (error) {
      throw new Error(
        `Invalid state parameter: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  isProviderEnabled(provider: OAuthProvider): boolean {
    switch (provider) {
      case "google":
        return !!(
          env.GOOGLE_CLIENT_ID &&
          env.GOOGLE_CLIENT_SECRET &&
          env.GOOGLE_REDIRECT_URI
        );
      case "github":
        return !!(
          env.GITHUB_CLIENT_ID &&
          env.GITHUB_CLIENT_SECRET &&
          env.GITHUB_REDIRECT_URI
        );
      case "linkedin":
        return !!(
          env.LINKEDIN_CLIENT_ID &&
          env.LINKEDIN_CLIENT_SECRET &&
          env.LINKEDIN_REDIRECT_URI
        );
      default:
        return false;
    }
  }

  getEnabledProviders(): OAuthProvider[] {
    const allProviders: OAuthProvider[] = ["google", "github", "linkedin"];
    return allProviders.filter((provider) => this.isProviderEnabled(provider));
  }
}