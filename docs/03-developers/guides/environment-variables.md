# Environment Variables Configuration Guide

This guide covers all environment variables used by the Users Service, their purposes, and configuration examples for different environments.

## Overview

The Users Service uses environment variables for configuration to maintain security and enable different setups across development, staging, and production environments.

## Required Variables

### Application Core

```bash
# Node.js environment (development, test, production)
NODE_ENV=development

# Server port (default: 3000)
PORT=3000

# Application URL (used for OAuth callbacks)
APP_URL=http://localhost:3000
```

### Database Configuration

```bash
# MongoDB connection components
# Development example:
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=users-service
MONGODB_USER=admin
MONGODB_PASSWORD=admin

# Production example:
MONGODB_HOST=your-mongodb-host.com
MONGODB_PORT=27017
MONGODB_DATABASE=users-service
MONGODB_USER=production_user
MONGODB_PASSWORD=secure_password

# MongoDB Atlas example:
MONGODB_HOST=cluster.mongodb.net
MONGODB_PORT=27017
MONGODB_DATABASE=users-service
MONGODB_USER=atlas_user
MONGODB_PASSWORD=atlas_password
```

### JWT Configuration

```bash
# JWT secret keys (CRITICAL: Use strong, unique keys in production)
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# Token expiry settings
JWT_ACCESS_EXPIRY_MINUTES=15
JWT_REFRESH_EXPIRY_DAYS=7
```

### Email Configuration

#### Development (Mailpit)

```bash
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_SECURE=false
```

#### Production (Gmail)

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_SECURE=true
```

#### Production (SendGrid)

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_SECURE=true
```

#### Production (AWS SES)

```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-aws-access-key-id
SMTP_PASSWORD=your-aws-secret-access-key
SMTP_SECURE=true
```

## OAuth Configuration

### Google OAuth

```bash
# Google OAuth credentials (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OAuth callback URL (must match Google Console settings)
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/oauth/google/callback
```

**Setup Steps:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs

### GitHub OAuth

```bash
# GitHub OAuth credentials (from GitHub Developer Settings)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# OAuth callback URL
GITHUB_REDIRECT_URI=http://localhost:3000/auth/oauth/github/callback
```

**Setup Steps:**

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create new OAuth App
3. Set Authorization callback URL
4. Get Client ID and Client Secret

### LinkedIn OAuth

```bash
# LinkedIn OAuth credentials (from LinkedIn Developer Portal)
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# OAuth callback URL
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/oauth/linkedin/callback
```

**Setup Steps:**

1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com/)
2. Create new app
3. Add OAuth 2.0 redirect URLs
4. Get Client ID and Client Secret

## Security Configuration

### Rate Limiting

```bash
# Rate limit window in milliseconds (default: 15 minutes)
RATE_LIMIT_WINDOW=900000

# Maximum requests per window (default: 100)
RATE_LIMIT_MAX_REQUESTS=100

# Rate limit storage (memory, redis)
RATE_LIMIT_STORE=memory

# Redis URL (if using Redis for rate limiting)
REDIS_URL=redis://localhost:6379
```

### Password Policy

```bash
# Minimum password length (default: 8)
PASSWORD_MIN_LENGTH=8

# Maximum password length (default: 128)
PASSWORD_MAX_LENGTH=128

# Require uppercase letters (default: true)
PASSWORD_REQUIRE_UPPERCASE=true

# Require lowercase letters (default: true)
PASSWORD_REQUIRE_LOWERCASE=true

# Require numbers (default: true)
PASSWORD_REQUIRE_NUMBERS=true

# Require special characters (default: true)
PASSWORD_REQUIRE_SPECIAL=true

# List of special characters (default: !@#$%^&*()_+-=[]{}|;:,.<>?)
PASSWORD_SPECIAL_CHARS=!@#$%^&*()_+-=[]{}|;:,.<>?
```

### Account Lockout

```bash
# Maximum failed login attempts before lockout (default: 5)
MAX_LOGIN_ATTEMPTS=5

# Base lockout duration in minutes (default: 15)
LOCKOUT_DURATION=15

# Enable progressive lockout (exponential backoff)
PROGRESSIVE_LOCKOUT=true

# Maximum lockout duration in minutes (default: 1440 = 24 hours)
MAX_LOCKOUT_DURATION=1440
```

### CSRF Protection

