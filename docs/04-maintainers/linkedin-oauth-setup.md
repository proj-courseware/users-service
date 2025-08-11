# LinkedIn OAuth2 Setup Guide

This guide walks you through setting up LinkedIn OAuth2 authentication for your authentication service using industry best practices.

## Key Benefits of This Setup

✅ **Separate Development & Production Apps**: Enhanced security and environment isolation  
✅ **Smart Account Linking**: Users with the same email across providers get linked automatically  
✅ **Professional OAuth Flow**: OpenID Connect with proper state validation  
✅ **Team-Friendly**: Clear separation of credentials and access controls

## Prerequisites

- A LinkedIn account
- Your authentication service running locally or deployed
- Access to LinkedIn Developer Portal
- A LinkedIn company page (required for all LinkedIn apps)

## Step 1: Create LinkedIn Apps (Development & Production)

> **💡 Best Practice**: Create separate LinkedIn apps for development and production environments for better security, quota management, and analytics isolation.

### Why Separate LinkedIn Apps?

- **🔒 Security Isolation**: Production secrets never touch development environment
- **📊 API Management**: Separate rate limits and usage analytics per environment
- **👥 Team Access**: Different permissions for dev vs prod apps
- **📈 Monitoring**: Separate usage analytics and monitoring per environment
- **⚙️ Configuration**: Environment-specific settings and redirect URLs
- **🏢 Company Page**: Can associate different company pages if needed

### Create Development App

