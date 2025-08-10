# Authentication Service Documentation

> [!NOTE]  
> **Base URL:** The API base URL depends on your environment:
> - **Development:** `http://localhost:3000`
> - **Production:** `https://your-domain.com`
> - **Testing:** `https://test.your-domain.com`

> [!IMPORTANT]  
> **Authentication Required:** Most endpoints require a Bearer token. Include `Authorization: Bearer <your-access-token>` in your requests.

> [!TIP]
> **Local Development:** Check verification emails at `http://localhost:8025` (Mailpit). For production setup, configure SMTP settings in your environment variables.

---

## API Endpoints Quick Reference

| Method | Path                           | Description                   | Auth Required |
|--------|--------------------------------|-------------------------------|:-------------:|
| GET    | /                              | Root endpoint (hello)         | No |
| GET    | /health                        | Health check                  | No |
| POST   | /auth/register                 | Register new user             | No |
| POST   | /auth/login                    | Login with email/password     | No |
| POST   | /auth/refresh                  | Refresh access token          | No |
| POST   | /auth/verify-email             | Verify email address          | No |
| POST   | /auth/resend-verification      | Resend email verification     | No |
| GET    | /auth/me                       | Get current user info         | Yes |
| POST   | /auth/logout                   | Logout (client-side)          | No |
| GET    | /auth/oauth/providers          | Get enabled OAuth providers   | No |
| GET    | /auth/oauth/:provider          | Initiate OAuth login          | No |
| GET    | /auth/oauth/:provider/callback | OAuth callback handler        | No |
| DELETE | /auth/oauth/:provider          | Unlink OAuth provider         | Yes |
| GET    | /me                            | Get user profile              | Yes |
| PUT    | /me                            | Update user profile           | Yes |
| DELETE | /me                            | Delete user account           | Yes |
| PUT    | /me/password                   | Change password               | Yes |
| GET    | /me/emails                     | Get user emails               | Yes |
| POST   | /me/emails                     | Add new email                 | Yes |
| PUT    | /me/emails/primary             | Set primary email             | Yes |
| DELETE | /me/emails/:emailAddress       | Remove email                  | Yes |
| GET    | /admin/users                   | List all users                | Admin |
| POST   | /admin/users                   | Create user                   | Admin |
| GET    | /admin/users/:userId           | Get user by ID                | Admin |
| PUT    | /admin/users/:userId           | Update user                   | Admin |
| DELETE | /admin/users/:userId           | Delete user                   | Admin |
| POST   | /admin/users/:userId/lock      | Lock user account             | Admin |
| POST   | /admin/users/:userId/unlock    | Unlock user account           | Admin |
| GET    | /admin/stats                   | System statistics             | Admin |
| GET    | /admin/health                  | System health status          | Admin |
| GET    | /admin/settings                | Get all system settings       | Admin |
| PUT    | /admin/settings/:key           | Set system setting            | Admin |
| DELETE | /admin/settings/:key           | Delete system setting         | Admin |
| GET    | /events                        | Real-time events (SSE stream) | Yes |

---

## Getting Started

### Quick Integration

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

### Authentication

All protected endpoints require authentication via Bearer tokens:

```http
Authorization: Bearer <your-access-token>
```

**Token Flow:**
1. Register or login to receive `accessToken` and `refreshToken`
2. Use `accessToken` for authenticated requests (15 minutes expiry)
3. Use `refreshToken` to get new tokens when access token expires
4. Store tokens securely (localStorage for web, secure storage for mobile)

## Endpoint Details

### Authentication Endpoints

