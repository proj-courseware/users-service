import type { Context } from "hono";
import type { AppEnv } from "@/schemas/app-env.schema";
import type {
  RegisterUserType,
  LoginCredentialsType,
} from "@/schemas/user.schema";
import type { IAuthenticationService } from "@/services/authentication.service";
import type { IEmailVerificationService } from "@/services/email-verification.service";
import { AuthenticationService } from "@/services/authentication.service";
import { EmailVerificationService } from "@/services/email-verification.service";
import { MockDbUserRepository } from "@/repositories/mockdb/user.mockdb.repository";
import { MongoDbUserRepository } from "@/repositories/mongodb/user.mongodb.repository";
import { PasswordService } from "@/services/password.service";
import { JWTService } from "@/services/jwt.service";
import { BadRequestError } from "@/errors";
import { env } from "@/env";

export interface AuthControllerDeps {
  authenticationService?: IAuthenticationService;
  emailVerificationService?: IEmailVerificationService;
}

export class AuthController {
  private authenticationService: IAuthenticationService;
  private emailVerificationService: IEmailVerificationService;

  constructor(deps?: AuthControllerDeps) {
    if (deps?.authenticationService && deps?.emailVerificationService) {
      this.authenticationService = deps.authenticationService;
      this.emailVerificationService = deps.emailVerificationService;
    } else {
      // Create default services with proper dependency injection
      const userRepository = env.NODE_ENV === "test" 
        ? new MockDbUserRepository() 
        : new MongoDbUserRepository();
      
      const passwordService = new PasswordService();
      const jwtService = new JWTService();
      
      this.authenticationService = new AuthenticationService(
        userRepository,
        passwordService,
        jwtService,
      );
      
      this.emailVerificationService = new EmailVerificationService(userRepository);
    }
  }

  /**
   * Register a new user
   * POST /auth/register
   */
  register = async (c: Context<AppEnv>): Promise<Response> => {
    const body = c.var.validatedBody as RegisterUserType;

    const result = await this.authenticationService.register(body);

    // If email verification is required, generate and return verification info
    if (result.requiresEmailVerification) {
      try {
        const verificationResult = await this.emailVerificationService.generateVerificationToken(
          result.user.id,
          result.user.primaryEmail,
        );

        return c.json({
          success: true,
          message: result.message,
          user: result.user,
          requiresEmailVerification: true,
          verificationEmailSent: true,
          // In a real app, you wouldn't return the token - it would be sent via email
          // For development/testing purposes, we include it in the response
          ...(env.NODE_ENV === "development" && { 
            verificationToken: verificationResult.token,
            verificationExpiresAt: verificationResult.expiresAt,
          }),
        }, 201);
      } catch (error) {
        // If verification token generation fails, user is still created
        // Log error and return success with manual verification note
        console.error("Failed to generate verification token:", error);
        return c.json({
          success: true,
          message: result.message,
          user: result.user,
          requiresEmailVerification: true,
          verificationEmailSent: false,
          note: "User created successfully, but verification email could not be sent. Please contact support.",
        }, 201);
      }
    }

    return c.json({
      success: true,
      message: result.message,
      user: result.user,
      requiresEmailVerification: false,
    }, 201);
  };

  /**
   * Login with email and password
   * POST /auth/login
   */
  login = async (c: Context<AppEnv>): Promise<Response> => {
    const body = c.var.validatedBody as LoginCredentialsType;

    const result = await this.authenticationService.loginWithPassword(body);

    return c.json({
      success: true,
      message: "Login successful",
      user: result.user,
      ...(result.accessToken && { accessToken: result.accessToken }),
      ...(result.refreshToken && { refreshToken: result.refreshToken }),
    });
  };

  /**
   * Refresh access token using refresh token
   * POST /auth/refresh
   */
  refreshToken = async (c: Context<AppEnv>): Promise<Response> => {
    const body = await c.req.json();
    
    if (!body.refreshToken) {
      throw new BadRequestError("Refresh token is required");
    }

    const result = await this.authenticationService.refreshTokens(body.refreshToken);

    return c.json({
      success: true,
      message: "Tokens refreshed successfully",
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  };

  /**
   * Verify email using verification token
   * POST /auth/verify-email
   */
  verifyEmail = async (c: Context<AppEnv>): Promise<Response> => {
    const body = await c.req.json();
    
    if (!body.token) {
      throw new BadRequestError("Verification token is required");
    }

    const result = await this.emailVerificationService.verifyEmailToken(body.token);

    if (!result.success) {
      throw new BadRequestError(result.message);
    }

    return c.json({
      success: true,
      message: result.message,
      user: result.user,
    });
  };

  /**
   * Resend email verification
   * POST /auth/resend-verification
   */
  resendVerification = async (c: Context<AppEnv>): Promise<Response> => {
    const body = await c.req.json();
    
    if (!body.userId || !body.emailAddress) {
      throw new BadRequestError("User ID and email address are required");
    }

    const result = await this.emailVerificationService.resendVerificationEmail(
      body.userId,
      body.emailAddress,
    );

    return c.json({
      success: true,
      message: result.message,
      emailAddress: result.emailAddress,
      // In development, include token info for testing
      ...(env.NODE_ENV === "development" && {
        verificationExpiresAt: result.expiresAt,
      }),
    });
  };

  /**
   * Verify access token and return user info
   * GET /auth/me
   */
  me = async (c: Context<AppEnv>): Promise<Response> => {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new BadRequestError("Valid authorization header required");
    }

    const token = authHeader.split(" ")[1];
    const user = await this.authenticationService.getUserFromToken(token);

    return c.json({
      success: true,
      user,
    });
  };

  /**
   * Logout (client-side token invalidation)
   * POST /auth/logout
   */
  logout = async (c: Context<AppEnv>): Promise<Response> => {
    // For JWT tokens, logout is typically handled client-side by removing the token
    // In a more sophisticated setup, you might maintain a token blacklist
    
    return c.json({
      success: true,
      message: "Logged out successfully. Please remove the access token from your client.",
    });
  };

  /**
   * Get token information (for debugging/development)
   * GET /auth/token-info
   */
  tokenInfo = async (c: Context<AppEnv>): Promise<Response> => {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new BadRequestError("Valid authorization header required");
    }

    const token = authHeader.split(" ")[1];
    
    try {
      const payload = await this.authenticationService.verifyAccessToken(token);
      
      return c.json({
        success: true,
        tokenInfo: {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          issuedAt: new Date(payload.iat * 1000),
          expiresAt: new Date(payload.exp * 1000),
          isExpired: Date.now() > payload.exp * 1000,
        },
      });
    } catch {
      throw new BadRequestError("Invalid or expired token");
    }
  };

  /**
   * Health check for authentication service
   * GET /auth/health
   */
  health = async (c: Context<AppEnv>): Promise<Response> => {
    return c.json({
      success: true,
      service: "authentication",
      status: "operational",
      timestamp: new Date().toISOString(),
    });
  };
}