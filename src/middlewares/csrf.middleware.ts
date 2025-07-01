import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
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

export interface CSRFTokenMiddlewareConfig {
  enabled?: boolean;
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
  const existingToken = getCookie(c, config.cookieName);
  const existingHash = getCookie(c, `${config.cookieName}-hash`);

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
  setCookie(c, config.cookieName, tokenData.token, {
    maxAge: Math.floor(config.maxAgeMs / 1000),
    path: "/",
    secure: config.secure,
    sameSite: config.sameSite,
    httpOnly: config.httpOnly,
  });

  // Set CSRF hash in a separate HTTP-only cookie (not accessible to JavaScript)
  setCookie(c, `${config.cookieName}-hash`, tokenData.hash, {
    maxAge: Math.floor(config.maxAgeMs / 1000),
    path: "/",
    secure: config.secure,
    sameSite: config.sameSite,
    httpOnly: true,
  });

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
    // Check Content-Type to determine how to parse body
    const contentType = c.req.header("Content-Type") || "";
    
    if (contentType.includes("application/json")) {
      // Parse JSON body
      try {
        const body = await c.req.json();
        csrfToken = body._csrf;
      } catch {
        // JSON parsing failed
      }
    } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      // Parse form data
      try {
        const formData = await c.req.formData();
        csrfToken = formData.get("_csrf") as string;
      } catch {
        // Form parsing failed
      }
    } else {
      // Try form data as fallback
      try {
        const formData = await c.req.formData();
        csrfToken = formData.get("_csrf") as string;
      } catch {
        // Form parsing failed, try JSON as final fallback
        try {
          const body = await c.req.json();
          csrfToken = body._csrf;
        } catch {
          // No CSRF token found
        }
      }
    }
  }

  if (!csrfToken) {
    throw new CSRFError("CSRF token is required");
  }

  // Get CSRF hash from cookie
  const csrfHash = getCookie(c, `${config.cookieName}-hash`);
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
export const createCSRFTokenMiddleware = (
  deps?: CSRFMiddlewareDeps,
  config?: CSRFTokenMiddlewareConfig,
) => {
  const csrfService = deps?.csrfService || new CSRFService();
  const enabled = config?.enabled ?? env.ENABLE_CSRF_PROTECTION;

  return createMiddleware<AppEnv>(async (c, next) => {
    if (!enabled) {
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