```bash
# Enable CSRF protection (default: false in development)
CSRF_ENABLED=false

# CSRF secret key
CSRF_SECRET=your-csrf-secret-key

# CSRF cookie name (default: _csrf)
CSRF_COOKIE_NAME=_csrf
```

## Optional Configuration

### Session Configuration

```bash
# Enable session-based authentication (default: false)
SESSION_ENABLED=false

# Session secret key
SESSION_SECRET=your-session-secret-key

# Session cookie name (default: sessionId)
SESSION_COOKIE_NAME=sessionId

# Session max age in milliseconds (default: 24 hours)
SESSION_MAX_AGE=86400000
```

### Logging Configuration

```bash
# Log level (error, warn, info, debug) (default: info)
LOG_LEVEL=info

# Enable debug logging (default: false)
DEBUG=false

# Log format (json, text) (default: json in production)
LOG_FORMAT=json
```

### CORS Configuration

```bash
# CORS origin (default: * in development)
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com

# CORS credentials (default: true)
CORS_CREDENTIALS=true
```

## Environment-Specific Configurations

### Development (.env.development)

```bash
NODE_ENV=development
PORT=3000

# Local MongoDB
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=users-service
MONGODB_USER=admin
MONGODB_PASSWORD=admin

# Weak secrets for development (NEVER use in production)
JWT_ACCESS_SECRET=development-access-secret-key-not-secure
JWT_REFRESH_SECRET=development-refresh-secret-key-not-secure

# Short expiry for testing
JWT_ACCESS_EXPIRY_MINUTES=15
JWT_REFRESH_EXPIRY_DAYS=1

# Mailpit for email testing
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=

# Relaxed rate limiting
RATE_LIMIT_MAX_REQUESTS=1000

# Relaxed password policy
PASSWORD_MIN_LENGTH=6
PASSWORD_REQUIRE_SPECIAL=false

# OAuth (optional for development)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Debug logging
LOG_LEVEL=debug
DEBUG=true
```

### Staging (.env.staging)

```bash
NODE_ENV=staging
PORT=3000

# Staging database
MONGODB_HOST=staging-cluster.mongodb.net
MONGODB_PORT=27017
MONGODB_DATABASE=users-service
MONGODB_USER=staging-user
MONGODB_PASSWORD=staging-password

# Secure staging secrets
JWT_ACCESS_SECRET=staging-secure-access-secret-key-32-characters-minimum
JWT_REFRESH_SECRET=staging-secure-refresh-secret-key-32-characters-minimum
JWT_ACCESS_EXPIRY_MINUTES=15
JWT_REFRESH_EXPIRY_DAYS=7

# Real SMTP for staging
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=staging@yourdomain.com
SMTP_PASSWORD=staging-app-password

# Moderate rate limiting
RATE_LIMIT_MAX_REQUESTS=200

# Production-like password policy
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL=true

# OAuth staging credentials
GOOGLE_CLIENT_ID=staging-google-client-id
GOOGLE_CLIENT_SECRET=staging-google-client-secret
GOOGLE_REDIRECT_URI=https://staging-api.yourdomain.com/auth/oauth/google/callback

# Verbose logging for debugging
LOG_LEVEL=info
```

### Production (.env.production)

```bash
NODE_ENV=production
PORT=3000

# Production database
MONGODB_HOST=prod-cluster.mongodb.net
MONGODB_PORT=27017
MONGODB_DATABASE=users-service
MONGODB_USER=prod-user
MONGODB_PASSWORD=secure-password

# Highly secure production secrets
JWT_ACCESS_SECRET=production-super-secure-access-secret-key-64-characters-minimum
JWT_REFRESH_SECRET=production-super-secure-refresh-secret-key-64-characters-minimum
JWT_ACCESS_EXPIRY_MINUTES=15
JWT_REFRESH_EXPIRY_DAYS=7

# Production SMTP
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key

# Strict rate limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW=900000

# Strict password policy
PASSWORD_MIN_LENGTH=12
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL=true

# Progressive account lockout
MAX_LOGIN_ATTEMPTS=3
PROGRESSIVE_LOCKOUT=true
LOCKOUT_DURATION=30
MAX_LOCKOUT_DURATION=1440

# OAuth production credentials
GOOGLE_CLIENT_ID=production-google-client-id
GOOGLE_CLIENT_SECRET=production-google-client-secret
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/auth/oauth/google/callback

GITHUB_CLIENT_ID=production-github-client-id
GITHUB_CLIENT_SECRET=production-github-client-secret
GITHUB_REDIRECT_URI=https://api.yourdomain.com/auth/oauth/github/callback

LINKEDIN_CLIENT_ID=production-linkedin-client-id
LINKEDIN_CLIENT_SECRET=production-linkedin-client-secret
LINKEDIN_REDIRECT_URI=https://api.yourdomain.com/auth/oauth/linkedin/callback

# Production logging
LOG_LEVEL=warn
LOG_FORMAT=json

# CORS for production domains
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```

