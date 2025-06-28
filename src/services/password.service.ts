import argon2 from "argon2";
import { z } from "zod";

// Password policy schema
export const passwordPolicySchema = z.object({
  minLength: z.number().min(8).default(8),
  requireUppercase: z.boolean().default(true),
  requireLowercase: z.boolean().default(true),
  requireNumbers: z.boolean().default(true),
  requireSpecialChars: z.boolean().default(true),
  maxLength: z.number().max(128).default(128),
});

export type PasswordPolicyType = z.infer<typeof passwordPolicySchema>;

// Password validation result schema
export const passwordValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()),
});

export type PasswordValidationResultType = z.infer<
  typeof passwordValidationResultSchema
>;

// Default password policy
export const DEFAULT_PASSWORD_POLICY: PasswordPolicyType = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLength: 128,
};

// Password service interface
export interface IPasswordService {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  validatePasswordStrength(
    password: string,
    policy?: PasswordPolicyType,
  ): PasswordValidationResultType;
  generateSecurePassword(length?: number): string;
}

// Password service implementation using Argon2id
export class PasswordService implements IPasswordService {
  private readonly argon2Options = {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64MB
    timeCost: 3,
    parallelism: 1,
  };

  /**
   * Hash a password using Argon2id
   * @param password - Plain text password to hash
   * @returns Promise that resolves to hashed password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      return await argon2.hash(password, this.argon2Options);
    } catch (error) {
      throw new Error(
        `Failed to hash password: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Verify a password against its hash
   * @param password - Plain text password to verify
   * @param hash - Stored password hash
   * @returns Promise that resolves to true if password matches
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      // Log error but don't expose details for security
      console.error("Password verification error:", error);
      return false;
    }
  }

  /**
   * Validate password strength against policy
   * @param password - Password to validate
   * @param policy - Password policy to check against (uses default if not provided)
   * @returns Validation result with isValid flag and error messages
   */
  validatePasswordStrength(
    password: string,
    policy: PasswordPolicyType = DEFAULT_PASSWORD_POLICY,
  ): PasswordValidationResultType {
    const errors: string[] = [];

    // Check minimum length
    if (password.length < policy.minLength) {
      errors.push(
        `Password must be at least ${policy.minLength} characters long`,
      );
    }

    // Check maximum length
    if (password.length > policy.maxLength) {
      errors.push(
        `Password must be no more than ${policy.maxLength} characters long`,
      );
    }

    // Check uppercase requirement
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    // Check lowercase requirement
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    // Check numbers requirement
    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    // Check special characters requirement
    if (
      policy.requireSpecialChars &&
      !/[!@#$%^&*(),.?":{}|<>]/.test(password)
    ) {
      errors.push(
        'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)',
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate a secure random password
   * @param length - Length of password to generate (default: 16)
   * @returns Randomly generated secure password
   */
  generateSecurePassword(length: number = 16): string {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const specialChars = '!@#$%^&*(),.?":{}|<>';

    const allChars = lowercase + uppercase + numbers + specialChars;

    // Ensure at least one character from each required category
    let password = "";
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];

    // Fill remaining length with random characters
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password to avoid predictable patterns
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }
}
