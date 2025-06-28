import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import type { AppEnv } from "@/schemas/app-env.schema";
import { TooManyRequestsError } from "@/errors";
import { env } from "@/env";

export interface RateLimitConfig {
  windowMinutes: number;
  maxRequests: number;
  keyGenerator?: (c: Context<AppEnv>) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

export interface RateLimitStore {
  get(key: string): Promise<number | null>;
  set(key: string, value: number, ttlSeconds: number): Promise<void>;
  increment(key: string, ttlSeconds: number): Promise<number>;
  delete(key: string): Promise<void>;
  reset(): Promise<void>;
}

class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { value: number; expires: number }>();

  async get(key: string): Promise<number | null> {
    const item = this.store.get(key);
    if (!item || item.expires < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: number, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1000,
    });
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const current = await this.get(key);
    const newValue = (current || 0) + 1;
    await this.set(key, newValue, ttlSeconds);
    return newValue;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async reset(): Promise<void> {
    this.store.clear();
  }
}

export class TooManyRequestsHttpError extends TooManyRequestsError {
  constructor(
    message: string = "Too many requests. Please try again later.",
    public retryAfter?: number,
  ) {
    super(message);
  }
}

export interface RateLimitDeps {
  store: RateLimitStore;
}

const defaultKeyGenerator = (c: Context<AppEnv>): string => {
  const ip = c.env?.CF_CONNECTING_IP || 
             c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
             c.req.header("x-real-ip") ||
             "unknown";
  const userAgent = c.req.header("user-agent") || "unknown";
  return `${ip}:${userAgent}`;
};

export const createRateLimitMiddleware = (
  config: RateLimitConfig,
  deps?: RateLimitDeps,
) => {
  const {
    windowMinutes,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = "Too many requests. Please try again later.",
  } = config;

  const store = deps?.store || new MemoryRateLimitStore();
  const windowSeconds = windowMinutes * 60;

  return createMiddleware<AppEnv>(async (c, next) => {
    try {
      const key = keyGenerator(c);
      const rateLimitKey = `rate_limit:${key}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;

      const currentCount = await store.get(rateLimitKey);
      
      if (currentCount !== null && currentCount >= maxRequests) {
        const retryAfter = windowSeconds;
        throw new TooManyRequestsHttpError(message, retryAfter);
      }

      let shouldCount = true;

      await next();

      if (skipSuccessfulRequests || skipFailedRequests) {
        // Get the response status code after the request is processed
        const statusCode = c.res?.status;

        if (skipSuccessfulRequests && statusCode && statusCode < 400) {
          shouldCount = false;
        }
        if (skipFailedRequests && statusCode && statusCode >= 400) {
          shouldCount = false;
        }
      }

      if (shouldCount) {
        await store.increment(rateLimitKey, windowSeconds);
      }
    } catch (error) {
      // If it's our rate limit error, re-throw it
      if (error instanceof TooManyRequestsHttpError) {
        throw error;
      }
      
      // For other errors, still count the request (unless skipFailedRequests is true)
      if (!skipFailedRequests) {
        const key = keyGenerator(c);
        const rateLimitKey = `rate_limit:${key}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
        try {
          await store.increment(rateLimitKey, windowSeconds);
        } catch (storeError) {
          // If store fails, log but don't block the request
          console.warn('Rate limit store error:', storeError);
        }
      }
      
      // Re-throw the original error
      throw error;
    }
  });
};

export const rateLimitMiddleware = createRateLimitMiddleware({
  windowMinutes: env.RATE_LIMIT_WINDOW_MINUTES,
  maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
});

export const authRateLimitMiddleware = createRateLimitMiddleware({
  windowMinutes: env.RATE_LIMIT_AUTH_WINDOW_MINUTES,
  maxRequests: env.RATE_LIMIT_AUTH_MAX_REQUESTS,
  message: "Too many authentication attempts. Please try again later.",
});