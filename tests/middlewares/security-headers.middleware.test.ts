import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import type { AppEnv } from "@/schemas/app-env.schema";
import {
  createSecurityHeadersMiddleware,
  securityHeadersMiddleware,
  devSecurityHeadersMiddleware,
} from "@/middlewares/security-headers.middleware";

describe("Security Headers Middleware", () => {
  let app: Hono<AppEnv>;

  beforeEach(() => {
    app = new Hono<AppEnv>();
  });

  describe("Default Security Headers", () => {
    beforeEach(() => {
      app.use("*", securityHeadersMiddleware);
      app.get("/test", (c) => c.json({ message: "test" }));
    });

    it("should set X-Frame-Options to DENY", async () => {
      const res = await app.request("/test");
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    });

    it("should set X-Content-Type-Options to nosniff", async () => {
      const res = await app.request("/test");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("should set Referrer-Policy", async () => {
      const res = await app.request("/test");
      expect(res.headers.get("Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin",
      );
    });

    it("should set X-XSS-Protection", async () => {
      const res = await app.request("/test");
      expect(res.headers.get("X-XSS-Protection")).toBe("1; mode=block");
    });

    it("should set Content-Security-Policy with default values", async () => {
      const res = await app.request("/test");
      const csp = res.headers.get("Content-Security-Policy");

      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("upgrade-insecure-requests");
      expect(csp).toContain("block-all-mixed-content");
    });

    it("should set Cross-Origin policies", async () => {
      const res = await app.request("/test");

      expect(res.headers.get("Cross-Origin-Embedder-Policy")).toBe(
        "unsafe-none",
      );
      expect(res.headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
      expect(res.headers.get("Cross-Origin-Resource-Policy")).toBe(
        "same-origin",
      );
    });

    it("should set Permissions-Policy", async () => {
      const res = await app.request("/test");
      const policy = res.headers.get("Permissions-Policy");

      expect(policy).toContain("camera=()");
      expect(policy).toContain("microphone=()");
      expect(policy).toContain("geolocation=()");
    });

    it("should set custom authentication service headers", async () => {
      const res = await app.request("/test");

      expect(res.headers.get("X-Service-Type")).toBe("authentication");
      expect(res.headers.get("X-API-Version")).toBe("1.0");
    });

    it("should remove Server header by default", async () => {
      const res = await app.request("/test");
      expect(res.headers.get("Server")).toBeNull();
    });

    it("should remove X-Powered-By header by default", async () => {
      const res = await app.request("/test");
      expect(res.headers.get("X-Powered-By")).toBeNull();
    });
  });

  describe("HSTS Header", () => {
    it("should set HSTS on HTTPS requests", async () => {
      app.use("*", securityHeadersMiddleware);
      app.get("/test", (c) => c.json({ message: "test" }));

      const req = new Request("https://example.com/test");
      const res = await app.request(req);

      const hsts = res.headers.get("Strict-Transport-Security");
      expect(hsts).toContain("max-age=31536000");
      expect(hsts).toContain("includeSubDomains");
    });

    it("should set HSTS when x-forwarded-proto is https", async () => {
      app.use("*", securityHeadersMiddleware);
      app.get("/test", (c) => c.json({ message: "test" }));

      const req = new Request("http://example.com/test", {
        headers: { "x-forwarded-proto": "https" },
      });
      const res = await app.request(req);

      expect(res.headers.get("Strict-Transport-Security")).toContain(
        "max-age=31536000",
      );
    });

    it("should not set HSTS on HTTP requests", async () => {
      app.use("*", securityHeadersMiddleware);
      app.get("/test", (c) => c.json({ message: "test" }));

      const req = new Request("http://example.com/test");
      const res = await app.request(req);

      expect(res.headers.get("Strict-Transport-Security")).toBeNull();
    });
  });

  describe("Custom Configuration", () => {
    it("should allow custom CSP configuration", async () => {
      const customMiddleware = createSecurityHeadersMiddleware({
        contentSecurityPolicy: {
          defaultSrc: ["'self'", "https://api.example.com"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
        },
      });

      app.use("*", customMiddleware);
      app.get("/test", (c) => c.json({ message: "test" }));

      const res = await app.request("/test");
      const csp = res.headers.get("Content-Security-Policy");

      expect(csp).toContain("default-src 'self' https://api.example.com");
      expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    });

    it("should allow custom frame options", async () => {
      const customMiddleware = createSecurityHeadersMiddleware({
        frameOptions: "SAMEORIGIN",
      });

      app.use("*", customMiddleware);
      app.get("/test", (c) => c.json({ message: "test" }));

      const res = await app.request("/test");
      expect(res.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    });

    it("should allow custom HSTS configuration", async () => {
      const customMiddleware = createSecurityHeadersMiddleware({
        hsts: {
          maxAge: 7776000, // 90 days
          includeSubDomains: false,
          preload: true,
        },
      });

      app.use("*", customMiddleware);
      app.get("/test", (c) => c.json({ message: "test" }));

      const req = new Request("https://example.com/test");
      const res = await app.request(req);

      const hsts = res.headers.get("Strict-Transport-Security");
      expect(hsts).toBe("max-age=7776000; preload");
    });

    it("should allow custom headers", async () => {
      const customMiddleware = createSecurityHeadersMiddleware({
        customHeaders: {
          "X-Custom-Header": "custom-value",
          "X-API-Rate-Limit": "1000",
        },
      });

      app.use("*", customMiddleware);
      app.get("/test", (c) => c.json({ message: "test" }));

      const res = await app.request("/test");
      expect(res.headers.get("X-Custom-Header")).toBe("custom-value");
      expect(res.headers.get("X-API-Rate-Limit")).toBe("1000");
    });

    it("should allow custom permissions policy", async () => {
      const customMiddleware = createSecurityHeadersMiddleware({
        permissionsPolicy: {
          camera: ["'self'"],
          microphone: ["'self'", "https://trusted.com"],
          geolocation: [],
        },
      });

      app.use("*", customMiddleware);
      app.get("/test", (c) => c.json({ message: "test" }));

      const res = await app.request("/test");
      const policy = res.headers.get("Permissions-Policy");

      expect(policy).toContain("camera=('self')");
      expect(policy).toContain("microphone=('self' https://trusted.com)");
      expect(policy).toContain("geolocation=()");
    });

    it("should allow disabling header removal", async () => {
      const customMiddleware = createSecurityHeadersMiddleware({
        removeServerHeader: false,
        removePoweredBy: false,
      });

      app.use("*", customMiddleware);
      app.get("/test", (c) => {
        c.res.headers.set("Server", "Custom Server");
        c.res.headers.set("X-Powered-By", "Custom Framework");
        return c.json({ message: "test" });
      });

      const res = await app.request("/test");
      expect(res.headers.get("Server")).toBe("Custom Server");
      expect(res.headers.get("X-Powered-By")).toBe("Custom Framework");
    });
  });

  describe("Development Security Headers", () => {
    beforeEach(() => {
      app.use("*", devSecurityHeadersMiddleware);
      app.get("/test", (c) => c.json({ message: "test" }));
    });

    it("should allow unsafe-eval and unsafe-inline in script-src for development", async () => {
      const res = await app.request("/test");
      const csp = res.headers.get("Content-Security-Policy");

      expect(csp).toContain("script-src 'self' 'unsafe-eval' 'unsafe-inline'");
    });

    it("should allow WebSocket connections for hot reload", async () => {
      const res = await app.request("/test");
      const csp = res.headers.get("Content-Security-Policy");

      expect(csp).toContain("connect-src 'self' ws: wss:");
    });

    it("should not enforce HTTPS upgrade in development", async () => {
      const res = await app.request("/test");
      const csp = res.headers.get("Content-Security-Policy");

      expect(csp).not.toContain("upgrade-insecure-requests");
      expect(csp).not.toContain("block-all-mixed-content");
    });

    it("should set development environment header", async () => {
      const res = await app.request("/test");
      expect(res.headers.get("X-Environment")).toBe("development");
    });

    it("should disable HSTS in development", async () => {
      const req = new Request("https://example.com/test");
      const res = await app.request(req);

      const hsts = res.headers.get("Strict-Transport-Security");
      expect(hsts).toBe("max-age=0");
    });
  });

  describe("CSP Builder", () => {
    it("should handle null CSP configuration", async () => {
      const customMiddleware = createSecurityHeadersMiddleware({
        contentSecurityPolicy: null,
      });

      app.use("*", customMiddleware);
      app.get("/test", (c) => c.json({ message: "test" }));

      const res = await app.request("/test");
      expect(res.headers.get("Content-Security-Policy")).toBeNull();
    });

    it("should build CSP with all directive types", async () => {
      const customMiddleware = createSecurityHeadersMiddleware({
        contentSecurityPolicy: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "https://cdn.example.com"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          childSrc: ["'none'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: true,
          blockAllMixedContent: true,
        },
      });

      app.use("*", customMiddleware);
      app.get("/test", (c) => c.json({ message: "test" }));

      const res = await app.request("/test");
      const csp = res.headers.get("Content-Security-Policy");

      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self' https://cdn.example.com");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      expect(csp).toContain("img-src 'self' data: https:");
      expect(csp).toContain("connect-src 'self'");
      expect(csp).toContain("font-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("media-src 'self'");
      expect(csp).toContain("frame-src 'none'");
      expect(csp).toContain("child-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).toContain("upgrade-insecure-requests");
      expect(csp).toContain("block-all-mixed-content");
    });
  });

  describe("Cross-Origin Headers", () => {
    it("should set all cross-origin headers with custom values", async () => {
      const customMiddleware = createSecurityHeadersMiddleware({
        crossOriginEmbedderPolicy: "require-corp",
        crossOriginOpenerPolicy: "same-origin-allow-popups",
        crossOriginResourcePolicy: "cross-origin",
      });

      app.use("*", customMiddleware);
      app.get("/test", (c) => c.json({ message: "test" }));

      const res = await app.request("/test");

      expect(res.headers.get("Cross-Origin-Embedder-Policy")).toBe(
        "require-corp",
      );
      expect(res.headers.get("Cross-Origin-Opener-Policy")).toBe(
        "same-origin-allow-popups",
      );
      expect(res.headers.get("Cross-Origin-Resource-Policy")).toBe(
        "cross-origin",
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle null permissions policy", async () => {
      const customMiddleware = createSecurityHeadersMiddleware({
        permissionsPolicy: null,
      });

      app.use("*", customMiddleware);
      app.get("/test", (c) => c.json({ message: "test" }));

      const res = await app.request("/test");
      expect(res.headers.get("Permissions-Policy")).toBeNull();
    });

    it("should handle null HSTS configuration", async () => {
      const customMiddleware = createSecurityHeadersMiddleware({
        hsts: null,
      });

      app.use("*", customMiddleware);
      app.get("/test", (c) => c.json({ message: "test" }));

      const req = new Request("https://example.com/test");
      const res = await app.request(req);

      expect(res.headers.get("Strict-Transport-Security")).toBeNull();
    });

    it("should merge custom config with defaults correctly", async () => {
      const customMiddleware = createSecurityHeadersMiddleware({
        frameOptions: "SAMEORIGIN",
        customHeaders: {
          "X-Custom": "value",
        },
      });

      app.use("*", customMiddleware);
      app.get("/test", (c) => c.json({ message: "test" }));

      const res = await app.request("/test");

      // Custom values should override defaults
      expect(res.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
      expect(res.headers.get("X-Custom")).toBe("value");

      // Defaults should still be present
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin",
      );
    });
  });
});
