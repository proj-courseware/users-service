import { z } from "zod";

export const serviceEventSchema = z.object({
  id: z.string(), // Event's own ID for storage/audit
  action: z.enum([
    // User lifecycle events
    "registered", 
    "updated", 
    "deleted",
    // Authentication events
    "login", 
    "logout", 
    "token_refreshed",
    // Email events
    "email_verified", 
    "email_added", 
    "email_removed", 
    "verification_sent",
    // Password events
    "password_changed", 
    "password_reset_requested", 
    "password_reset_completed",
    // OAuth events
    "oauth_login", 
    "oauth_account_linked", 
    "oauth_account_unlinked",
    // Security events
    "account_locked", 
    "account_unlocked", 
    "failed_login_attempt",
    // Admin events
    "user_role_changed", 
    "admin_action_performed"
  ]),
  data: z.unknown(), // Will be typed based on specific entity
  user: z
    .object({
      id: z.string(),
    })
    .passthrough()
    .optional(), // Optional for system events
  timestamp: z.date(), // When event occurred
  resourceType: z.string(), // 'users', 'authentication', 'oauth', etc.
});

export type ServiceEventType = z.infer<typeof serviceEventSchema>;

// Authentication-specific event types
export const userEventSchema = serviceEventSchema.extend({
  resourceType: z.literal("users"),
  data: z.object({
    userId: z.string(),
    email: z.string().optional(),
    globalRole: z.enum(["admin", "teacher", "student"]).optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  }),
});

export const authEventSchema = serviceEventSchema.extend({
  resourceType: z.literal("authentication"),
  data: z.object({
    userId: z.string(),
    email: z.string().optional(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    sessionId: z.string().optional(),
    tokenType: z.enum(["access", "refresh"]).optional(),
  }),
});

export const emailEventSchema = serviceEventSchema.extend({
  resourceType: z.literal("email"),
  data: z.object({
    userId: z.string(),
    email: z.string(),
    isPrimary: z.boolean().optional(),
    isVerified: z.boolean().optional(),
  }),
});

export const passwordEventSchema = serviceEventSchema.extend({
  resourceType: z.literal("password"),
  data: z.object({
    userId: z.string(),
    email: z.string().optional(),
    resetToken: z.string().optional(),
    strength: z.enum(["weak", "medium", "strong"]).optional(),
  }),
});

export const oauthEventSchema = serviceEventSchema.extend({
  resourceType: z.literal("oauth"),
  data: z.object({
    userId: z.string(),
    provider: z.enum(["google", "github", "linkedin"]),
    providerUserId: z.string(),
    email: z.string().optional(),
    isNewUser: z.boolean().optional(),
  }),
});

export const securityEventSchema = serviceEventSchema.extend({
  resourceType: z.literal("security"),
  data: z.object({
    userId: z.string(),
    email: z.string().optional(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    lockoutDuration: z.number().optional(), // in milliseconds
    failedAttempts: z.number().optional(),
    reason: z.string().optional(),
  }),
});

export const adminEventSchema = serviceEventSchema.extend({
  resourceType: z.literal("admin"),
  data: z.object({
    adminUserId: z.string(),
    targetUserId: z.string().optional(),
    action: z.string(),
    changes: z.record(z.unknown()).optional(),
    settingKey: z.string().optional(),
    settingValue: z.unknown().optional(),
  }),
});

// Union type for all authentication events
export type UserEventType = z.infer<typeof userEventSchema>;
export type AuthEventType = z.infer<typeof authEventSchema>;
export type EmailEventType = z.infer<typeof emailEventSchema>;
export type PasswordEventType = z.infer<typeof passwordEventSchema>;
export type OAuthEventType = z.infer<typeof oauthEventSchema>;
export type SecurityEventType = z.infer<typeof securityEventSchema>;
export type AdminEventType = z.infer<typeof adminEventSchema>;

export type AuthenticationEventType = 
  | UserEventType 
  | AuthEventType 
  | EmailEventType 
  | PasswordEventType 
  | OAuthEventType 
  | SecurityEventType 
  | AdminEventType;
