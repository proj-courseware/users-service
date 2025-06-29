import { describe, it, expect } from "vitest";
import {
  serviceEventSchema,
  userEventSchema,
  authEventSchema,
  emailEventSchema,
  passwordEventSchema,
  oauthEventSchema,
  securityEventSchema,
  adminEventSchema,
} from "@/schemas/event.schema";

describe("Event Schemas", () => {
  describe("serviceEventSchema", () => {
    it("should validate a complete authentication service event", () => {
      const validEvent = {
        id: "event-1",
        action: "registered",
        data: { userId: "user-1", email: "test@example.com" },
        user: { id: "user1", name: "John Doe" },
        timestamp: new Date(),
        resourceType: "users",
      };

      const result = serviceEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validEvent);
      }
    });

    it("should validate minimal service event", () => {
      const minimalEvent = {
        id: "event-2",
        action: "login",
        data: { userId: "user-1" },
        timestamp: new Date(),
        resourceType: "authentication",
      };

      const result = serviceEventSchema.safeParse(minimalEvent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(minimalEvent);
      }
    });

    it("should validate all authentication action types", () => {
      const baseEvent = {
        id: "event-3",
        data: { userId: "user-1" },
        timestamp: new Date(),
        resourceType: "users",
      };

      const actions = [
        "registered",
        "updated",
        "deleted",
        "login",
        "logout",
        "token_refreshed",
        "email_verified",
        "email_added",
        "email_removed",
        "verification_sent",
        "password_changed",
        "password_reset_requested",
        "password_reset_completed",
        "oauth_login",
        "oauth_account_linked",
        "oauth_account_unlinked",
        "account_locked",
        "account_unlocked",
        "failed_login_attempt",
        "user_role_changed",
        "admin_action_performed",
      ] as const;

      actions.forEach((action) => {
        const event = { ...baseEvent, action };
        const result = serviceEventSchema.safeParse(event);
        expect(result.success).toBe(true);
      });
    });

    it("should validate authentication resourceType field", () => {
      const baseEvent = {
        id: "event-4",
        action: "registered",
        data: { userId: "user-1" },
        timestamp: new Date(),
      };

      const resourceTypes = [
        "users",
        "authentication",
        "email",
        "password",
        "oauth",
        "security",
        "admin",
      ];

      resourceTypes.forEach((resourceType) => {
        const event = { ...baseEvent, resourceType };
        const result = serviceEventSchema.safeParse(event);
        expect(result.success).toBe(true);
      });
    });

    it("should accept string id", () => {
      const baseEvent = {
        action: "login",
        data: { userId: "user-1" },
        timestamp: new Date(),
        resourceType: "authentication",
      };

      // Test string id
      const stringIdEvent = { ...baseEvent, id: "string-id" };
      expect(serviceEventSchema.safeParse(stringIdEvent).success).toBe(true);
    });

    it("should allow user object with additional properties", () => {
      const event = {
        id: "event-5",
        action: "registered",
        data: { userId: "user-1" },
        user: {
          id: "user1",
          name: "John Doe",
          email: "john@example.com",
          role: "admin",
        },
        timestamp: new Date(),
        resourceType: "users",
      };

      const result = serviceEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it("should reject invalid action", () => {
      const invalidEvent = {
        id: "event-6",
        action: "invalid-action",
        data: { userId: "user-1" },
        timestamp: new Date(),
        resourceType: "users",
      };

      const result = serviceEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should require id field", () => {
      const eventWithoutId = {
        action: "login",
        data: { userId: "user-1" },
        timestamp: new Date(),
        resourceType: "authentication",
      };

      const result = serviceEventSchema.safeParse(eventWithoutId);
      expect(result.success).toBe(false);
    });

    it("should require user.id when user is provided", () => {
      const eventWithoutUserId = {
        id: "event-7",
        action: "registered",
        data: { userId: "user-1" },
        user: { name: "John Doe" },
        timestamp: new Date(),
        resourceType: "users",
      };

      const result = serviceEventSchema.safeParse(eventWithoutUserId);
      expect(result.success).toBe(false);
    });

    it("should require timestamp", () => {
      const eventWithoutTimestamp = {
        id: "event-8",
        action: "login",
        data: { userId: "user-1" },
        resourceType: "authentication",
      };

      const result = serviceEventSchema.safeParse(eventWithoutTimestamp);
      expect(result.success).toBe(false);
    });
  });

  describe("userEventSchema", () => {
    it("should validate a complete user event", () => {
      const validUserEvent = {
        id: "user-event-1",
        action: "registered",
        data: {
          userId: "user-1",
          email: "test@example.com",
          globalRole: "student",
          firstName: "John",
          lastName: "Doe",
        },
        user: { id: "user-1" },
        timestamp: new Date(),
        resourceType: "users",
      };

      const result = userEventSchema.safeParse(validUserEvent);
      expect(result.success).toBe(true);
    });

    it("should require userId in data", () => {
      const invalidEvent = {
        id: "user-event-2",
        action: "registered",
        data: {
          email: "test@example.com",
        },
        timestamp: new Date(),
        resourceType: "users",
      };

      const result = userEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });
  });

  describe("authEventSchema", () => {
    it("should validate a complete auth event", () => {
      const validAuthEvent = {
        id: "auth-event-1",
        action: "login",
        data: {
          userId: "user-1",
          email: "test@example.com",
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          sessionId: "session-123",
          tokenType: "access",
        },
        user: { id: "user-1" },
        timestamp: new Date(),
        resourceType: "authentication",
      };

      const result = authEventSchema.safeParse(validAuthEvent);
      expect(result.success).toBe(true);
    });
  });

  describe("oauthEventSchema", () => {
    it("should validate a complete oauth event", () => {
      const validOAuthEvent = {
        id: "oauth-event-1",
        action: "oauth_login",
        data: {
          userId: "user-1",
          provider: "google",
          providerUserId: "google-123",
          email: "test@example.com",
          isNewUser: true,
        },
        user: { id: "user-1" },
        timestamp: new Date(),
        resourceType: "oauth",
      };

      const result = oauthEventSchema.safeParse(validOAuthEvent);
      expect(result.success).toBe(true);
    });

    it("should require valid provider", () => {
      const invalidEvent = {
        id: "oauth-event-2",
        action: "oauth_login",
        data: {
          userId: "user-1",
          provider: "invalid-provider",
          providerUserId: "123",
        },
        timestamp: new Date(),
        resourceType: "oauth",
      };

      const result = oauthEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });
  });
});
