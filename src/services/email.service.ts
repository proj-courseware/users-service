import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/env";
import {
  emailTemplates,
  generateVerificationUrl,
  generatePasswordResetUrl,
  type VerificationEmailData,
  type PasswordResetEmailData,
  type WelcomeEmailData,
} from "@/templates/email.templates";

// Email sending result interfaces
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailSendOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

// Email service configuration
export interface EmailServiceConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  fromAddress: string;
  fromName: string;
  maxRetries: number;
  retryDelayMs: number;
}

// Default email service configuration
export const DEFAULT_EMAIL_CONFIG: EmailServiceConfig = {
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth:
    env.SMTP_USER && env.SMTP_PASSWORD
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        }
      : undefined,
  fromAddress: env.SMTP_FROM_ADDRESS || env.SMTP_USER || "noreply@example.com",
  fromName: env.SMTP_FROM_NAME,
  maxRetries: env.EMAIL_MAX_RETRIES,
  retryDelayMs: env.EMAIL_RETRY_DELAY_MS,
};

// Email service interface
export interface IEmailService {
  sendVerificationEmail(
    userId: string,
    emailAddress: string,
    token: string,
    firstName?: string,
  ): Promise<EmailSendResult>;
  sendPasswordResetEmail(
    userId: string,
    emailAddress: string,
    token: string,
    firstName?: string,
  ): Promise<EmailSendResult>;
  sendWelcomeEmail(
    emailAddress: string,
    firstName?: string,
  ): Promise<EmailSendResult>;
  sendRawEmail(options: EmailSendOptions): Promise<EmailSendResult>;
  isHealthy(): Promise<boolean>;
}

// Main email service implementation
export class EmailService implements IEmailService {
  private transporter: Transporter;
  private readonly config: EmailServiceConfig;

  constructor(config?: Partial<EmailServiceConfig>) {
    this.config = { ...DEFAULT_EMAIL_CONFIG, ...config };
    this.transporter = this.createTransporter();
  }

