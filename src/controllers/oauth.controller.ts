import type { Context } from "hono";
import { z } from "zod";
import type { AppEnv } from "@/schemas/app-env.schema";
import type { IUserRepository } from "@/repositories/user.repository";
import type { IJWTService } from "@/services/jwt.service";
import type { IOAuthService } from "@/services/oauth.service";
import type { IAuthenticationService } from "@/services/authentication.service";
import {
  oauthProviderSchema,
  oauthCallbackQuerySchema,
  type OAuthProvider,
} from "@/schemas/oauth.schema";
import type { AuthenticatedUserContextType } from "@/schemas/user.schemas";
import type { CreateUserType } from "@/schemas/user.schema";
import {
  BadRequestError,
  UserAlreadyExistsError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "@/errors";

const providerParamsSchema = z.object({
  provider: oauthProviderSchema,
});

const oauthLoginQuerySchema = z.object({
  redirectTo: z.string().url().optional(),
});

export interface IOAuthController {
  initiateOAuth(c: Context<AppEnv>): Promise<Response>;
  handleOAuthCallback(c: Context<AppEnv>): Promise<Response>;
  getEnabledProviders(c: Context<AppEnv>): Promise<Response>;
  unlinkOAuthProvider(c: Context<AppEnv>): Promise<Response>;
}

export class OAuthController implements IOAuthController {
  constructor(
    private userRepository: IUserRepository,
    private jwtService: IJWTService,
    private oauthService: IOAuthService,
    private authService: IAuthenticationService,
  ) {}

  async initiateOAuth(c: Context<AppEnv>): Promise<Response> {
    try {
      const { provider } = providerParamsSchema.parse(c.req.param());
      const query = oauthLoginQuerySchema.parse(c.req.query());

      if (!this.oauthService.isProviderEnabled(provider)) {
        throw new NotFoundError(`OAuth provider '${provider}' is not enabled`);
      }

      const { url } = this.oauthService.generateAuthorizationUrl(
        provider,
        query.redirectTo,
      );

      return c.redirect(url, 302);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new BadRequestError("Invalid request parameters");
      }
      throw error;
    }
  }

  async handleOAuthCallback(c: Context<AppEnv>): Promise<Response> {
    try {
      const { provider } = providerParamsSchema.parse(c.req.param());
      const query = oauthCallbackQuerySchema.parse(c.req.query());

      if (!this.oauthService.isProviderEnabled(provider)) {
        throw new NotFoundError(`OAuth provider '${provider}' is not enabled`);
      }

      if (query.error) {
        throw new UnauthorizedError(
          `OAuth authentication failed: ${query.error_description || query.error}`,
        );
      }

      if (!query.code) {
        throw new BadRequestError("Authorization code is required");
      }

      const oauthUserInfo = await this.oauthService.handleCallback(
        provider,
        query.code,
        query.state,
      );

      const stateData = this.oauthService.validateState(query.state);

      let user = await this.userRepository.findByEmail(oauthUserInfo.email);

      if (user) {
        const socialIdentity = user.socialIdentities?.find(
          (identity) => identity.provider === provider,
        );

        if (!socialIdentity) {
          await this.userRepository.linkSocialIdentity(user.id, {
            provider,
            providerUserId: oauthUserInfo.id,
            email: oauthUserInfo.email,
            name: oauthUserInfo.name,
            linkedAt: new Date(),
          });
          // Refetch user with updated social identities
          user = await this.userRepository.findById(user.id);
        } else if (socialIdentity.providerUserId !== oauthUserInfo.id) {
          throw new UserAlreadyExistsError(
            "This email is associated with a different account on this provider",
          );
        }
      } else {
        const userData: CreateUserType = {
          firstName:
            oauthUserInfo.firstName || oauthUserInfo.name.split(" ")[0] || "",
          lastName:
            oauthUserInfo.lastName ||
            oauthUserInfo.name.split(" ").slice(1).join(" ") ||
            "",
          primaryEmail: oauthUserInfo.email,
          emails: [
            {
              emailAddress: oauthUserInfo.email,
              isVerified: true,
              addedAt: new Date(),
            },
          ],
          globalRole: "student",
          isAccountLocked: false,
          failedLoginAttempts: 0,
          socialIdentities: [
            {
              provider,
              providerUserId: oauthUserInfo.id,
              email: oauthUserInfo.email,
              name: oauthUserInfo.name,
              linkedAt: new Date(),
            },
          ],
        };

        user = await this.userRepository.create(userData);
      }

      if (!user) {
        throw new InternalServerError("Failed to create or retrieve user");
      }

      const tokens = await this.jwtService.generateTokenPair(user);

      const responseData = {
        message: "OAuth authentication successful",
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          primaryEmail: user.primaryEmail,
          globalRole: user.globalRole,
          provider,
        },
        redirectTo: stateData.redirectTo,
      };

      return c.json(responseData, 200);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new BadRequestError("Invalid callback parameters");
      }
      throw error;
    }
  }

  async getEnabledProviders(c: Context<AppEnv>): Promise<Response> {
    const enabledProviders = this.oauthService.getEnabledProviders();

    const providerDetails = enabledProviders.map((provider) => ({
      name: provider,
      displayName: this.getProviderDisplayName(provider),
      authUrl: `/auth/oauth/${provider}`,
    }));

    return c.json({
      providers: providerDetails,
      count: enabledProviders.length,
    });
  }

  async unlinkOAuthProvider(c: Context<AppEnv>): Promise<Response> {
    try {
      const user = c.var.user as AuthenticatedUserContextType;
      const { provider } = providerParamsSchema.parse(c.req.param());

      if (!user) {
        throw new UnauthorizedError("User authentication required");
      }

      const currentUser = await this.userRepository.findById(user.userId);
      if (!currentUser) {
        throw new NotFoundError("User not found");
      }

      const hasPassword = !!currentUser.passwordHash;
      const socialIdentities = currentUser.socialIdentities || [];
      const hasOtherSocialIdentities = socialIdentities.length > 1;

      if (!hasPassword && !hasOtherSocialIdentities) {
        throw new UserAlreadyExistsError(
          "Cannot unlink the only authentication method. Set a password first.",
        );
      }

      const socialIdentity = socialIdentities.find(
        (identity) => identity.provider === provider,
      );

      if (!socialIdentity) {
        throw new NotFoundError(
          `${this.getProviderDisplayName(provider)} account is not linked`,
        );
      }

      await this.userRepository.unlinkSocialIdentity(
        currentUser.id,
        provider,
        socialIdentity.providerUserId,
      );

      return c.json({
        message: `${this.getProviderDisplayName(provider)} account unlinked successfully`,
        provider,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new BadRequestError("Invalid request parameters");
      }
      throw error;
    }
  }

  private getProviderDisplayName(provider: OAuthProvider): string {
    switch (provider) {
      case "google":
        return "Google";
      case "github":
        return "GitHub";
      case "linkedin":
        return "LinkedIn";
      default:
        return provider;
    }
  }
}
