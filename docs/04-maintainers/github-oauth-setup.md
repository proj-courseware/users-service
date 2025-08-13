# GitHub OAuth2 Setup Guide

This guide walks you through setting up GitHub OAuth2 authentication for your authentication service.

## Prerequisites

- A GitHub account
- Your authentication service running locally or deployed
- Admin access to create GitHub Apps or OAuth Apps

## Step 1: Create GitHub OAuth Apps (Development & Production)

> **💡 Best Practice**: Create separate OAuth apps for development and production environments for better security and isolation.

### Create Development OAuth App

1. **Go to GitHub Developer Settings**

   - Visit [GitHub Developer Settings](https://github.com/settings/developers)
   - Sign in to your GitHub account

2. **Create New OAuth App for Development**

   - Click "OAuth Apps" in the left sidebar
   - Click "New OAuth App"

## Step 2: Configure Development OAuth App

1. **Fill Development Application Information**

   - **Application name**: Use a clear development name (e.g., "my-app-local" or "my-app-dev")
   - **Homepage URL**: `http://localhost:3000`
   - **Application description**: "Development environment for [Your App Name]" (optional)
   - **Authorization callback URL**: `http://localhost:3000/auth/oauth/github/callback`

2. **Register Development Application**

   - Click "Register application"

### Create Production OAuth App

3. **Create Second OAuth App for Production**

   - Click "New OAuth App" again
   - **Application name**: Use your production app name (e.g., "my-app")
   - **Homepage URL**: `https://yourdomain.com`
   - **Application description**: Brief description of your production app (optional)
   - **Authorization callback URL**: `https://yourdomain.com/auth/oauth/github/callback`

4. **Register Production Application**

   - Click "Register application"

## Step 3: Get OAuth Credentials

### Development App Credentials

1. **Copy Development Client Credentials**
   From your development OAuth app:

   - **Client ID**: Copy this value (it's public)
   - **Client Secret**: Click "Generate a new client secret" and copy the value

   ⚠️ **Important**: Save the client secret immediately - you won't be able to see it again!

### Production App Credentials

2. **Copy Production Client Credentials**
   From your production OAuth app:

   - **Client ID**: Copy this value (it's public)
   - **Client Secret**: Click "Generate a new client secret" and copy the value

   ⚠️ **Important**: Keep production credentials secure and separate from development!

## Step 4: Configure Scopes and Permissions

GitHub OAuth uses scopes to control access. For authentication, you typically need:

- **No scopes**: Basic public profile information
- **user:email**: Access to user's email addresses
- **read:user**: Access to user profile information

The authentication service will request these scopes during the OAuth flow.

## Step 5: Configure Your Authentication Service

### Development Environment

1. **Local Environment Variables**

   Add these variables to your `docker/.env` file for development:

   ```env
   # GitHub OAuth2 Configuration (Development)
   GITHUB_CLIENT_ID=your_development_github_client_id_here
   GITHUB_CLIENT_SECRET=your_development_github_client_secret_here
   GITHUB_REDIRECT_URI=http://localhost:3000/auth/oauth/github/callback
   ```

### Production Environment

2. **Production Environment Variables**

   For production, use separate credentials in `docker/.env.production`:

   ```env
   # GitHub OAuth2 Configuration (Production)
   GITHUB_CLIENT_ID=your_production_github_client_id_here
   GITHUB_CLIENT_SECRET=your_production_github_client_secret_here
   GITHUB_REDIRECT_URI=https://yourdomain.com/auth/oauth/github/callback
   ```

   > **🔒 Security Tip**: Never commit production credentials to version control. Use environment variable management tools like AWS Secrets Manager, Azure Key Vault, or similar.

3. **Verify Environment Schema Configuration**

   The GitHub OAuth environment variables are already configured in `src/env.ts`. You can verify they exist by checking lines 79-81:

   ```typescript
   // OAuth Configuration (already present)
   GITHUB_CLIENT_ID: z.string().optional(),
   GITHUB_CLIENT_SECRET: z.string().optional(),
   GITHUB_REDIRECT_URI: z.string().url().optional(),
   ```

   If you need to make these required instead of optional, you can modify the schema:

   ```typescript
   // To make GitHub OAuth required, change from:
   GITHUB_CLIENT_ID: z.string().optional(),
   // To:
   GITHUB_CLIENT_ID: z.string().min(1, "GitHub Client ID is required"),
   ```

   **Note**: The current configuration makes OAuth providers optional, allowing the service to run without OAuth credentials during development.

## Step 6: Understanding GitHub OAuth Flow

GitHub OAuth2 flow works as follows:

1. **Authorization Request**: Redirect user to GitHub

   ```plaintext
   https://github.com/login/oauth/authorize?
     client_id=YOUR_CLIENT_ID&
     redirect_uri=YOUR_REDIRECT_URI&
     scope=user:email&
     state=RANDOM_STATE_VALUE
   ```

2. **Authorization Grant**: GitHub redirects back with code

   ```plaintext
   https://yourapp.com/auth/oauth/github/callback?
     code=AUTHORIZATION_CODE&
     state=SAME_STATE_VALUE
   ```

3. **Access Token Request**: Exchange code for access token

   ```plaintext
   POST https://github.com/login/oauth/access_token
   ```

4. **User Information**: Get user data with access token

   ```plaintext
   GET https://api.github.com/user
   GET https://api.github.com/user/emails
   ```

## Step 7: Test Your Configuration

1. **Start Your Development Server**

   ```bash
   pnpm dev
   ```

2. **Test the OAuth Flow**

   - Navigate to `http://localhost:3000/auth/oauth/github` to initiate GitHub OAuth
   - You should be redirected to GitHub's authorization page
   - After authorization, you should be redirected back to your application via the callback URL
   - Check your application logs for authentication success/failure messages

## Step 8: Environment Management Best Practices

### Development vs Production Separation

The approach of creating separate OAuth apps (`my-app` and `myapp-local`) is common practice. Here are additional tips:

1. **Environment File Management**

   ```bash
   # Development
   docker/.env                    # Local development (gitignored)
   docker/.env.example           # Template for new developers

   # Production
   docker/.env.production        # Production template (gitignored)
   # Use deployment tools to inject actual production environment variables
   ```

2. **Team Collaboration**

   - Share development OAuth app credentials with your team
   - Keep production credentials restricted to deployment systems
   - Document which OAuth app is for which environment

### Production Deployment Security

1. **HTTPS Requirements**

   - Use HTTPS for all production URLs
   - GitHub requires HTTPS for production OAuth apps

2. **Credential Management**

   - Store client secrets securely (environment variables, secrets manager)
   - Use deployment tools to inject production environment variables
   - Never commit production credentials to version control

3. **OAuth Security**
   - Implement proper state validation to prevent CSRF attacks
   - Consider rate limiting OAuth endpoints
   - Monitor OAuth usage and failed attempts

## Step 9: Advanced Configuration

### GitHub App vs OAuth App

For most authentication use cases, OAuth Apps are sufficient. However, consider GitHub Apps if you need:

- Installation on specific repositories
- Fine-grained permissions
- Higher rate limits
- Webhook integrations

### Custom Scopes

You can request additional scopes based on your needs:

```typescript
const scopes = [
  "user:email", // Access to email addresses
  "read:user", // Read user profile
  "user:follow", // Access to follow/unfollow users
  "public_repo", // Access to public repositories
];
```

### Organization Access

To access organization information:

```typescript
const scopes = [
  "user:email",
  "read:org", // Read organization membership
];
```

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" Error**

   - Ensure the redirect URI in your code exactly matches the one in GitHub OAuth App settings
   - Check for trailing slashes and protocol (http vs https)

2. **"bad_verification_code" Error**

   - The authorization code has expired (valid for 10 minutes)
   - User might have denied access
   - Code has already been used (codes are single-use)

3. **"incorrect_client_credentials" Error**

   - Verify your client ID and client secret are correct
   - Ensure environment variables are properly loaded

4. **Rate Limiting**

   - GitHub has rate limits for OAuth requests
   - Implement proper error handling and retry logic
   - Consider caching user information

### Testing Commands

```bash
# Test GitHub OAuth authorization URL generation
curl -X GET http://localhost:3000/auth/oauth/github
# Should redirect to GitHub OAuth page

# Test environment variables
echo $GITHUB_CLIENT_ID
echo $GITHUB_CLIENT_SECRET
```

### Debugging Tips

1. **Check GitHub OAuth App Settings**

   - Verify callback URL is exactly correct
   - Ensure the OAuth App is active

2. **Validate Environment Variables**

   - Ensure all required variables are set
   - Check for extra spaces or newlines

3. **Monitor GitHub API Responses**

   - Log API responses for debugging
   - Check for rate limit headers

## Security Best Practices

1. **State Parameter**

   - Always use a random state parameter to prevent CSRF attacks
   - Validate the state parameter on callback

2. **Secure Storage**

   - Never commit OAuth credentials to version control
   - Use secure environment variable management
   - Rotate client secret regularly

3. **Token Security**

   - Store access tokens securely
   - Implement token refresh if needed
   - Consider token expiration

4. **User Data**

   - Only request scopes you actually need
   - Handle user data according to privacy policies
   - Implement proper data retention policies

## Additional Resources

- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [OAuth2 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [GitHub Developer Settings](https://github.com/settings/developers)

## Next Steps

After completing GitHub OAuth setup:

1. Implement the OAuth service in your authentication service
2. Add GitHub login buttons to your frontend
3. Test the complete authentication flow
4. Set up Google OAuth (see `google-oauth-setup.md`)
5. Set up LinkedIn OAuth (see `linkedin-oauth-setup.md`)

## Example Implementation

Here's a basic example of how the GitHub OAuth flow might look in your service:

```typescript
// GitHub OAuth configuration
const githubConfig = {
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  redirectUri: process.env.GITHUB_REDIRECT_URI,
  scope: "user:email",
};

// Authorization URL
const authUrl = `https://github.com/login/oauth/authorize?client_id=${githubConfig.clientId}&redirect_uri=${githubConfig.redirectUri}&scope=${githubConfig.scope}&state=${state}`;

// Token exchange
const tokenResponse = await fetch(
  "https://github.com/login/oauth/access_token",
  {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: githubConfig.clientId,
      client_secret: githubConfig.clientSecret,
      code: authorizationCode,
    }),
  },
);

// Get user information
const userResponse = await fetch("https://api.github.com/user", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github.v3+json",
  },
});
```
