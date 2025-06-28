import jwt from "jsonwebtoken";
import { env } from "@/env";
import { UnauthenticatedError } from "@/errors";
import type {
  UserType,
  JWTPayloadType,
  RefreshJWTPayloadType,
} from "@/schemas/user.schema";

// JWT service interface
export interface IJWTService {
  generateAccessToken(user: UserType): Promise<string>;
  generateRefreshToken(user: UserType): Promise<string>;
  verifyAccessToken(token: string): Promise<JWTPayloadType>;
  verifyRefreshToken(token: string): Promise<RefreshJWTPayloadType>;
  decodeToken(token: string): jwt.JwtPayload | string | null;
  generateTokenPair(
    user: UserType,
  ): Promise<{ accessToken: string; refreshToken: string }>;
}

// Token generation options
export interface TokenGenerationOptions {
  expiryOverride?: string | number;
  algorithm?: jwt.Algorithm;
  audience?: string;
  issuer?: string;
}

// JWT service implementation
export class JWTService implements IJWTService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiryMinutes: number;
  private readonly refreshTokenExpiryDays: number;
  private readonly defaultAlgorithm: jwt.Algorithm = "HS256";

  constructor() {
    this.accessTokenSecret = env.JWT_ACCESS_SECRET;
    this.refreshTokenSecret = env.JWT_REFRESH_SECRET;
    this.accessTokenExpiryMinutes = env.JWT_ACCESS_EXPIRY_MINUTES;
    this.refreshTokenExpiryDays = env.JWT_REFRESH_EXPIRY_DAYS;
  }

  /**
   * Generate an access token for a user
   * @param user - User object containing authentication details
   * @param options - Optional token generation settings
   * @returns Promise that resolves to signed JWT access token
   */
  async generateAccessToken(
    user: UserType,
    options?: TokenGenerationOptions,
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const expirySeconds =
      (options?.expiryOverride as number) || this.accessTokenExpiryMinutes * 60;

    const payload: Omit<JWTPayloadType, "iat" | "exp"> & {
      iat: number;
      exp: number;
    } = {
      userId: user.id,
      email: user.primaryEmail,
      role: user.globalRole,
      iat: now,
      exp: now + expirySeconds,
    };

    const signOptions: jwt.SignOptions = {
      algorithm: options?.algorithm || this.defaultAlgorithm,
    };

    if (options?.audience) {
      signOptions.audience = options.audience;
    }

    if (options?.issuer) {
      signOptions.issuer = options.issuer;
    }

    try {
      return jwt.sign(payload, this.accessTokenSecret, signOptions);
    } catch (error) {
      throw new UnauthenticatedError("Failed to generate access token", {
        cause: error,
      });
    }
  }

  /**
   * Generate a refresh token for a user
   * @param user - User object containing authentication details
   * @param options - Optional token generation settings
   * @returns Promise that resolves to signed JWT refresh token
   */
  async generateRefreshToken(
    user: UserType,
    options?: TokenGenerationOptions,
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const expirySeconds =
      (options?.expiryOverride as number) ||
      this.refreshTokenExpiryDays * 24 * 60 * 60;

    const payload: Omit<RefreshJWTPayloadType, "iat" | "exp"> & {
      iat: number;
      exp: number;
    } = {
      userId: user.id,
      type: "refresh",
      iat: now,
      exp: now + expirySeconds,
    };

    const signOptions: jwt.SignOptions = {
      algorithm: options?.algorithm || this.defaultAlgorithm,
    };

    if (options?.audience) {
      signOptions.audience = options.audience;
    }

    if (options?.issuer) {
      signOptions.issuer = options.issuer;
    }

    try {
      return jwt.sign(payload, this.refreshTokenSecret, signOptions);
    } catch (error) {
      throw new UnauthenticatedError("Failed to generate refresh token", {
        cause: error,
      });
    }
  }

  /**
   * Verify and decode an access token
   * @param token - JWT access token to verify
   * @returns Promise that resolves to verified payload
   * @throws UnauthenticatedError if token is invalid
   */
  async verifyAccessToken(token: string): Promise<JWTPayloadType> {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        algorithms: [this.defaultAlgorithm],
      }) as JWTPayloadType;

      // Additional validation to ensure token structure
      if (!decoded.userId || !decoded.email || !decoded.role) {
        throw new UnauthenticatedError("Invalid token payload structure");
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthenticatedError("Invalid access token", {
          cause: error,
        });
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthenticatedError("Access token expired", {
          cause: error,
        });
      }
      if (error instanceof jwt.NotBeforeError) {
        throw new UnauthenticatedError("Access token not active yet", {
          cause: error,
        });
      }
      // Re-throw if it's already our custom error
      if (error instanceof UnauthenticatedError) {
        throw error;
      }
      // Fallback for unexpected errors
      throw new UnauthenticatedError("Token verification failed", {
        cause: error,
      });
    }
  }

  /**
   * Verify and decode a refresh token
   * @param token - JWT refresh token to verify
   * @returns Promise that resolves to verified payload
   * @throws UnauthenticatedError if token is invalid
   */
  async verifyRefreshToken(token: string): Promise<RefreshJWTPayloadType> {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        algorithms: [this.defaultAlgorithm],
      }) as RefreshJWTPayloadType;

      // Additional validation to ensure token structure and type
      if (!decoded.userId || decoded.type !== "refresh") {
        throw new UnauthenticatedError(
          "Invalid refresh token payload structure",
        );
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthenticatedError("Invalid refresh token", {
          cause: error,
        });
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthenticatedError("Refresh token expired", {
          cause: error,
        });
      }
      if (error instanceof jwt.NotBeforeError) {
        throw new UnauthenticatedError("Refresh token not active yet", {
          cause: error,
        });
      }
      // Re-throw if it's already our custom error
      if (error instanceof UnauthenticatedError) {
        throw error;
      }
      // Fallback for unexpected errors
      throw new UnauthenticatedError("Refresh token verification failed", {
        cause: error,
      });
    }
  }

  /**
   * Decode a token without verification (for debugging or inspection)
   * @param token - JWT token to decode
   * @returns Decoded payload or null if invalid
   */
  decodeToken(token: string): jwt.JwtPayload | string | null {
    try {
      return jwt.decode(token);
    } catch (error) {
      console.warn("Failed to decode token:", error);
      return null;
    }
  }

  /**
   * Generate both access and refresh tokens for a user
   * @param user - User object containing authentication details
   * @param options - Optional token generation settings
   * @returns Promise that resolves to token pair
   */
  async generateTokenPair(
    user: UserType,
    options?: TokenGenerationOptions,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.generateAccessToken(user, options),
        this.generateRefreshToken(user, options),
      ]);

      return { accessToken, refreshToken };
    } catch (error) {
      throw new UnauthenticatedError("Failed to generate token pair", {
        cause: error,
      });
    }
  }

  /**
   * Extract user ID from any token type without full verification
   * Useful for logging or basic token inspection
   * @param token - JWT token to extract user ID from
   * @returns User ID string or null if extraction fails
   */
  extractUserIdFromToken(token: string): string | null {
    try {
      const decoded = this.decodeToken(token);
      if (decoded && typeof decoded === "object" && "userId" in decoded) {
        return decoded.userId as string;
      }
      return null;
    } catch (error) {
      console.warn("Failed to extract user ID from token:", error);
      return null;
    }
  }

  /**
   * Check if a token is expired without full verification
   * @param token - JWT token to check
   * @returns True if token is expired, false otherwise
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (decoded && typeof decoded === "object" && "exp" in decoded) {
        const now = Math.floor(Date.now() / 1000);
        return (decoded.exp as number) < now;
      }
      return true; // Consider invalid tokens as expired
    } catch (error) {
      console.warn("Failed to check token expiry:", error);
      return true;
    }
  }

  /**
   * Get token expiry time
   * @param token - JWT token to check
   * @returns Expiry time as Date or null if cannot be determined
   */
  getTokenExpiry(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token);
      if (decoded && typeof decoded === "object" && "exp" in decoded) {
        return new Date((decoded.exp as number) * 1000);
      }
      return null;
    } catch (error) {
      console.warn("Failed to get token expiry:", error);
      return null;
    }
  }

  /**
   * Get remaining time until token expiry
   * @param token - JWT token to check
   * @returns Remaining time in seconds, or 0 if expired/invalid
   */
  getTokenRemainingTime(token: string): number {
    try {
      const expiry = this.getTokenExpiry(token);
      if (!expiry) return 0;

      const now = new Date();
      const remaining = Math.floor((expiry.getTime() - now.getTime()) / 1000);
      return Math.max(0, remaining);
    } catch (error) {
      console.warn("Failed to get token remaining time:", error);
      return 0;
    }
  }
}
