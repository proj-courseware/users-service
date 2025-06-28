import { Hono } from "hono";
import type { AuthController } from "@/controllers/auth.controller";
import type { AppEnv } from "@/schemas/app-env.schema";
import { validate as defaultValidate } from "@/middlewares/validation.middleware";
import { authRateLimitMiddleware } from "@/middlewares/rate-limit.middleware";
import {
  registerUserSchema,
  loginCredentialsSchema,
} from "@/schemas/user.schema";

export interface CreateAuthRoutesDeps {
  authController: AuthController;
  validate?: typeof defaultValidate;
}

export const createAuthRoutes = (dependencies: CreateAuthRoutesDeps) => {
  const {
    authController,
    validate = defaultValidate,
  } = dependencies;

  const authRoutes = new Hono<AppEnv>();

  // Public authentication endpoints (no auth middleware)

  /**
   * Register a new user
   * POST /auth/register
   */
  authRoutes.post(
    "/register",
    authRateLimitMiddleware,
    validate({
      schema: registerUserSchema,
      source: "body",
      varKey: "validatedBody",
    }),
    authController.register,
  );

  /**
   * Login with email and password
   * POST /auth/login
   */
  authRoutes.post(
    "/login",
    authRateLimitMiddleware,
    validate({
      schema: loginCredentialsSchema,
      source: "body",
      varKey: "validatedBody",
    }),
    authController.login,
  );

  /**
   * Refresh access token
   * POST /auth/refresh
   * Body: { refreshToken: string }
   */
  authRoutes.post(
    "/refresh",
    authRateLimitMiddleware,
    authController.refreshToken,
  );

  /**
   * Verify email address
   * POST /auth/verify-email
   * Body: { token: string }
   */
  authRoutes.post(
    "/verify-email",
    authRateLimitMiddleware,
    authController.verifyEmail,
  );

  /**
   * Resend email verification
   * POST /auth/resend-verification
   * Body: { userId: string, emailAddress: string }
   */
  authRoutes.post(
    "/resend-verification",
    authRateLimitMiddleware,
    authController.resendVerification,
  );

  /**
   * Get current user info (requires auth header)
   * GET /auth/me
   */
  authRoutes.get(
    "/me",
    authController.me,
  );

  /**
   * Logout (client-side token removal)
   * POST /auth/logout
   */
  authRoutes.post(
    "/logout",
    authController.logout,
  );

  /**
   * Get token information (for debugging)
   * GET /auth/token-info
   */
  authRoutes.get(
    "/token-info",
    authController.tokenInfo,
  );

  /**
   * Health check for authentication service
   * GET /auth/health
   */
  authRoutes.get(
    "/health",
    authController.health,
  );

  return authRoutes;
};