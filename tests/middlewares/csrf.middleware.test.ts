import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import type { AppEnv } from "@/schemas/app-env.schema";
import {
  createCSRFMiddleware,
  createCSRFTokenMiddleware,
  CSRFError,
  type CSRFConfig,
} from "@/middlewares/csrf.middleware";
import { CSRFService, type ICSRFService } from "@/services/csrf.service";
import { globalErrorHandler } from "@/errors";

class MockCSRFService implements ICSRFService {
  private tokens = new Map<string, { hash: string; timestamp: number }>();

  generateToken() {
    const token = "mock-token-" + Math.random().toString(36).substring(7);
    const timestamp = Date.now();
    const hash = `mock-hash-${token}:${timestamp}`;

    this.tokens.set(token, { hash, timestamp });

    return {
      token,
      hash,
      timestamp,
    };
  }

  validateToken(token: string, hash: string, maxAgeMs?: number): boolean {
    const stored = this.tokens.get(token);
    if (!stored) return false;
    if (stored.hash !== hash) return false;
    if (maxAgeMs && Date.now() - stored.timestamp > maxAgeMs) return false;
    return true;
  }

  generateSecureToken(length: number): string {
    return Math.random()
      .toString(36)
      .substring(2, 2 + length);
  }
}

describe("CSRF Middleware", () => {
  let app: Hono<AppEnv>;
  let mockCSRFService: MockCSRFService;

  beforeEach(() => {
    app = new Hono<AppEnv>();
    app.onError(globalErrorHandler);
    mockCSRFService = new MockCSRFService();
  });

  describe("createCSRFMiddleware", () => {
    it("should allow GET requests without CSRF token", async () => {
      const config: Partial<CSRFConfig> = { enabled: true };
      const middleware = createCSRFMiddleware(config, {
        csrfService: mockCSRFService,
      });

      app.use("*", middleware);
      app.get("/test", (c) => c.json({ success: true }));

      const response = await app.request("/test");
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toEqual({ success: true });
    });

    it("should generate CSRF token for GET requests", async () => {
      const config: Partial<CSRFConfig> = { enabled: true };
      const middleware = createCSRFMiddleware(config, {
        csrfService: mockCSRFService,
      });

      app.use("*", middleware);
      app.get("/test", (c) => {
        const csrfToken = c.get("csrfToken");
        return c.json({ success: true, csrfToken });
      });

      const response = await app.request("/test");
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.csrfToken).toBeDefined();
      expect(typeof body.csrfToken).toBe("string");
    });

    it("should set CSRF cookies for GET requests", async () => {
      const config: Partial<CSRFConfig> = {
        enabled: true,
        cookieName: "test-csrf",
      };
      const middleware = createCSRFMiddleware(config, {
        csrfService: mockCSRFService,
      });

      app.use("*", middleware);
      app.get("/test", (c) => c.json({ success: true }));

      const response = await app.request("/test");
      expect(response.status).toBe(200);

      const setCookieHeaders = response.headers.getSetCookie();
      expect(setCookieHeaders.length).toBeGreaterThanOrEqual(2);

      // Should have both token and hash cookies
      const hasCsrfCookie = setCookieHeaders.some((header) =>
        header.includes("test-csrf="),
      );
      const hasHashCookie = setCookieHeaders.some((header) =>
        header.includes("test-csrf-hash="),
      );

      expect(hasCsrfCookie).toBe(true);
      expect(hasHashCookie).toBe(true);
    });

    it("should reject POST requests without CSRF token", async () => {
      const config: Partial<CSRFConfig> = { enabled: true };
      const middleware = createCSRFMiddleware(config, {
        csrfService: mockCSRFService,
      });

      app.use("*", middleware);
      app.post("/test", (c) => c.json({ success: true }));

      const response = await app.request("/test", { method: "POST" });
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.error).toContain("CSRF token is required");
    });

    it("should accept POST requests with valid CSRF token in header", async () => {
      const config: Partial<CSRFConfig> = {
        enabled: true,
        cookieName: "test-csrf",
        headerName: "x-test-csrf",
      };
      const middleware = createCSRFMiddleware(config, {
        csrfService: mockCSRFService,
      });

      app.use("*", middleware);
      app.post("/test", (c) => c.json({ success: true }));

      // First, generate a token with GET request
      const getResponse = await app.request("/test", { method: "GET" });
      const setCookieHeaders = getResponse.headers.getSetCookie();

      // Extract token and hash from cookies
      let csrfToken = "";
      let csrfHash = "";

      setCookieHeaders.forEach((header) => {
        if (
          header.includes("test-csrf=") &&
          !header.includes("test-csrf-hash=")
        ) {
          csrfToken = header.split("test-csrf=")[1].split(";")[0];
        }
        if (header.includes("test-csrf-hash=")) {
          csrfHash = header.split("test-csrf-hash=")[1].split(";")[0];
        }
      });

      // Now make POST request with CSRF token
      const response = await app.request("/test", {
        method: "POST",
        headers: {
          "x-test-csrf": csrfToken,
          Cookie: `test-csrf=${csrfToken}; test-csrf-hash=${csrfHash}`,
        },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ success: true });
    });

    it("should reject POST requests with invalid CSRF token", async () => {
      const config: Partial<CSRFConfig> = {
        enabled: true,
        headerName: "x-test-csrf",
        cookieName: "test-csrf",
      };
      const middleware = createCSRFMiddleware(config, {
        csrfService: mockCSRFService,
      });

      app.use("*", middleware);
      app.post("/test", (c) => c.json({ success: true }));

      const response = await app.request("/test", {
        method: "POST",
        headers: {
          "x-test-csrf": "invalid-token",
          Cookie: "test-csrf-hash=invalid-hash",
        },
      });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toContain("CSRF token validation failed");
    });

    it("should skip CSRF protection when disabled", async () => {
      const config: Partial<CSRFConfig> = { enabled: false };
      const middleware = createCSRFMiddleware(config, {
        csrfService: mockCSRFService,
      });

      app.use("*", middleware);
      app.post("/test", (c) => c.json({ success: true }));

      const response = await app.request("/test", { method: "POST" });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toEqual({ success: true });
    });

    it("should handle form data CSRF token", async () => {
      const config: Partial<CSRFConfig> = {
        enabled: true,
        cookieName: "test-csrf",
      };
      const middleware = createCSRFMiddleware(config, {
        csrfService: mockCSRFService,
      });

      app.use("*", middleware);
      app.post("/test", (c) => c.json({ success: true }));

      // Generate token first
      const tokenData = mockCSRFService.generateToken();

      // Create form data with CSRF token
      const formData = new FormData();
      formData.append("_csrf", tokenData.token);
      formData.append("data", "test");

      const response = await app.request("/test", {
        method: "POST",
        body: formData,
        headers: {
          Cookie: `test-csrf-hash=${tokenData.hash}`,
        },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ success: true });
    });

    it("should handle JSON body CSRF token", async () => {
      const config: Partial<CSRFConfig> = {
        enabled: true,
        cookieName: "test-csrf",
      };
      const middleware = createCSRFMiddleware(config, {
        csrfService: mockCSRFService,
      });

      app.use("*", middleware);
      app.post("/test", (c) => c.json({ success: true }));

      // Generate token first
      const tokenData = mockCSRFService.generateToken();

      const response = await app.request("/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `test-csrf-hash=${tokenData.hash}`,
        },
        body: JSON.stringify({
          _csrf: tokenData.token,
          data: "test",
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ success: true });
    });

    it("should respect custom skip methods", async () => {
      const config: Partial<CSRFConfig> = {
        enabled: true,
        skipMethods: ["GET", "HEAD", "OPTIONS", "POST"], // Include POST in skip methods
      };
      const middleware = createCSRFMiddleware(config, {
        csrfService: mockCSRFService,
      });

      app.use("*", middleware);
      app.post("/test", (c) => c.json({ success: true }));

      const response = await app.request("/test", { method: "POST" });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toEqual({ success: true });
    });
  });

  describe("createCSRFTokenMiddleware", () => {
    it("should generate CSRF token and expose it", async () => {
      const middleware = createCSRFTokenMiddleware({
        csrfService: mockCSRFService,
      });

      app.use("*", middleware);
      app.get("/token", (c) => {
        const csrfToken = c.get("csrfToken");
        const csrfTokenData = c.get("csrfTokenData");
        return c.json({ csrfToken, hasTokenData: !!csrfTokenData });
      });

      const response = await app.request("/token");
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.csrfToken).toBeDefined();
      expect(typeof body.csrfToken).toBe("string");
      expect(body.hasTokenData).toBe(true);
    });

    it("should skip when CSRF protection is disabled", async () => {
      const middleware = createCSRFTokenMiddleware(
        {
          csrfService: mockCSRFService,
        },
        {
          enabled: false,
        },
      );

      app.use("*", middleware);
      app.get("/token", (c) => {
        const csrfToken = c.get("csrfToken");
        return c.json({ csrfToken: csrfToken || null });
      });

      const response = await app.request("/token");
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.csrfToken).toBeNull();
    });
  });

  describe("CSRFError", () => {
    it("should create CSRF error with default message", () => {
      const error = new CSRFError();
      expect(error.message).toBe("Invalid CSRF token");
      expect(error.errorCode).toBe(401);
    });

    it("should create CSRF error with custom message", () => {
      const error = new CSRFError("Custom CSRF error");
      expect(error.message).toBe("Custom CSRF error");
      expect(error.errorCode).toBe(401);
    });
  });

  describe("cookie security", () => {
    it("should set secure cookies in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const config: Partial<CSRFConfig> = {
        enabled: true,
        cookieName: "test-csrf",
        secure: true,
      };
      const middleware = createCSRFMiddleware(config, {
        csrfService: mockCSRFService,
      });

      app.use("*", middleware);
      app.get("/test", (c) => c.json({ success: true }));

      const response = await app.request("/test");
      const setCookieHeaders = response.headers.getSetCookie();

      const hasSecureCookie = setCookieHeaders.some((header) =>
        header.includes("Secure"),
      );
      expect(hasSecureCookie).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });

    it("should set SameSite cookies", async () => {
      const config: Partial<CSRFConfig> = {
        enabled: true,
        cookieName: "test-csrf",
        sameSite: "strict",
      };
      const middleware = createCSRFMiddleware(config, {
        csrfService: mockCSRFService,
      });

      app.use("*", middleware);
      app.get("/test", (c) => c.json({ success: true }));

      const response = await app.request("/test");
      const setCookieHeaders = response.headers.getSetCookie();

      const hasSameSiteCookie = setCookieHeaders.some((header) =>
        header.includes("SameSite=Strict"),
      );
      expect(hasSameSiteCookie).toBe(true);
    });
  });

  describe("CSRF token validation edge cases", () => {
    it("should handle form data parsing as fallback for unknown content type", async () => {
      const config: Partial<CSRFConfig> = {
        enabled: true,
        cookieName: "test-csrf",
      };
      const middleware = createCSRFMiddleware(config, {
        csrfService: mockCSRFService,
      });

      app.use("*", middleware);
      app.post("/test", (c) => c.json({ success: true }));

      // Mock cookies for hash validation
      vi.doMock("hono/cookie", () => ({
        getCookie: (c: any, name: string) => {
          if (name === "test-csrf-hash") return "test-hash";
          return undefined;
        },
        setCookie: vi.fn(),
      }));

      mockCSRFService.validateToken = vi.fn().mockReturnValue(true);

      // Create form data with CSRF token
      const formData = new FormData();
      formData.append("_csrf", "test-token");
      formData.append("data", "test");

      const response = await app.request("/test", {
        method: "POST",
        headers: {
          "Content-Type": "unknown/type", // Unknown content type to trigger fallback
        },
        body: formData,
      });

      expect(response.status).toBe(200);
      expect(mockCSRFService.validateToken).toHaveBeenCalledWith(
        "test-token",
        "test-hash",
        3600000,
      );
    });

    it("should handle JSON parsing as final fallback when form parsing fails", async () => {
      const config: Partial<CSRFConfig> = {
        enabled: true,
        cookieName: "test-csrf",
      };
      const middleware = createCSRFMiddleware(config, {
        csrfService: mockCSRFService,
      });

      app.use("*", middleware);
      app.post("/test", (c) => c.json({ success: true }));

      // Mock cookies for hash validation
      vi.doMock("hono/cookie", () => ({
        getCookie: (c: any, name: string) => {
          if (name === "test-csrf-hash") return "test-hash";
          return undefined;
        },
        setCookie: vi.fn(),
      }));

      mockCSRFService.validateToken = vi.fn().mockReturnValue(true);

      const response = await app.request("/test", {
        method: "POST",
        headers: {
          "Content-Type": "unknown/type",
        },
        body: JSON.stringify({ _csrf: "test-token", data: "test" }),
      });

      expect(response.status).toBe(200);
      expect(mockCSRFService.validateToken).toHaveBeenCalledWith(
        "test-token",
        "test-hash",
        3600000,
      );
    });

    it("should throw error when no hash cookie is found", async () => {
      const config: Partial<CSRFConfig> = {
        enabled: true,
        cookieName: "test-csrf",
      };
      const middleware = createCSRFMiddleware(config, {
        csrfService: mockCSRFService,
      });

      app.use("*", middleware);
      app.post("/test", (c) => c.json({ success: true }));

      // Mock cookies to return no hash
      vi.doMock("hono/cookie", () => ({
        getCookie: (c: any, name: string) => {
          return undefined; // No hash cookie found
        },
        setCookie: vi.fn(),
      }));

      const response = await app.request("/test", {
        method: "POST",
        headers: {
          "X-CSRF-Token": "test-token",
        },
      });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("CSRF token validation failed - no hash found");
    });
  });

  describe("CSRF response middleware", () => {
    it("should enhance JSON responses with CSRF token", async () => {
      const responseMiddleware = createCSRFResponseMiddleware();

      app.use("*", responseMiddleware);
      app.get("/test", (c) => {
        c.set("csrfToken", "test-csrf-token");
        return c.json({ data: "test response" });
      });

      const response = await app.request("/test");
      const body = await response.json();

      expect(body).toEqual({
        data: "test response",
        csrfToken: "test-csrf-token",
      });
    });

    it("should skip enhancement for non-JSON responses", async () => {
      const responseMiddleware = createCSRFResponseMiddleware();

      app.use("*", responseMiddleware);
      app.get("/test", (c) => {
        c.set("csrfToken", "test-csrf-token");
        return c.text("plain text response");
      });

      const response = await app.request("/test");
      const body = await response.text();

      expect(body).toBe("plain text response");
      expect(body).not.toContain("csrfToken");
    });

    it("should handle response parsing errors gracefully", async () => {
      const responseMiddleware = createCSRFResponseMiddleware();

      app.use("*", responseMiddleware);
      app.get("/test", (c) => {
        c.set("csrfToken", "test-csrf-token");
        // Create a response that looks like JSON but isn't valid
        return new Response("invalid json content", {
          headers: { "content-type": "application/json" },
        });
      });

      const response = await app.request("/test");
      const body = await response.text();

      expect(body).toBe("invalid json content");
      expect(response.status).toBe(200);
    });

    it("should not enhance responses without CSRF token", async () => {
      const responseMiddleware = createCSRFResponseMiddleware();

      app.use("*", responseMiddleware);
      app.get("/test", (c) => c.json({ data: "test response" }));

      const response = await app.request("/test");
      const body = await response.json();

      expect(body).toEqual({
        data: "test response",
      });
      expect(body.csrfToken).toBeUndefined();
    });
  });
});
