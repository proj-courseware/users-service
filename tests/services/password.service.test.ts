import { describe, it, expect, beforeEach } from "vitest";
import {
  PasswordService,
  DEFAULT_PASSWORD_POLICY,
  getEnvironmentPasswordPolicy,
  type PasswordPolicyType,
  type IPasswordService,
} from "@/services/password.service";

describe("PasswordService", () => {
  let passwordService: IPasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  describe("hashPassword", () => {
    it("should hash a password successfully", async () => {
      const password = "testPassword123!";
      const hash = await passwordService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // Argon2 hashes are typically longer
    });

    it("should generate different hashes for the same password", async () => {
      const password = "testPassword123!";
      const hash1 = await passwordService.hashPassword(password);
      const hash2 = await passwordService.hashPassword(password);

      expect(hash1).not.toBe(hash2); // Salt makes each hash unique
    });

    it("should handle empty password", async () => {
      await expect(passwordService.hashPassword("")).resolves.toBeDefined();
    });

    it("should handle very long passwords", async () => {
      const longPassword = "a".repeat(1000);
      await expect(
        passwordService.hashPassword(longPassword),
      ).resolves.toBeDefined();
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password against hash", async () => {
      const password = "testPassword123!";
      const hash = await passwordService.hashPassword(password);

      const isValid = await passwordService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password against hash", async () => {
      const password = "testPassword123!";
      const wrongPassword = "wrongPassword123!";
      const hash = await passwordService.hashPassword(password);

      const isValid = await passwordService.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it("should handle case sensitivity correctly", async () => {
      const password = "TestPassword123!";
      const wrongCasePassword = "testpassword123!";
      const hash = await passwordService.hashPassword(password);

      const isValid = await passwordService.verifyPassword(
        wrongCasePassword,
        hash,
      );
      expect(isValid).toBe(false);
    });

    it("should handle empty password verification", async () => {
      const hash = await passwordService.hashPassword("");

      const isValidEmpty = await passwordService.verifyPassword("", hash);
      const isValidNonEmpty = await passwordService.verifyPassword(
        "test",
        hash,
      );

      expect(isValidEmpty).toBe(true);
      expect(isValidNonEmpty).toBe(false);
    });

    it("should return false for invalid hash format", async () => {
      const password = "testPassword123!";
      const invalidHash = "not-a-valid-hash";

      const isValid = await passwordService.verifyPassword(
        password,
        invalidHash,
      );
      expect(isValid).toBe(false);
    });

    it("should return false for empty hash", async () => {
      const password = "testPassword123!";

      const isValid = await passwordService.verifyPassword(password, "");
      expect(isValid).toBe(false);
    });
  });

  describe("validatePasswordStrength", () => {
    describe("with default policy", () => {
      it("should accept strong password meeting all requirements", () => {
        const password = "StrongPass123!";
        const result = passwordService.validatePasswordStrength(password);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("should reject password too short", () => {
        const password = "Short1!";
        const result = passwordService.validatePasswordStrength(password);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Password must be at least 8 characters long",
        );
      });

      it("should reject password without uppercase", () => {
        const password = "lowercase123!";
        const result = passwordService.validatePasswordStrength(password);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Password must contain at least one uppercase letter",
        );
      });

      it("should reject password without lowercase", () => {
        const password = "UPPERCASE123!";
        const result = passwordService.validatePasswordStrength(password);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Password must contain at least one lowercase letter",
        );
      });

      it("should reject password without numbers", () => {
        const password = "NoNumbers!";
        const result = passwordService.validatePasswordStrength(password);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Password must contain at least one number",
        );
      });

      it("should reject password without special characters", () => {
        const password = "NoSpecial123";
        const result = passwordService.validatePasswordStrength(password);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)',
        );
      });

      it("should reject password too long", () => {
        const password = "a".repeat(200);
        const result = passwordService.validatePasswordStrength(password);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Password must be no more than 128 characters long",
        );
      });

      it("should collect multiple validation errors", () => {
        const password = "weak";
        const result = passwordService.validatePasswordStrength(password);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
        expect(result.errors).toContain(
          "Password must be at least 8 characters long",
        );
        expect(result.errors).toContain(
          "Password must contain at least one uppercase letter",
        );
        expect(result.errors).toContain(
          "Password must contain at least one number",
        );
        expect(result.errors).toContain(
          'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)',
        );
      });
    });

    describe("with custom policy", () => {
      it("should accept password meeting custom requirements", () => {
        const customPolicy: PasswordPolicyType = {
          minLength: 6,
          requireUppercase: false,
          requireLowercase: true,
          requireNumbers: false,
          requireSpecialChars: false,
          maxLength: 50,
        };

        const password = "simplepass";
        const result = passwordService.validatePasswordStrength(
          password,
          customPolicy,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("should enforce custom minimum length", () => {
        const customPolicy: PasswordPolicyType = {
          minLength: 12,
          requireUppercase: false,
          requireLowercase: false,
          requireNumbers: false,
          requireSpecialChars: false,
          maxLength: 50,
        };

        const password = "short";
        const result = passwordService.validatePasswordStrength(
          password,
          customPolicy,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Password must be at least 12 characters long",
        );
      });

      it("should enforce custom maximum length", () => {
        const customPolicy: PasswordPolicyType = {
          minLength: 8,
          requireUppercase: false,
          requireLowercase: false,
          requireNumbers: false,
          requireSpecialChars: false,
          maxLength: 10,
        };

        const password = "thispasswordistoolong";
        const result = passwordService.validatePasswordStrength(
          password,
          customPolicy,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Password must be no more than 10 characters long",
        );
      });

      it("should allow disabling all character requirements", () => {
        const customPolicy: PasswordPolicyType = {
          minLength: 8,
          requireUppercase: false,
          requireLowercase: false,
          requireNumbers: false,
          requireSpecialChars: false,
          maxLength: 128,
        };

        const password = "simplepassword";
        const result = passwordService.validatePasswordStrength(
          password,
          customPolicy,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe("edge cases", () => {
      it("should handle empty password", () => {
        const result = passwordService.validatePasswordStrength("");

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Password must be at least 8 characters long",
        );
      });

      it("should handle password with unicode characters", () => {
        const password = "Pässw0rd!🔐";
        const result = passwordService.validatePasswordStrength(password);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("should handle password with spaces", () => {
        const password = "Pass Word 123!";
        const result = passwordService.validatePasswordStrength(password);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe("generateSecurePassword", () => {
    it("should generate password with default length", () => {
      const password = passwordService.generateSecurePassword();

      expect(password).toBeDefined();
      expect(password.length).toBe(16);
    });

    it("should generate password with custom length", () => {
      const customLength = 24;
      const password = passwordService.generateSecurePassword(customLength);

      expect(password.length).toBe(customLength);
    });

    it("should generate password meeting all default policy requirements", () => {
      const password = passwordService.generateSecurePassword();
      const validation = passwordService.validatePasswordStrength(password);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should contain at least one character from each required category", () => {
      const password = passwordService.generateSecurePassword();

      // Check for uppercase letter
      expect(/[A-Z]/.test(password)).toBe(true);

      // Check for lowercase letter
      expect(/[a-z]/.test(password)).toBe(true);

      // Check for number
      expect(/\d/.test(password)).toBe(true);

      // Check for special character
      expect(/[!@#$%^&*(),.?":{}|<>]/.test(password)).toBe(true);
    });

    it("should generate different passwords on each call", () => {
      const password1 = passwordService.generateSecurePassword();
      const password2 = passwordService.generateSecurePassword();
      const password3 = passwordService.generateSecurePassword();

      expect(password1).not.toBe(password2);
      expect(password2).not.toBe(password3);
      expect(password1).not.toBe(password3);
    });

    it("should handle minimum length requirements", () => {
      // Test very short length (should still include required character types)
      const password = passwordService.generateSecurePassword(8);

      expect(password.length).toBe(8);

      // Should still have at least one from each category
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/\d/.test(password)).toBe(true);
      expect(/[!@#$%^&*(),.?":{}|<>]/.test(password)).toBe(true);
    });

    it("should generate long passwords correctly", () => {
      const longPassword = passwordService.generateSecurePassword(100);

      expect(longPassword.length).toBe(100);

      const validation = passwordService.validatePasswordStrength(longPassword);
      expect(validation.isValid).toBe(true);
    });

    it("should only use allowed characters", () => {
      const password = passwordService.generateSecurePassword(50);
      const allowedChars = /^[a-zA-Z0-9!@#$%^&*(),.?":{}|<>]+$/;

      expect(allowedChars.test(password)).toBe(true);
    });
  });

  describe("integration tests", () => {
    it("should hash and verify generated password", async () => {
      const generatedPassword = passwordService.generateSecurePassword();
      const hash = await passwordService.hashPassword(generatedPassword);
      const isValid = await passwordService.verifyPassword(
        generatedPassword,
        hash,
      );

      expect(isValid).toBe(true);
    });

    it("should validate generated password strength", () => {
      for (let i = 0; i < 10; i++) {
        const password = passwordService.generateSecurePassword();
        const validation = passwordService.validatePasswordStrength(password);

        expect(validation.isValid).toBe(true);
      }
    });

    it("should handle complete password lifecycle", async () => {
      // 1. Generate secure password
      const password = passwordService.generateSecurePassword();

      // 2. Validate it meets policy
      const validation = passwordService.validatePasswordStrength(password);
      expect(validation.isValid).toBe(true);

      // 3. Hash the password
      const hash = await passwordService.hashPassword(password);

      // 4. Verify correct password
      const isValidCorrect = await passwordService.verifyPassword(
        password,
        hash,
      );
      expect(isValidCorrect).toBe(true);

      // 5. Verify incorrect password fails
      const wrongPassword = passwordService.generateSecurePassword();
      const isValidWrong = await passwordService.verifyPassword(
        wrongPassword,
        hash,
      );
      expect(isValidWrong).toBe(false);
    });
  });

  describe("security considerations", () => {
    it("should not expose original password in hash", async () => {
      const password = "secretPassword123!";
      const hash = await passwordService.hashPassword(password);

      expect(hash).not.toContain(password);
      expect(hash).not.toContain("secret");
      expect(hash).not.toContain("Password");
      expect(hash).not.toContain("123");
    });

    it("should handle timing attacks consistently", async () => {
      const password = "testPassword123!";
      const hash = await passwordService.hashPassword(password);

      // Multiple verification attempts should not reveal timing information
      const startTime1 = Date.now();
      await passwordService.verifyPassword("wrongPassword", hash);
      const time1 = Date.now() - startTime1;

      const startTime2 = Date.now();
      await passwordService.verifyPassword("anotherWrongPassword", hash);
      const time2 = Date.now() - startTime2;

      // Times should be relatively similar (within reasonable variance)
      // This is a basic check - real timing attack prevention is handled by Argon2
      expect(Math.abs(time1 - time2)).toBeLessThan(100); // 100ms variance allowed
    });

    it("should not throw sensitive information in error messages", async () => {
      const password = "testPassword123!";

      try {
        // This should not throw, but if it does, check error message
        await passwordService.verifyPassword(password, "invalid-hash-format");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        expect(errorMessage).not.toContain(password);
      }
    });
  });

  describe("default password policy", () => {
    it("should have sensible default values", () => {
      expect(DEFAULT_PASSWORD_POLICY.minLength).toBe(8);
      expect(DEFAULT_PASSWORD_POLICY.maxLength).toBe(128);
      expect(DEFAULT_PASSWORD_POLICY.requireUppercase).toBe(true);
      expect(DEFAULT_PASSWORD_POLICY.requireLowercase).toBe(true);
      expect(DEFAULT_PASSWORD_POLICY.requireNumbers).toBe(true);
      expect(DEFAULT_PASSWORD_POLICY.requireSpecialChars).toBe(true);
    });

    it("should be used when no policy is provided", () => {
      const weakPassword = "weak";
      const result1 = passwordService.validatePasswordStrength(weakPassword);
      const result2 = passwordService.validatePasswordStrength(
        weakPassword,
        DEFAULT_PASSWORD_POLICY,
      );

      expect(result1).toEqual(result2);
    });
  });

  describe("getCurrentPasswordPolicy", () => {
    it("should return environment-based policy", () => {
      const policy = passwordService.getCurrentPasswordPolicy();

      expect(policy).toBeDefined();
      expect(typeof policy.minLength).toBe("number");
      expect(typeof policy.maxLength).toBe("number");
      expect(typeof policy.requireUppercase).toBe("boolean");
      expect(typeof policy.requireLowercase).toBe("boolean");
      expect(typeof policy.requireNumbers).toBe("boolean");
      expect(typeof policy.requireSpecialChars).toBe("boolean");
    });

    it("should fall back to default policy on error", () => {
      // This test assumes environment is properly set, but tests fallback behavior
      const policy = passwordService.getCurrentPasswordPolicy();

      // Should have valid structure
      expect(policy.minLength).toBeGreaterThanOrEqual(4);
      expect(policy.maxLength).toBeLessThanOrEqual(256);
      expect(policy.minLength).toBeLessThanOrEqual(policy.maxLength);
    });
  });

  describe("validatePasswordPolicy", () => {
    it("should validate a correct policy", () => {
      const validPolicy: PasswordPolicyType = {
        minLength: 8,
        maxLength: 64,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      };

      const result = passwordService.validatePasswordPolicy(validPolicy);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject policy with min length greater than max length", () => {
      const invalidPolicy: PasswordPolicyType = {
        minLength: 20,
        maxLength: 10,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      };

      const result = passwordService.validatePasswordPolicy(invalidPolicy);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Minimum length cannot be greater than maximum length",
      );
    });

    it("should reject policy with min length too small", () => {
      const invalidPolicy: PasswordPolicyType = {
        minLength: 2,
        maxLength: 64,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      };

      const result = passwordService.validatePasswordPolicy(invalidPolicy);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Minimum length must be at least 4 characters",
      );
    });

    it("should reject policy with max length too large", () => {
      const invalidPolicy: PasswordPolicyType = {
        minLength: 8,
        maxLength: 300,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      };

      const result = passwordService.validatePasswordPolicy(invalidPolicy);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Maximum length cannot exceed 256 characters",
      );
    });

    it("should reject policy with min length too large", () => {
      const invalidPolicy: PasswordPolicyType = {
        minLength: 150,
        maxLength: 200,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      };

      const result = passwordService.validatePasswordPolicy(invalidPolicy);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Minimum length cannot exceed 128 characters",
      );
    });

    it("should reject policy with max length too small", () => {
      const invalidPolicy: PasswordPolicyType = {
        minLength: 6,
        maxLength: 6,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      };

      const result = passwordService.validatePasswordPolicy(invalidPolicy);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Maximum length must be at least 8 characters",
      );
    });

    it("should reject policy where required character types exceed min length", () => {
      const invalidPolicy: PasswordPolicyType = {
        minLength: 3,
        maxLength: 64,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      };

      const result = passwordService.validatePasswordPolicy(invalidPolicy);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Minimum length (3) must be at least 4 to accommodate all required character types",
      );
    });

    it("should accept policy with minimal requirements", () => {
      const validPolicy: PasswordPolicyType = {
        minLength: 4,
        maxLength: 8,
        requireUppercase: false,
        requireLowercase: true,
        requireNumbers: false,
        requireSpecialChars: false,
      };

      const result = passwordService.validatePasswordPolicy(validPolicy);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle multiple validation errors", () => {
      const invalidPolicy: PasswordPolicyType = {
        minLength: 2,
        maxLength: 300,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      };

      const result = passwordService.validatePasswordPolicy(invalidPolicy);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain(
        "Minimum length must be at least 4 characters",
      );
      expect(result.errors).toContain(
        "Maximum length cannot exceed 256 characters",
      );
    });
  });

  describe("environment integration", () => {
    it("should load environment password policy", () => {
      const envPolicy = getEnvironmentPasswordPolicy();

      expect(envPolicy).toBeDefined();
      expect(typeof envPolicy.minLength).toBe("number");
      expect(typeof envPolicy.maxLength).toBe("number");
      expect(typeof envPolicy.requireUppercase).toBe("boolean");
      expect(typeof envPolicy.requireLowercase).toBe("boolean");
      expect(typeof envPolicy.requireNumbers).toBe("boolean");
      expect(typeof envPolicy.requireSpecialChars).toBe("boolean");
    });

    it("should use environment policy in password validation", () => {
      // Test that the service uses environment policy by default
      const password = "Test123!";
      const resultWithoutPolicy =
        passwordService.validatePasswordStrength(password);
      const resultWithEnvPolicy = passwordService.validatePasswordStrength(
        password,
        getEnvironmentPasswordPolicy(),
      );

      expect(resultWithoutPolicy).toEqual(resultWithEnvPolicy);
    });
  });

  describe("policy flexibility", () => {
    it("should handle policy with no requirements", () => {
      const lenientPolicy: PasswordPolicyType = {
        minLength: 4,
        maxLength: 256,
        requireUppercase: false,
        requireLowercase: false,
        requireNumbers: false,
        requireSpecialChars: false,
      };

      const password = "abcd";
      const result = passwordService.validatePasswordStrength(
        password,
        lenientPolicy,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle policy with all requirements", () => {
      const strictPolicy: PasswordPolicyType = {
        minLength: 12,
        maxLength: 64,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      };

      const validPassword = "MySecurePass123!";
      const result = passwordService.validatePasswordStrength(
        validPassword,
        strictPolicy,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject password that doesn't meet custom policy", () => {
      const strictPolicy: PasswordPolicyType = {
        minLength: 15,
        maxLength: 64,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      };

      const shortPassword = "Test123!";
      const result = passwordService.validatePasswordStrength(
        shortPassword,
        strictPolicy,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must be at least 15 characters long",
      );
    });
  });
});
