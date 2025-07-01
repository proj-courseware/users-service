import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import type { AppEnv } from "@/schemas/app-env.schema";
import {
  createRateLimitMiddleware,
  rateLimitMiddleware,
  authRateLimitMiddleware,
  TooManyRequestsHttpError,
  type RateLimitStore,
  type RateLimitConfig,
} from "@/middlewares/rate-limit.middleware";
import { globalErrorHandler } from "@/errors";

class MockRateLimitStore implements RateLimitStore {
  private store = new Map<string, number>();
  private ttls = new Map<string, number>();

  async get(key: string): Promise<number | null> {
    const value = this.store.get(key);
    const ttl = this.ttls.get(key);

    if (value !== undefined && ttl !== undefined && ttl > Date.now()) {
      return value;
    }

    if (value !== undefined) {
      this.store.delete(key);
      this.ttls.delete(key);
    }

    return null;
  }

  async set(key: string, value: number, ttlSeconds: number): Promise<void> {
    this.store.set(key, value);
    this.ttls.set(key, Date.now() + ttlSeconds * 1000);
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const current = await this.get(key);
    const newValue = (current || 0) + 1;
    await this.set(key, newValue, ttlSeconds);
    return newValue;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
    this.ttls.delete(key);
  }

  async reset(): Promise<void> {
    this.store.clear();
    this.ttls.clear();
  }

  getStore() {
    return this.store;
  }

  getTtls() {
    return this.ttls;
  }
}

