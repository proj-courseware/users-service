# Google OAuth2 Setup Guide

This guide walks you through setting up Google OAuth2 authentication for your authentication service.

## Prerequisites

- A Google account
- Access to Google Cloud Console
- Your authentication service running locally or deployed

## Step 1: Create Google Cloud Projects (Development & Production)

> **💡 Best Practice**: Create separate Google Cloud projects for development and production environments for better security, quota management, and analytics isolation.

### Why Separate Google Cloud Projects?

- **🔒 Security Isolation**: Production secrets never touch development environment
- **📊 Quota Management**: Separate API quotas and billing per environment
- **👥 Team Access**: Different IAM permissions for dev vs prod projects
- **📈 Analytics**: Separate usage analytics and monitoring per environment
- **🔍 Consent Screen**: Different consent screens for testing vs production
- **⚙️ Configuration**: Environment-specific settings and configurations

### Create Development Project

1. **Go to Google Cloud Console**

   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Create Development Project**

   - Click the project dropdown at the top of the page
   - Click "New Project"
   - Enter a project name (e.g., "my-app-local" or "my-app-dev")
   - Select your organization (if applicable)
   - Click "Create"

3. **Select Your Development Project**

   - Make sure your new development project is selected in the project dropdown

### Create Production Project

4. **Create Production Project**

   - Click "New Project" again
   - Enter a production project name (e.g., "my-app" or "my-app-prod")
   - Select your organization (if applicable)
   - Click "Create"

> **📝 Note**: You'll configure each project separately in the following steps.

## Step 2: Enable APIs for Both Projects

> **🔄 Important**: Repeat these steps for both development and production projects.

### For Development Project

1. **Select Development Project**

   - Switch to your development project using the project dropdown

2. **Navigate to APIs & Services**

   - In the left sidebar, click "APIs & Services" → "Library"

3. **Enable Required APIs**

   - Search for "Google+ API" and click on it → Click "Enable"
   - Search for "People API" and click on it → Click "Enable"

### For Production Project

4. **Switch to Production Project**

   - Switch to your production project using the project dropdown

5. **Repeat API Enablement**

   - Navigate to "APIs & Services" → "Library"
   - Enable "Google+ API" and "People API" for the production project

## Step 3: Configure OAuth Consent Screen for Both Projects

### Development Project Consent Screen

1. **Select Development Project**

   - Ensure your development project is selected

2. **Go to OAuth Consent Screen**

   - In the left sidebar, click "APIs & Services" → "OAuth consent screen"

3. **Choose User Type**

   - Select "External" for most applications
   - Click "Create"

4. **Fill Development App Information**

   - **App name**: "my-app-local" or "my-app-dev"
   - **User support email**: Your email address
   - **App logo**: (Optional) Upload your app logo
   - **App domain**: `http://localhost:3000` (for development)
   - **Authorized domains**: Leave empty for localhost development
   - **Developer contact information**: Your email address

5. **Scopes**

   - Click "Add or Remove Scopes"
   - Add these scopes: `openid`, `email`, `profile`
   - Click "Update"

6. **Test Users** (Important for Development)

   - Add your email and other developer emails
   - Click "Add Users"
   - Click "Save and Continue"

### Production Project Consent Screen

7. **Switch to Production Project**

   - Switch to your production project using the project dropdown

8. **Repeat OAuth Consent Screen Setup**

   - Navigate to "APIs & Services" → "OAuth consent screen"
   - Select "External" → Click "Create"

9. **Fill Production App Information**

   - **App name**: "my-app" (your production app name)
   - **User support email**: Your support email
   - **App logo**: (Optional) Your production app logo
   - **App domain**: `https://yourdomain.com`
   - **Authorized domains**: `yourdomain.com`
   - **Developer contact information**: Your contact email

10. **Production Scopes and Review**

    - Add the same scopes: `openid`, `email`, `profile`
    - For production, you may want to submit for Google verification
    - Click "Save and Continue" through all steps

## Step 4: Create OAuth2 Credentials for Both Projects

### Development Project Credentials

1. **Select Development Project**

   - Ensure your development project is selected

2. **Go to Credentials**

   - In the left sidebar, click "APIs & Services" → "Credentials"

3. **Create Development OAuth Client ID**

   - Click "Create Credentials" → "OAuth client ID"
   - **Application type**: Select "Web application"
   - **Name**: "my-app-local Web Client" (or similar)

4. **Configure Development Redirect URIs**

   - **Authorized JavaScript origins**: `http://localhost:3000`
   - **Authorized redirect URIs**: `http://localhost:3000/auth/oauth/google/callback`

5. **Create and Save Development Credentials**

   - Click "Create"
   - **Copy Development Credentials**:
     - **Client ID**: Copy and save this value
     - **Client Secret**: Copy and save this value

### Production Project Credentials