- **POST /auth/register**  
  Register a new user account with email verification.  
  **Auth:** Not required  
  **Body:**

  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }
  ```

  **Response:**
  ```json
  {
    "user": {
      "id": "user-123",
      "firstName": "John",
      "lastName": "Doe",
      "primaryEmail": "john@example.com",
      "globalRole": "student",
      "accountStatus": "active"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  }
  ```

  **Example:**
  ```bash
  curl -X POST /auth/register \
    -H "Content-Type: application/json" \
    -d '{
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "password": "SecurePassword123!"
    }'
  ```

- **POST /auth/login**  
  Login with email and password.  
  **Auth:** Not required  
  **Body:**

  ```json
  {
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }
  ```

  **Response:** User object with access and refresh tokens (same as register)

  **Example:**
  ```bash
  curl -X POST /auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "john@example.com",
      "password": "SecurePassword123!"
    }'
  ```

- **POST /auth/refresh**  
  Refresh access token using refresh token.  
  **Auth:** Not required (uses refresh token)  
  **Body:**

  ```json
  { "refreshToken": "your-refresh-token" }
  ```

  **Response:**
  ```json
  {
    "tokens": {
      "accessToken": "new-access-token",
      "refreshToken": "new-refresh-token", 
      "expiresIn": 900
    }
  }
  ```

  **Example:**
  ```bash
  curl -X POST /auth/refresh \
    -H "Content-Type: application/json" \
    -d '{"refreshToken": "your-refresh-token"}'
  ```

- **POST /auth/verify-email**  
  Verify email address with verification token from email.  
  **Body:**

  ```json
  { "token": "verification_token_from_email" }
  ```

  **Example:**
  ```bash
  curl -X POST /auth/verify-email \
    -H "Content-Type: application/json" \
    -d '{"token": "verification_token_from_email"}'
  ```

- **GET /auth/me**  
  Get current authenticated user information.  
  **Auth:** Bearer token required  
  **Response:** Current user object

  **Example:**
  ```bash
  curl -H "Authorization: Bearer your-token" /auth/me
  ```

### Social Authentication (OAuth)

- **GET /auth/oauth/providers**  
  Get list of available OAuth providers.  
  **Auth:** Not required  
  **Response:**
  ```json
  ["google", "github", "linkedin"]
  ```

- **GET /auth/oauth/:provider**  
  Initiate OAuth login flow. Supports `google`, `github`, `linkedin`.  
  **Auth:** Not required  
  **Response:** HTTP redirect to OAuth provider  

  **Example:**
  ```bash
  # Redirect user to this URL for Google OAuth
  https://your-domain.com/auth/oauth/google
  ```

- **GET /auth/oauth/:provider/callback**  
  OAuth callback handler (automatically called by OAuth provider).  
  **Auth:** Not required  
  **Response:** Redirect to frontend with tokens or error

- **DELETE /auth/oauth/:provider**  
  Unlink OAuth provider from current user account.  
  **Auth:** Bearer token required

  **Example:**
  ```bash
  curl -X DELETE \
    -H "Authorization: Bearer your-token" \
    /auth/oauth/google
  ```

### User Profile Management

- **GET /me**  
  Get current user profile with all details.  
  **Auth:** Bearer token required  
  **Response:**
  ```json
  {
    "id": "user-123",
    "firstName": "John",
    "lastName": "Doe",
    "primaryEmail": "john@example.com",
    "emails": [
      {
        "address": "john@example.com",
        "isVerified": true,
        "isPrimary": true
      }
    ],
    "globalRole": "student",
    "accountStatus": "active",
    "socialIdentities": {
      "google": "google-user-id"
    },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
  ```

- **PUT /me**  
  Update user profile information.  
  **Auth:** Bearer token required  
  **Body:**

  ```json
  {
    "firstName": "Jane",
    "lastName": "Smith"
  }
  ```

  **Example:**
  ```bash
  curl -X PUT /me \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer your-token" \
    -d '{
      "firstName": "Jane",
      "lastName": "Smith"
    }'
  ```

- **PUT /me/password**  
  Change user password.  
  **Auth:** Bearer token required  
  **Body:**

  ```json
  {
    "currentPassword": "old_password",
    "newPassword": "new_secure_password"
  }
  ```

- **DELETE /me**  
  Delete user account (requires password confirmation).  
  **Auth:** Bearer token required  
  **Body:**

  ```json
  { "password": "current_password" }
  ```

### Email Management

- **GET /me/emails**  
  Get all email addresses for current user.  
  **Auth:** Bearer token required  
  **Response:**
  ```json
  [
    {
      "address": "john@example.com",
      "isVerified": true,
      "isPrimary": true
    },
    {
      "address": "john.doe@work.com",
      "isVerified": false,
      "isPrimary": false
    }
  ]
  ```

- **POST /me/emails**  
  Add new email address to user account.  
  **Auth:** Bearer token required  
  **Body:**

  ```json
  { "emailAddress": "new@example.com" }
  ```

- **PUT /me/emails/primary**  
  Set primary email address (must be verified).  
  **Auth:** Bearer token required  
  **Body:**

  ```json
  { "emailAddress": "primary@example.com" }
  ```

- **DELETE /me/emails/:emailAddress**  
  Remove email address from account.  
  **Auth:** Bearer token required

  **Example:**
  ```bash
  curl -X DELETE \
    -H "Authorization: Bearer your-token" \
    "/me/emails/old@example.com"
  ```

### Admin Endpoints

- **GET /admin/users**  
  List all users with pagination and filtering.  
  **Auth:** Admin role required  
  **Query Parameters:** `page`, `limit`, `search`, `role`, `status`  
  **Response:**
  ```json
  {
    "data": [
      /* array of user objects */
    ],
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
  ```

- **POST /admin/users**  
  Create new user account (admin only).  
  **Auth:** Admin role required  
  **Body:**

  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "globalRole": "student",
    "password": "temporary_password",
    "sendWelcomeEmail": true
  }
  ```

- **GET /admin/stats**  
  Get system statistics and metrics.  
  **Auth:** Admin role required  
  **Response:**
  ```json
  {
    "users": {
      "total": 1247,
      "active": 1189,
      "locked": 3,
      "byRole": {
        "admin": 5,
        "teacher": 47,
        "student": 1195
      }
    },
    "system": {
      "uptime": 86400,
      "version": "1.0.0"
    }
  }
  ```

- **GET /admin/health**  
  Get detailed system health information.  
  **Auth:** Admin role required

### Real-time Events

- **GET /events**  
  Server-Sent Events stream for real-time authentication events.  
  **Auth:** Bearer token required  
  **Response:** `text/event-stream` with authentication events

  **Example:**
  ```javascript
  const eventSource = new EventSource('/events', {
    headers: {
      'Authorization': 'Bearer your-token'
    }
  });

  eventSource.addEventListener('authentication:login', (event) => {
    const data = JSON.parse(event.data);
    console.log('User logged in:', data.email);
  });
  ```

## Data Models

### User Object

```json
{
  "id": "user-123",
  "firstName": "John",
  "lastName": "Doe",
  "primaryEmail": "john@example.com",
  "emails": [
    {
      "address": "john@example.com",
      "isVerified": true,
      "isPrimary": true,
      "verificationToken": null,
      "verificationExpires": null
    }
  ],
  "globalRole": "student",
  "accountStatus": "active",
  "socialIdentities": {
    "google": "google-user-id",
    "github": "github-username",
    "linkedin": "linkedin-id"
  },
  "passwordResetToken": null,
  "passwordResetExpires": null,
  "lockoutInfo": {
    "failedAttempts": 0,
    "lockoutUntil": null,
    "progressiveLockoutLevel": 0
  },
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### Authentication Response

```json
{
  "user": {
    /* user object (without sensitive fields) */
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

### Email Object

```json
{
  "address": "email@example.com",
  "isVerified": true,
  "isPrimary": false,
  "verificationToken": "token-string",
  "verificationExpires": "2025-01-01T12:00:00.000Z"
}
```

### Paginated Response

```json
{
  "data": [
    /* array of objects */
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

## Integration Examples

### Complete User Registration Flow

When implementing user registration with email verification:

```javascript
// JavaScript/Node.js example
async function registerUser(userData) {
  try {
    // 1. Register user
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const result = await response.json();
    
    // 2. Store tokens securely
    localStorage.setItem('accessToken', result.tokens.accessToken);
    localStorage.setItem('refreshToken', result.tokens.refreshToken);
    
    // 3. Redirect to email verification notice
    window.location.href = '/verify-email';
    
    return result;
  } catch (error) {
    console.error('Registration failed:', error.message);
    throw error;
  }
}
```

```python
# Python example
import requests

def register_user(user_data):
    """Register a new user and handle the response"""
    try:
        response = requests.post(
            'https://your-api-domain.com/auth/register',
            headers={'Content-Type': 'application/json'},
            json={
                'firstName': user_data['firstName'],
                'lastName': user_data['lastName'],
                'email': user_data['email'],
                'password': user_data['password']
            }
        )
        
        if response.status_code == 201:
            result = response.json()
            # Store tokens securely in your application
            store_tokens(result['tokens'])
            return result
        else:
            error = response.json()
            raise Exception(f"Registration failed: {error['error']}")
            
    except requests.exceptions.RequestException as e:
        print(f"Network error: {e}")
        raise
```

### Authentication with Token Refresh

Implement automatic token refresh for seamless user experience:

```javascript
// JavaScript/Node.js automatic token refresh
class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  async request(endpoint, options = {}) {
    try {
      return await this.makeRequest(endpoint, options);
    } catch (error) {
      // If token expired, try to refresh and retry
      if (error.status === 401) {
        await this.refreshTokens();
        return await this.makeRequest(endpoint, options);
      }
      throw error;
    }
  }

  async makeRequest(endpoint, options) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw { status: response.status, ...error };
    }

    return await response.json();
  }

  async refreshTokens() {
    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    if (!response.ok) {
      // Refresh failed, redirect to login
      this.logout();
      throw new Error('Session expired');
    }

    const tokens = await response.json();
    this.accessToken = tokens.tokens.accessToken;
    this.refreshToken = tokens.tokens.refreshToken;
    
    localStorage.setItem('accessToken', this.accessToken);
    localStorage.setItem('refreshToken', this.refreshToken);
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }
}

