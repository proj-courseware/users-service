import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { Hono } from "hono";
import {
  createSessionMiddleware,
  createSessionAuthMiddleware,
  SessionService,
  type SessionMiddlewareDeps,
  type SessionData,
} from "@/middlewares/session.middleware";
import type { UserType } from "@/schemas/user.schema";
import { UnauthenticatedError } from "@/errors";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "@/schemas/app-env.schema";
import { globalErrorHandler } from "@/errors";

let mockSessionService: SessionMiddlewareDeps["sessionService"];
let app: Hono<AppEnv>;

function createMockContext(cookies: Record<string, string> = {}) {
  return {
    req: {
      header: (name: string) => undefined,
      url: "http://localhost/test",
    },
    set: vi.fn(),
    get: vi.fn(),
    var: {},
    env: {},
    executionCtx: {},
  } as any;
}

describe("SessionService", () => {
  let sessionService: SessionService;
  let mockUser: UserType;

  beforeEach(() => {
    sessionService = new SessionService({
      cookieName: "test-session",
      secret: "test-secret",
      maxAgeHours: 24,
      secure: false,
      httpOnly: true,
      sameSite: "strict",
      path: "/",
    });

    mockUser = {
      id: "user123",
      primaryEmail: "test@example.com",
      globalRole: "Student",
      emails: [
        { email: "test@example.com", isVerified: true, isPrimary: true },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as UserType;
  });

  describe("createSession", () => {
    it("should create a valid session token", async () => {
      const token = await sessionService.createSession(mockUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("should create different tokens for subsequent calls", async () => {
      const token1 = await sessionService.createSession(mockUser);

      // Add small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 2));

      const token2 = await sessionService.createSession(mockUser);

      expect(token1).not.toBe(token2);
    });
  });

  describe("validateSession", () => {
    it("should validate a valid session token", async () => {
      const token = await sessionService.createSession(mockUser);
      const sessionData = await sessionService.validateSession(token);

      expect(sessionData).toBeDefined();
      expect(sessionData?.userId).toBe(mockUser.id);
      expect(sessionData?.email).toBe(mockUser.primaryEmail);
      expect(sessionData?.role).toBe(mockUser.globalRole);
    });

    it("should return null for invalid token", async () => {
      const sessionData = await sessionService.validateSession("invalid-token");

      expect(sessionData).toBeNull();
    });

    it("should return null for expired token", async () => {
      // Create service with very short expiry
      const shortLivedService = new SessionService({
        maxAgeHours: -1, // Already expired
      });

      const token = await shortLivedService.createSession(mockUser);
      const sessionData = await shortLivedService.validateSession(token);

      expect(sessionData).toBeNull();
    });

    it("should return null for malformed token", async () => {
      const sessionData =
        await sessionService.validateSession("malformed.token");

      expect(sessionData).toBeNull();
    });
  });

  describe("getCookieName", () => {
    it("should return the configured cookie name", () => {
      expect(sessionService.getCookieName()).toBe("test-session");
    });
  });

  describe("destroySession", () => {
    it("should destroy a session (no-op in current implementation)", async () => {
      const token = await sessionService.createSession(mockUser);

      // Should not throw
      await expect(
        sessionService.destroySession(token),
      ).resolves.toBeUndefined();
    });
  });

  describe("refreshSession", () => {
    it("should refresh a valid session", async () => {
      const originalToken = await sessionService.createSession(mockUser);

      // Add small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 2));

      const newToken = await sessionService.refreshSession(originalToken);

      expect(newToken).toBeDefined();
      expect(typeof newToken).toBe("string");
      expect(newToken).not.toBe(originalToken);
    });

    it("should throw error for invalid token", async () => {
      await expect(
        sessionService.refreshSession("invalid-token"),
      ).rejects.toThrow();
    });
  });
});

describe("createSessionMiddleware", () => {
  beforeEach(() => {
    app = new Hono<AppEnv>();
    app.onError(globalErrorHandler);

    mockSessionService = {
      createSession: vi.fn(),
      validateSession: vi.fn(),
      destroySession: vi.fn(),
      refreshSession: vi.fn(),
      getCookieName: vi.fn().mockReturnValue("auth-session"),
    };
  });

  it("should set session data when valid session exists", async () => {
    const sessionData: SessionData = {
      userId: "user123",
      email: "test@example.com",
      role: "Student",
      issuedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    };

    mockSessionService.validateSession = vi.fn().mockResolvedValue(sessionData);

    const middleware = createSessionMiddleware({
      sessionService: mockSessionService,
    });

    app.use("*", middleware);
    app.get("/test", (c) => {
      const session = c.get("session");
      const userId = c.get("userId");
      return c.json({
        session,
        userId,
        hasSessionService: !!c.get("sessionService"),
      });
    });

    const response = await app.request("/test", {
      headers: {
        Cookie: "auth-session=valid-session-token",
      },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.session).toEqual(sessionData);
    expect(body.userId).toBe("user123");
    expect(body.hasSessionService).toBe(true);
    expect(mockSessionService.validateSession).toHaveBeenCalledWith(
      "valid-session-token",
    );
  });

  it("should not set session data when no session token exists", async () => {
    const middleware = createSessionMiddleware({
      sessionService: mockSessionService,
    });

    app.use("*", middleware);
    app.get("/test", (c) => {
      const session = c.get("session");
      const userId = c.get("userId");
      return c.json({
        session,
        userId,
        hasSessionService: !!c.get("sessionService"),
      });
    });

    const response = await app.request("/test");

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.session).toBeUndefined();
    expect(body.userId).toBeUndefined();
    expect(body.hasSessionService).toBe(true);
    expect(mockSessionService.validateSession).not.toHaveBeenCalled();
  });

  it("should not set session data when session validation fails", async () => {
    mockSessionService.validateSession = vi.fn().mockResolvedValue(null);

    const middleware = createSessionMiddleware({
      sessionService: mockSessionService,
    });

    app.use("*", middleware);
    app.get("/test", (c) => {
      const session = c.get("session");
      const userId = c.get("userId");
      return c.json({
        session,
        userId,
        hasSessionService: !!c.get("sessionService"),
      });
    });

    const response = await app.request("/test", {
      headers: {
        Cookie: "auth-session=invalid-session-token",
      },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.session).toBeUndefined();
    expect(body.userId).toBeUndefined();
    expect(body.hasSessionService).toBe(true);
    expect(mockSessionService.validateSession).toHaveBeenCalledWith(
      "invalid-session-token",
    );
  });

  it("should handle validateSession errors gracefully", async () => {
    mockSessionService.validateSession = vi
      .fn()
      .mockRejectedValue(new Error("Validation error"));

    const middleware = createSessionMiddleware({
      sessionService: mockSessionService,
    });

    app.use("*", middleware);
    app.get("/test", (c) => c.json({ success: true }));

    const response = await app.request("/test", {
      headers: {
        Cookie: "auth-session=session-token",
      },
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("An unexpected error occurred");
  });
});

describe("createSessionAuthMiddleware", () => {
  beforeEach(() => {
    app = new Hono<AppEnv>();
    app.onError(globalErrorHandler);

    mockSessionService = {
      createSession: vi.fn(),
      validateSession: vi.fn(),
      destroySession: vi.fn(),
      refreshSession: vi.fn(),
      getCookieName: vi.fn().mockReturnValue("auth-session"),
    };
  });

  it("should allow access with valid session", async () => {
    const sessionData: SessionData = {
      userId: "user123",
      email: "test@example.com",
      role: "Student",
      issuedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    };

    mockSessionService.validateSession = vi.fn().mockResolvedValue(sessionData);

    const middleware = createSessionAuthMiddleware({
      sessionService: mockSessionService,
    });

    app.use("*", middleware);
    app.get("/test", (c) => {
      const session = c.get("session");
      const userId = c.get("userId");
      return c.json({
        session,
        userId,
        hasSessionService: !!c.get("sessionService"),
      });
    });

    const response = await app.request("/test", {
      headers: {
        Cookie: "auth-session=valid-session-token",
      },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.session).toEqual(sessionData);
    expect(body.userId).toBe("user123");
    expect(body.hasSessionService).toBe(true);
    expect(mockSessionService.validateSession).toHaveBeenCalledWith(
      "valid-session-token",
    );
  });

  it("should throw UnauthenticatedError when no session token exists", async () => {
    const middleware = createSessionAuthMiddleware({
      sessionService: mockSessionService,
    });

    app.use("*", middleware);
    app.get("/test", (c) => c.json({ success: true }));

    const response = await app.request("/test");

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("No session found");
  });

  it("should throw UnauthenticatedError when session validation fails", async () => {
    mockSessionService.validateSession = vi.fn().mockResolvedValue(null);

    const middleware = createSessionAuthMiddleware({
      sessionService: mockSessionService,
    });

    app.use("*", middleware);
    app.get("/test", (c) => c.json({ success: true }));

    const response = await app.request("/test", {
      headers: {
        Cookie: "auth-session=invalid-session-token",
      },
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Invalid or expired session");
    expect(mockSessionService.validateSession).toHaveBeenCalledWith(
      "invalid-session-token",
    );
  });

  it("should propagate validation errors", async () => {
    mockSessionService.validateSession = vi
      .fn()
      .mockRejectedValue(new Error("Database error"));

    const middleware = createSessionAuthMiddleware({
      sessionService: mockSessionService,
    });

    app.use("*", middleware);
    app.get("/test", (c) => c.json({ success: true }));

    const response = await app.request("/test", {
      headers: {
        Cookie: "auth-session=session-token",
      },
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("An unexpected error occurred");
  });
});

describe("SessionService configuration", () => {
  it("should use default configuration when no config provided", () => {
    const service = new SessionService();

    expect(service.getCookieName()).toBe("auth-session");
  });

  it("should use custom configuration when provided", () => {
    const service = new SessionService({
      cookieName: "custom-session",
      maxAgeHours: 12,
      secure: true,
      sameSite: "lax",
    });

    expect(service.getCookieName()).toBe("custom-session");
  });

  it("should create middleware with default service when no deps provided", () => {
    const middleware = createSessionMiddleware();

    expect(middleware).toBeDefined();
    expect(typeof middleware).toBe("function");
  });

  it("should create auth middleware with default service when no deps provided", () => {
    const middleware = createSessionAuthMiddleware();

    expect(middleware).toBeDefined();
    expect(typeof middleware).toBe("function");
  });
});
