import { Hono } from "hono";
import type { UserController } from "@/controllers/user.controller";
import type { AppEnv } from "@/schemas/app-env.schema";
import { validate as defaultValidate } from "@/middlewares/validation.middleware";
import { authMiddleware as defaultAuthMiddleware } from "@/middlewares/auth.middleware";
import {
  updateUserSchema,
  changePasswordSchema,
  addEmailSchema,
  setPrimaryEmailSchema,
  emailAddressParamSchema,
} from "@/schemas/user.schema";

export interface CreateUserRoutesDeps {
  userController: UserController;
  validate?: typeof defaultValidate;
  authMiddleware?: typeof defaultAuthMiddleware;
}

export const createUserRoutes = (dependencies: CreateUserRoutesDeps) => {
  const {
    userController,
    validate = defaultValidate,
    authMiddleware = defaultAuthMiddleware,
  } = dependencies;

  const userRoutes = new Hono<AppEnv>();

  // All user routes require authentication
  userRoutes.use("*", authMiddleware);

  /**
   * Get current user profile
   * GET /me
   */
  userRoutes.get("/", userController.getProfile);

  /**
   * Update current user profile
   * PUT /me
   */
  userRoutes.put(
    "/",
    validate({
      schema: updateUserSchema,
      source: "body",
      varKey: "validatedBody",
    }),
    userController.updateProfile,
  );

  /**
   * Delete current user account
   * DELETE /me
   * Body: { password: string }
   */
  userRoutes.delete("/", userController.deleteAccount);

  /**
   * Get account summary
   * GET /me/summary
   */
  userRoutes.get("/summary", userController.getAccountSummary);

  /**
   * Change user password
   * PUT /me/password
   */
  userRoutes.put(
    "/password",
    validate({
      schema: changePasswordSchema,
      source: "body",
      varKey: "validatedBody",
    }),
    userController.changePassword,
  );

  /**
   * Get user's email addresses
   * GET /me/emails
   */
  userRoutes.get("/emails", userController.getEmails);

  /**
   * Add new email address
   * POST /me/emails
   */
  userRoutes.post(
    "/emails",
    validate({
      schema: addEmailSchema,
      source: "body",
      varKey: "validatedBody",
    }),
    userController.addEmail,
  );

  /**
   * Set primary email address
   * PUT /me/emails/primary
   */
  userRoutes.put(
    "/emails/primary",
    validate({
      schema: setPrimaryEmailSchema,
      source: "body",
      varKey: "validatedBody",
    }),
    userController.setPrimaryEmail,
  );

  /**
   * Remove email address
   * DELETE /me/emails/:emailAddress
   */
  userRoutes.delete(
    "/emails/:emailAddress",
    validate({
      schema: emailAddressParamSchema,
      source: "params",
      varKey: "validatedParams",
    }),
    userController.removeEmail,
  );

  /**
   * Resend email verification for specific email
   * POST /me/emails/:emailAddress/resend-verification
   */
  userRoutes.post(
    "/emails/:emailAddress/resend-verification",
    validate({
      schema: emailAddressParamSchema,
      source: "params",
      varKey: "validatedParams",
    }),
    userController.resendEmailVerification,
  );

  return userRoutes;
};
