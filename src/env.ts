import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
dotenv.config();

// Define the schema to validate the environment variables
const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(3000),
  // Optional Auth Service URL (Keep this until we are done with refactoring)
  AUTH_SERVICE_URL: z.string().url().optional(),
  // MongoDB URI Configuration
  MONGODB_HOST: z.string().default("localhost"),
  MONGODB_PORT: z.coerce.number().default(27017),
  MONGODB_USER: z.string().optional(),
  MONGODB_PASSWORD: z.string().optional(),
  MONGODB_DATABASE: z.string().default("users-service"),
  // JWT Configuration
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT access secret must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT refresh secret must be at least 32 characters"),
  JWT_ACCESS_EXPIRY_MINUTES: z.coerce.number().default(15),
  JWT_REFRESH_EXPIRY_DAYS: z.coerce.number().default(7),
  // Email Configuration
  SMTP_HOST: z.string().default("mailhog"),
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
  // MailHog Configuration
  MAILHOG_SMTP_PORT: z.coerce.number().default(1025),
  MAILHOG_WEB_PORT: z.coerce.number().default(8025),
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
  SESSION_SECRET: z
    .string()
    .min(32, "Session secret must be at least 32 characters"),
  SESSION_MAX_AGE_HOURS: z.coerce.number().default(24),
  CSRF_SECRET: z.string().min(32, "CSRF secret must be at least 32 characters"),
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

// Create an object to allow (potentially) mapping environment variables with different names
const mappedEnv = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL, // keep until refactoring is done
  MONGODB_HOST: process.env.MONGODB_HOST,
  MONGODB_PORT: process.env.MONGODB_PORT,
  MONGODB_USER: process.env.MONGODB_USER,
  MONGODB_PASSWORD: process.env.MONGODB_PASSWORD,
  MONGODB_DATABASE: process.env.MONGODB_DATABASE,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRY_MINUTES: process.env.JWT_ACCESS_EXPIRY_MINUTES,
  JWT_REFRESH_EXPIRY_DAYS: process.env.JWT_REFRESH_EXPIRY_DAYS,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SMTP_FROM_ADDRESS: process.env.SMTP_FROM_ADDRESS,
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME,
  EMAIL_MAX_RETRIES: process.env.EMAIL_MAX_RETRIES,
  EMAIL_RETRY_DELAY_MS: process.env.EMAIL_RETRY_DELAY_MS,
  FRONTEND_URL: process.env.FRONTEND_URL,
  MAILHOG_SMTP_PORT: process.env.MAILHOG_SMTP_PORT,
  MAILHOG_WEB_PORT: process.env.MAILHOG_WEB_PORT,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  RATE_LIMIT_WINDOW_MINUTES: process.env.RATE_LIMIT_WINDOW_MINUTES,
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_AUTH_WINDOW_MINUTES: process.env.RATE_LIMIT_AUTH_WINDOW_MINUTES,
  RATE_LIMIT_AUTH_MAX_REQUESTS: process.env.RATE_LIMIT_AUTH_MAX_REQUESTS,
  RATE_LIMIT_STRICT_MODE: process.env.RATE_LIMIT_STRICT_MODE,
  SESSION_SECRET: process.env.SESSION_SECRET,
  SESSION_MAX_AGE_HOURS: process.env.SESSION_MAX_AGE_HOURS,
  CSRF_SECRET: process.env.CSRF_SECRET,
  CSRF_TOKEN_LENGTH: process.env.CSRF_TOKEN_LENGTH,
  CSRF_COOKIE_NAME: process.env.CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME: process.env.CSRF_HEADER_NAME,
  ENABLE_CSRF_PROTECTION: process.env.ENABLE_CSRF_PROTECTION,
  PASSWORD_MIN_LENGTH: process.env.PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH: process.env.PASSWORD_MAX_LENGTH,
  PASSWORD_REQUIRE_UPPERCASE: process.env.PASSWORD_REQUIRE_UPPERCASE,
  PASSWORD_REQUIRE_LOWERCASE: process.env.PASSWORD_REQUIRE_LOWERCASE,
  PASSWORD_REQUIRE_NUMBERS: process.env.PASSWORD_REQUIRE_NUMBERS,
  PASSWORD_REQUIRE_SPECIAL_CHARS: process.env.PASSWORD_REQUIRE_SPECIAL_CHARS,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  GITHUB_REDIRECT_URI: process.env.GITHUB_REDIRECT_URI,
  LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
  LINKEDIN_REDIRECT_URI: process.env.LINKEDIN_REDIRECT_URI,
};

const _env = envSchema.safeParse(mappedEnv);

if (!_env.success) {
  console.error(
    "❌ Invalid environment variables after mapping:",
    _env.error.format(),
  );
  // Log the mappedEnv for easier debugging of what Zod received
  console.error("Mapped environment data passed to Zod:", mappedEnv);
  process.exit(1);
}

export const env = _env.data;
