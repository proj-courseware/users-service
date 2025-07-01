import { createMiddleware } from "hono/factory";
import { sign, verify } from "hono/jwt";
import { getCookie } from "hono/cookie";
import type { AppEnv } from "@/schemas/app-env.schema";
import type { UserType } from "@/schemas/user.schema";
import { UnauthenticatedError } from "@/errors";
import { env } from "@/env";

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  issuedAt: number;
  expiresAt: number;
  [key: string]: any; // Add index signature for JWT compatibility
}

export interface SessionConfig {
  cookieName: string;
  secret: string;
  maxAgeHours: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite: "strict" | "lax" | "none";
  domain?: string;
  path: string;
}

export interface ISessionService {
  createSession(user: UserType): Promise<string>;
  validateSession(sessionToken: string): Promise<SessionData | null>;
  destroySession(sessionToken: string): Promise<void>;
  refreshSession(sessionToken: string): Promise<string>;
  getCookieName(): string;
}

export class SessionService implements ISessionService {
  private readonly config: SessionConfig;

  constructor(config?: Partial<SessionConfig>) {
    this.config = {
      cookieName: config?.cookieName || "auth-session",
      secret: config?.secret || env.SESSION_SECRET,
      maxAgeHours: config?.maxAgeHours || env.SESSION_MAX_AGE_HOURS,
      secure: config?.secure ?? env.NODE_ENV === "production",
      httpOnly: config?.httpOnly ?? true,
      sameSite: config?.sameSite || "strict",
      domain: config?.domain,
      path: config?.path || "/",
    };
  }

  /**
   * Create a new session for a user
   */
  async createSession(user: UserType): Promise<string> {
    const now = Date.now();
    const expiresAt = now + this.config.maxAgeHours * 60 * 60 * 1000;

    const sessionData: SessionData = {
      userId: user.id,
      email: user.primaryEmail,
      role: user.globalRole,
      issuedAt: now,
      expiresAt,
    };

    // Sign the session data as a JWT
    const sessionToken = await sign(sessionData, this.config.secret);
    return sessionToken;
  }

  /**
   * Validate and parse a session token
   */
  async validateSession(sessionToken: string): Promise<SessionData | null> {
    try {
      const payload = (await verify(
        sessionToken,
        this.config.secret,
      )) as unknown as SessionData;

      // Check if session has expired
      if (payload.expiresAt < Date.now()) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Destroy a session (for logout)
   * Note: For JWT-based sessions, we can't truly "destroy" them server-side
   * without maintaining a blacklist. Instead, we rely on the client to delete the cookie.
   */
  async destroySession(): Promise<void> {
    // In a production system, you might want to maintain a blacklist
    // of invalidated session tokens in Redis or a database
    // For now, we'll just mark this as a no-op since the cookie will be cleared
  }

  /**
   * Refresh a session by creating a new token with extended expiry
   */
  async refreshSession(sessionToken: string): Promise<string> {
    const sessionData = await this.validateSession(sessionToken);
    if (!sessionData) {
      throw new UnauthenticatedError("Invalid session");
    }

    // Create a new session with the same data but new timestamps
    const now = Date.now();
    const newSessionData: SessionData = {
      ...sessionData,
      issuedAt: now,
      expiresAt: now + this.config.maxAgeHours * 60 * 60 * 1000,
    };

    return await sign(newSessionData, this.config.secret);
  }

  /**
   * Get cookie options for setting session cookies
   */
  getCookieOptions(): {
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite: "Strict" | "Lax" | "None";
    domain?: string;
    path: string;
  } {
    return {
      maxAge: this.config.maxAgeHours * 60 * 60, // in seconds
      secure: this.config.secure,
      httpOnly: this.config.httpOnly,
      sameSite:
        this.config.sameSite === "strict"
          ? "Strict"
          : this.config.sameSite === "lax"
            ? "Lax"
            : "None",
      domain: this.config.domain,
      path: this.config.path,
    };
  }

  /**
   * Get the session cookie name
   */
  getCookieName(): string {
    return this.config.cookieName;
  }
}

export interface SessionMiddlewareDeps {
  sessionService: ISessionService;
}

/**
 * Session middleware factory for dependency injection
 */
export const createSessionMiddleware = (deps?: SessionMiddlewareDeps) => {
  const sessionService = deps?.sessionService || new SessionService();

  return createMiddleware<AppEnv>(async (c, next) => {
    const sessionToken = getCookie(c, sessionService.getCookieName());

    if (sessionToken) {
      const sessionData = await sessionService.validateSession(sessionToken);
      if (sessionData) {
        // Store session data in context for use by other middleware/controllers
        c.set("session", sessionData);
        c.set("userId", sessionData.userId);
      }
    }

    // Add session utilities to context
    c.set("sessionService", sessionService);

    await next();
  });
};

/**
 * Session authentication middleware - requires valid session
 */
export const createSessionAuthMiddleware = (deps?: SessionMiddlewareDeps) => {
  const sessionService = deps?.sessionService || new SessionService();

  return createMiddleware<AppEnv>(async (c, next) => {
    const sessionToken = getCookie(c, sessionService.getCookieName());

    if (!sessionToken) {
      throw new UnauthenticatedError("No session found");
    }

    const sessionData = await sessionService.validateSession(sessionToken);
    if (!sessionData) {
      throw new UnauthenticatedError("Invalid or expired session");
    }

    // Store session data in context
    c.set("session", sessionData);
    c.set("userId", sessionData.userId);
    c.set("sessionService", sessionService);

    await next();
  });
};

// Default session service instance
export const sessionService = new SessionService();

// Default middleware instances
export const sessionMiddleware = createSessionMiddleware({ sessionService });
export const sessionAuthMiddleware = createSessionAuthMiddleware({
  sessionService,
});