// Usage
const api = new ApiClient('https://your-api-domain.com');

// Get user profile with automatic token refresh
const user = await api.request('/me');
console.log('User profile:', user);
```

### Social Login Integration

Implement OAuth login flows:

```javascript
// Social login integration
function initiateGoogleLogin() {
  // Redirect to OAuth provider
  window.location.href = '/auth/oauth/google';
}

// Handle OAuth callback (in your callback page)
function handleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const error = urlParams.get('error');
  
  if (error) {
    console.error('OAuth login failed:', error);
    // Handle error (show message to user)
    return;
  }
  
  if (token) {
    // OAuth successful, token is provided
    localStorage.setItem('accessToken', token);
    
    // Get user info and redirect
    fetch('/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(user => {
      console.log('Logged in user:', user);
      window.location.href = '/dashboard';
    });
  }
}
```

### Real-time Event Monitoring

Subscribe to authentication events:

```javascript
// Real-time event monitoring
function setupEventStream() {
  const token = localStorage.getItem('accessToken');
  
  const eventSource = new EventSource('/events', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // Listen for specific events
  eventSource.addEventListener('authentication:login', (event) => {
    const data = JSON.parse(event.data);
    console.log('User login detected:', data);
    updateUserActivityFeed(data);
  });

  eventSource.addEventListener('security:account_locked', (event) => {
    const data = JSON.parse(event.data);
    console.log('Account locked:', data);
    showSecurityAlert(data);
  });

  eventSource.addEventListener('email:email_verified', (event) => {
    const data = JSON.parse(event.data);
    console.log('Email verified:', data);
    updateEmailStatus(data);
  });

  // Handle connection errors
  eventSource.onerror = (error) => {
    console.error('EventSource error:', error);
    // Implement reconnection logic
  };

  return eventSource;
}
```

## Error Handling

### Error Format

All errors return consistent JSON format:

```json
{
  "error": "Error message describing what went wrong",
  "details": "Additional details or validation information"
}
```

### Common Status Codes

- **200**: Success
- **201**: Created successfully
- **400**: Bad request (validation error, malformed data)
- **401**: Authentication required or invalid credentials
- **403**: Access forbidden (insufficient permissions)
- **404**: Resource not found
- **409**: Conflict (email already exists, etc.)
- **429**: Rate limit exceeded
- **500**: Internal server error

### Example Error Responses

```json
// 400 Bad Request - Validation Error
{
  "error": "Validation failed",
  "details": "Password must be at least 8 characters and contain uppercase, lowercase, and numbers"
}

// 401 Unauthorized - Invalid Token
{
  "error": "Authentication required", 
  "details": "Please provide a valid access token"
}

// 403 Forbidden - Insufficient Permissions
{
  "error": "Access forbidden",
  "details": "Admin role required for this operation"
}

// 409 Conflict - Email Already Exists
{
  "error": "A user with this email already exists",
  "details": "Please use a different email address or try logging in"
}

// 429 Rate Limited
{
  "error": "Too many requests",
  "details": "Please wait before making another request"
}
```

### Error Handling Best Practices

```javascript
// JavaScript error handling example
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      
      switch (response.status) {
        case 400:
          throw new ValidationError(errorData.error, errorData.details);
        case 401:
          // Handle authentication error
          redirectToLogin();
          throw new AuthError(errorData.error);
        case 403:
          throw new PermissionError(errorData.error);
        case 409:
          throw new ConflictError(errorData.error);
        case 429:
          throw new RateLimitError(errorData.error);
        default:
          throw new ApiError(errorData.error);
      }
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```

## Rate Limits

The API implements rate limiting to ensure service stability:

- **Standard endpoints**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 5 requests per 15 minutes per IP
- **Admin endpoints**: Higher limits for administrative operations

### Rate Limit Headers

Response headers indicate your current rate limit status:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1635724800
```

### Handling Rate Limits

```javascript
// Handle rate limit responses
async function makeApiCall(endpoint, options) {
  const response = await fetch(endpoint, options);
  
  if (response.status === 429) {
    const resetTime = response.headers.get('X-RateLimit-Reset');
    const waitTime = (resetTime * 1000) - Date.now();
    
    console.log(`Rate limited. Waiting ${waitTime}ms`);
    
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return makeApiCall(endpoint, options);
  }
  
  return response;
}
```

## Real-time Events (Server-Sent Events)

### Event Types

The `/events` endpoint provides real-time authentication events:

**User Events:**
- `users:registered` - New user registration
- `users:updated` - User profile changes  
- `users:deleted` - User account deletion

**Authentication Events:**
- `authentication:login` - User login
- `authentication:logout` - User logout
- `authentication:token_refreshed` - Token refresh

**Email Events:**
- `email:email_verified` - Email verification completed
- `email:verification_sent` - Verification email sent
- `email:email_added` - New email added to account
- `email:email_removed` - Email removed from account

**Password Events:**
- `password:password_changed` - Password changed
- `password:password_reset_requested` - Password reset requested

**OAuth Events:**
- `oauth:oauth_login` - Social login completed
- `oauth:oauth_account_linked` - OAuth provider linked
- `oauth:oauth_account_unlinked` - OAuth provider unlinked

**Security Events:**
- `security:account_locked` - Account locked due to failed attempts
- `security:failed_login_attempt` - Failed login attempt
- `security:account_unlocked` - Account unlocked

**Admin Events:**
- `admin:user_role_changed` - User role modified
- `admin:admin_action_performed` - Administrative action

### Event Format

```
event: authentication:login
data: {
  "userId": "user-123",
  "email": "john@example.com", 
  "timestamp": "2025-01-01T10:00:00.000Z",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}

event: security:account_locked
data: {
  "userId": "user-456",
  "email": "suspicious@example.com",
  "lockoutLevel": 2,
  "lockoutUntil": "2025-01-01T11:00:00.000Z",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

### Client Implementation

```javascript
// Complete SSE client implementation
class AuthEventClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.eventSource = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    this.eventSource = new EventSource('/events', {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    // Handle all event types
    this.eventSource.addEventListener('authentication:login', this.handleLogin.bind(this));
    this.eventSource.addEventListener('security:account_locked', this.handleAccountLocked.bind(this));
    this.eventSource.addEventListener('email:email_verified', this.handleEmailVerified.bind(this));
    
    // Handle connection events
    this.eventSource.onopen = () => {
      console.log('Event stream connected');
      this.reconnectAttempts = 0;
    };

    this.eventSource.onerror = (error) => {
      console.error('Event stream error:', error);
      this.handleReconnect();
    };
  }

  handleLogin(event) {
    const data = JSON.parse(event.data);
    console.log('User login:', data.email);
    // Update UI, show notification, etc.
  }

  handleAccountLocked(event) {
    const data = JSON.parse(event.data);
    console.log('Account locked:', data.userId);
    // Show security alert, update user list, etc.
  }

  handleEmailVerified(event) {
    const data = JSON.parse(event.data);
    console.log('Email verified:', data.email);
    // Update email status in UI
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      
      setTimeout(() => {
        console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
        this.connect();
      }, delay);
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
```

## Account Management & Email Behavior

### Email Address Behavior

The authentication service implements intelligent account management:

#### Registration with Existing Email

- **Email/Password Registration**: ❌ **Rejected with `409 Conflict`**
  ```json
  {
    "error": "A user with this email already exists"
  }
  ```

- **OAuth Registration**: ✅ **Smart Account Linking**

#### OAuth Account Linking

When using OAuth with an existing email address:

1. **Existing Account Found**: OAuth provider links to existing account
2. **No Existing Account**: New account created with OAuth provider  
3. **Multiple OAuth Providers**: All providers with same email link to single account

**Example Flow:**
```plaintext
1. Register: john@example.com with password ✅ Account created
2. Login with Google (john@example.com) ✅ Google linked to existing account  
3. Login with GitHub (john@example.com) ✅ GitHub also linked to same account
4. Try to register again with john@example.com ❌ Registration rejected
```

#### Multiple Login Methods

After linking, users can login using any method:
- Original email/password
- Any linked OAuth provider (Google, GitHub, LinkedIn)
- All methods access the same account with same user ID

### Adding Additional Emails

Users can manage multiple email addresses:

```javascript
// Add new email to account
const response = await fetch('/me/emails', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    emailAddress: 'work@example.com'
  })
});

