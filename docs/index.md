# Authentication API Documentation

> [!NOTE]  
> **Base URL:** The API base URL depends on your environment (e.g., `http://localhost:3000` for local development, or your production domain).

> [!IMPORTANT]  
> **Do not hardcode the base URL in client applications.**

> [!TIP]
> During local development, check emails at <http://localhost:8025> (Mailpit)

---

## API Endpoints Quick Reference

| Method | Path                           | Description                   | Auth Required |
| ------ | ------------------------------ | ----------------------------- | :-----------: |
| GET    | /                              | Root endpoint (hello)         |      No       |
| GET    | /health                        | Health check                  |      No       |
| POST   | /auth/register                 | Register new user             |      No       |
| POST   | /auth/login                    | Login with email/password     |      No       |
| POST   | /auth/refresh                  | Refresh access token          |      No       |
| POST   | /auth/verify-email             | Verify email address          |      No       |
| POST   | /auth/resend-verification      | Resend email verification     |      No       |
| GET    | /auth/me                       | Get current user info         |      Yes      |
| POST   | /auth/logout                   | Logout (client-side)          |      No       |
| GET    | /auth/oauth/providers          | Get enabled OAuth providers   |      No       |
| GET    | /auth/oauth/:provider          | Initiate OAuth login          |      No       |
| GET    | /auth/oauth/:provider/callback | OAuth callback handler        |      No       |
| DELETE | /auth/oauth/:provider          | Unlink OAuth provider         |      Yes      |
| GET    | /me                            | Get user profile              |      Yes      |
| PUT    | /me                            | Update user profile           |      Yes      |
| DELETE | /me                            | Delete user account           |      Yes      |
| PUT    | /me/password                   | Change password               |      Yes      |
| GET    | /me/emails                     | Get user emails               |      Yes      |
| POST   | /me/emails                     | Add new email                 |      Yes      |
| PUT    | /me/emails/primary             | Set primary email             |      Yes      |
| DELETE | /me/emails/:emailAddress       | Remove email                  |      Yes      |
| GET    | /admin/users                   | List all users (admin)        |     Admin     |
| POST   | /admin/users                   | Create user (admin)           |     Admin     |
| GET    | /admin/users/:userId           | Get user by ID (admin)        |     Admin     |
| PUT    | /admin/users/:userId           | Update user (admin)           |     Admin     |
| DELETE | /admin/users/:userId           | Delete user (admin)           |     Admin     |
| POST   | /admin/users/:userId/lock      | Lock user account             |     Admin     |
| POST   | /admin/users/:userId/unlock    | Unlock user account           |     Admin     |
| GET    | /admin/stats                   | System statistics             |     Admin     |
| GET    | /admin/health                  | System health status          |     Admin     |
| GET    | /admin/settings                | Get all system settings       |     Admin     |
| PUT    | /admin/settings/:key           | Set system setting            |     Admin     |
| DELETE | /admin/settings/:key           | Delete system setting         |     Admin     |
| GET    | /events                        | Real-time events (SSE stream) |      Yes      |

---

## Endpoint Details

### Root

