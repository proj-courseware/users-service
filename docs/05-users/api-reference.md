# API Reference

## Quick Reference Table

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
| GET    | /admin/users                   | List all users                |     Admin     |
| POST   | /admin/users                   | Create user                   |     Admin     |
| GET    | /admin/users/:userId           | Get user by ID                |     Admin     |
| PUT    | /admin/users/:userId           | Update user                   |     Admin     |
| DELETE | /admin/users/:userId           | Delete user                   |     Admin     |
| POST   | /admin/users/:userId/lock      | Lock user account             |     Admin     |
| POST   | /admin/users/:userId/unlock    | Unlock user account           |     Admin     |
| GET    | /admin/stats                   | System statistics             |     Admin     |
| GET    | /admin/health                  | System health status          |     Admin     |
| GET    | /admin/settings                | Get all system settings       |     Admin     |
| PUT    | /admin/settings/:key           | Set system setting            |     Admin     |
| DELETE | /admin/settings/:key           | Delete system setting         |     Admin     |
| GET    | /events                        | Real-time events (SSE stream) |      Yes      |

---

## Authentication Endpoints

### POST /auth/register

Register a new user account with email verification.

**Auth:** Not required

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (201 Created):**

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

**cURL Example:**

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

### POST /auth/login

Login with email and password.

**Auth:** Not required

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** User object with access and refresh tokens (same format as register)

**cURL Example:**

```bash
curl -X POST /auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'
```

### POST /auth/refresh

Refresh access token using refresh token.

**Auth:** Not required (uses refresh token)

**Request Body:**

```json
{ "refreshToken": "your-refresh-token" }
```

**Response (200 OK):**

```json
{
  "tokens": {
    "accessToken": "new-access-token",
    "refreshToken": "new-refresh-token",
    "expiresIn": 900
  }
}
```

### POST /auth/verify-email

Verify email address with verification token from email.

**Auth:** Not required

**Request Body:**

```json
{ "token": "verification_token_from_email" }
```

### GET /auth/me

Get current authenticated user information.

**Auth:** Bearer token required

**Response:** Current user object

**cURL Example:**

```bash
curl -H "Authorization: Bearer your-token" /auth/me
```

---

## Social Authentication (OAuth)

### GET /auth/oauth/providers

Get list of available OAuth providers.

**Auth:** Not required

**Response (200 OK):**

```json
["google", "github", "linkedin"]
```

### GET /auth/oauth/:provider

Initiate OAuth login flow. Supports `google`, `github`, `linkedin`.

**Auth:** Not required

**Response:** HTTP redirect to OAuth provider

**Example:**

```bash
# Redirect user to this URL for Google OAuth
https://your-domain.com/auth/oauth/google
```

### GET /auth/oauth/:provider/callback

OAuth callback handler (automatically called by OAuth provider).

**Auth:** Not required

**Response:** Redirect to frontend with tokens or error

### DELETE /auth/oauth/:provider

Unlink OAuth provider from current user account.

**Auth:** Bearer token required

**cURL Example:**

```bash
curl -X DELETE \
  -H "Authorization: Bearer your-token" \
  /auth/oauth/google
```

---

## User Profile Management

### GET /me

Get current user profile with all details.

**Auth:** Bearer token required

**Response (200 OK):**

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

### PUT /me

Update user profile information.

**Auth:** Bearer token required

**Request Body:**

```json
{
  "firstName": "Jane",
  "lastName": "Smith"
}
```

**cURL Example:**

```bash
curl -X PUT /me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith"
  }'
```

### PUT /me/password

Change user password.

**Auth:** Bearer token required

**Request Body:**

```json
{
  "currentPassword": "old_password",
  "newPassword": "new_secure_password"
}
```

### DELETE /me

Delete user account (requires password confirmation).

**Auth:** Bearer token required

**Request Body:**

```json
{ "password": "current_password" }
```

---

## Email Management

### GET /me/emails

Get all email addresses for current user.

**Auth:** Bearer token required

**Response (200 OK):**

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

### POST /me/emails

Add new email address to user account.

**Auth:** Bearer token required

**Request Body:**

```json
{ "emailAddress": "new@example.com" }
```

### PUT /me/emails/primary

Set primary email address (must be verified).

**Auth:** Bearer token required

**Request Body:**

```json
{ "emailAddress": "primary@example.com" }
```

### DELETE /me/emails/:emailAddress

Remove email address from account.

**Auth:** Bearer token required

**cURL Example:**

```bash
curl -X DELETE \
  -H "Authorization: Bearer your-token" \
  "/me/emails/old@example.com"
```

---

## Admin Endpoints

### GET /admin/users

List all users with pagination and filtering.

**Auth:** Admin role required

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Search term (searches name and email)
- `role` - Filter by role (admin, teacher, student)
- `status` - Filter by account status (active, locked)

**Response (200 OK):**

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

### POST /admin/users

Create new user account (admin only).

**Auth:** Admin role required

**Request Body:**

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

### GET /admin/users/:userId

Get specific user by ID.

**Auth:** Admin role required

### PUT /admin/users/:userId

Update user account (admin only).

**Auth:** Admin role required

### DELETE /admin/users/:userId

Delete user account (admin only).

**Auth:** Admin role required

### POST /admin/users/:userId/lock

Lock user account.

**Auth:** Admin role required

### POST /admin/users/:userId/unlock

Unlock user account.

**Auth:** Admin role required

### GET /admin/stats

Get system statistics and metrics.

**Auth:** Admin role required

**Response (200 OK):**

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

### GET /admin/health

Get detailed system health information.

**Auth:** Admin role required

### GET /admin/settings

Get all system settings.

**Auth:** Admin role required

### PUT /admin/settings/:key

Set system setting value.

**Auth:** Admin role required

### DELETE /admin/settings/:key

Delete system setting.

**Auth:** Admin role required

---

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