// Set primary email (must be verified)
await fetch('/me/emails/primary', {
  method: 'PUT', 
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    emailAddress: 'work@example.com'
  })
});
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

## Testing

### Test Environment

- **Base URL**: `https://test.your-api-domain.com`
- **Test Users**: Create test accounts for development
- **Email Testing**: Use Mailpit or email services that support test mode

### Example Integration Tests

```javascript
// Integration test examples
describe('Authentication Service Integration', () => {
  const API_BASE = 'http://localhost:3000';
  let userToken = '';

  it('should register a new user', async () => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'TestPass123!'
      })
    });

    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result.user.email).toBe('test@example.com');
    expect(result.tokens.accessToken).toBeDefined();
    
    userToken = result.tokens.accessToken;
  });

  it('should login with credentials', async () => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPass123!'
      })
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.tokens.accessToken).toBeDefined();
  });

  it('should access protected endpoint', async () => {
    const response = await fetch(`${API_BASE}/me`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    expect(response.status).toBe(200);
    const user = await response.json();
    expect(user.email).toBe('test@example.com');
  });
});
```

## Troubleshooting

### Common Issues

**Issue**: `401 Unauthorized` on protected endpoints  
**Solution**: 
1. Verify you're including the Authorization header: `Authorization: Bearer <token>`
2. Check that your access token hasn't expired (15 minutes default)
3. Use `/auth/refresh` endpoint to get a new access token
4. Ensure the token format is correct (JWT string)

