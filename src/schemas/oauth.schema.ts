import { z } from "zod";

export const oauthProviderSchema = z.enum(["google", "github", "linkedin"]);

export const oauthUserInfoSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  picture: z.string().url().optional(),
  provider: oauthProviderSchema,
});

export const oauthStateSchema = z.object({
  provider: oauthProviderSchema,
  redirectTo: z.string().url().optional(),
  timestamp: z.number(),
  nonce: z.string(),
});

export const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1, "Authorization code is required").optional(),
  state: z.string().min(1, "State parameter is required"),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const oauthConfigSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
  redirectUri: z.string().url("Redirect URI must be a valid URL"),
  scope: z.string().min(1, "Scope is required"),
});

export type OAuthProvider = z.infer<typeof oauthProviderSchema>;
export type OAuthUserInfo = z.infer<typeof oauthUserInfoSchema>;
export type OAuthState = z.infer<typeof oauthStateSchema>;
export type OAuthCallbackQuery = z.infer<typeof oauthCallbackQuerySchema>;
export type OAuthConfig = z.infer<typeof oauthConfigSchema>;

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface OAuthAuthorizationURL {
  url: string;
  state: string;
}
