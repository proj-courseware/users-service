# OAuth Providers Setup Overview

This guide provides an overview of setting up OAuth2 authentication with multiple providers for your authentication service.

## Supported Providers

This authentication service supports OAuth2 integration with three major providers:

1. **Google OAuth2** - For Google account authentication
2. **GitHub OAuth2** - For GitHub account authentication
3. **LinkedIn OAuth2** - For LinkedIn professional account authentication

## Quick Start Checklist

### Prerequisites

- [ ] Authentication service running locally or deployed
- [ ] HTTPS enabled for production deployments
- [ ] Environment variable management set up

### Provider Setup

- [ ] [Google OAuth2 Setup](./google-oauth-setup.md)
- [ ] [GitHub OAuth2 Setup](./github-oauth-setup.md)
- [ ] [LinkedIn OAuth2 Setup](./linkedin-oauth-setup.md)

### Implementation

- [ ] OAuth service implementation in authentication service
- [ ] Frontend integration (login buttons, callbacks)
- [ ] Testing complete authentication flows
- [ ] Production deployment configuration

## Environment Variables Summary

After setting up all providers, your `docker/.env` file should include:

```env
# Google OAuth2
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# GitHub OAuth2
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback

# LinkedIn OAuth2
LINKEDIN_CLIENT_ID=your_linkedin_client_id_here
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback
```

## Provider Comparison

| Feature                | Google   | GitHub            | LinkedIn                |
| ---------------------- | -------- | ----------------- | ----------------------- |
| Setup Complexity       | Medium   | Easy              | Hard                    |
| Approval Required      | No       | No                | Yes (for some features) |
| Company Page Required  | No       | No                | Yes                     |
| User Base              | General  | Developers        | Professionals           |
| Rate Limits            | Generous | Moderate          | Strict                  |
| Additional Permissions | Many     | Repository access | Professional data       |

## Setup Difficulty & Time Estimates

### Google OAuth2

- **Difficulty**: Medium
- **Time**: 30-45 minutes
- **Complexity**: OAuth consent screen configuration
- **Gotchas**: Domain verification, scope approval

### GitHub OAuth2

- **Difficulty**: Easy
- **Time**: 15-20 minutes
- **Complexity**: Straightforward OAuth app creation
- **Gotchas**: Minimal, well-documented process

### LinkedIn OAuth2

- **Difficulty**: Hard
- **Time**: 45-60 minutes
- **Complexity**: Company page requirement, app review process
- **Gotchas**: Must have LinkedIn company page, some features require approval

## Common Configuration Patterns

### Development URLs

```
http://localhost:3000/auth/{provider}/callback
```

### Production URLs

```
https://yourdomain.com/auth/{provider}/callback
```

### Standard Scopes

- **Google**: `openid`, `email`, `profile`
- **GitHub**: `user:email`, `read:user`
- **LinkedIn**: `openid`, `profile`, `email`

## Security Best Practices

### 1. Environment Management

- Never commit OAuth credentials to version control
- Use secure environment variable management
- Rotate client secrets regularly
- Use different credentials for development and production

### 2. State Parameter

- Always implement CSRF protection with state parameter
- Use cryptographically secure random state values
- Validate state parameter on callback

### 3. Redirect URI Validation

- Exact match required for redirect URIs
- Use HTTPS in production
- Avoid wildcard or loose matching

### 4. Token Security

- Store access tokens securely
- Implement proper token expiration
- Consider token refresh strategies
- Log OAuth events for security monitoring

## Implementation Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Auth Service   │    │  OAuth Provider │
│                 │    │                 │    │                 │
│ [Login Button]  │───▶│ Generate Auth   │───▶│ Authorization   │
│                 │    │ URL + State     │    │ Server          │
│                 │    │                 │    │                 │
│ Handle Callback │◀───│ Validate State  │◀───│ Callback with   │
│                 │    │ Exchange Token  │    │ Auth Code       │
│                 │    │                 │    │                 │
│ Store Session/  │◀───│ Get User Info   │───▶│ User API        │
│ JWT Token       │    │ Create/Link     │    │                 │
│                 │    │ User Account    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Testing Strategy

### 1. Development Testing

- Test each provider independently
- Verify redirect URIs work correctly
- Test error scenarios (user denial, expired codes)
- Validate user data retrieval

### 2. Integration Testing

- Test account linking logic
- Verify email matching for existing users
- Test new user creation flow
- Validate session/token creation

### 3. Production Testing

- Test with production URLs
- Verify HTTPS redirect URIs
- Test rate limiting behavior
- Monitor OAuth error rates

## Troubleshooting Guide

### Common Issues Across All Providers

1. **Redirect URI Mismatch**

   - Check exact URL match including protocol, domain, and path
   - Verify no trailing slashes discrepancies
   - Ensure development vs production URLs are configured correctly

2. **Invalid Client Credentials**

   - Verify client ID and secret are correct
   - Check environment variable loading
   - Ensure no extra spaces or special characters

3. **State Parameter Issues**
   - Implement proper state generation and validation
   - Check for state parameter tampering
   - Verify state storage and retrieval logic

### Provider-Specific Issues

- **Google**: Domain verification, consent screen configuration
- **GitHub**: Rate limiting, scope permissions
- **LinkedIn**: Company page association, app approval delays

## Monitoring and Analytics

### Key Metrics to Track

- OAuth success/failure rates by provider
- User signup sources (which OAuth provider)
- Authentication completion times
- Error rates and types

### Logging Recommendations

```typescript
// Log OAuth events
logger.info("OAuth login attempt", {
  provider: "google",
  userId: user.id,
  timestamp: new Date().toISOString(),
});

logger.error("OAuth error", {
  provider: "github",
  error: error.message,
  userAgent: req.headers["user-agent"],
});
```

## Next Steps

1. **Choose Your Providers**: Start with the providers most relevant to your user base
2. **Follow Setup Guides**: Complete the detailed setup for each chosen provider
3. **Implement OAuth Service**: Build the OAuth integration in your authentication service
4. **Frontend Integration**: Add login buttons and handle OAuth callbacks
5. **Test Thoroughly**: Test all flows in development and production
6. **Monitor Performance**: Set up logging and monitoring for OAuth flows

## Additional Resources

- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [OpenID Connect Specification](https://openid.net/connect/)
- [PKCE for OAuth Public Clients](https://datatracker.ietf.org/doc/html/rfc7636)

Choose the providers that best fit your application's user base and follow the detailed setup guides for each provider you want to implement.
