import { env } from "@/env";

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface VerificationEmailData {
  firstName?: string;
  verificationUrl: string;
  expiresInHours: number;
}

export interface PasswordResetEmailData {
  firstName?: string;
  resetUrl: string;
  expiresInHours: number;
}

export interface WelcomeEmailData {
  firstName?: string;
  appName: string;
}

// Template rendering utility
function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}

// Email verification template
export function createVerificationEmailTemplate(
  data: VerificationEmailData,
): EmailTemplate {
  const greeting = data.firstName ? `Hi ${data.firstName}` : "Hello";

  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin: 0; font-size: 28px;">Email Verification</h1>
        </div>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          {{greeting}},
        </p>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
          Thank you for registering! Please verify your email address by clicking the button below:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{verificationUrl}}" style="background-color: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
          Or copy and paste this link into your browser:
        </p>
        
        <p style="color: #007bff; font-size: 14px; word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">
          {{verificationUrl}}
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
            <strong>Important:</strong> This verification link will expire in {{expiresInHours}} hours.
          </p>
          
          <p style="color: #999; font-size: 14px; line-height: 1.6; margin-bottom: 0;">
            If you didn't create an account, please ignore this email.
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        This email was sent from an automated system. Please do not reply.
      </div>
    </div>
  `;

  const textTemplate = `
Email Verification

{{greeting}},

Thank you for registering! Please verify your email address by visiting the following link:

{{verificationUrl}}

This verification link will expire in {{expiresInHours}} hours.

If you didn't create an account, please ignore this email.

---
This email was sent from an automated system. Please do not reply.
  `;

  const templateData = {
    greeting,
    verificationUrl: data.verificationUrl,
    expiresInHours: data.expiresInHours,
  };

  return {
    subject: "Verify your email address",
    html: renderTemplate(htmlTemplate, templateData),
    text: renderTemplate(textTemplate, templateData),
  };
}

// Password reset template
export function createPasswordResetEmailTemplate(
  data: PasswordResetEmailData,
): EmailTemplate {
  const greeting = data.firstName ? `Hi ${data.firstName}` : "Hello";

  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #dc3545; margin: 0; font-size: 28px;">Password Reset</h1>
        </div>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          {{greeting}},
        </p>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
          You requested a password reset for your account. Click the button below to set a new password:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{resetUrl}}" style="background-color: #dc3545; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
          Or copy and paste this link into your browser:
        </p>
        
        <p style="color: #dc3545; font-size: 14px; word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">
          {{resetUrl}}
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
            <strong>Security Notice:</strong> This reset link will expire in {{expiresInHours}} hour(s).
          </p>
          
          <p style="color: #999; font-size: 14px; line-height: 1.6; margin-bottom: 0;">
            If you didn't request a password reset, please ignore this email and your password will remain unchanged.
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        This email was sent from an automated system. Please do not reply.
      </div>
    </div>
  `;

  const textTemplate = `
Password Reset

{{greeting}},

You requested a password reset for your account. Please visit the following link to set a new password:

{{resetUrl}}

This reset link will expire in {{expiresInHours}} hour(s).

If you didn't request a password reset, please ignore this email and your password will remain unchanged.

---
This email was sent from an automated system. Please do not reply.
  `;

  const templateData = {
    greeting,
    resetUrl: data.resetUrl,
    expiresInHours: data.expiresInHours,
  };

  return {
    subject: "Password Reset Request",
    html: renderTemplate(htmlTemplate, templateData),
    text: renderTemplate(textTemplate, templateData),
  };
}

// Welcome email template (optional, for after email verification)
export function createWelcomeEmailTemplate(
  data: WelcomeEmailData,
): EmailTemplate {
  const greeting = data.firstName ? `Hi ${data.firstName}` : "Welcome";

  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #28a745; margin: 0; font-size: 28px;">Welcome to {{appName}}!</h1>
        </div>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          {{greeting}},
        </p>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
          Your email has been successfully verified and your account is now active!
        </p>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
          You can now use all features of {{appName}}. If you have any questions or need assistance, please don't hesitate to contact our support team.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 14px; line-height: 1.6; margin-bottom: 0;">
            Thank you for joining {{appName}}!
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        This email was sent from an automated system. Please do not reply.
      </div>
    </div>
  `;

  const textTemplate = `
Welcome to {{appName}}!

{{greeting}},

Your email has been successfully verified and your account is now active!

You can now use all features of {{appName}}. If you have any questions or need assistance, please don't hesitate to contact our support team.

Thank you for joining {{appName}}!

---
This email was sent from an automated system. Please do not reply.
  `;

  const templateData = {
    greeting,
    appName: data.appName,
  };

  return {
    subject: `Welcome to ${data.appName}!`,
    html: renderTemplate(htmlTemplate, templateData),
    text: renderTemplate(textTemplate, templateData),
  };
}

// Email template utilities
export const emailTemplates = {
  verification: createVerificationEmailTemplate,
  passwordReset: createPasswordResetEmailTemplate,
  welcome: createWelcomeEmailTemplate,
};

// Helper function to generate verification URL
export function generateVerificationUrl(token: string): string {
  const baseUrl = env.FRONTEND_URL;
  return `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
}

// Helper function to generate password reset URL
export function generatePasswordResetUrl(token: string): string {
  const baseUrl = env.FRONTEND_URL;
  return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
}