**Issue**: Email verification not working  
**Solution**:
1. Check your email service configuration (SMTP settings)
2. In development, check Mailpit at `http://localhost:8025`
3. Verify the verification token hasn't expired
4. Use `/auth/resend-verification` to send a new token

**Issue**: OAuth login fails or redirects incorrectly  
**Solution**:
1. Verify OAuth provider configuration (client ID, secret, redirect URLs)
2. Check that redirect URLs match exactly in provider settings
3. Ensure your OAuth provider is enabled in the service configuration
4. Check browser console for errors during OAuth flow

**Issue**: Rate limit errors  
**Solution**:
1. Check `X-RateLimit-*` headers in responses
2. Implement exponential backoff in your client
3. Consider using connection pooling or request queuing
4. Contact admin if limits need to be adjusted for your use case

**Issue**: Server-Sent Events connection fails  
**Solution**:
1. Verify you're passing the Authorization header with EventSource
2. Check that your access token is valid and not expired
3. Implement reconnection logic with exponential backoff
4. Check browser network tab for connection errors

### Getting Help

- **API Documentation**: This document and endpoint examples
- **Source Code**: Check test files for usage patterns and examples
- **Health Endpoint**: Use `/health` and `/admin/health` to verify service status
- **Error Responses**: All endpoints return detailed error messages
- **Development Mode**: Enable detailed logging in development environment