1. **Go to LinkedIn Developer Portal**

   - Visit [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
   - Sign in with your LinkedIn account

2. **Create New App for Development**
   - Click "Create app"
   - Use a clear development name (e.g., "courseware-local" or "MyApp-dev")

## Step 2: Configure Development App

1. **Development App Details**

   - **App name**: Use a clear development name (e.g., "courseware-local" or "MyApp-dev")
   - **LinkedIn Page**: Associate with a LinkedIn company page
     - Create a company page if you don't have one (required for all LinkedIn apps)
     - You can use the same company page for both dev and prod apps
   - **App logo**: Upload your application logo (required)
   - **Legal agreement**: Check the box to agree to LinkedIn API Terms of Use

2. **Create Development App**
   - Click "Create app"
   - Your development app will be created

### Create Production App

3. **Repeat for Production**

   - Click "Create app" again for your production app
   - **App name**: Use production name (e.g., "courseware" or "MyApp")
   - Use the same company page and logo
   - Create the production app

## Step 3: Configure OAuth Settings for Both Apps

> **🔄 Important**: Configure OAuth settings for both development and production apps.

### Development App OAuth Configuration

1. **Navigate to Development App**

   - Go to your development app dashboard
   - Click on the "Auth" tab

2. **Configure Development OAuth 2.0 Settings**

   - **Client ID**: Copy the automatically generated value
   - **Client Secret**: Click "Generate a new client secret" and copy the value

   ⚠️ **Important**: Save the client secret immediately - you won't be able to see it again!

3. **Development Authorized Redirect URLs**
   Add your development callback URL:
   - `http://localhost:3000/auth/oauth/linkedin/callback`

### Production App OAuth Configuration

4. **Navigate to Production App**

   - Go to your production app dashboard
   - Click on the "Auth" tab

5. **Configure Production OAuth 2.0 Settings**

   - **Client ID**: Copy the production client ID
   - **Client Secret**: Generate and copy the production client secret

6. **Production Authorized Redirect URLs**
   Add your production callback URL:
   - `https://yourdomain.com/auth/oauth/linkedin/callback`

## Step 4: Request API Access for Both Apps

> **🔄 Important**: Request API access for both development and production apps.

LinkedIn requires approval for certain API access:

### For Development App

1. **Navigate to Development App Products Tab**

   - Go to your development app dashboard
   - Click on the "Products" tab

2. **Request Basic Authentication Access**
   - Request access to "Sign In with LinkedIn using OpenID Connect"
   - This gives you access to basic profile information
   - Usually approved automatically for development

### For Production App

3. **Navigate to Production App Products Tab**

   - Go to your production app dashboard
   - Click on the "Products" tab

4. **Request Production Access**

   - Request access to "Sign In with LinkedIn using OpenID Connect"
   - May require additional review for production apps

### Additional Products (if needed)

5. **Advanced Features** (optional)

   - **Marketing Developer Platform**: For marketing APIs
   - **LinkedIn Learning**: For learning content access
   - **Compliance and Verification**: For enhanced features

6. **Approval Process**

   - Basic authentication is usually approved automatically
   - Advanced products require LinkedIn approval and review
   - Development apps typically get faster approval

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

### Development Environment

1. **Local Environment Variables**

   Add these variables to your `.env` file for development:

   ```env
   # LinkedIn OAuth2 Configuration (Development)
   LINKEDIN_CLIENT_ID=your_development_linkedin_client_id_here
   LINKEDIN_CLIENT_SECRET=your_development_linkedin_client_secret_here
   LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/oauth/linkedin/callback
   ```

### Production Environment

2. **Production Environment Variables**

   For production deployment, use your production app credentials:

   ```env
   # LinkedIn OAuth2 Configuration (Production)
   LINKEDIN_CLIENT_ID=your_production_linkedin_client_id_here
   LINKEDIN_CLIENT_SECRET=your_production_linkedin_client_secret_here
   LINKEDIN_REDIRECT_URI=https://yourdomain.com/auth/oauth/linkedin/callback
   ```

3. **Verify Environment Schema Configuration**

   The LinkedIn OAuth environment variables are already configured in `src/env.ts`. You can verify they exist by checking lines 82-84:

   ```typescript
   // OAuth Configuration (already present)
   LINKEDIN_CLIENT_ID: z.string().optional(),
   LINKEDIN_CLIENT_SECRET: z.string().optional(),
   LINKEDIN_REDIRECT_URI: z.string().url().optional(),
   ```

   **Note**: The variables are marked as `optional()` to provide flexibility during development. When you set them in your `.env` file, they become available to your application.

## Step 7: Understanding LinkedIn OAuth Flow

LinkedIn uses OpenID Connect (built on OAuth2) for authentication:

1. **Authorization Request**: Redirect user to LinkedIn

   ```plaintext
   https://www.linkedin.com/oauth/v2/authorization?
     response_type=code&
     client_id=YOUR_CLIENT_ID&
     redirect_uri=YOUR_REDIRECT_URI&
     state=RANDOM_STATE_VALUE&
     scope=openid%20profile%20email
   ```

2. **Authorization Grant**: LinkedIn redirects back with code

   ```plaintext
   https://yourapp.com/auth/oauth/linkedin/callback?
     code=AUTHORIZATION_CODE&
     state=SAME_STATE_VALUE
   ```

3. **Access Token Request**: Exchange code for access token

   ```plaintext
   POST https://www.linkedin.com/oauth/v2/accessToken
   ```

4. **User Information**: Get user data with access token

   ```plaintext
   GET https://api.linkedin.com/v2/userinfo
   ```

## Step 7: Test Your Configuration

1. **Start Your Development Server**

   ```bash
   pnpm dev
   ```

2. **Test the OAuth Flow**
   - Navigate to `http://localhost:3000/auth/oauth/linkedin` to initiate LinkedIn OAuth
   - You should be redirected to LinkedIn's authorization page
   - After authorization, you should be redirected back to your application via the callback URL
   - Check your application logs for authentication success/failure messages

## Step 8: Environment Management Best Practices

### Development vs Production Separation

The approach of creating separate LinkedIn apps (`courseware` and `courseware-local`) is industry best practice. Here are additional tips:

1. **Environment File Management**

   ```bash
   # Development
   .env                    # Local development (gitignored)
   .env.example           # Template for new developers

   # Production
   .env.production        # Production template (gitignored)
   # Use deployment tools to inject actual production values
   ```

2. **Team Collaboration**

   - Share development app credentials with team members
   - Keep production credentials restricted to deployment pipeline
   - Use separate company pages if needed for different environments

### Production Deployment Security

1. **HTTPS Requirements**

   - Use HTTPS for all production URLs
   - LinkedIn requires HTTPS for production OAuth apps

2. **Credential Management**

   - Store client secrets securely (environment variables, secrets manager)
   - Use deployment tools to inject production environment variables
   - Never commit production credentials to version control

3. **OAuth Security**

   - Implement proper state validation to prevent CSRF attacks
   - Consider rate limiting OAuth endpoints
   - Monitor OAuth usage and failed attempts
   - Regularly review app permissions and access

## Step 10: Advanced Configuration

### Custom Scopes

Request additional scopes based on your needs:

```typescript
const scopes = [
  "openid", // OpenID Connect
  "profile", // Profile information
  "email", // Email address
  "w_member_social", // Post updates (requires approval)
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
curl -X GET http://localhost:3000/auth/oauth/linkedin
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

1. **Test the OAuth flow**: Navigate to `http://localhost:3000/auth/oauth/linkedin`
2. **Verify account linking**: Test with the same email used in other OAuth providers
3. **Check logs**: Monitor application logs for authentication success/failure
4. **Set up other providers**:
   - Google OAuth (see `google-oauth-setup.md`)
   - GitHub OAuth (see `github-oauth-setup.md`)

## Example Implementation

Here's a basic example of how the LinkedIn OAuth flow might look in your service:

```typescript
// LinkedIn OAuth configuration
const linkedinConfig = {
  clientId: process.env.LINKEDIN_CLIENT_ID,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  redirectUri: process.env.LINKEDIN_REDIRECT_URI,
  scope: "openid profile email",
};

// Authorization URL
const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${linkedinConfig.clientId}&redirect_uri=${linkedinConfig.redirectUri}&state=${state}&scope=${encodeURIComponent(linkedinConfig.scope)}`;

// Token exchange
const tokenResponse = await fetch(
  "https://www.linkedin.com/oauth/v2/accessToken",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authorizationCode,
      client_id: linkedinConfig.clientId,
      client_secret: linkedinConfig.clientSecret,
      redirect_uri: linkedinConfig.redirectUri,
    }),
  },
);

// Get user information
const userResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
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
