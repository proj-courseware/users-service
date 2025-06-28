import { Hono } from "hono";
import type { AppEnv } from "@/schemas/app-env.schema";
import { AdminController } from "@/controllers/admin.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validation.middleware";
import { 
  userQueryParamsSchema,
  createUserSchema,
  updateUserSchema,
} from "@/schemas/user.schema";
import { globalRoleSchema } from "@/schemas/roles.schemas";
import { passwordPolicySchema } from "@/services/password.service";
import { adminSettingSchema } from "@/schemas/user.schema";
import { z } from "zod";

// Create admin router
const adminRouter = new Hono<AppEnv>();
const adminController = new AdminController();

// Apply authentication middleware to all admin routes
adminRouter.use("*", authMiddleware);

// Admin user management routes
adminRouter.get(
  "/users",
  validate({
    schema: userQueryParamsSchema,
    source: "query",
    varKey: "validatedQuery",
  }),
  adminController.getAllUsers,
);

adminRouter.get(
  "/users/search",
  adminController.searchUsers,
);

adminRouter.get(
  "/users/:userId",
  validate({
    schema: z.object({
      userId: z.string().min(1, "User ID is required"),
    }),
    source: "params",
    varKey: "validatedParams",
  }),
  adminController.getUserById,
);

adminRouter.post(
  "/users",
  validate({
    schema: createUserSchema.extend({
      password: z.string().optional(),
      sendWelcomeEmail: z.boolean().optional().default(false),
      generatePassword: z.boolean().optional().default(false),
    }),
    source: "body",
    varKey: "validatedBody",
  }),
  adminController.createUser,
);

adminRouter.put(
  "/users/:userId",
  validate({
    schema: z.object({
      userId: z.string().min(1, "User ID is required"),
    }),
    source: "params",
    varKey: "validatedParams",
  }),
  validate({
    schema: updateUserSchema.extend({
      globalRole: globalRoleSchema.optional(),
    }).partial(),
    source: "body",
    varKey: "validatedBody",
  }),
  adminController.updateUser,
);

adminRouter.delete(
  "/users/:userId",
  validate({
    schema: z.object({
      userId: z.string().min(1, "User ID is required"),
    }),
    source: "params",
    varKey: "validatedParams",
  }),
  adminController.deleteUser,
);

// User account management routes
adminRouter.post(
  "/users/:userId/lock",
  validate({
    schema: z.object({
      userId: z.string().min(1, "User ID is required"),
    }),
    source: "params",
    varKey: "validatedParams",
  }),
  adminController.lockUser,
);

adminRouter.post(
  "/users/:userId/unlock",
  validate({
    schema: z.object({
      userId: z.string().min(1, "User ID is required"),
    }),
    source: "params",
    varKey: "validatedParams",
  }),
  adminController.unlockUser,
);

adminRouter.post(
  "/users/:userId/reset-password",
  validate({
    schema: z.object({
      userId: z.string().min(1, "User ID is required"),
    }),
    source: "params",
    varKey: "validatedParams",
  }),
  adminController.resetUserPassword,
);

// Bulk operations
adminRouter.post(
  "/users/bulk",
  adminController.bulkOperations,
);

// System statistics and monitoring
adminRouter.get(
  "/stats",
  adminController.getSystemStats,
);

// System health check
adminRouter.get(
  "/health",
  adminController.getHealthStatus,
);

// Admin settings management routes
adminRouter.get(
  "/settings",
  adminController.getAllSettings,
);

adminRouter.get(
  "/settings/:key",
  validate({
    schema: z.object({
      key: z.string().min(1, "Setting key is required"),
    }),
    source: "params",
    varKey: "validatedParams",
  }),
  adminController.getSettingByKey,
);

adminRouter.put(
  "/settings/:key",
  validate({
    schema: z.object({
      key: z.string().min(1, "Setting key is required"),
    }),
    source: "params",
    varKey: "validatedParams",
  }),
  validate({
    schema: z.object({
      value: z.unknown(),
      description: z.string().optional(),
    }),
    source: "body",
    varKey: "validatedBody",
  }),
  adminController.setSettingByKey,
);

adminRouter.delete(
  "/settings/:key",
  validate({
    schema: z.object({
      key: z.string().min(1, "Setting key is required"),
    }),
    source: "params",
    varKey: "validatedParams",
  }),
  adminController.deleteSettingByKey,
);

adminRouter.post(
  "/settings/batch",
  validate({
    schema: z.object({
      keys: z.array(z.string().min(1)).min(1, "At least one key is required"),
    }),
    source: "body",
    varKey: "validatedBody",
  }),
  adminController.getMultipleSettings,
);

// Password policy management routes
adminRouter.get(
  "/password-policy",
  adminController.getPasswordPolicy,
);

adminRouter.get(
  "/password-policy/info",
  adminController.getPasswordPolicyInfo,
);

adminRouter.post(
  "/password-policy/validate",
  validate({
    schema: passwordPolicySchema,
    source: "body",
    varKey: "validatedBody",
  }),
  adminController.validatePasswordPolicy,
);

adminRouter.post(
  "/password-policy/test",
  validate({
    schema: z.object({
      password: z.string().min(1, "Password is required"),
      policy: passwordPolicySchema.optional(),
    }),
    source: "body",
    varKey: "validatedBody",
  }),
  adminController.testPasswordPolicy,
);

export { adminRouter };