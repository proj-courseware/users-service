import { describe, it, expect } from "vitest";
import { envSchema } from "@/env";

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

  it("parses SMTP_SECURE robustly", () => {
    const required = {
      JWT_ACCESS_SECRET: "a".repeat(32),
      JWT_REFRESH_SECRET: "b".repeat(32),
      SESSION_SECRET: "c".repeat(32),
      CSRF_SECRET: "d".repeat(32),
    };
    expect(envSchema.parse({ ...required, SMTP_SECURE: "false" }).SMTP_SECURE).toBe(false);
    expect(envSchema.parse({ ...required, SMTP_SECURE: false }).SMTP_SECURE).toBe(false);
    expect(envSchema.parse({ ...required, SMTP_SECURE: "0" }).SMTP_SECURE).toBe(false);
    expect(envSchema.parse({ ...required, SMTP_SECURE: 0 }).SMTP_SECURE).toBe(false);
    expect(envSchema.parse({ ...required, SMTP_SECURE: undefined }).SMTP_SECURE).toBe(false);
    expect(envSchema.parse({ ...required, SMTP_SECURE: null }).SMTP_SECURE).toBe(false);
    expect(envSchema.parse({ ...required, SMTP_SECURE: "true" }).SMTP_SECURE).toBe(true);
    expect(envSchema.parse({ ...required, SMTP_SECURE: true }).SMTP_SECURE).toBe(true);
    expect(envSchema.parse({ ...required, SMTP_SECURE: "1" }).SMTP_SECURE).toBe(true);
    expect(envSchema.parse({ ...required, SMTP_SECURE: 1 }).SMTP_SECURE).toBe(true);
  });
});