### Performance Tips

1. **Token Management**: Refresh tokens before they expire to avoid failed requests
2. **Connection Reuse**: Use HTTP/1.1 keep-alive or HTTP/2 for better performance  
3. **Batch Operations**: Use admin endpoints for bulk user operations when possible
4. **Caching**: Cache user profile data locally and refresh when needed
5. **Error Handling**: Implement proper retry logic with exponential backoff

---

## Security Considerations

### Best Practices

- **Token Storage**: Store tokens securely (httpOnly cookies for web, secure storage for mobile)
- **HTTPS Only**: Always use HTTPS in production environments
- **Token Rotation**: Regularly refresh access tokens using refresh tokens
- **Input Validation**: Validate all user input on your client side as well
- **Rate Limiting**: Respect rate limits and implement client-side throttling
- **Password Requirements**: Follow the service's password policy requirements
- **Email Verification**: Always verify email addresses before considering them trusted

### Security Features

The service includes enterprise-grade security features:

- **Progressive Account Lockout**: Automatic protection against brute force attacks
- **Rate Limiting**: Per-IP and per-endpoint request limiting  
- **Input Sanitization**: All inputs are validated and sanitized
- **CSRF Protection**: Available for session-based authentication
- **Password Security**: Argon2id hashing with configurable policies
- **JWT Security**: Short-lived access tokens with secure refresh rotation

---

## Migration and Integration Guides

### Migrating from Other Authentication Systems

If you're migrating from another authentication system:

1. **Export User Data**: Extract user profiles, emails, and roles from your existing system
2. **Password Migration**: Users will need to reset passwords (or implement password migration if supported)
3. **OAuth Linking**: Re-link social accounts through the OAuth flow
4. **Role Mapping**: Map existing roles to the service's role system (admin, teacher, student)
5. **Email Verification**: Re-verify email addresses if required

### Frontend Integration Examples

**React Integration:**
```jsx
// React hook for authentication
function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (token) => {
    try {
      const response = await fetch('/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        localStorage.removeItem('accessToken');
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  return { user, loading };
}
```

**Vue.js Integration:**
```javascript
// Vue.js authentication store (Pinia)
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken')
  }),

  actions: {
    async login(email, password) {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        this.setTokens(data.tokens);
        this.user = data.user;
        return data;
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    },

    setTokens(tokens) {
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
  }
});
```

---

This documentation provides everything you need to successfully integrate with the authentication service. For the most up-to-date information, always refer to the API endpoints directly and check the service health status.