import { describe, it, expect } from "vitest";
import {
  createVerificationEmailTemplate,
  createPasswordResetEmailTemplate,
  createWelcomeEmailTemplate,
  generateVerificationUrl,
  generatePasswordResetUrl,
  type VerificationEmailData,
  type PasswordResetEmailData,
  type WelcomeEmailData,
} from "@/templates/email.templates";

describe("Email Templates", () => {
  describe("createVerificationEmailTemplate", () => {
    it("should create verification email with first name", () => {
      const data: VerificationEmailData = {
        firstName: "John",
        verificationUrl: "https://app.example.com/verify?token=abc123",
        expiresInHours: 24,
      };

      const template = createVerificationEmailTemplate(data);

      expect(template.subject).toBe("Verify your email address");
      expect(template.html).toContain("Hi John");
      expect(template.html).toContain(
        "https://app.example.com/verify?token=abc123",
      );
      expect(template.html).toContain("24 hours");
      expect(template.html).toContain("Verify Email Address");
      expect(template.text).toContain("Hi John");
      expect(template.text).toContain(
        "https://app.example.com/verify?token=abc123",
      );
      expect(template.text).toContain("24 hours");
    });

    it("should create verification email without first name", () => {
      const data: VerificationEmailData = {
        verificationUrl: "https://app.example.com/verify?token=xyz789",
        expiresInHours: 12,
      };

      const template = createVerificationEmailTemplate(data);

      expect(template.subject).toBe("Verify your email address");
      expect(template.html).toContain("Hello,");
      expect(template.html).not.toContain("Hi ");
      expect(template.html).toContain(
        "https://app.example.com/verify?token=xyz789",
      );
      expect(template.html).toContain("12 hours");
      expect(template.text).toContain("Hello,");
      expect(template.text).toContain(
        "https://app.example.com/verify?token=xyz789",
      );
      expect(template.text).toContain("12 hours");
    });

    it("should include proper HTML structure", () => {
      const data: VerificationEmailData = {
        firstName: "Alice",
        verificationUrl: "https://test.com/verify?token=test",
        expiresInHours: 24,
      };

      const template = createVerificationEmailTemplate(data);

      // Check HTML elements
      expect(template.html).toContain("<div");
      expect(template.html).toContain("<h1");
      expect(template.html).toContain("<p");
      expect(template.html).toContain("<a href=");
      expect(template.html).toContain("style=");

      // Check button styling
      expect(template.html).toContain("background-color: #007bff");
      expect(template.html).toContain("color: white");
      expect(template.html).toContain("padding: 14px 28px");
      expect(template.html).toContain("text-decoration: none");
    });

    it("should have clean plain text version", () => {
      const data: VerificationEmailData = {
        firstName: "Bob",
        verificationUrl: "https://test.com/verify?token=plaintext",
        expiresInHours: 24,
      };

      const template = createVerificationEmailTemplate(data);

      // Text should not contain HTML tags
      expect(template.text).not.toContain("<");
      expect(template.text).not.toContain(">");
      expect(template.text).not.toContain("style=");

      // But should contain key information
      expect(template.text).toContain("Hi Bob");
      expect(template.text).toContain(
        "https://test.com/verify?token=plaintext",
      );
      expect(template.text).toContain("24 hours");
      expect(template.text).toContain("Email Verification");
    });
  });

  describe("createPasswordResetEmailTemplate", () => {
    it("should create password reset email with first name", () => {
      const data: PasswordResetEmailData = {
        firstName: "Jane",
        resetUrl: "https://app.example.com/reset?token=reset123",
        expiresInHours: 1,
      };

      const template = createPasswordResetEmailTemplate(data);

      expect(template.subject).toBe("Password Reset Request");
      expect(template.html).toContain("Hi Jane");
      expect(template.html).toContain(
        "https://app.example.com/reset?token=reset123",
      );
      expect(template.html).toContain("1 hour");
      expect(template.html).toContain("Reset Password");
      expect(template.text).toContain("Hi Jane");
      expect(template.text).toContain(
        "https://app.example.com/reset?token=reset123",
      );
      expect(template.text).toContain("1 hour");
    });

    it("should create password reset email without first name", () => {
      const data: PasswordResetEmailData = {
        resetUrl: "https://app.example.com/reset?token=reset456",
        expiresInHours: 2,
      };

      const template = createPasswordResetEmailTemplate(data);

      expect(template.subject).toBe("Password Reset Request");
      expect(template.html).toContain("Hello,");
      expect(template.html).not.toContain("Hi ");
      expect(template.html).toContain(
        "https://app.example.com/reset?token=reset456",
      );
      expect(template.html).toContain("2 hour");
      expect(template.text).toContain("Hello,");
      expect(template.text).toContain(
        "https://app.example.com/reset?token=reset456",
      );
      expect(template.text).toContain("2 hour");
    });

    it("should include security warnings", () => {
      const data: PasswordResetEmailData = {
        firstName: "Security",
        resetUrl: "https://secure.com/reset?token=secure123",
        expiresInHours: 1,
      };

      const template = createPasswordResetEmailTemplate(data);

      expect(template.html).toContain("Security Notice");
      expect(template.html).toContain("If you didn't request");
      expect(template.html).toContain("ignore this email");
      expect(template.text).toContain("If you didn't request");
      expect(template.text).toContain("ignore this email");
    });

    it("should use appropriate styling for reset button", () => {
      const data: PasswordResetEmailData = {
        resetUrl: "https://test.com/reset",
        expiresInHours: 1,
      };

      const template = createPasswordResetEmailTemplate(data);

      // Check reset button has warning color (red)
      expect(template.html).toContain("background-color: #dc3545");
      expect(template.html).toContain("Reset Password");
    });
  });

  describe("createWelcomeEmailTemplate", () => {
    it("should create welcome email with first name", () => {
      const data: WelcomeEmailData = {
        firstName: "Charlie",
        appName: "Test App",
      };

      const template = createWelcomeEmailTemplate(data);

      expect(template.subject).toBe("Welcome to Test App!");
      expect(template.html).toContain("Hi Charlie");
      expect(template.html).toContain("Welcome to Test App!");
      expect(template.html).toContain("successfully verified");
      expect(template.html).toContain("now active");
      expect(template.text).toContain("Hi Charlie");
      expect(template.text).toContain("Welcome to Test App!");
      expect(template.text).toContain("successfully verified");
    });

    it("should create welcome email without first name", () => {
      const data: WelcomeEmailData = {
        appName: "My Service",
      };

      const template = createWelcomeEmailTemplate(data);

      expect(template.subject).toBe("Welcome to My Service!");
      expect(template.html).toContain("Welcome,");
      expect(template.html).not.toContain("Hi ");
      expect(template.html).toContain("Welcome to My Service!");
      expect(template.text).toContain("Welcome,");
      expect(template.text).toContain("Welcome to My Service!");
    });

    it("should include positive messaging", () => {
      const data: WelcomeEmailData = {
        firstName: "Happy",
        appName: "Awesome App",
      };

      const template = createWelcomeEmailTemplate(data);

      expect(template.html).toContain("successfully verified");
      expect(template.html).toContain("now active");
      expect(template.html).toContain("Thank you for joining");
      expect(template.text).toContain("successfully verified");
      expect(template.text).toContain("now active");
      expect(template.text).toContain("Thank you for joining");
    });

    it("should use positive styling", () => {
      const data: WelcomeEmailData = {
        appName: "Style Test",
      };

      const template = createWelcomeEmailTemplate(data);

      // Check welcome uses success color (green)
      expect(template.html).toContain("color: #28a745");
    });
  });

  describe("URL Generators", () => {
    describe("generateVerificationUrl", () => {
      it("should generate correct verification URL", () => {
        const token = "verification-token-123";
        const url = generateVerificationUrl(token);

        expect(url).toContain("/verify-email");
        expect(url).toContain(`token=${encodeURIComponent(token)}`);
        expect(url).toMatch(/^https?:\/\//); // Should be a valid URL
      });

      it("should URL encode special characters in token", () => {
        const token = "token with spaces & special chars!";
        const url = generateVerificationUrl(token);

        expect(url).toContain(`token=${encodeURIComponent(token)}`);
        expect(url).not.toContain(" "); // Spaces should be encoded
        expect(url).not.toContain("&"); // Special chars should be encoded (except in query)
      });

      it("should use FRONTEND_URL from environment", () => {
        const token = "test-token";
        const url = generateVerificationUrl(token);

        // Should start with the frontend URL (default in test: http://localhost:3001)
        expect(url).toMatch(/^http:\/\/localhost:3001/);
      });
    });

    describe("generatePasswordResetUrl", () => {
      it("should generate correct password reset URL", () => {
        const token = "reset-token-456";
        const url = generatePasswordResetUrl(token);

        expect(url).toContain("/reset-password");
        expect(url).toContain(`token=${encodeURIComponent(token)}`);
        expect(url).toMatch(/^https?:\/\//); // Should be a valid URL
      });

      it("should URL encode special characters in reset token", () => {
        const token = "reset+token/with=special&chars";
        const url = generatePasswordResetUrl(token);

        expect(url).toContain(`token=${encodeURIComponent(token)}`);
        // The URL itself will contain / in the base URL, so check the encoded token part
        const encodedToken = encodeURIComponent(token);
        expect(encodedToken).not.toContain("+");
        expect(encodedToken).not.toContain("=");
        expect(encodedToken).toContain("%2F"); // / should be encoded as %2F
      });
    });
  });

  describe("Template Rendering", () => {
    it("should handle multiple template variables", () => {
      const data: VerificationEmailData = {
        firstName: "Multi",
        verificationUrl: "https://multi.test/verify?token=multi123",
        expiresInHours: 48,
      };

      const template = createVerificationEmailTemplate(data);

      // All variables should be replaced
      expect(template.html).not.toContain("{{");
      expect(template.html).not.toContain("}}");
      expect(template.text).not.toContain("{{");
      expect(template.text).not.toContain("}}");

      // Specific values should be present
      expect(template.html).toContain("Multi");
      expect(template.html).toContain(
        "https://multi.test/verify?token=multi123",
      );
      expect(template.html).toContain("48 hours");
    });

    it("should handle missing optional variables gracefully", () => {
      const data: VerificationEmailData = {
        verificationUrl: "https://test.com/verify",
        expiresInHours: 24,
        // firstName is undefined
      };

      const template = createVerificationEmailTemplate(data);

      // Should default to generic greeting
      expect(template.html).toContain("Hello,");
      expect(template.text).toContain("Hello,");

      // Other variables should still work
      expect(template.html).toContain("https://test.com/verify");
      expect(template.html).toContain("24 hours");
    });

    it("should preserve template structure with different data", () => {
      const shortData: VerificationEmailData = {
        firstName: "A",
        verificationUrl: "https://a.co/v",
        expiresInHours: 1,
      };

      const longData: VerificationEmailData = {
        firstName: "Verylongfirstnamethatmightcauseissues",
        verificationUrl:
          "https://very-long-domain-name-for-testing.example.com/verify-email-address?token=very-long-token-that-might-cause-line-wrapping-issues",
        expiresInHours: 168, // 1 week
      };

      const shortTemplate = createVerificationEmailTemplate(shortData);
      const longTemplate = createVerificationEmailTemplate(longData);

      // Both should have same basic structure
      expect(shortTemplate.subject).toBe(longTemplate.subject);
      expect(shortTemplate.html).toMatch(/<div.*style=/);
      expect(longTemplate.html).toMatch(/<div.*style=/);
      expect(shortTemplate.html).toContain("Verify Email Address");
      expect(longTemplate.html).toContain("Verify Email Address");
    });
  });

  describe("Email Content Security", () => {
    it("should include verification URL appropriately", () => {
      const data: VerificationEmailData = {
        firstName: "Security",
        verificationUrl: "https://secure.com/verify?token=secret-token-123",
        expiresInHours: 24,
      };

      const template = createVerificationEmailTemplate(data);

      // Token should appear in the URL (both as href and displayed URL for accessibility)
      expect(template.html).toContain(
        'href="https://secure.com/verify?token=secret-token-123"',
      );
      expect(template.html).toContain("Verify Email Address");
      expect(template.text).toContain(
        "https://secure.com/verify?token=secret-token-123",
      );

      // Should not appear as raw token elsewhere
      expect(template.html).not.toContain("Token: secret-token-123");
      expect(template.html).not.toContain(
        "secret-token-123 is your verification code",
      );
    });

    it("should use secure link styling", () => {
      const data: VerificationEmailData = {
        verificationUrl: "https://secure.test/verify?token=test",
        expiresInHours: 24,
      };

      const template = createVerificationEmailTemplate(data);

      // Button should be clearly styled and accessible
      expect(template.html).toContain(
        'href="https://secure.test/verify?token=test"',
      );
      expect(template.html).toContain("Verify Email Address");
      expect(template.html).toContain("display: inline-block");
    });

    it("should include proper disclaimers", () => {
      const verificationTemplate = createVerificationEmailTemplate({
        verificationUrl: "https://test.com/verify",
        expiresInHours: 24,
      });

      const resetTemplate = createPasswordResetEmailTemplate({
        resetUrl: "https://test.com/reset",
        expiresInHours: 1,
      });

      // Both should include automated system disclaimer
      expect(verificationTemplate.html).toContain("automated system");
      expect(verificationTemplate.text).toContain("automated system");
      expect(resetTemplate.html).toContain("automated system");
      expect(resetTemplate.text).toContain("automated system");

      // Reset should include additional security warnings
      expect(resetTemplate.html).toContain("If you didn't request");
      expect(resetTemplate.text).toContain("If you didn't request");
    });
  });
});
