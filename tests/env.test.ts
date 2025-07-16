import { describe, it, expect } from "vitest";
import { z } from "zod";

// Expanded envSchema as in src/env.ts for comprehensive testing
const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(3000),
  // MongoDB URI Configuration
  MONGODB_HOST: z.string().default("localhost"),
  MONGODB_PORT: z.coerce.number().default(27017),
  MONGODB_USER: z.string().optional(),
  MONGODB_PASSWORD: z.string().optional(),
  MONGODB_DATABASE: z.string().default("users-service"),
  // JWT Configuration
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY_MINUTES: z.coerce.number().default(15),
  JWT_REFRESH_EXPIRY_DAYS: z.coerce.number().default(7),
  // Email Configuration
  SMTP_HOST: z.string().default("mailpit"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_ADDRESS: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().default("Authentication Service"),
  EMAIL_MAX_RETRIES: z.coerce.number().default(3),
  EMAIL_RETRY_DELAY_MS: z.coerce.number().default(1000),
  // Frontend Configuration
  FRONTEND_URL: z.string().url().default("http://localhost:3001"),
  // Mailpit Configuration
  MAILPIT_SMTP_PORT: z.coerce.number().default(1025),
  MAILPIT_WEB_PORT: z.coerce.number().default(8025),
  // Redis Configuration
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().default(15),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_AUTH_WINDOW_MINUTES: z.coerce.number().default(15),
  RATE_LIMIT_AUTH_MAX_REQUESTS: z.coerce.number().default(5),
  RATE_LIMIT_STRICT_MODE: z.coerce.boolean().default(true),
  // Session and CSRF Configuration
  SESSION_SECRET: z.string().min(32),
  SESSION_MAX_AGE_HOURS: z.coerce.number().default(24),
  CSRF_SECRET: z.string().min(32),
  CSRF_TOKEN_LENGTH: z.coerce.number().default(32),
  CSRF_COOKIE_NAME: z.string().default("csrf-token"),
  CSRF_HEADER_NAME: z.string().default("x-csrf-token"),
  ENABLE_CSRF_PROTECTION: z.coerce.boolean().default(true),
  // Password Policy Configuration
  PASSWORD_MIN_LENGTH: z.coerce.number().min(4).max(128).default(8),
  PASSWORD_MAX_LENGTH: z.coerce.number().min(8).max(256).default(128),
  PASSWORD_REQUIRE_UPPERCASE: z.coerce.boolean().default(true),
  PASSWORD_REQUIRE_LOWERCASE: z.coerce.boolean().default(true),
  PASSWORD_REQUIRE_NUMBERS: z.coerce.boolean().default(true),
  PASSWORD_REQUIRE_SPECIAL_CHARS: z.coerce.boolean().default(true),
  // OAuth Configuration
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_REDIRECT_URI: z.string().url().optional(),
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_REDIRECT_URI: z.string().url().optional(),
});