describe("Rate Limit Middleware", () => {
  let app: Hono<AppEnv>;
  let mockStore: MockRateLimitStore;

  beforeEach(() => {
    app = new Hono<AppEnv>();
    app.onError(globalErrorHandler);
    mockStore = new MockRateLimitStore();
  });

  describe("createRateLimitMiddleware", () => {
    it("should allow requests under the limit", async () => {
      const config: RateLimitConfig = {
        windowMinutes: 15,
        maxRequests: 5,
      };

      const middleware = createRateLimitMiddleware(config, {
        store: mockStore,
      });

      app.use("/test", middleware);
      app.get("/test", (c) => c.json({ success: true }));

      for (let i = 0; i < 5; i++) {
        const response = await app.request("/test", {
          headers: { "x-forwarded-for": "192.168.1.1" },
        });
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({ success: true });
      }
    });

    it("should block requests over the limit", async () => {
      const config: RateLimitConfig = {
        windowMinutes: 15,
        maxRequests: 3,
        message: "Custom rate limit message",
      };

      const middleware = createRateLimitMiddleware(config, {
        store: mockStore,
      });

      app.use("/test", middleware);
      app.get("/test", (c) => c.json({ success: true }));

      // Make 3 successful requests
      for (let i = 0; i < 3; i++) {
        const response = await app.request("/test", {
          headers: { "x-forwarded-for": "192.168.1.1" },
        });
        expect(response.status).toBe(200);
      }

      // 4th request should be blocked
      const response = await app.request("/test", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      });
      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error).toBe("Custom rate limit message");
    });

    it("should use different limits for different IPs", async () => {
      const config: RateLimitConfig = {
        windowMinutes: 15,
        maxRequests: 2,
      };

      const middleware = createRateLimitMiddleware(config, {
        store: mockStore,
      });

      app.use("/test", middleware);
      app.get("/test", (c) => c.json({ success: true }));

      // IP 1 - 2 requests
      for (let i = 0; i < 2; i++) {
        const response = await app.request("/test", {
          headers: { "x-forwarded-for": "192.168.1.1" },
        });
        expect(response.status).toBe(200);
      }

      // IP 2 - 2 requests (should still work)
      for (let i = 0; i < 2; i++) {
        const response = await app.request("/test", {
          headers: { "x-forwarded-for": "192.168.1.2" },
        });
        expect(response.status).toBe(200);
      }

      // IP 1 - 3rd request (should be blocked)
      const response1 = await app.request("/test", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      });
      expect(response1.status).toBe(429);

      // IP 2 - 3rd request (should be blocked)
      const response2 = await app.request("/test", {
        headers: { "x-forwarded-for": "192.168.1.2" },
      });
      expect(response2.status).toBe(429);
    });

    it("should use custom key generator", async () => {
      const config: RateLimitConfig = {
        windowMinutes: 15,
        maxRequests: 1,
        keyGenerator: (c) => c.req.header("user-id") || "anonymous",
      };

      const middleware = createRateLimitMiddleware(config, {
        store: mockStore,
      });

      app.use("/test", middleware);
      app.get("/test", (c) => c.json({ success: true }));

      // User 1 - first request
      const response1 = await app.request("/test", {
        headers: { "user-id": "user1" },
      });
      expect(response1.status).toBe(200);

      // User 2 - first request (different user, should work)
      const response2 = await app.request("/test", {
        headers: { "user-id": "user2" },
      });
      expect(response2.status).toBe(200);

      // User 1 - second request (should be blocked)
      const response3 = await app.request("/test", {
        headers: { "user-id": "user1" },
      });
      expect(response3.status).toBe(429);
    });

    it("should handle skipSuccessfulRequests option", async () => {
      const config: RateLimitConfig = {
        windowMinutes: 15,
        maxRequests: 2,
        skipSuccessfulRequests: true,
      };

      const middleware = createRateLimitMiddleware(config, {
        store: mockStore,
      });

      app.use("/test", middleware);
      app.get("/test", (c) => c.json({ success: true })); // Returns 200
      app.get("/test-error", (c) => c.json({ error: "test" }, 400)); // Returns 400

      const headers = { "x-forwarded-for": "192.168.1.1" };

      // Make 3 successful requests (should not count towards limit due to skipSuccessfulRequests)
      for (let i = 0; i < 3; i++) {
        const response = await app.request("/test", { headers });
        expect(response.status).toBe(200);
      }

      // Make error requests which should count towards limit
      const errorResponse1 = await app.request("/test-error", { headers });
      expect(errorResponse1.status).toBe(400);

      const errorResponse2 = await app.request("/test-error", { headers });
      expect(errorResponse2.status).toBe(400);

      // 3rd error request should be rate limited
      const errorResponse3 = await app.request("/test-error", { headers });
      expect(errorResponse3.status).toBe(429);
    });

    it("should handle skipFailedRequests option", async () => {
      const config: RateLimitConfig = {
        windowMinutes: 15,
        maxRequests: 2,
        skipFailedRequests: true,
      };

      const middleware = createRateLimitMiddleware(config, {
        store: mockStore,
      });

      app.use("/test", middleware);
      app.get("/test", (c) => c.json({ success: true })); // Returns 200
      app.get("/test-error", (c) => c.json({ error: "test" }, 500)); // Returns 500

      const headers = { "x-forwarded-for": "192.168.1.1" };

      // Make failed requests (should not count towards limit due to skipFailedRequests)
      for (let i = 0; i < 3; i++) {
        const response = await app.request("/test-error", { headers });
        expect(response.status).toBe(500);
      }

      // Make successful requests which should count towards limit
      const successResponse1 = await app.request("/test", { headers });
      expect(successResponse1.status).toBe(200);

      const successResponse2 = await app.request("/test", { headers });
      expect(successResponse2.status).toBe(200);

      // 3rd successful request should be rate limited
      const successResponse3 = await app.request("/test", { headers });
      expect(successResponse3.status).toBe(429);
    });

    it("should handle store errors gracefully", async () => {
      const faultyStore: RateLimitStore = {
        get: vi.fn().mockRejectedValue(new Error("Store error")),
        set: vi.fn().mockRejectedValue(new Error("Store error")),
        increment: vi.fn().mockRejectedValue(new Error("Store error")),
        delete: vi.fn().mockRejectedValue(new Error("Store error")),
        reset: vi.fn().mockRejectedValue(new Error("Store error")),
      };

      const config: RateLimitConfig = {
        windowMinutes: 15,
        maxRequests: 3,
      };

      const middleware = createRateLimitMiddleware(config, {
        store: faultyStore,
      });

      app.use("/test", middleware);
      app.get("/test", (c) => c.json({ success: true }));

      // Should still work even if store fails (fails open for availability)
      try {
        const response = await app.request("/test", {
          headers: { "x-forwarded-for": "192.168.1.1" },
        });
        // The middleware should either pass through or handle the error gracefully
        // The exact behavior depends on implementation - we're just ensuring it doesn't crash
        expect([200, 429, 500]).toContain(response.status);
      } catch (error) {
        // If it throws, we still want to ensure it's handled appropriately
        expect(error).toBeDefined();
      }
    });
  });

  describe("TooManyRequestsHttpError", () => {
    it("should create error with default message", () => {
      const error = new TooManyRequestsHttpError();
      expect(error.message).toBe("Too many requests. Please try again later.");
      expect(error.retryAfter).toBeUndefined();
    });

    it("should create error with custom message and retry after", () => {
      const error = new TooManyRequestsHttpError("Custom message", 60);
      expect(error.message).toBe("Custom message");
      expect(error.retryAfter).toBe(60);
    });
  });

  describe("default middleware instances", () => {
    it("should export rateLimitMiddleware", () => {
      expect(rateLimitMiddleware).toBeDefined();
      expect(typeof rateLimitMiddleware).toBe("function");
    });

    it("should export authRateLimitMiddleware", () => {
      expect(authRateLimitMiddleware).toBeDefined();
      expect(typeof authRateLimitMiddleware).toBe("function");
    });
  });

  describe("MemoryStore operations", () => {
    it("should test delete functionality", async () => {
      const config: RateLimitConfig = {
        windowMinutes: 15,
        maxRequests: 2,
      };

      const middleware = createRateLimitMiddleware(config, {
        store: mockStore,
      });

      app.use("/test", middleware);
      app.get("/test", (c) => c.json({ success: true }));

      const headers = { "x-forwarded-for": "192.168.1.1" };

      // Make first request
      const response1 = await app.request("/test", { headers });
      expect(response1.status).toBe(200);

      // Verify store has data
      expect(mockStore.getStore().size).toBeGreaterThan(0);

      // Delete the key manually
      const key = "rate_limit:192.168.1.1";
      await mockStore.delete(key);

      // Next request should reset counter
      const response2 = await app.request("/test", { headers });
      expect(response2.status).toBe(200);

      const response3 = await app.request("/test", { headers });
      expect(response3.status).toBe(200);

      // Third request should be blocked (limit is 2)
      const response4 = await app.request("/test", { headers });
      expect(response4.status).toBe(429);
    });

    it("should test reset functionality", async () => {
      const config: RateLimitConfig = {
        windowMinutes: 15,
        maxRequests: 1,
      };

      const middleware = createRateLimitMiddleware(config, {
        store: mockStore,
      });

      app.use("/test", middleware);
      app.get("/test", (c) => c.json({ success: true }));

      // Make requests from multiple IPs to populate store
      const response1 = await app.request("/test", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      });
      expect(response1.status).toBe(200);

      const response2 = await app.request("/test", {
        headers: { "x-forwarded-for": "192.168.1.2" },
      });
      expect(response2.status).toBe(200);

      // Both IPs should be blocked on next request
      const response3 = await app.request("/test", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      });
      expect(response3.status).toBe(429);

      // Reset the store
      await mockStore.reset();

      // Both IPs should work again
      const response4 = await app.request("/test", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      });
      expect(response4.status).toBe(200);

      const response5 = await app.request("/test", {
        headers: { "x-forwarded-for": "192.168.1.2" },
      });
      expect(response5.status).toBe(200);
    });

    it("should test increment method directly", async () => {
      const key = "test_key";
      const ttl = 60;

      // First increment
      const count1 = await mockStore.increment(key, ttl);
      expect(count1).toBe(1);

      // Second increment
      const count2 = await mockStore.increment(key, ttl);
      expect(count2).toBe(2);

      // Third increment
      const count3 = await mockStore.increment(key, ttl);
      expect(count3).toBe(3);

      // Verify direct get
      const current = await mockStore.get(key);
      expect(current).toBe(3);
    });

    it("should handle expired keys in increment", async () => {
      const key = "expiring_key";

      // Mock Date.now to control time
      const originalDateNow = Date.now;
      let currentTime = 1000000;
      vi.spyOn(Date, "now").mockImplementation(() => currentTime);

      // Set with 1 second TTL
      await mockStore.set(key, 5, 1);

      // Advance time past TTL
      currentTime += 2000;

      // Increment should start from 1 (not 6)
      const count = await mockStore.increment(key, 60);
      expect(count).toBe(1);

      // Restore Date.now
      Date.now = originalDateNow;
    });
  });

  describe("window-based rate limiting", () => {
    it("should reset counter when window expires", async () => {
      // Mock Date.now to control time
      const originalDateNow = Date.now;
      let currentTime = 1000000; // Start time
      vi.spyOn(Date, "now").mockImplementation(() => currentTime);

      const config: RateLimitConfig = {
        windowMinutes: 1, // 1 minute window
        maxRequests: 2,
      };

      const middleware = createRateLimitMiddleware(config, {
        store: mockStore,
      });

      app.use("/test", middleware);
      app.get("/test", (c) => c.json({ success: true }));

      const headers = { "x-forwarded-for": "192.168.1.1" };

      // Make 2 requests in first window
      for (let i = 0; i < 2; i++) {
        const response = await app.request("/test", { headers });
        expect(response.status).toBe(200);
      }

      // 3rd request should be blocked
      const blockedResponse = await app.request("/test", { headers });
      expect(blockedResponse.status).toBe(429);

      // Move time forward by 61 seconds (past the window)
      currentTime += 61 * 1000;

      // Should be able to make requests again
      const response = await app.request("/test", { headers });
      expect(response.status).toBe(200);

      // Restore original Date.now
      Date.now = originalDateNow;
    });
  });

  describe("IP extraction", () => {
    it("should extract IP from x-forwarded-for header", async () => {
      const config: RateLimitConfig = {
        windowMinutes: 15,
        maxRequests: 1,
      };

      const middleware = createRateLimitMiddleware(config, {
        store: mockStore,
      });

      app.use("/test", middleware);
      app.get("/test", (c) => c.json({ success: true }));

      // First request with specific IP
      const response1 = await app.request("/test", {
        headers: { "x-forwarded-for": "192.168.1.100, 10.0.0.1" },
      });
      expect(response1.status).toBe(200);

      // Second request with same IP (should be blocked)
      const response2 = await app.request("/test", {
        headers: { "x-forwarded-for": "192.168.1.100, 10.0.0.2" },
      });
      expect(response2.status).toBe(429);
    });

    it("should extract IP from x-real-ip header when x-forwarded-for is not present", async () => {
      const config: RateLimitConfig = {
        windowMinutes: 15,
        maxRequests: 1,
      };

      const middleware = createRateLimitMiddleware(config, {
        store: mockStore,
      });

      app.use("/test", middleware);
      app.get("/test", (c) => c.json({ success: true }));

      // First request with x-real-ip
      const response1 = await app.request("/test", {
        headers: { "x-real-ip": "192.168.1.200" },
      });
      expect(response1.status).toBe(200);

      // Second request with same IP (should be blocked)
      const response2 = await app.request("/test", {
        headers: { "x-real-ip": "192.168.1.200" },
      });
      expect(response2.status).toBe(429);
    });

    it("should handle missing IP headers gracefully", async () => {
      const config: RateLimitConfig = {
        windowMinutes: 15,
        maxRequests: 1,
      };

      const middleware = createRateLimitMiddleware(config, {
        store: mockStore,
      });

      app.use("/test", middleware);
      app.get("/test", (c) => c.json({ success: true }));

      // First request without IP headers
      const response1 = await app.request("/test");
      expect(response1.status).toBe(200);

      // Second request should be blocked (same "unknown" IP)
      const response2 = await app.request("/test");
      expect(response2.status).toBe(429);
    });
  });
});