  /**
   * Create nodemailer transporter with configuration
   * @returns Configured nodemailer transporter
   */
  private createTransporter(): Transporter {
    return nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      // Additional security and configuration options
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000, // 5 seconds
      socketTimeout: 30000, // 30 seconds
    });
  }

  /**
   * Send verification email to user
   * @param userId - User ID (for logging/tracking)
   * @param emailAddress - Email address to send to
   * @param token - Verification token
   * @param firstName - Optional first name for personalization
   * @returns Email send result
   */
  async sendVerificationEmail(
    userId: string,
    emailAddress: string,
    token: string,
    firstName?: string,
  ): Promise<EmailSendResult> {
    try {
      // Generate verification URL
      const verificationUrl = generateVerificationUrl(token);

      // Create email template
      const emailData: VerificationEmailData = {
        firstName,
        verificationUrl,
        expiresInHours: 24, // Match default from email verification service
      };

      const template = emailTemplates.verification(emailData);

      // Send email
      const result = await this.sendEmailWithRetry({
        to: emailAddress,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      // Log success for monitoring
      if (result.success) {
        console.log(
          `Verification email sent to ${emailAddress} for user ${userId}`,
          {
            messageId: result.messageId,
            userId,
            emailAddress,
          },
        );
      }

      return result;
    } catch (error) {
      console.error("Failed to send verification email:", error, {
        userId,
        emailAddress,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send password reset email to user
   * @param userId - User ID (for logging/tracking)
   * @param emailAddress - Email address to send to
   * @param token - Password reset token
   * @param firstName - Optional first name for personalization
   * @returns Email send result
   */
  async sendPasswordResetEmail(
    userId: string,
    emailAddress: string,
    token: string,
    firstName?: string,
  ): Promise<EmailSendResult> {
    try {
      // Generate password reset URL
      const resetUrl = generatePasswordResetUrl(token);

      // Create email template
      const emailData: PasswordResetEmailData = {
        firstName,
        resetUrl,
        expiresInHours: 1, // Password reset tokens typically expire faster
      };

      const template = emailTemplates.passwordReset(emailData);

      // Send email
      const result = await this.sendEmailWithRetry({
        to: emailAddress,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      // Log success for monitoring
      if (result.success) {
        console.log(
          `Password reset email sent to ${emailAddress} for user ${userId}`,
          {
            messageId: result.messageId,
            userId,
            emailAddress,
          },
        );
      }

      return result;
    } catch (error) {
      console.error("Failed to send password reset email:", error, {
        userId,
        emailAddress,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send welcome email to user (after successful verification)
   * @param emailAddress - Email address to send to
   * @param firstName - Optional first name for personalization
   * @returns Email send result
   */
  async sendWelcomeEmail(
    emailAddress: string,
    firstName?: string,
  ): Promise<EmailSendResult> {
    try {
      // Create email template
      const emailData: WelcomeEmailData = {
        firstName,
        appName: "Authentication Service", // Could be made configurable
      };

      const template = emailTemplates.welcome(emailData);

      // Send email
      const result = await this.sendEmailWithRetry({
        to: emailAddress,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      // Log success for monitoring
      if (result.success) {
        console.log(`Welcome email sent to ${emailAddress}`, {
          messageId: result.messageId,
          emailAddress,
        });
      }

      return result;
    } catch (error) {
      console.error("Failed to send welcome email:", error, {
        emailAddress,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send raw email with custom content
   * @param options - Email sending options
   * @returns Email send result
   */
  async sendRawEmail(options: EmailSendOptions): Promise<EmailSendResult> {
    try {
      return await this.sendEmailWithRetry(options);
    } catch (error) {
      console.error("Failed to send raw email:", error, {
        to: options.to,
        subject: options.subject,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send email with retry logic
   * @param options - Email sending options
   * @returns Email send result
   */
  private async sendEmailWithRetry(
    options: EmailSendOptions,
  ): Promise<EmailSendResult> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const info = await this.transporter.sendMail({
          from:
            options.from ||
            `${this.config.fromName} <${this.config.fromAddress}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });

        return {
          success: true,
          messageId: info.messageId,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.maxRetries) {
          // Exponential backoff: 2^(attempt-1) * base delay
          const delay = Math.pow(2, attempt - 1) * this.config.retryDelayMs;
          console.warn(
            `Email sending attempt ${attempt} failed, retrying in ${delay}ms:`,
            error,
          );
          await this.delay(delay);
        }
      }
    }

    // All retries failed
    throw (
      lastError || new Error("Email sending failed after all retry attempts")
    );
  }

  /**
   * Check if email service is healthy
   * @returns True if email service can connect
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Verify SMTP connection
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.warn("Email service health check failed:", error);
      return false;
    }
  }

  /**
   * Close the email service and cleanup resources
   */
  async close(): Promise<void> {
    try {
      this.transporter.close();
    } catch (error) {
      console.warn("Error closing email service:", error);
    }
  }

  /**
   * Utility function to delay execution
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get email service configuration (without sensitive data)
   * @returns Safe configuration object
   */
  getConfig(): Omit<EmailServiceConfig, "auth"> & { hasAuth: boolean } {
    return {
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      fromAddress: this.config.fromAddress,
      fromName: this.config.fromName,
      maxRetries: this.config.maxRetries,
      retryDelayMs: this.config.retryDelayMs,
      hasAuth: !!this.config.auth,
    };
  }
}

// Mock email service for testing
export class MockEmailService implements IEmailService {
  private sentEmails: Array<{
    type: string;
    to: string;
    subject: string;
    content: string;
    sentAt: Date;
  }> = [];

  async sendVerificationEmail(
    userId: string,
    emailAddress: string,
    token: string,
    firstName?: string,
  ): Promise<EmailSendResult> {
    const verificationUrl = generateVerificationUrl(token);
    const template = emailTemplates.verification({
      firstName,
      verificationUrl,
      expiresInHours: 24,
    });

    this.sentEmails.push({
      type: "verification",
      to: emailAddress,
      subject: template.subject,
      content: template.html,
      sentAt: new Date(),
    });

    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random()}`,
    };
  }

  async sendPasswordResetEmail(
    userId: string,
    emailAddress: string,
    token: string,
    firstName?: string,
  ): Promise<EmailSendResult> {
    const resetUrl = generatePasswordResetUrl(token);
    const template = emailTemplates.passwordReset({
      firstName,
      resetUrl,
      expiresInHours: 1,
    });

    this.sentEmails.push({
      type: "passwordReset",
      to: emailAddress,
      subject: template.subject,
      content: template.html,
      sentAt: new Date(),
    });

    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random()}`,
    };
  }

  async sendWelcomeEmail(
    emailAddress: string,
    firstName?: string,
  ): Promise<EmailSendResult> {
    const template = emailTemplates.welcome({
      firstName,
      appName: "Authentication Service",
    });

    this.sentEmails.push({
      type: "welcome",
      to: emailAddress,
      subject: template.subject,
      content: template.html,
      sentAt: new Date(),
    });

    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random()}`,
    };
  }

  async sendRawEmail(options: EmailSendOptions): Promise<EmailSendResult> {
    this.sentEmails.push({
      type: "raw",
      to: options.to,
      subject: options.subject,
      content: options.html,
      sentAt: new Date(),
    });

    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random()}`,
    };
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  // Testing utilities
  getSentEmails() {
    return [...this.sentEmails];
  }

  getLastEmail() {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  getEmailsByType(type: string) {
    return this.sentEmails.filter((email) => email.type === type);
  }

  clearSentEmails() {
    this.sentEmails = [];
  }
}
