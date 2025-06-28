import { Hono } from "hono";
import type { AppEnv } from "@/schemas/app-env.schema";
import { AdminController } from "@/controllers/admin.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { validationMiddleware } from "@/middlewares/validation.middleware";
import { 
  userQueryParamsSchema,
  createUserSchema,
  updateUserSchema,
} from "@/schemas/user.schema";
import { globalRoleSchema } from "@/schemas/roles.schemas";
import { z } from "zod";

// Create admin router
const adminRouter = new Hono<AppEnv>();
const adminController = new AdminController();

// Apply authentication middleware to all admin routes
adminRouter.use("*", authMiddleware);

// Admin user management routes
adminRouter.get(
  "/users",
  validationMiddleware({
    query: userQueryParamsSchema,
  }),
  adminController.getAllUsers,
);

adminRouter.get(
  "/users/search",
  adminController.searchUsers,
);

adminRouter.get(
  "/users/:userId",
  validationMiddleware({
    params: z.object({
      userId: z.string().min(1, "User ID is required"),
    }),
  }),
  adminController.getUserById,
);

adminRouter.post(
  "/users",
  validationMiddleware({
    body: createUserSchema.extend({
      password: z.string().optional(),
      sendWelcomeEmail: z.boolean().optional().default(false),
      generatePassword: z.boolean().optional().default(false),
    }),
  }),
  adminController.createUser,
);

adminRouter.put(
  "/users/:userId",
  validationMiddleware({
    params: z.object({
      userId: z.string().min(1, "User ID is required"),
    }),
    body: updateUserSchema.extend({
      globalRole: globalRoleSchema.optional(),
    }).partial(),
  }),
  adminController.updateUser,
);

adminRouter.delete(
  "/users/:userId",
  validationMiddleware({
    params: z.object({
      userId: z.string().min(1, "User ID is required"),
    }),
  }),
  adminController.deleteUser,
);

// User account management routes
adminRouter.post(
  "/users/:userId/lock",
  validationMiddleware({
    params: z.object({
      userId: z.string().min(1, "User ID is required"),
    }),
  }),
  adminController.lockUser,
);

adminRouter.post(
  "/users/:userId/unlock",
  validationMiddleware({
    params: z.object({
      userId: z.string().min(1, "User ID is required"),
    }),
  }),
  adminController.unlockUser,
);

adminRouter.post(
  "/users/:userId/reset-password",
  validationMiddleware({
    params: z.object({
      userId: z.string().min(1, "User ID is required"),
    }),
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

export { adminRouter };