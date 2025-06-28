import { describe, it, expect, beforeEach, vi } from "vitest";
import { CSRFService, type ICSRFService, type CSRFConfig } from "@/services/csrf.service";

describe("CSRFService", () => {
  let csrfService: ICSRFService;

  beforeEach(() => {
    csrfService = new CSRFService({
      secret: "test-secret-key-32-characters-long",
      tokenLength: 32,
      saltLength: 16,
    });
  });

  describe("generateToken", () => {
    it("should generate a valid CSRF token with hash and timestamp", () => {
      const tokenData = csrfService.generateToken();

      expect(tokenData).toHaveProperty("token");
      expect(tokenData).toHaveProperty("hash");
      expect(tokenData).toHaveProperty("timestamp");
      
      expect(typeof tokenData.token).toBe("string");
      expect(typeof tokenData.hash).toBe("string");
      expect(typeof tokenData.timestamp).toBe("number");
      
      expect(tokenData.token.length).toBe(32);
      expect(tokenData.hash).toContain(":");
      expect(tokenData.timestamp).toBeCloseTo(Date.now(), -2); // Within 100ms
    });

    it("should generate unique tokens on multiple calls", () => {
      const token1 = csrfService.generateToken();
      const token2 = csrfService.generateToken();

      expect(token1.token).not.toBe(token2.token);
      expect(token1.hash).not.toBe(token2.hash);
    });

    it("should generate tokens with correct length", () => {
      const tokenData = csrfService.generateToken();
      
      // Token should have the configured length (32 characters by default)
      expect(tokenData.token).toHaveLength(32);
    });
  });

  describe("validateToken", () => {
    it("should validate a correctly generated token", () => {
      const tokenData = csrfService.generateToken();
      const isValid = csrfService.validateToken(tokenData.token, tokenData.hash);

      expect(isValid).toBe(true);
    });

    it("should reject invalid token", () => {
      const tokenData = csrfService.generateToken();
      const isValid = csrfService.validateToken("invalid-token", tokenData.hash);

      expect(isValid).toBe(false);
    });

    it("should reject invalid hash", () => {
      const tokenData = csrfService.generateToken();
      const isValid = csrfService.validateToken(tokenData.token, "invalid-hash");

      expect(isValid).toBe(false);
    });

    it("should reject empty token", () => {
      const tokenData = csrfService.generateToken();
      const isValid = csrfService.validateToken("", tokenData.hash);

      expect(isValid).toBe(false);
    });

    it("should reject empty hash", () => {
      const tokenData = csrfService.generateToken();
      const isValid = csrfService.validateToken(tokenData.token, "");

      expect(isValid).toBe(false);
    });

    it("should reject expired token when maxAge is specified", async () => {
      const tokenData = csrfService.generateToken();
      
      // Wait to ensure the token is expired
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Token should be invalid if maxAge is 5ms (expired after 10ms wait)
      const isValid = csrfService.validateToken(tokenData.token, tokenData.hash, 5);
      
      expect(isValid).toBe(false);
    });

    it("should accept valid token within maxAge", () => {
      const tokenData = csrfService.generateToken();
      
      // Token should be valid if maxAge is very large
      const isValid = csrfService.validateToken(tokenData.token, tokenData.hash, 60000); // 1 minute
      
      expect(isValid).toBe(true);
    });

    it("should handle malformed hash gracefully", () => {
      const tokenData = csrfService.generateToken();
      
      // Hash without colon separator
      const isValid1 = csrfService.validateToken(tokenData.token, "malformed-hash");
      expect(isValid1).toBe(false);

      // Hash with non-numeric timestamp
      const isValid2 = csrfService.validateToken(tokenData.token, "hash:not-a-number");
      expect(isValid2).toBe(false);

      // Hash with extra parts
      const isValid3 = csrfService.validateToken(tokenData.token, "hash:123:extra");
      expect(isValid3).toBe(false);
    });
  });

  describe("generateSecureToken", () => {
    it("should generate token of specified length", () => {
      const token1 = csrfService.generateSecureToken(16);
      const token2 = csrfService.generateSecureToken(32);
      const token3 = csrfService.generateSecureToken(64);

      expect(token1).toHaveLength(16);
      expect(token2).toHaveLength(32);
      expect(token3).toHaveLength(64);
    });

    it("should generate unique tokens", () => {
      const token1 = csrfService.generateSecureToken(32);
      const token2 = csrfService.generateSecureToken(32);

      expect(token1).not.toBe(token2);
    });

    it("should generate hexadecimal tokens", () => {
      const token = csrfService.generateSecureToken(32);
      
      // Should only contain hex characters
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe("timing attack protection", () => {
    it("should take similar time for valid and invalid tokens", async () => {
      const tokenData = csrfService.generateToken();
      
      const start1 = performance.now();
      csrfService.validateToken(tokenData.token, tokenData.hash);
      const time1 = performance.now() - start1;

      const start2 = performance.now();
      csrfService.validateToken("invalid-token-same-length-as-real", tokenData.hash);
      const time2 = performance.now() - start2;

      // Times should be relatively similar (within an order of magnitude)
      // This is a basic check - in practice, timing attack prevention is complex
      expect(Math.abs(time1 - time2)).toBeLessThan(10); // 10ms tolerance
    });
  });

  describe("configuration", () => {
    it("should use custom configuration", () => {
      const customConfig: Partial<CSRFConfig> = {
        secret: "custom-secret-key-32-characters-long",
        tokenLength: 64,
        saltLength: 32,
      };

      const customService = new CSRFService(customConfig);
      const tokenData = customService.generateToken();

      expect(tokenData.token).toHaveLength(64);
      
      // Validate with the same service
      const isValid = customService.validateToken(tokenData.token, tokenData.hash);
      expect(isValid).toBe(true);
    });

    it("should reject tokens from different secrets", () => {
      const service1 = new CSRFService({ secret: "secret1-32-characters-long-string" });
      const service2 = new CSRFService({ secret: "secret2-32-characters-long-string" });

      const tokenData = service1.generateToken();
      const isValid = service2.validateToken(tokenData.token, tokenData.hash);

      expect(isValid).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle very short token lengths", () => {
      const service = new CSRFService({ tokenLength: 4, saltLength: 2 });
      const tokenData = service.generateToken();

      expect(tokenData.token).toHaveLength(4);
      
      const isValid = service.validateToken(tokenData.token, tokenData.hash);
      expect(isValid).toBe(true);
    });

    it("should handle timestamp boundaries", () => {
      // Mock Date.now to test specific timestamps
      const originalDateNow = Date.now;
      
      // Test with timestamp at Unix epoch
      vi.spyOn(Date, "now").mockReturnValue(0);
      const tokenData1 = csrfService.generateToken();
      expect(tokenData1.timestamp).toBe(0);
      
      // Test with large timestamp
      vi.spyOn(Date, "now").mockReturnValue(9999999999999);
      const tokenData2 = csrfService.generateToken();
      expect(tokenData2.timestamp).toBe(9999999999999);
      
      // Restore original Date.now
      Date.now = originalDateNow;
    });
  });
});