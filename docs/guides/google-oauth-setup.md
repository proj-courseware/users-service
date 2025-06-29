# Google OAuth2 Setup Guide

This guide walks you through setting up Google OAuth2 authentication for your authentication service.

## Prerequisites

- A Google account
- Access to Google Cloud Console
- Your authentication service running locally or deployed

## Step 1: Create a Google Cloud Project

1. **Go to Google Cloud Console**

   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Create a New Project**

   - Click the project dropdown at the top of the page
   - Click "New Project"
   - Enter a project name (e.g., "My Auth Service")
   - Select your organization (if applicable)
   - Click "Create"

3. **Select Your Project**
   - Make sure your new project is selected in the project dropdown

## Step 2: Enable Google+ API

1. **Navigate to APIs & Services**

   - In the left sidebar, click "APIs & Services" → "Library"

2. **Enable Required APIs**
   - Search for "Google+ API" and click on it
   - Click "Enable"
   - Also search for "People API" and enable it (for user profile information)

## Step 3: Configure OAuth Consent Screen

1. **Go to OAuth Consent Screen**

   - In the left sidebar, click "APIs & Services" → "OAuth consent screen"

2. **Choose User Type**

   - Select "External" for most applications
   - Click "Create"

3. **Fill App Information**

   - **App name**: Enter your application name (e.g., "My Authentication Service")
   - **User support email**: Your email address
   - **App logo**: (Optional) Upload your app logo
   - **App domain**: Your application domain (e.g., `https://myapp.com`)
   - **Authorized domains**: Add your domain (e.g., `myapp.com`)
   - **Developer contact information**: Your email address

4. **Scopes**

   - Click "Add or Remove Scopes"
   - Add these scopes:
     - `openid`
     - `email`
     - `profile`
   - Click "Update"

5. **Test Users** (for development)

   - Add your email and other developer emails
   - Click "Add Users"

6. **Review and Submit**
   - Review your information
   - Click "Back to Dashboard"

## Step 4: Create OAuth2 Credentials

1. **Go to Credentials**

   - In the left sidebar, click "APIs & Services" → "Credentials"

2. **Create OAuth Client ID**

   - Click "Create Credentials" → "OAuth client ID"
   - **Application type**: Select "Web application"
   - **Name**: Enter a name (e.g., "Auth Service Web Client")

3. **Configure Redirect URIs**

   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for local development)
     - `https://yourdomain.com` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/google/callback` (for local development)
     - `https://yourdomain.com/auth/google/callback` (for production)

4. **Create**
   - Click "Create"
   - **Save your credentials**:
     - **Client ID**: Copy this value
     - **Client Secret**: Copy this value

## Step 5: Configure Your Authentication Service

1. **Environment Variables**

   Add these variables to your `.env` file:

   ```env
   # Google OAuth2 Configuration
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

   # For production, use:
   # GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
   ```

2. **Update App Environment Schema**

   Add Google OAuth configuration to your `src/schemas/app-env.schema.ts`:

   ```typescript
   const appEnvSchema = z.object({
     // ... existing configuration

     // Google OAuth2
     GOOGLE_CLIENT_ID: z.string().min(1, "Google Client ID is required"),
     GOOGLE_CLIENT_SECRET: z
       .string()
       .min(1, "Google Client Secret is required"),
     GOOGLE_REDIRECT_URI: z
       .string()
       .url("Google Redirect URI must be a valid URL"),
   });
   ```

## Step 6: Test Your Configuration

1. **Start Your Development Server**

   ```bash
   pnpm dev
   ```

2. **Test the OAuth Flow**
   - Navigate to your login page
   - Click "Sign in with Google"
   - You should be redirected to Google's authentication page
   - After authorization, you should be redirected back to your application

## Step 7: Production Setup

### For Production Deployment

1. **Update OAuth Consent Screen**

   - Go back to OAuth consent screen
   - Click "Publish App" when ready for production
   - Update domains to your production domain

2. **Update Credentials**

   - Add your production redirect URI to authorized redirect URIs
   - Update your production environment variables

3. **Security Considerations**
   - Never commit OAuth credentials to version control
   - Use environment variables or secure secret management
   - Regularly rotate your client secret
   - Monitor OAuth usage in Google Cloud Console

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
# Test environment variables are loaded
curl -X GET http://localhost:3000/auth/google
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
