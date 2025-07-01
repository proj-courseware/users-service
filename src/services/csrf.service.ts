import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { env } from "@/env";

export interface CSRFConfig {
  secret: string;
  tokenLength: number;
  saltLength: number;
}

export interface CSRFTokenData extends Record<string, unknown> {
  token: string;
  hash: string;
  timestamp: number;
}

export interface ICSRFService {
  generateToken(): CSRFTokenData;
  validateToken(token: string, hash: string, maxAgeMs?: number): boolean;
  generateSecureToken(length: number): string;
}

export class CSRFService implements ICSRFService {
  private readonly config: CSRFConfig;

  constructor(config?: Partial<CSRFConfig>) {
    this.config = {
      secret: config?.secret || env.CSRF_SECRET,
      tokenLength: config?.tokenLength || env.CSRF_TOKEN_LENGTH,
      saltLength: config?.saltLength || 16,
    };
  }

  /**
   * Generate a CSRF token with a cryptographically secure random salt
   * and an HMAC hash for validation
   */
  generateToken(): CSRFTokenData {
    const timestamp = Date.now();

    // Generate token with specified length (in hex characters)
    const tokenBytes = Math.ceil(this.config.tokenLength / 2);
    const token = randomBytes(tokenBytes)
      .toString("hex")
      .slice(0, this.config.tokenLength);

    // Create HMAC hash using the token, timestamp, and secret
    const hash = this.createHash(token, timestamp);

    return {
      token,
      hash,
      timestamp,
    };
  }

  /**
   * Validate a CSRF token against its hash and optionally check age
   */
  validateToken(token: string, hash: string, maxAgeMs?: number): boolean {
    if (!token || !hash) {
      return false;
    }

    // Extract timestamp from hash (we'll need to store it separately)
    // For now, we'll recreate the hash and compare
    try {
      // Try to extract timestamp from the expected format
      const hashParts = hash.split(":");
      if (hashParts.length !== 2) {
        return false;
      }

      const timestamp = parseInt(hashParts[1], 10);
      if (isNaN(timestamp)) {
        return false;
      }

      // Check token age if maxAgeMs is provided
      if (maxAgeMs && Date.now() - timestamp > maxAgeMs) {
        return false;
      }

      // Recreate the expected hash
      const expectedHash = this.createHash(token, timestamp);

      // Use timing-safe comparison to prevent timing attacks
      return this.timingSafeCompare(hash, expectedHash);
    } catch {
      return false;
    }
  }

  /**
   * Generate a cryptographically secure random token
   */
  generateSecureToken(length: number): string {
    const bytes = Math.ceil(length / 2);
    return randomBytes(bytes).toString("hex").slice(0, length);
  }

  /**
   * Create HMAC hash with token, timestamp, and secret
   */
  private createHash(token: string, timestamp: number): string {
    const hmac = createHmac("sha256", this.config.secret);
    hmac.update(`${token}:${timestamp}`);
    return `${hmac.digest("hex")}:${timestamp}`;
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   */
  private timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    return timingSafeEqual(bufferA, bufferB);
  }
}

// Default CSRF service instance
export const csrfService = new CSRFService();
