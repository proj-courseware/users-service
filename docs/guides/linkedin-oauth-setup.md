# LinkedIn OAuth2 Setup Guide

This guide walks you through setting up LinkedIn OAuth2 authentication for your authentication service.

## Prerequisites

- A LinkedIn account
- Your authentication service running locally or deployed
- Access to LinkedIn Developer Portal

## Step 1: Create a LinkedIn App

1. **Go to LinkedIn Developer Portal**
   - Visit [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
   - Sign in with your LinkedIn account

2. **Create a New App**
   - Click "Create app"
   - You'll need to fill out the application form

## Step 2: Fill Application Information

1. **App Details**
   - **App name**: Enter your application name (e.g., "My Authentication Service")
   - **LinkedIn Page**: You need to associate your app with a LinkedIn company page
     - If you don't have one, create a company page first
     - Or use your personal LinkedIn profile (for development)
   - **App logo**: Upload your application logo (required)
   - **Legal agreement**: Check the box to agree to LinkedIn API Terms of Use

2. **Create App**
   - Click "Create app"
   - Your app will be created and you'll be taken to the app dashboard

## Step 3: Configure App Settings

1. **Navigate to Auth Tab**
   - In your app dashboard, click on the "Auth" tab

2. **Configure OAuth 2.0 Settings**
   - **Client ID**: This is automatically generated (copy this value)
   - **Client Secret**: Click "Generate a new client secret" and copy the value
   
   ⚠️ **Important**: Save the client secret immediately - you won't be able to see it again!

3. **Authorized Redirect URLs**
   Add your callback URLs:
   - Development: `http://localhost:3000/auth/linkedin/callback`
   - Production: `https://yourdomain.com/auth/linkedin/callback`

## Step 4: Request API Access

LinkedIn requires approval for certain API access:

1. **Products Tab**
   - Click on the "Products" tab in your app dashboard
   - Request access to "Sign In with LinkedIn using OpenID Connect"
   - This gives you access to basic profile information

2. **Additional Products** (if needed)
   - **Marketing Developer Platform**: For marketing APIs
   - **LinkedIn Learning**: For learning content access
   - **Compliance and Verification**: For enhanced features

3. **Approval Process**
   - Some products require LinkedIn approval
   - "Sign In with LinkedIn" is usually approved automatically
   - Follow LinkedIn's review process for other products

## Step 5: Configure Scopes

LinkedIn OAuth2 uses scopes to control access. For authentication, you'll typically need:

### Basic Authentication Scopes:
- `openid`: OpenID Connect authentication
- `profile`: Basic profile information (name, picture, etc.)
- `email`: User's email address

### Additional Scopes (if approved):
- `w_member_social`: Post on behalf of user
- `r_organization_social`: Read organization content

## Step 6: Configure Your Authentication Service

1. **Environment Variables**
   
   Add these variables to your `.env` file:

   ```env
   # LinkedIn OAuth2 Configuration
   LINKEDIN_CLIENT_ID=your_linkedin_client_id_here
   LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret_here
   LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback
   
   # For production, use:
   # LINKEDIN_REDIRECT_URI=https://yourdomain.com/auth/linkedin/callback
   ```

2. **Update App Environment Schema**
   
   Add LinkedIn OAuth configuration to your `src/schemas/app-env.schema.ts`:

   ```typescript
   const appEnvSchema = z.object({
     // ... existing configuration
     
     // LinkedIn OAuth2
     LINKEDIN_CLIENT_ID: z.string().min(1, "LinkedIn Client ID is required"),
     LINKEDIN_CLIENT_SECRET: z.string().min(1, "LinkedIn Client Secret is required"),
     LINKEDIN_REDIRECT_URI: z.string().url("LinkedIn Redirect URI must be a valid URL"),
   });
   ```

## Step 7: Understanding LinkedIn OAuth Flow

LinkedIn uses OpenID Connect (built on OAuth2) for authentication:

1. **Authorization Request**: Redirect user to LinkedIn
   ```
   https://www.linkedin.com/oauth/v2/authorization?
     response_type=code&
     client_id=YOUR_CLIENT_ID&
     redirect_uri=YOUR_REDIRECT_URI&
     state=RANDOM_STATE_VALUE&
     scope=openid%20profile%20email
   ```

2. **Authorization Grant**: LinkedIn redirects back with code
   ```
   https://yourapp.com/auth/linkedin/callback?
     code=AUTHORIZATION_CODE&
     state=SAME_STATE_VALUE
   ```

3. **Access Token Request**: Exchange code for access token
   ```
   POST https://www.linkedin.com/oauth/v2/accessToken
   ```

4. **User Information**: Get user data with access token
   ```
   GET https://api.linkedin.com/v2/userinfo
   ```

## Step 8: Test Your Configuration

1. **Start Your Development Server**
   ```bash
   pnpm dev
   ```

2. **Test the OAuth Flow**
   - Navigate to your login page
   - Click "Sign in with LinkedIn"
   - You should be redirected to LinkedIn's authorization page
   - After authorization, you should be redirected back to your application

## Step 9: Production Setup

### For Production Deployment

1. **Update App Settings**
   - Go back to your LinkedIn app dashboard
   - Update redirect URLs to include production URLs
   - Ensure your app is associated with the correct company page

2. **Verify App Status**
   - Make sure your app is approved for required products
   - Check that all redirect URLs are configured correctly

3. **Security Considerations**
   - Use HTTPS for all production URLs
   - Store client secret securely (environment variables, secrets manager)
   - Implement proper state validation
   - Consider rate limiting OAuth endpoints

4. **Update Environment Variables**
   ```env
   LINKEDIN_CLIENT_ID=your_linkedin_client_id_here
   LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret_here
   LINKEDIN_REDIRECT_URI=https://yourdomain.com/auth/linkedin/callback
   ```

## Step 10: Advanced Configuration

### Custom Scopes

Request additional scopes based on your needs:

```typescript
const scopes = [
  'openid',         // OpenID Connect
  'profile',        // Profile information
  'email',          // Email address
  'w_member_social', // Post updates (requires approval)
];
```

### User Information Available

With basic authentication, you can access:

```json
{
  "sub": "unique_user_identifier",
  "name": "Full Name",
  "given_name": "First Name",
  "family_name": "Last Name",
  "picture": "https://media.licdn.com/profile_picture_url",
  "email": "user@example.com",
  "email_verified": true,
  "locale": "en_US"
}
```

### Company Page Requirement

LinkedIn requires apps to be associated with a company page:

1. **Create Company Page** (if needed)
   - Go to LinkedIn and create a company page
   - You need admin access to the page

2. **Associate App**
   - In your app settings, select the company page
   - You must be an admin of the page to associate it

## Troubleshooting

### Common Issues

1. **"invalid_redirect_uri" Error**
   - Ensure the redirect URI in your code exactly matches the one in LinkedIn app settings
   - Check for trailing slashes and protocol (http vs https)

2. **"invalid_client_id" Error**
   - Verify your client ID is correct
   - Ensure environment variables are properly loaded

3. **"access_denied" Error**
   - User denied access to your application
   - Your app might not be approved for requested scopes

4. **"invalid_grant" Error**
   - The authorization code has expired
   - Code has already been used (codes are single-use)
   - Check your token exchange implementation

### App Review Issues

1. **App Not Approved**
   - Some LinkedIn products require manual approval
   - Follow LinkedIn's app review guidelines
   - Provide clear use case description

2. **Missing Company Page**
   - All LinkedIn apps must be associated with a company page
   - Create a company page if you don't have one

### Testing Commands

```bash
# Test LinkedIn OAuth authorization URL generation
curl -X GET http://localhost:3000/auth/linkedin
# Should redirect to LinkedIn OAuth page

# Test environment variables
echo $LINKEDIN_CLIENT_ID
echo $LINKEDIN_CLIENT_SECRET
```

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
   - Implement proper token expiration handling
   - Consider token refresh if available

4. **User Data**
   - Only request scopes you actually need
   - Handle user data according to privacy policies
   - Implement proper data retention policies

5. **Rate Limiting**
   - LinkedIn has rate limits for API calls
   - Implement proper error handling and retry logic
   - Cache user information when appropriate

## Additional Resources

- [LinkedIn OAuth Documentation](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)
- [LinkedIn API Documentation](https://docs.microsoft.com/en-us/linkedin/)
- [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
- [OpenID Connect Specification](https://openid.net/connect/)

## Next Steps

After completing LinkedIn OAuth setup:
1. Implement the OAuth service in your authentication service
2. Add LinkedIn login buttons to your frontend
3. Test the complete authentication flow
4. Set up Google OAuth (see `google-oauth-setup.md`)
5. Set up GitHub OAuth (see `github-oauth-setup.md`)

## Example Implementation

Here's a basic example of how the LinkedIn OAuth flow might look in your service:

```typescript
// LinkedIn OAuth configuration
const linkedinConfig = {
  clientId: process.env.LINKEDIN_CLIENT_ID,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  redirectUri: process.env.LINKEDIN_REDIRECT_URI,
  scope: 'openid profile email',
};

// Authorization URL
const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${linkedinConfig.clientId}&redirect_uri=${linkedinConfig.redirectUri}&state=${state}&scope=${encodeURIComponent(linkedinConfig.scope)}`;

// Token exchange
const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    client_id: linkedinConfig.clientId,
    client_secret: linkedinConfig.clientSecret,
    redirect_uri: linkedinConfig.redirectUri,
  }),
});

// Get user information
const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});
```

## LinkedIn-Specific Considerations

1. **Company Page Requirement**
   - Unlike other providers, LinkedIn requires a company page association
   - This is mandatory even for personal projects

2. **App Review Process**
   - LinkedIn has a stricter review process than some other providers
   - Plan extra time for app approval if you need advanced features

3. **Professional Context**
   - LinkedIn users expect professional use cases
   - Clearly communicate how you'll use their professional information

4. **Rate Limits**
   - LinkedIn has strict rate limits
   - Implement proper caching and error handling

5. **Data Usage Policies**
   - LinkedIn has specific policies about data usage
   - Ensure compliance with their data use policies