describe("envSchema", () => {
  it("accepts valid env object with all required fields", () => {
    const valid = {
      NODE_ENV: "production",
      PORT: 8080,
      MONGODB_HOST: "mongodb.example.com",
      MONGODB_PORT: 27017,
      MONGODB_USER: "testuser",
      MONGODB_PASSWORD: "testpass",
      MONGODB_DATABASE: "testdb",
      JWT_ACCESS_SECRET: "a".repeat(32),
      JWT_REFRESH_SECRET: "b".repeat(32),
      JWT_ACCESS_EXPIRY_MINUTES: 10,
      JWT_REFRESH_EXPIRY_DAYS: 5,
      SMTP_HOST: "mailpit",
      SMTP_PORT: 1025,
      SMTP_SECURE: false,
      SMTP_USER: "smtpuser",
      SMTP_PASSWORD: "smtppass",
      SMTP_FROM_ADDRESS: "admin@example.com",
      SMTP_FROM_NAME: "Auth Service",
      EMAIL_MAX_RETRIES: 2,
      EMAIL_RETRY_DELAY_MS: 500,
      FRONTEND_URL: "http://localhost:3001",
      MAILPIT_SMTP_PORT: 1025,
      MAILPIT_WEB_PORT: 8025,
      REDIS_HOST: "localhost",
      REDIS_PORT: 6379,
      REDIS_PASSWORD: "redispass",
      RATE_LIMIT_WINDOW_MINUTES: 10,
      RATE_LIMIT_MAX_REQUESTS: 50,
      RATE_LIMIT_AUTH_WINDOW_MINUTES: 10,
      RATE_LIMIT_AUTH_MAX_REQUESTS: 2,
      RATE_LIMIT_STRICT_MODE: false,
      SESSION_SECRET: "c".repeat(32),
      SESSION_MAX_AGE_HOURS: 12,
      CSRF_SECRET: "d".repeat(32),
      CSRF_TOKEN_LENGTH: 32,
      CSRF_COOKIE_NAME: "csrf-token",
      CSRF_HEADER_NAME: "x-csrf-token",
      ENABLE_CSRF_PROTECTION: true,
      PASSWORD_MIN_LENGTH: 8,
      PASSWORD_MAX_LENGTH: 128,
      PASSWORD_REQUIRE_UPPERCASE: true,
      PASSWORD_REQUIRE_LOWERCASE: true,
      PASSWORD_REQUIRE_NUMBERS: true,
      PASSWORD_REQUIRE_SPECIAL_CHARS: true,
      GOOGLE_CLIENT_ID: "google-client-id",
      GOOGLE_CLIENT_SECRET: "google-client-secret",
      GOOGLE_REDIRECT_URI: "http://localhost:3000/oauth2/google/callback",
      GITHUB_CLIENT_ID: "github-client-id",
      GITHUB_CLIENT_SECRET: "github-client-secret",
      GITHUB_REDIRECT_URI: "http://localhost:3000/oauth2/github/callback",
      LINKEDIN_CLIENT_ID: "linkedin-client-id",
      LINKEDIN_CLIENT_SECRET: "linkedin-client-secret",
      LINKEDIN_REDIRECT_URI: "http://localhost:3000/oauth2/linkedin/callback",
    };
    expect(envSchema.parse(valid)).toEqual(valid);
  });

  it("defaults values if missing", () => {
    const parsed = envSchema.parse({
      JWT_ACCESS_SECRET: "a".repeat(32),
      JWT_REFRESH_SECRET: "b".repeat(32),
      SESSION_SECRET: "c".repeat(32),
      CSRF_SECRET: "d".repeat(32),
    });
    expect(parsed.NODE_ENV).toBe("development");
    expect(parsed.PORT).toBe(3000);
    expect(parsed.MONGODB_HOST).toBe("localhost");
    expect(parsed.MONGODB_PORT).toBe(27017);
    expect(parsed.MONGODB_DATABASE).toBe("users-service");
    expect(parsed.JWT_ACCESS_EXPIRY_MINUTES).toBe(15);
    expect(parsed.JWT_REFRESH_EXPIRY_DAYS).toBe(7);
    expect(parsed.SMTP_HOST).toBe("mailpit");
    expect(parsed.SMTP_PORT).toBe(1025);
    expect(parsed.SMTP_SECURE).toBe(false);
    expect(parsed.SMTP_FROM_NAME).toBe("Authentication Service");
    expect(parsed.EMAIL_MAX_RETRIES).toBe(3);
    expect(parsed.EMAIL_RETRY_DELAY_MS).toBe(1000);
    expect(parsed.FRONTEND_URL).toBe("http://localhost:3001");
    expect(parsed.MAILPIT_SMTP_PORT).toBe(1025);
    expect(parsed.MAILPIT_WEB_PORT).toBe(8025);
    expect(parsed.REDIS_HOST).toBe("localhost");
    expect(parsed.REDIS_PORT).toBe(6379);
    expect(parsed.RATE_LIMIT_WINDOW_MINUTES).toBe(15);
    expect(parsed.RATE_LIMIT_MAX_REQUESTS).toBe(100);
    expect(parsed.RATE_LIMIT_AUTH_WINDOW_MINUTES).toBe(15);
    expect(parsed.RATE_LIMIT_AUTH_MAX_REQUESTS).toBe(5);
    expect(parsed.RATE_LIMIT_STRICT_MODE).toBe(true);
    expect(parsed.SESSION_MAX_AGE_HOURS).toBe(24);
    expect(parsed.CSRF_TOKEN_LENGTH).toBe(32);
    expect(parsed.CSRF_COOKIE_NAME).toBe("csrf-token");
    expect(parsed.CSRF_HEADER_NAME).toBe("x-csrf-token");
    expect(parsed.ENABLE_CSRF_PROTECTION).toBe(true);
    expect(parsed.PASSWORD_MIN_LENGTH).toBe(8);
    expect(parsed.PASSWORD_MAX_LENGTH).toBe(128);
    expect(parsed.PASSWORD_REQUIRE_UPPERCASE).toBe(true);
    expect(parsed.PASSWORD_REQUIRE_LOWERCASE).toBe(true);
    expect(parsed.PASSWORD_REQUIRE_NUMBERS).toBe(true);
    expect(parsed.PASSWORD_REQUIRE_SPECIAL_CHARS).toBe(true);
  });

  it("rejects secrets that are too short", () => {
    expect(() =>
      envSchema.parse({
        JWT_ACCESS_SECRET: "short",
        JWT_REFRESH_SECRET: "short",
        SESSION_SECRET: "short",
        CSRF_SECRET: "short",
      })
    ).toThrow();
  });

  it("accepts missing optional fields", () => {
    const parsed = envSchema.parse({
      JWT_ACCESS_SECRET: "a".repeat(32),
      JWT_REFRESH_SECRET: "b".repeat(32),
      SESSION_SECRET: "c".repeat(32),
      CSRF_SECRET: "d".repeat(32),
    });
    expect(parsed.MONGODB_USER).toBeUndefined();
    expect(parsed.MONGODB_PASSWORD).toBeUndefined();
    expect(parsed.SMTP_USER).toBeUndefined();
    expect(parsed.SMTP_PASSWORD).toBeUndefined();
    expect(parsed.SMTP_FROM_ADDRESS).toBeUndefined();
    expect(parsed.REDIS_PASSWORD).toBeUndefined();
    expect(parsed.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(parsed.GOOGLE_CLIENT_SECRET).toBeUndefined();
    expect(parsed.GOOGLE_REDIRECT_URI).toBeUndefined();
    expect(parsed.GITHUB_CLIENT_ID).toBeUndefined();
    expect(parsed.GITHUB_CLIENT_SECRET).toBeUndefined();
    expect(parsed.GITHUB_REDIRECT_URI).toBeUndefined();
    expect(parsed.LINKEDIN_CLIENT_ID).toBeUndefined();
    expect(parsed.LINKEDIN_CLIENT_SECRET).toBeUndefined();
    expect(parsed.LINKEDIN_REDIRECT_URI).toBeUndefined();
  });

  it("rejects invalid email in SMTP_FROM_ADDRESS", () => {
    expect(() =>
      envSchema.parse({
        JWT_ACCESS_SECRET: "a".repeat(32),
        JWT_REFRESH_SECRET: "b".repeat(32),
        SESSION_SECRET: "c".repeat(32),
        CSRF_SECRET: "d".repeat(32),
        SMTP_FROM_ADDRESS: "not-an-email",
      })
    ).toThrow();
  });

  it("rejects invalid URLs in OAuth redirect URIs", () => {
    expect(() =>
      envSchema.parse({
        JWT_ACCESS_SECRET: "a".repeat(32),
        JWT_REFRESH_SECRET: "b".repeat(32),
        SESSION_SECRET: "c".repeat(32),
        CSRF_SECRET: "d".repeat(32),
        GOOGLE_REDIRECT_URI: "not-a-url",
      })
    ).toThrow();
  });
});