6. **Switch to Production Project**

   - Switch to your production project using the project dropdown

7. **Create Production OAuth Client ID**

   - Navigate to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - **Application type**: Select "Web application"
   - **Name**: "my-app Web Client" (or similar)

8. **Configure Production Redirect URIs**

   - **Authorized JavaScript origins**: `https://yourdomain.com`
   - **Authorized redirect URIs**: `https://yourdomain.com/auth/oauth/google/callback`

9. **Create and Save Production Credentials**

   - Click "Create"
   - **Copy Production Credentials**:
     - **Client ID**: Copy and save this value
     - **Client Secret**: Copy and save this value

> **🔒 Security Note**: Keep development and production credentials completely separate and secure.

## Step 5: Configure Your Authentication Service

### Development Environment

1. **Local Environment Variables**

   Add these variables to your `.env` file for development:

   ```env
   # Google OAuth2 Configuration (Development)
   GOOGLE_CLIENT_ID=your_development_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_development_google_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/oauth/google/callback
   ```

### Production Environment

2. **Production Environment Variables**

   For production, use separate credentials:

   ```env
   # Google OAuth2 Configuration (Production)
   GOOGLE_CLIENT_ID=your_production_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_production_google_client_secret_here
   GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/oauth/google/callback
   ```

   > **🔒 Security Tip**: Never commit production credentials to version control. Use environment variable management tools like AWS Secrets Manager, Google Secret Manager, or similar.

3. **Verify Environment Schema Configuration**

   The Google OAuth environment variables are already configured in `src/env.ts`.

   ```typescript
   // OAuth Configuration (already present)
   GOOGLE_CLIENT_ID: z.string().optional(),
   GOOGLE_CLIENT_SECRET: z.string().optional(),
   GOOGLE_REDIRECT_URI: z.string().url().optional(),
   ```

   If you need to make these required instead of optional, you can modify the schema:

   ```typescript
   // To make Google OAuth required, change from:
   GOOGLE_CLIENT_ID: z.string().optional(),
   // To:
   GOOGLE_CLIENT_ID: z.string().min(1, "Google Client ID is required"),
   ```

   **Note**: The current configuration makes OAuth providers optional, allowing the service to run without OAuth credentials during development.

## Step 6: Test Your Configuration

1. **Start Your Development Server**

   ```bash
   pnpm dev
   ```

2. **Test the OAuth Flow**

   - Navigate to `http://localhost:3000/auth/oauth/google` to initiate Google OAuth
   - You should be redirected to Google's authentication page
   - After authorization, you should be redirected back to your application via the callback URL
   - Check your application logs for authentication success/failure messages

## Step 7: Environment Management Best Practices

### Development vs Production Separation

The approach of creating separate Google Cloud projects (`my-app` and `my-app-local`) is industry best practice. Here are additional tips:

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

   - Share development project credentials with your team
   - Keep production credentials restricted to deployment systems
   - Document which Google Cloud project is for which environment

### Production Deployment Security

1. **Google Cloud Project Management**

   - Use separate Google Cloud projects for different environments
   - Configure appropriate IAM permissions per project
   - Enable audit logging for production projects

2. **OAuth Consent Screen**

   - For production: Click "Publish App" when ready for public use
   - Submit for Google verification if using sensitive scopes
   - Keep development apps in "Testing" mode

3. **Credential Management**

   - Store client secrets securely (environment variables, secrets manager)
   - Use Google Secret Manager for production secrets
   - Never commit production credentials to version control
   - Regularly rotate client secrets

4. **Monitoring and Analytics**
   - Monitor OAuth usage in Google Cloud Console
   - Set up alerts for unusual activity
   - Use separate analytics per environment

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" Error**

   - Ensure your redirect URI in the code exactly matches the one configured in Google Cloud Console
   - Check for trailing slashes and protocol (http vs https)

2. **"access_blocked" Error**

   - Make sure your app is configured for external users
   - Add test users in the OAuth consent screen during development

3. **"invalid_client" Error**

   - Verify your client ID and client secret are correct
   - Ensure environment variables are properly loaded

4. **Scope Issues**
   - Make sure you've enabled the required APIs (Google+ API, People API)
   - Verify the scopes in your OAuth consent screen

### Testing Commands

```bash
# Test Google OAuth authorization URL generation
curl -X GET http://localhost:3000/auth/oauth/google
# Should redirect to Google OAuth page

# Test callback endpoint
# This will be called automatically by Google after user authorization
```

## Additional Resources

- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth2 Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)

## Next Steps

After completing Google OAuth setup:

1. Implement the OAuth service in your authentication service
2. Add Google login buttons to your frontend
3. Test the complete authentication flow
4. Set up GitHub OAuth (see `github-oauth-setup.md`)
5. Set up LinkedIn OAuth (see `linkedin-oauth-setup.md`)
