# Getting Started with Authentication Service

> [!NOTE]  
> **Base URL:** The API base URL depends on your environment:
>
> - **Development:** `http://localhost:3000`
> - **Production:** `https://your-domain.com`
> - **Testing:** `https://test.your-domain.com`

> [!IMPORTANT]  
> **Authentication Required:** Most endpoints require a Bearer token. Include `Authorization: Bearer <your-access-token>` in your requests.

> [!TIP]
> **Local Development:** Check verification emails at `http://localhost:8025` (Mailpit). For production setup, configure SMTP settings in your environment variables.

## Quick Integration

The fastest way to get started is with a simple user registration:

```bash
# Register a new user (simplest integration)
curl -X POST https://your-api-domain.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'
```

## Authentication Flow

All protected endpoints require authentication via Bearer tokens:

```http
Authorization: Bearer <your-access-token>
```

**Token Flow:**

1. Register or login to receive `accessToken` and `refreshToken`
2. Use `accessToken` for authenticated requests (15 minutes expiry)
3. Use `refreshToken` to get new tokens when access token expires
4. Store tokens securely (localStorage for web, secure storage for mobile)

## Basic Usage Example

Here's a complete flow for registering and authenticating a user:

```javascript
// 1. Register a new user
const registerResponse = await fetch("/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    password: "SecurePassword123!",
  }),
});

const { user, tokens } = await registerResponse.json();

// 2. Store tokens securely
localStorage.setItem("accessToken", tokens.accessToken);
localStorage.setItem("refreshToken", tokens.refreshToken);

// 3. Use token for authenticated requests
const profileResponse = await fetch("/me", {
  headers: {
    Authorization: `Bearer ${tokens.accessToken}`,
  },
});

const userProfile = await profileResponse.json();
console.log("User profile:", userProfile);
```

## Environment Variables

Configuration for integrating applications:

```bash
# Service Configuration
API_BASE_URL=https://your-api-domain.com    # Service base URL
API_TIMEOUT=30000                           # Request timeout (ms)

# Frontend Integration
FRONTEND_URL=http://localhost:3001          # Your frontend URL
OAUTH_REDIRECT_BASE=https://yourapp.com     # OAuth redirect base

# Development (optional)
MAILPIT_WEB_URL=http://localhost:8025       # Email preview (dev only)
```

## What's Next?

- **[API Reference](./api-reference.md)** - Complete endpoint documentation
- **[Authentication Guide](./authentication-guide.md)** - Detailed auth flows and token management
- **[Integration Examples](./integration-examples.md)** - Code samples for different frameworks
- **[Data Models](./data-models.md)** - Schema definitions and response formats
- **[Error Handling](./error-handling.md)** - Error codes and troubleshooting
- **[Real-time Events](./realtime-events.md)** - Server-Sent Events documentation
- **[Security Guide](./security-guide.md)** - Best practices and security considerations

## Test Environment

- **Base URL**: `https://test.your-api-domain.com`
- **Test Users**: Create test accounts for development
- **Email Testing**: Use Mailpit or email services that support test mode