## Security Best Practices

### Secret Management

1. **Never commit secrets to version control**

   ```bash
   # Add to .gitignore
   .env*
   !.env.example
   ```

2. **Use different secrets for each environment**

   - Development: Simple secrets for convenience
   - Staging: Secure secrets similar to production
   - Production: Highly secure, complex secrets

3. **Generate strong secrets**

   ```bash
   # Generate secure JWT secret
   openssl rand -base64 64

   # Generate UUID for secrets
   uuidgen
   ```

4. **Use secret management services in production**
   - AWS Secrets Manager
   - Azure Key Vault
   - Google Secret Manager
   - HashiCorp Vault

### Environment File Security

```bash
# Set secure permissions
chmod 600 .env.production
chown app:app .env.production

# Verify no secrets in git
git log --all --full-history -- .env*
```

## Validation and Testing

### Environment Validation

The application validates environment variables on startup:

```typescript
// Example validation errors:
// ❌ JWT_SECRET must be at least 32 characters
// ❌ MONGODB_URI is required
// ❌ EMAIL_FROM must be a valid email address
// ❌ PORT must be a number between 1-65535
```

### Testing Configuration

```bash
# Test with different environments
NODE_ENV=test pnpm test

# Validate environment variables
pnpm run validate-env

# Test database connection
pnpm run test-db

# Test email configuration
pnpm run test-email
```

## Common Configuration Issues

### JWT Secret Too Short

```bash
# ❌ Wrong (insecure)
JWT_ACCESS_SECRET=short
JWT_REFRESH_SECRET=short

# ✅ Correct (minimum 32 characters)
JWT_ACCESS_SECRET=this-is-a-secure-jwt-access-secret-key-32-chars-minimum
JWT_REFRESH_SECRET=this-is-a-secure-jwt-refresh-secret-key-32-chars-minimum
```

### MongoDB Connection Issues

```bash
# ❌ Wrong (missing authentication)
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=users-service
# Missing MONGODB_USER and MONGODB_PASSWORD

# ✅ Correct (with authentication)
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=users-service
MONGODB_USER=username
MONGODB_PASSWORD=password
```

### Email Configuration Issues

```bash
# ❌ Wrong (missing SMTP_SECURE for port 587)
SMTP_PORT=587
SMTP_SECURE=false
SMTP_PASSWORD=wrong

# ✅ Correct
SMTP_PORT=587
SMTP_SECURE=true
SMTP_PASSWORD=correct-password
```

### OAuth Redirect URI Mismatch

```bash
# ❌ Wrong (doesn't match OAuth provider settings)
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback

# ✅ Correct (matches Google Console settings)
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/oauth/google/callback
```

## Environment Templates

### .env.example (Template)

```bash
# Application
NODE_ENV=development
PORT=3000

# MongoDB Configuration
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=users-service
MONGODB_USER=admin
MONGODB_PASSWORD=admin

# JWT Configuration
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_ACCESS_EXPIRY_MINUTES=15
JWT_REFRESH_EXPIRY_DAYS=7

# Email Configuration (MailHog for development)
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=

# OAuth (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# Security
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=100
PASSWORD_MIN_LENGTH=8
MAX_LOGIN_ATTEMPTS=5
```

### Environment Checklist

Before deploying to production:

- [ ] All required variables are set
- [ ] JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are at least 32 characters each
- [ ] Database connection string is correct
- [ ] Email SMTP configuration is tested
- [ ] OAuth redirect URIs match provider settings
- [ ] Rate limiting is appropriately configured
- [ ] Password policy meets security requirements
- [ ] Secrets are not in version control
- [ ] Production secrets are unique and secure

For OAuth setup details, see:

- [Google OAuth Setup](./google-oauth-setup.md)
- [GitHub OAuth Setup](./github-oauth-setup.md)
- [LinkedIn OAuth Setup](./linkedin-oauth-setup.md)

For deployment configurations, see the [Deployment Guide](./deployment.md).
