import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from "vitest";
import {
  EmailService,
  MockEmailService,
  DEFAULT_EMAIL_CONFIG,
  type EmailServiceConfig,
  type EmailSendOptions,
} from "@/services/email.service";
import {
  generateVerificationUrl,
  generatePasswordResetUrl,
} from "@/templates/email.templates";

describe("EmailService", () => {
  describe("MockEmailService", () => {
    let mockEmailService: MockEmailService;

    beforeEach(() => {
      mockEmailService = new MockEmailService();
      mockEmailService.clearSentEmails();
    });

    describe("sendVerificationEmail", () => {
      it("should send verification email successfully", async () => {
        const result = await mockEmailService.sendVerificationEmail(
          "user123",
          "test@example.com",
          "verification-token-123",
          "John"
        );

        expect(result.success).toBe(true);
        expect(result.messageId).toMatch(/^mock-/);

        const sentEmails = mockEmailService.getSentEmails();
        expect(sentEmails).toHaveLength(1);

        const email = sentEmails[0];
        expect(email.type).toBe("verification");
        expect(email.to).toBe("test@example.com");
        expect(email.subject).toBe("Verify your email address");
        expect(email.content).toContain("Hi John");
        expect(email.content).toContain("verification-token-123");
        expect(email.content).toContain("Verify Email Address");
      });

      it("should send verification email without first name", async () => {
        const result = await mockEmailService.sendVerificationEmail(
          "user123",
          "test@example.com",
          "verification-token-123"
        );

        expect(result.success).toBe(true);

        const sentEmails = mockEmailService.getSentEmails();
        expect(sentEmails).toHaveLength(1);

        const email = sentEmails[0];
        expect(email.content).toContain("Hello");
        expect(email.content).not.toContain("Hi ");
      });

      it("should generate correct verification URL", () => {
        const token = "test-token-123";
        const url = generateVerificationUrl(token);
        
        expect(url).toContain("/verify-email");
        expect(url).toContain(`token=${encodeURIComponent(token)}`);
      });
    });

    describe("sendPasswordResetEmail", () => {
      it("should send password reset email successfully", async () => {
        const result = await mockEmailService.sendPasswordResetEmail(
          "user123",
          "test@example.com",
          "reset-token-456",
          "Jane"
        );

        expect(result.success).toBe(true);
        expect(result.messageId).toMatch(/^mock-/);

        const sentEmails = mockEmailService.getSentEmails();
        expect(sentEmails).toHaveLength(1);

        const email = sentEmails[0];
        expect(email.type).toBe("passwordReset");
        expect(email.to).toBe("test@example.com");
        expect(email.subject).toBe("Password Reset Request");
        expect(email.content).toContain("Hi Jane");
        expect(email.content).toContain("reset-token-456");
        expect(email.content).toContain("Reset Password");
      });

      it("should generate correct password reset URL", () => {
        const token = "reset-token-456";
        const url = generatePasswordResetUrl(token);
        
        expect(url).toContain("/reset-password");
        expect(url).toContain(`token=${encodeURIComponent(token)}`);
      });
    });

    describe("sendWelcomeEmail", () => {
      it("should send welcome email successfully", async () => {
        const result = await mockEmailService.sendWelcomeEmail(
          "test@example.com",
          "Bob"
        );

        expect(result.success).toBe(true);

        const sentEmails = mockEmailService.getSentEmails();
        expect(sentEmails).toHaveLength(1);

        const email = sentEmails[0];
        expect(email.type).toBe("welcome");
        expect(email.to).toBe("test@example.com");
        expect(email.subject).toBe("Welcome to Authentication Service!");
        expect(email.content).toContain("Hi Bob");
        expect(email.content).toContain("Welcome to Authentication Service!");
      });
    });

    describe("sendRawEmail", () => {
      it("should send raw email successfully", async () => {
        const emailOptions: EmailSendOptions = {
          to: "test@example.com",
          subject: "Custom Subject",
          html: "<h1>Custom HTML</h1>",
          text: "Custom Text",
        };

        const result = await mockEmailService.sendRawEmail(emailOptions);

        expect(result.success).toBe(true);

        const sentEmails = mockEmailService.getSentEmails();
        expect(sentEmails).toHaveLength(1);

        const email = sentEmails[0];
        expect(email.type).toBe("raw");
        expect(email.to).toBe("test@example.com");
        expect(email.subject).toBe("Custom Subject");
        expect(email.content).toBe("<h1>Custom HTML</h1>");
      });
    });

    describe("isHealthy", () => {
      it("should always return true for mock service", async () => {
        const healthy = await mockEmailService.isHealthy();
        expect(healthy).toBe(true);
      });
    });

    describe("testing utilities", () => {
      beforeEach(async () => {
        // Send a few test emails
        await mockEmailService.sendVerificationEmail("user1", "test1@example.com", "token1");
        await mockEmailService.sendPasswordResetEmail("user2", "test2@example.com", "token2");
        await mockEmailService.sendWelcomeEmail("test3@example.com");
      });

      it("should track all sent emails", () => {
        const sentEmails = mockEmailService.getSentEmails();
        expect(sentEmails).toHaveLength(3);
      });

      it("should return last sent email", () => {
        const lastEmail = mockEmailService.getLastEmail();
        expect(lastEmail.type).toBe("welcome");
        expect(lastEmail.to).toBe("test3@example.com");
      });

      it("should filter emails by type", () => {
        const verificationEmails = mockEmailService.getEmailsByType("verification");
        const resetEmails = mockEmailService.getEmailsByType("passwordReset");
        const welcomeEmails = mockEmailService.getEmailsByType("welcome");

        expect(verificationEmails).toHaveLength(1);
        expect(resetEmails).toHaveLength(1);
        expect(welcomeEmails).toHaveLength(1);

        expect(verificationEmails[0].to).toBe("test1@example.com");
        expect(resetEmails[0].to).toBe("test2@example.com");
        expect(welcomeEmails[0].to).toBe("test3@example.com");
      });

      it("should clear sent emails", () => {
        expect(mockEmailService.getSentEmails()).toHaveLength(3);
        
        mockEmailService.clearSentEmails();
        
        expect(mockEmailService.getSentEmails()).toHaveLength(0);
      });
    });
  });

  describe("EmailService Configuration", () => {
    it("should use default configuration", () => {
      const emailService = new EmailService();
      const config = emailService.getConfig();

      expect(config.host).toBe(DEFAULT_EMAIL_CONFIG.host);
      expect(config.port).toBe(DEFAULT_EMAIL_CONFIG.port);
      expect(config.secure).toBe(DEFAULT_EMAIL_CONFIG.secure);
      expect(config.fromAddress).toBe(DEFAULT_EMAIL_CONFIG.fromAddress);
      expect(config.fromName).toBe(DEFAULT_EMAIL_CONFIG.fromName);
      expect(config.maxRetries).toBe(DEFAULT_EMAIL_CONFIG.maxRetries);
      expect(config.retryDelayMs).toBe(DEFAULT_EMAIL_CONFIG.retryDelayMs);
    });

    it("should merge custom configuration with defaults", () => {
      const customConfig: Partial<EmailServiceConfig> = {
        host: "custom.smtp.com",
        port: 587,
        fromName: "Custom Service",
        maxRetries: 5,
      };

      const emailService = new EmailService(customConfig);
      const config = emailService.getConfig();

      expect(config.host).toBe("custom.smtp.com");
      expect(config.port).toBe(587);
      expect(config.fromName).toBe("Custom Service");
      expect(config.maxRetries).toBe(5);
      
      // Should keep defaults for unspecified values
      expect(config.secure).toBe(DEFAULT_EMAIL_CONFIG.secure);
      expect(config.retryDelayMs).toBe(DEFAULT_EMAIL_CONFIG.retryDelayMs);
    });

    it("should indicate auth presence without exposing credentials", () => {
      const configWithAuth: Partial<EmailServiceConfig> = {
        auth: {
          user: "test@example.com",
          pass: "secret",
        },
      };

      const emailService = new EmailService(configWithAuth);
      const config = emailService.getConfig();

      expect(config.hasAuth).toBe(true);
      expect(config).not.toHaveProperty("auth");
    });

    it("should indicate no auth when not provided", () => {
      const emailService = new EmailService();
      const config = emailService.getConfig();

      expect(config.hasAuth).toBe(false);
    });
  });

  describe("Email Templates Integration", () => {
    let mockEmailService: MockEmailService;

    beforeEach(() => {
      mockEmailService = new MockEmailService();
    });

    it("should render verification email template correctly", async () => {
      await mockEmailService.sendVerificationEmail(
        "user123",
        "test@example.com",
        "token123",
        "Alice"
      );

      const email = mockEmailService.getLastEmail();
      
      // Check that template placeholders are replaced
      expect(email.content).toContain("Hi Alice");
      expect(email.content).toContain("token123");
      expect(email.content).toContain("24 hours");
      expect(email.content).toContain("Verify Email Address");
      
      // Check HTML structure
      expect(email.content).toContain("<h1");
      expect(email.content).toContain("<a href=");
      expect(email.content).toContain("style=");
    });

    it("should render password reset email template correctly", async () => {
      await mockEmailService.sendPasswordResetEmail(
        "user123",
        "test@example.com",
        "resetToken456",
        "Bob"
      );

      const email = mockEmailService.getLastEmail();
      
      expect(email.content).toContain("Hi Bob");
      expect(email.content).toContain("resetToken456");
      expect(email.content).toContain("1 hour");
      expect(email.content).toContain("Reset Password");
      expect(email.content).toContain("Password Reset");
    });

    it("should render welcome email template correctly", async () => {
      await mockEmailService.sendWelcomeEmail("test@example.com", "Charlie");

      const email = mockEmailService.getLastEmail();
      
      expect(email.content).toContain("Hi Charlie");
      expect(email.content).toContain("Welcome to Authentication Service!");
      expect(email.content).toContain("successfully verified");
      expect(email.content).toContain("now active");
    });

    it("should handle missing first name gracefully", async () => {
      await mockEmailService.sendVerificationEmail("user123", "test@example.com", "token123");
      const verificationEmail = mockEmailService.getLastEmail();
      expect(verificationEmail.content).toContain("Hello,");

      await mockEmailService.sendPasswordResetEmail("user123", "test@example.com", "token123");
      const resetEmail = mockEmailService.getLastEmail();
      expect(resetEmail.content).toContain("Hello,");

      await mockEmailService.sendWelcomeEmail("test@example.com");
      const welcomeEmail = mockEmailService.getLastEmail();
      expect(welcomeEmail.content).toContain("Welcome,");
    });
  });

  describe("Error Handling", () => {
    it("should handle email service errors gracefully in mock", async () => {
      // Mock email service doesn't actually fail, but test interface
      const mockEmailService = new MockEmailService();
      
      const result = await mockEmailService.sendVerificationEmail(
        "user123",
        "invalid-email", // Mock service accepts any email format
        "token123"
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });

  describe("Integration Scenarios", () => {
    let mockEmailService: MockEmailService;

    beforeEach(() => {
      mockEmailService = new MockEmailService();
    });

    it("should handle user registration flow", async () => {
      // Simulate user registration requiring email verification
      const userId = "new-user-123";
      const email = "newuser@example.com";
      const token = "verification-token-abc";
      const firstName = "New";

      const result = await mockEmailService.sendVerificationEmail(
        userId,
        email,
        token,
        firstName
      );

      expect(result.success).toBe(true);

      const sentEmail = mockEmailService.getLastEmail();
      expect(sentEmail.type).toBe("verification");
      expect(sentEmail.to).toBe(email);
      expect(sentEmail.content).toContain(firstName);
      expect(sentEmail.content).toContain(token);
    });

    it("should handle password reset flow", async () => {
      // Simulate password reset request
      const userId = "existing-user-456";
      const email = "user@example.com";
      const resetToken = "reset-token-xyz";
      const firstName = "Existing";

      const result = await mockEmailService.sendPasswordResetEmail(
        userId,
        email,
        resetToken,
        firstName
      );

      expect(result.success).toBe(true);

      const sentEmail = mockEmailService.getLastEmail();
      expect(sentEmail.type).toBe("passwordReset");
      expect(sentEmail.to).toBe(email);
      expect(sentEmail.content).toContain(firstName);
      expect(sentEmail.content).toContain(resetToken);
    });

    it("should handle post-verification welcome flow", async () => {
      // Simulate sending welcome email after successful verification
      const email = "verified@example.com";
      const firstName = "Verified";

      const result = await mockEmailService.sendWelcomeEmail(email, firstName);

      expect(result.success).toBe(true);

      const sentEmail = mockEmailService.getLastEmail();
      expect(sentEmail.type).toBe("welcome");
      expect(sentEmail.to).toBe(email);
      expect(sentEmail.content).toContain(firstName);
      expect(sentEmail.content).toContain("successfully verified");
    });

    it("should handle multiple emails for same user", async () => {
      const userId = "multi-email-user";
      const primaryEmail = "primary@example.com";
      const secondaryEmail = "secondary@example.com";
      const firstName = "Multi";

      // Send verification for primary email
      await mockEmailService.sendVerificationEmail(userId, primaryEmail, "token1", firstName);
      
      // Send verification for secondary email
      await mockEmailService.sendVerificationEmail(userId, secondaryEmail, "token2", firstName);

      const sentEmails = mockEmailService.getSentEmails();
      expect(sentEmails).toHaveLength(2);

      const primaryEmailSent = sentEmails.find(e => e.to === primaryEmail);
      const secondaryEmailSent = sentEmails.find(e => e.to === secondaryEmail);

      expect(primaryEmailSent).toBeDefined();
      expect(secondaryEmailSent).toBeDefined();
      expect(primaryEmailSent?.content).toContain("token1");
      expect(secondaryEmailSent?.content).toContain("token2");
    });
  });
});

// Test utilities for testing email functionality in other test files
export function createMockEmailService(): MockEmailService {
  return new MockEmailService();
}

export function expectVerificationEmailSent(
  mockEmailService: MockEmailService,
  to: string,
  token: string,
  firstName?: string
): void {
  const verificationEmails = mockEmailService.getEmailsByType("verification");
  const targetEmail = verificationEmails.find(email => 
    email.to === to && email.content.includes(token)
  );

  expect(targetEmail).toBeDefined();
  expect(targetEmail?.subject).toBe("Verify your email address");
  
  if (firstName) {
    expect(targetEmail?.content).toContain(`Hi ${firstName}`);
  } else {
    expect(targetEmail?.content).toContain("Hello,");
  }
}

export function expectPasswordResetEmailSent(
  mockEmailService: MockEmailService,
  to: string,
  token: string,
  firstName?: string
): void {
  const resetEmails = mockEmailService.getEmailsByType("passwordReset");
  const targetEmail = resetEmails.find(email => 
    email.to === to && email.content.includes(token)
  );

  expect(targetEmail).toBeDefined();
  expect(targetEmail?.subject).toBe("Password Reset Request");
  
  if (firstName) {
    expect(targetEmail?.content).toContain(`Hi ${firstName}`);
  } else {
    expect(targetEmail?.content).toContain("Hello,");
  }
}

export function expectWelcomeEmailSent(
  mockEmailService: MockEmailService,
  to: string,
  firstName?: string
): void {
  const welcomeEmails = mockEmailService.getEmailsByType("welcome");
  const targetEmail = welcomeEmails.find(email => email.to === to);

  expect(targetEmail).toBeDefined();
  expect(targetEmail?.subject).toBe("Welcome to Authentication Service!");
  
  if (firstName) {
    expect(targetEmail?.content).toContain(`Hi ${firstName}`);
  } else {
    expect(targetEmail?.content).toContain("Welcome,");
  }
}