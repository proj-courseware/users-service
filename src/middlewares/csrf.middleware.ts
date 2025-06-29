import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import type { AppEnv } from "@/schemas/app-env.schema";
import type { ICSRFService, CSRFTokenData } from "@/services/csrf.service";
import { CSRFService } from "@/services/csrf.service";
import { UnauthenticatedError } from "@/errors";
import { env } from "@/env";

export class CSRFError extends UnauthenticatedError {
  constructor(message: string = "Invalid CSRF token") {
    super(message);
  }
}

export interface CSRFConfig {
  cookieName: string;
  headerName: string;
  maxAgeMs: number;
  skipMethods: string[];
  secure: boolean;
  httpOnly: boolean;
  sameSite: "strict" | "lax" | "none";
  enabled: boolean;
}

export interface CSRFMiddlewareDeps {
  csrfService: ICSRFService;
}

/**
 * CSRF Protection Middleware
 *
 * This middleware provides Cross-Site Request Forgery protection by:
 * 1. Generating CSRF tokens for safe methods (GET, HEAD, OPTIONS)
 * 2. Validating CSRF tokens for unsafe methods (POST, PUT, DELETE, PATCH)
 * 3. Setting CSRF tokens in cookies and requiring them in headers/forms
 */
export const createCSRFMiddleware = (
  config?: Partial<CSRFConfig>,
  deps?: CSRFMiddlewareDeps,
) => {
  const csrfConfig: CSRFConfig = {
    cookieName: config?.cookieName || env.CSRF_COOKIE_NAME,
    headerName: config?.headerName || env.CSRF_HEADER_NAME,
    maxAgeMs: config?.maxAgeMs || 60 * 60 * 1000, // 1 hour default
    skipMethods: config?.skipMethods || ["GET", "HEAD", "OPTIONS"],
    secure: config?.secure ?? env.NODE_ENV === "production",
    httpOnly: config?.httpOnly ?? false, // CSRF tokens need to be accessible to JS
    sameSite: config?.sameSite || "strict",
    enabled: config?.enabled ?? env.ENABLE_CSRF_PROTECTION,
  };

  const csrfService = deps?.csrfService || new CSRFService();

  return createMiddleware<AppEnv>(async (c, next) => {
    // Skip CSRF protection if disabled
    if (!csrfConfig.enabled) {
      await next();
      return;
    }

    const method = c.req.method.toUpperCase();
    const isUnsafeMethod = !csrfConfig.skipMethods.includes(method);

    if (isUnsafeMethod) {
      // Validate CSRF token for unsafe methods
      await validateCSRFToken(c, csrfService, csrfConfig);
    } else {
      // Generate and set CSRF token for safe methods
      await generateCSRFToken(c, csrfService, csrfConfig);
    }

    await next();
  });
};

/**
 * Generate and set CSRF token for safe methods
 */
async function generateCSRFToken(
  c: Context<AppEnv>,
  csrfService: ICSRFService,
  config: CSRFConfig,
): Promise<void> {
  // Check if a valid token already exists
  const existingToken = c.req.cookie(config.cookieName);
  const existingHash = c.req.cookie(`${config.cookieName}-hash`);

  if (existingToken && existingHash) {
    // Validate existing token
    const isValid = csrfService.validateToken(
      existingToken,
      existingHash,
      config.maxAgeMs,
    );
    if (isValid) {
      // Token is still valid, expose it to the client
      c.set("csrfToken", existingToken);
      return;
    }
  }

  // Generate new CSRF token
  const tokenData: CSRFTokenData = csrfService.generateToken();

  // Set CSRF token in cookie (accessible to JavaScript)
  c.header(
    "Set-Cookie",
    `${config.cookieName}=${tokenData.token}; Max-Age=${Math.floor(config.maxAgeMs / 1000)}; ` +
      `Path=/; ${config.secure ? "Secure; " : ""}` +
      `SameSite=${config.sameSite}; ${config.httpOnly ? "HttpOnly" : ""}`,
  );

  // Set CSRF hash in a separate HTTP-only cookie (not accessible to JavaScript)
  c.header(
    "Set-Cookie",
    `${config.cookieName}-hash=${tokenData.hash}; Max-Age=${Math.floor(config.maxAgeMs / 1000)}; ` +
      `Path=/; ${config.secure ? "Secure; " : ""}` +
      `SameSite=${config.sameSite}; HttpOnly`,
  );

  // Expose token to the application
  c.set("csrfToken", tokenData.token);
}

/**
 * Validate CSRF token for unsafe methods
 */
async function validateCSRFToken(
  c: Context<AppEnv>,
  csrfService: ICSRFService,
  config: CSRFConfig,
): Promise<void> {
  // Get CSRF token from header or form data
  let csrfToken = c.req.header(config.headerName);

  if (!csrfToken) {
    // Try to get from form data
    try {
      const formData = await c.req.formData();
      csrfToken = formData.get("_csrf") as string;
    } catch {
      // If form parsing fails, try JSON body
      try {
        const body = await c.req.json();
        csrfToken = body._csrf;
      } catch {
        // No CSRF token found
      }
    }
  }

  if (!csrfToken) {
    throw new CSRFError("CSRF token is required");
  }

  // Get CSRF hash from cookie
  const csrfHash = c.req.cookie(`${config.cookieName}-hash`);
  if (!csrfHash) {
    throw new CSRFError("CSRF token validation failed - no hash found");
  }

  // Validate the token
  const isValid = csrfService.validateToken(
    csrfToken,
    csrfHash,
    config.maxAgeMs,
  );
  if (!isValid) {
    throw new CSRFError("CSRF token validation failed");
  }

  // Token is valid, store it in context
  c.set("csrfToken", csrfToken);
}

/**
 * Middleware to generate CSRF token for API responses
 * This can be used on routes that need to provide CSRF tokens to clients
 */
export const createCSRFTokenMiddleware = (deps?: CSRFMiddlewareDeps) => {
  const csrfService = deps?.csrfService || new CSRFService();

  return createMiddleware<AppEnv>(async (c, next) => {
    if (!env.ENABLE_CSRF_PROTECTION) {
      await next();
      return;
    }

    const tokenData: CSRFTokenData = csrfService.generateToken();

    // Expose token to the response
    c.set("csrfToken", tokenData.token);
    c.set("csrfTokenData", tokenData);

    await next();
  });
};

/**
 * Helper middleware to add CSRF token to JSON responses
 */
export const createCSRFResponseMiddleware = () => {
  return createMiddleware<AppEnv>(async (c, next) => {
    await next();

    // Add CSRF token to JSON responses if available
    const csrfToken = c.get("csrfToken");
    if (
      csrfToken &&
      c.res.headers.get("content-type")?.includes("application/json")
    ) {
      try {
        const body = await c.res.json();
        const enhancedBody = {
          ...body,
          csrfToken,
        };
        c.res = new Response(JSON.stringify(enhancedBody), {
          status: c.res.status,
          headers: c.res.headers,
        });
      } catch {
        // If response is not JSON, skip enhancement
      }
    }
  });
};

// Default CSRF middleware instances
export const csrfMiddleware = createCSRFMiddleware();
export const csrfTokenMiddleware = createCSRFTokenMiddleware();
export const csrfResponseMiddleware = createCSRFResponseMiddleware();