- **GET /**  
  Returns a simple hello message.  
  **Auth:** Not required

### Health Check

- **GET /health**  
  Returns API health status.  
  **Auth:** Not required  
  **Response:**
  ```json
  { "status": "ok" }
  ```

### Authentication

- **POST /auth/register**  
  Register a new user account.  
  **Body:**

  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }
  ```

  **Response:** User object with access token

- **POST /auth/login**  
  Login with email and password.  
  **Body:**

  ```json
  {
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }
  ```

  **Response:** User object with access and refresh tokens

- **POST /auth/refresh**  
  Refresh access token using refresh token.  
  **Body:**

  ```json
  { "refreshToken": "refresh_token_string" }
  ```

  **Response:** New access and refresh tokens

- **POST /auth/verify-email**  
  Verify email address with token.  
  **Body:**

  ```json
  { "token": "verification_token" }
  ```

- **POST /auth/resend-verification**  
  Resend email verification.  
  **Body:**

  ```json
  {
    "userId": "user-id",
    "emailAddress": "john@example.com"
  }
  ```

- **GET /auth/me**  
  Get current user information.  
  **Auth:** Bearer token required  
  **Response:** Current user object

- **POST /auth/logout**  
  Logout (client-side token removal).  
  **Response:** Success message

### Social Authentication (OAuth)

- **GET /auth/oauth/providers**  
  Get list of enabled OAuth providers.  
  **Response:** Array of provider names

- **GET /auth/oauth/:provider**  
  Initiate OAuth login flow (supports google, github, linkedin).  
  **Example:** `/auth/oauth/github` for GitHub OAuth  
  **Response:** Redirect to OAuth provider

- **GET /auth/oauth/:provider/callback**  
  OAuth callback handler.  
  **Example:** `/auth/oauth/github/callback` for GitHub OAuth callback  
  **Response:** Redirect with tokens or error

- **DELETE /auth/oauth/:provider**  
  Unlink OAuth provider from account.  
  **Auth:** Bearer token required

### User Profile Management

- **GET /me**  
  Get current user profile.  
  **Auth:** Bearer token required

- **PUT /me**  
  Update user profile.  
  **Body:**

  ```json
  {
    "firstName": "Jane",
    "lastName": "Smith"
  }
  ```

- **DELETE /me**  
  Delete user account.  
  **Body:**

  ```json
  { "password": "current_password" }
  ```

- **PUT /me/password**  
  Change password.  
  **Body:**
  ```json
  {
    "currentPassword": "old_password",
    "newPassword": "new_password"
  }
  ```

### Email Management

- **GET /me/emails**  
  Get user's email addresses.  
  **Response:** Array of email objects

- **POST /me/emails**  
  Add new email address.  
  **Body:**

  ```json
  { "emailAddress": "new@example.com" }
  ```

- **PUT /me/emails/primary**  
  Set primary email address.  
  **Body:**

  ```json
  { "emailAddress": "primary@example.com" }
  ```

- **DELETE /me/emails/:emailAddress**  
  Remove email address from account.

### Admin User Management

- **GET /admin/users**  
  List all users with pagination and filtering.  
  **Query:** `page`, `limit`, `search`, `role`, `status`  
  **Auth:** Admin role required

- **POST /admin/users**  
  Create new user (admin).  
  **Body:**

  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "globalRole": "student",
    "password": "password123",
    "sendWelcomeEmail": true
  }
  ```

- **GET /admin/users/:userId**  
  Get user by ID.  
  **Auth:** Admin role required

- **PUT /admin/users/:userId**  
  Update user information.  
  **Auth:** Admin role required

- **DELETE /admin/users/:userId**  
  Delete user account.  
  **Auth:** Admin role required

- **POST /admin/users/:userId/lock**  
  Lock user account.  
  **Auth:** Admin role required

- **POST /admin/users/:userId/unlock**  
  Unlock user account.  
  **Auth:** Admin role required

### Admin System Management

- **GET /admin/stats**  
  Get system statistics.  
  **Auth:** Admin role required  
  **Response:** User counts, system metrics

- **GET /admin/health**  
  Get detailed system health status.  
  **Auth:** Admin role required

- **GET /admin/settings**  
  Get all system settings.  
  **Auth:** Admin role required

- **PUT /admin/settings/:key**  
  Set system setting.  
  **Body:**

  ```json
  {
    "value": "setting_value",
    "description": "Setting description"
  }
  ```

- **DELETE /admin/settings/:key**  
  Delete system setting.  
  **Auth:** Admin role required

### Real-time Events

- **GET /events**  
  Server-Sent Events (SSE) stream for real-time authentication events.  
  **Auth:** Bearer token required  
  **Response:** `text/event-stream` with authentication events and heartbeats.

---

## Authentication

Most endpoints require authentication. There are two methods:

### Bearer Token (Recommended)

```http
Authorization: Bearer <your-access-token>
```

### Session Cookies (Optional)

Session-based authentication via HTTP-only cookies.

### User Roles

- **admin**: Full system access, user management, system settings
- **teacher**: Enhanced privileges (educational context)
- **student**: Basic user privileges (default)

---

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
      "isPrimary": true
    }
  ],
  "globalRole": "student",
  "accountStatus": "active",
  "socialIdentities": {
    "google": "google-user-id",
    "github": "github-username"
  },
  "createdAt": "2025-06-29T10:00:00.000Z",
  "updatedAt": "2025-06-29T10:00:00.000Z"
}
```

### Authentication Response

```json
{
  "user": {
    /* user object */
  },
  "tokens": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
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
  "verificationExpires": "2025-06-29T11:00:00.000Z"
}
```

### Paginated Response

```json
{
  "data": [
    /* array of objects */
  ],
  "total": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

---

## Error Format

All errors return JSON:

```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

Common status codes: 400, 401, 403, 404, 500

---

## Real-time Events (SSE)

- **Endpoint:** `GET /events`
- **Auth:** Bearer token required
- **Event types:**
  - **User Events:** `users:registered`, `users:updated`, `users:deleted`
  - **Auth Events:** `authentication:login`, `authentication:logout`, `authentication:token_refreshed`
  - **Email Events:** `email:email_verified`, `email:verification_sent`, `email:email_added`, `email:email_removed`
  - **Password Events:** `password:password_changed`, `password:password_reset_requested`
  - **OAuth Events:** `oauth:oauth_login`, `oauth:oauth_account_linked`, `oauth:oauth_account_unlinked`
  - **Security Events:** `security:account_locked`, `security:failed_login_attempt`, `security:account_unlocked`
  - **Admin Events:** `admin:user_role_changed`, `admin:admin_action_performed`
  - **Heartbeat:** `: heartbeat`

**Example event:**

```
event: authentication:login
data: { "userId": "user-123", "email": "john@example.com", "timestamp": "2025-06-29T10:00:00.000Z" }
```

**Client Example (JS):**

```js
const es = new EventSource("/events", {
  headers: { Authorization: "Bearer your-token" },
});

es.addEventListener("authentication:login", (e) => {
  const data = JSON.parse(e.data);
  console.log("User logged in:", data.email);
});

es.addEventListener("security:account_locked", (e) => {
  const data = JSON.parse(e.data);
  console.log("Account locked:", data.userId);
});
```

---

## Account Management & Email Conflicts

### Email Address Behavior

The authentication service implements intelligent account management based on email addresses:

#### **Registration with Existing Email**

- **Email/Password Registration**: ❌ **Rejected with `409 Conflict`**
  ```json
  {
    "error": "A user with this email already exists"
  }
  ```
- **OAuth Registration**: ✅ **Smart Account Linking** (see below)

#### **OAuth Account Linking**

When using OAuth (Google, GitHub, LinkedIn) with an existing email:

1. **Existing Account Found**: OAuth provider is **linked** to the existing account
2. **No Existing Account**: New account created with OAuth provider
3. **Multiple OAuth Providers**: All providers with same email link to single account

**Example Flow:**

```plaintext
1. Register with email/password: john@example.com ✅ Account created
2. Login with Google (john@example.com) ✅ Google linked to existing account
3. Login with GitHub (john@example.com) ✅ GitHub also linked to same account
4. Try to register again with john@example.com ❌ Registration rejected
```

#### **Account Access Methods**

After linking, users can login using **any** of these methods:

- Original email/password
- Any linked OAuth provider (Google, GitHub, LinkedIn)
- All methods access the **same account** with same user ID

#### **Security Protection**

- **Provider ID Verification**: OAuth accounts are verified by provider user ID
- **Email Verification**: Social login emails are automatically verified
- **Conflict Detection**: Prevents linking different provider accounts with same email

### Adding Additional Emails

Authenticated users can add multiple email addresses:

- **POST /me/emails**: Add new email to existing account
- **Validation**: Email cannot be used by another user
- **Verification**: New emails require verification before use
- **Primary Email**: One email designated as primary for login

## Authorization & Security

### Access Control

- **Public endpoints:** Registration, login, OAuth flows, health checks
- **Authenticated endpoints:** User profile, email management, events
- **Admin endpoints:** User management, system settings, statistics

### Security Features

- **Progressive account lockout:** Exponential backoff after failed login attempts
- **Rate limiting:** Per-endpoint and per-IP request limits
- **Input validation:** Comprehensive validation with sanitization
- **CSRF protection:** Session-based CSRF tokens (when enabled)
- **Password security:** Argon2id hashing with configurable policies

### Social Login

- **Supported providers:** Google, GitHub, LinkedIn
- **Account linking:** Automatic linking based on verified email addresses
- **Security:** OAuth2 with state validation and CSRF protection

---

## Development Notes

- **Base URL:** Environment-dependent (see top of document)
- **Database:** Uses MongoDB (production/dev) or in-memory (test)
- **CORS:** Enabled for all origins in development
- **Email service:** Mailpit for development, SMTP for production
- **Environment:** Docker-based development with hot reload

---

## Environment Variables

Core configuration:

- `PORT`, `NODE_ENV`, `MONGODB_URI`
- `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

OAuth providers:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`

Security settings:

- `RATE_LIMIT_WINDOW`, `RATE_LIMIT_MAX_REQUESTS`
- `PASSWORD_MIN_LENGTH`, `PASSWORD_REQUIRE_UPPERCASE`

---

## Error Handling

All errors return consistent JSON format with appropriate HTTP status codes:

- **400:** Validation errors, malformed requests
- **401:** Authentication required or invalid credentials
- **403:** Access forbidden (insufficient permissions)
- **404:** Resource not found
- **409:** Conflict (email already exists, etc.)
- **429:** Rate limit exceeded
- **500:** Internal server errors

Error responses include detailed messages and validation information when applicable.
