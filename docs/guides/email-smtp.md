# Email & SMTP Development Guide

This guide explains why authentication services need email functionality, how SMTP works in production, and why Mailpit is essential for local development testing.

## Table of Contents

- [Why Authentication Services Need Email](#why-authentication-services-need-email)
- [SMTP in Production vs Development](#smtp-in-production-vs-development)
- [Mailpit for Development](#mailpit-for-development)
- [Configuration Patterns](#configuration-patterns)
- [Testing Email Functionality](#testing-email-functionality)
- [Production Email Setup](#production-email-setup)

## Why Authentication Services Need Email

### Core Email Requirements

Authentication services require email functionality for several critical features:

1. **Account Verification**: Users must verify their email addresses when registering
2. **Password Reset**: Secure password reset links sent via email
3. **Login Notifications**: Security alerts for new device logins
4. **Account Recovery**: Email-based account recovery when users lose access
5. **Multi-factor Authentication**: Email-based 2FA codes and backup methods

### The Development Problem

During development, you need to test these email flows without:

- Sending real emails to real users
- Setting up complex production email services
- Accidentally triggering spam filters
- Exposing email credentials in development environments

This is where Mailpit becomes essential.

## SMTP in Production vs Development

### Production SMTP Requirements

In production, your authentication service needs a reliable SMTP service:

```typescript
// Production email configuration
const productionConfig = {
  SMTP_HOST: "smtp.gmail.com", // Gmail's SMTP server
  SMTP_PORT: 465, // Secure port for Gmail
  SMTP_SECURE: true, // Use TLS/SSL encryption
  SMTP_USER: "your-app@yourdomain.com", // Service account email
  SMTP_PASSWORD: "app-specific-password", // App password, not regular password
};
```

**Production Considerations:**

- **Reliability**: 99.9% uptime for critical auth emails
- **Deliverability**: Proper SPF/DKIM/DMARC records to avoid spam folders
- **Rate Limits**: Handle email service rate limits gracefully
- **Security**: Encrypted connections and secure credential management
- **Monitoring**: Track email delivery success/failure rates

### Development Challenges

Testing email functionality during development is challenging:

```typescript
// What happens with real SMTP in development?
const problems = [
  "Sends real emails to test users", // Annoying for testers
  "Requires production email credentials", // Security risk
  "May trigger spam detection", // Gmail blocks suspicious activity
  "Difficult to test error scenarios", // Can\'t easily simulate failures
  "No way to inspect email content", // Can\'t verify email formatting
];
```

## Mailpit for Development

### What is Mailpit?

Mailpit is a development email server that:

- **Captures** all outgoing emails instead of sending them
- **Provides** a web interface to view captured emails
- **Simulates** real SMTP behavior without external dependencies
- **Enables** testing of email functionality in complete isolation

### Mailpit Architecture

```
Your App → Mailpit SMTP (port 1025) → Mailpit Storage
                     ↓
                Web UI (port 8025) → View Emails
```

### Why Mailpit is Perfect for Development

#### 1. **Zero Configuration**

```yaml
# docker-compose.yml
mailpit:
  image: axllent/mailpit:latest
  ports:
    - "1025:1025" # SMTP port
    - "8025:8025" # Web interface
```

Your app connects to `localhost:1025` just like production SMTP.

#### 2. **Complete Email Inspection**

- View HTML and plain text versions
- Inspect email headers
- Check FROM/TO/SUBJECT fields
- Verify email formatting and content

#### 3. **Test All Email Scenarios**

```typescript
// Test different email types
const testScenarios = [
  "User registration verification",
  "Password reset requests",
  "Login security alerts",
  "Account recovery emails",
  "Multi-factor auth codes",
];
```

#### 4. **No External Dependencies**

- Works completely offline
- No risk of sending real emails
- No email service API keys needed
- Perfect for CI/CD environments

## Configuration Patterns

### Environment-Based Configuration

Your application should use the same SMTP configuration interface for both development and production:

```typescript
// src/config/email.ts
import { env } from "@/env";

export const emailConfig = {
  host: env.SMTP_HOST, // 'mailpit' in dev, 'smtp.gmail.com' in prod
  port: env.SMTP_PORT, // 1025 in dev, 465 in prod
  secure: env.SMTP_SECURE, // false in dev, true in prod
  auth: env.SMTP_USER
    ? {
        user: env.SMTP_USER, // undefined in dev, real email in prod
        pass: env.SMTP_PASSWORD, // undefined in dev, app password in prod
      }
    : undefined,
};
```

### Development Environment Configuration

```bash
# .env (development)
SMTP_HOST=mailpit                    # Docker service name
SMTP_PORT=1025                       # Mailpit SMTP port
SMTP_SECURE=false                    # No TLS needed for local testing
SMTP_USER=                           # Empty - Mailpit doesn't need auth
SMTP_PASSWORD=                       # Empty - Mailpit doesn't need auth

# Mailpit Docker Service Configuration
MAILPIT_SMTP_PORT=1025               # Host port mapping for SMTP
MAILPIT_WEB_PORT=8025                # Host port mapping for web interface
```

### Production Environment Configuration

```bash
# .env.production
SMTP_HOST=smtp.gmail.com             # Production SMTP server
SMTP_PORT=465                        # Secure SMTP port
SMTP_SECURE=true                     # Enable TLS encryption
SMTP_USER=noreply@yourdomain.com     # Service account email
SMTP_PASSWORD=app-specific-password   # App password from email provider

# Mailpit variables (not used in production)
MAILPIT_SMTP_PORT=1025
MAILPIT_WEB_PORT=8025
```

## Testing Email Functionality

### Integration Testing with Mailpit

```typescript
// tests/integration/email.test.ts
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { emailService } from "@/services/email.service";

describe("Email Integration Tests", () => {
  beforeAll(async () => {
    // Wait for Mailpit to be ready
    await waitForMailpit("http://localhost:8025");
  });

  it("should send verification email", async () => {
    // Send email through your service
    await emailService.sendVerificationEmail({
      to: "test@example.com",
      verificationToken: "test-token-123",
    });

    // Check Mailpit for the email
    const emails = await getMailpitEmails();
    const verificationEmail = emails.find(
      (email) =>
        email.To[0].Mailbox === "test" &&
        email.Content.Headers.Subject[0].includes("Verify")
    );

    expect(verificationEmail).toBeDefined();
    expect(verificationEmail.Content.Body).toContain("test-token-123");
  });

  it("should send password reset email", async () => {
    await emailService.sendPasswordResetEmail({
      to: "user@example.com",
      resetToken: "reset-token-456",
    });

    const emails = await getMailpitEmails();
    const resetEmail = emails.find((email) =>
      email.Content.Headers.Subject[0].includes("Password Reset")
    );

    expect(resetEmail).toBeDefined();
    expect(resetEmail.Content.Body).toContain("reset-token-456");
  });
});
```

### Manual Testing Workflow

1. **Start Development Environment**

   ```bash
   docker compose up
   ```

2. **Trigger Email in Application**

   - Register a new user
   - Request password reset
   - Trigger any email-sending feature

3. **View Email in Mailpit**

   - Open http://localhost:8025
   - Find your email in the inbox
   - Click to view content, headers, and formatting

4. **Test Email Links**
   - Copy verification/reset links from emails
   - Test that links work correctly
   - Verify token parsing and validation

## Production Email Setup

### Choosing an Email Provider

Popular SMTP providers for production:

| Provider          | Reliability | Cost                  | Features                         |
| ----------------- | ----------- | --------------------- | -------------------------------- |
| **SendGrid**      | Excellent   | Pay-per-email         | Advanced analytics, templates    |
| **Mailgun**       | Excellent   | Pay-per-email         | Powerful API, EU compliance      |
| **AWS SES**       | Good        | Very cheap            | Integrates with AWS ecosystem    |
| **Gmail/G Suite** | Good        | Included with G Suite | Simple setup, familiar interface |

### Production Security Best Practices

#### 1. **Use App-Specific Passwords**

```typescript
// Never use regular email passwords in production
const badConfig = {
  auth: {
    user: "myemail@gmail.com",
    pass: "myRegularPassword", // ❌ Never do this
  },
};

const goodConfig = {
  auth: {
    user: "service@yourdomain.com",
    pass: process.env.SMTP_APP_PASSWORD, // ✅ App-specific password
  },
};
```

#### 2. **Implement Email Rate Limiting**

```typescript
// src/services/email.service.ts
import { RateLimiterMemory } from "rate-limiter-flexible";

const emailRateLimiter = new RateLimiterMemory({
  keyBy: "email",
  points: 5, // 5 emails
  duration: 3600, // per hour
});

export async function sendEmail(to: string, template: EmailTemplate) {
  try {
    await emailRateLimiter.consume(to);
    return await sendEmailInternal(to, template);
  } catch (rateLimitError) {
    throw new Error("Email rate limit exceeded");
  }
}
```

#### 3. **Handle Email Failures Gracefully**

```typescript
export async function sendEmailWithRetry(emailData: EmailData) {
  const maxRetries = 3;
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendEmail(emailData);
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        // Exponential backoff: 2^attempt seconds
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  // Log failure and handle gracefully
  logger.error("Email failed after retries", {
    email: emailData.to,
    error: lastError,
  });

  // Don't block user registration/login due to email failures
  return { success: false, error: lastError };
}
```

### Email Template Management

```typescript
// src/templates/email.templates.ts
export const emailTemplates = {
  verification: {
    subject: "Verify your account",
    html: `
      <h2>Welcome to our service!</h2>
      <p>Click the link below to verify your email:</p>
      <a href="{{verificationUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none;">
        Verify Email
      </a>
      <p>This link expires in 24 hours.</p>
    `,
    text: `
      Welcome to our service!
      
      Please verify your email by visiting: {{verificationUrl}}
      
      This link expires in 24 hours.
    `,
  },

  passwordReset: {
    subject: "Password Reset Request",
    html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset. Click below to set a new password:</p>
      <a href="{{resetUrl}}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none;">
        Reset Password
      </a>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link expires in 1 hour.</p>
    `,
  },
};
```

## Summary

Understanding email in authentication services requires balancing development convenience with production reliability:

- **Mailpit** provides a complete email testing environment without external dependencies
- **Environment-based configuration** allows the same code to work in development and production
- **Proper testing** ensures email functionality works correctly before deployment
- **Production considerations** include security, reliability, and proper error handling

This setup gives you confidence that your authentication emails will work correctly when deployed, while making development and testing straightforward and reliable.
