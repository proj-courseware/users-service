# Data Models

This document describes the data structures and response formats used by the Authentication Service.

## User Object

The complete user object with all fields:

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
    },
    {
      "address": "john.work@company.com",
      "isVerified": false,
      "isPrimary": false,
      "verificationToken": "abc123def456",
      "verificationExpires": "2025-01-01T12:00:00.000Z"
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

### User Field Descriptions

| Field                  | Type         | Description                                                   |
| ---------------------- | ------------ | ------------------------------------------------------------- |
| `id`                   | string       | Unique user identifier                                        |
| `firstName`            | string       | User's first name                                             |
| `lastName`             | string       | User's last name                                              |
| `primaryEmail`         | string       | User's primary email address (always verified)                |
| `emails`               | array        | Array of email objects (see Email Object below)               |
| `globalRole`           | string       | User's role: `admin`, `teacher`, or `student`                 |
| `accountStatus`        | string       | Account status: `active`, `locked`, or `suspended`            |
| `socialIdentities`     | object       | OAuth provider identities (key: provider, value: external ID) |
| `passwordResetToken`   | string\|null | Password reset token (if active)                              |
| `passwordResetExpires` | string\|null | Password reset token expiration (ISO date)                    |
| `lockoutInfo`          | object       | Account lockout information (see Lockout Info below)          |
| `createdAt`            | string       | Account creation timestamp (ISO date)                         |
| `updatedAt`            | string       | Last update timestamp (ISO date)                              |

### Public User Object

When returned in responses, sensitive fields are typically omitted:

```json
{
  "id": "user-123",
  "firstName": "John",
  "lastName": "Doe",
  "primaryEmail": "john@example.com",
  "globalRole": "student",
  "accountStatus": "active",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

## Email Object

Represents an email address associated with a user account:

```json
{
  "address": "email@example.com",
  "isVerified": true,
  "isPrimary": false,
  "verificationToken": "abc123def456",
  "verificationExpires": "2025-01-01T12:00:00.000Z"
}
```

### Email Field Descriptions

| Field                 | Type         | Description                                  |
| --------------------- | ------------ | -------------------------------------------- |
| `address`             | string       | The email address                            |
| `isVerified`          | boolean      | Whether the email is verified                |
| `isPrimary`           | boolean      | Whether this is the primary email            |
| `verificationToken`   | string\|null | Token for email verification (if unverified) |
| `verificationExpires` | string\|null | Verification token expiration (ISO date)     |

### Public Email Object

In public responses, sensitive fields are omitted:

```json
{
  "address": "email@example.com",
  "isVerified": true,
  "isPrimary": false
}
```

## Authentication Response

Returned after successful login or registration:

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

### Tokens Object

| Field          | Type   | Description                                 |
| -------------- | ------ | ------------------------------------------- |
| `accessToken`  | string | JWT access token for authenticated requests |
| `refreshToken` | string | Token for refreshing the access token       |
| `expiresIn`    | number | Access token expiration time in seconds     |

## Lockout Info Object

Information about account lockout status:

```json
{
  "failedAttempts": 3,
  "lockoutUntil": "2025-01-01T10:15:00.000Z",
  "progressiveLockoutLevel": 2
}
```

### Lockout Field Descriptions

| Field                     | Type         | Description                                 |
| ------------------------- | ------------ | ------------------------------------------- |
| `failedAttempts`          | number       | Number of consecutive failed login attempts |
| `lockoutUntil`            | string\|null | Lockout expiration timestamp (ISO date)     |
| `progressiveLockoutLevel` | number       | Current lockout level (0-4)                 |

### Lockout Levels

| Level | Failed Attempts | Lockout Duration |
| ----- | --------------- | ---------------- |
| 0     | 0-2             | No lockout       |
| 1     | 3-5             | 1 minute         |
| 2     | 6-8             | 5 minutes        |
| 3     | 9-11            | 15 minutes       |
| 4     | 12+             | 60 minutes       |

## Paginated Response

Used for endpoints that return lists (e.g., admin user listing):

```json
{
  "data": [
    {
      "id": "user-123",
      "firstName": "John",
      "lastName": "Doe",
      "primaryEmail": "john@example.com",
      "globalRole": "student",
      "accountStatus": "active"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

### Pagination Fields

| Field        | Type   | Description                     |
| ------------ | ------ | ------------------------------- |
| `data`       | array  | Array of result objects         |
| `total`      | number | Total number of items available |
| `page`       | number | Current page number (1-indexed) |
| `limit`      | number | Maximum items per page          |
| `totalPages` | number | Total number of pages           |

## System Statistics

Returned by the `/admin/stats` endpoint:

```json
{
  "users": {
    "total": 1247,
    "active": 1189,
    "locked": 3,
    "suspended": 0,
    "byRole": {
      "admin": 5,
      "teacher": 47,
      "student": 1195
    }
  },
  "system": {
    "uptime": 86400,
    "version": "1.0.0",
    "environment": "production"
  },
  "auth": {
    "totalLogins": 15673,
    "totalRegistrations": 1247,
    "oauthRegistrations": {
      "google": 342,
      "github": 156,
      "linkedin": 89
    }
  }
}
```

### Statistics Field Descriptions

| Field                     | Type   | Description                     |
| ------------------------- | ------ | ------------------------------- |
| `users.total`             | number | Total number of users           |
| `users.active`            | number | Number of active users          |
| `users.locked`            | number | Number of locked accounts       |
| `users.suspended`         | number | Number of suspended accounts    |
| `users.byRole`            | object | User count by role              |
| `system.uptime`           | number | System uptime in seconds        |
| `system.version`          | string | Service version                 |
| `system.environment`      | string | Environment name                |
| `auth.totalLogins`        | number | Total login attempts            |
| `auth.totalRegistrations` | number | Total registrations             |
| `auth.oauthRegistrations` | object | OAuth registrations by provider |

## Health Status

Returned by the `/admin/health` endpoint:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T10:00:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 15,
      "message": "MongoDB connection active"
    },
    "memory": {
      "status": "healthy",
      "usage": {
        "used": 128,
        "total": 1024,
        "percentage": 12.5
      }
    },
    "settings": {
      "status": "healthy",
      "message": "Admin settings accessible"
    }
  }
}
```

### Health Check Fields

| Field       | Type   | Description                                      |
| ----------- | ------ | ------------------------------------------------ |
| `status`    | string | Overall status: `healthy`, `warning`, `critical` |
| `timestamp` | string | Health check timestamp (ISO date)                |
| `uptime`    | number | System uptime in seconds                         |
| `version`   | string | Service version                                  |
| `checks`    | object | Individual health checks                         |

### Individual Check Status

Each check in the `checks` object has:

| Field          | Type   | Description                                    |
| -------------- | ------ | ---------------------------------------------- |
| `status`       | string | Check status: `healthy`, `warning`, `critical` |
| `responseTime` | number | Response time in milliseconds (if applicable)  |
| `message`      | string | Human-readable status message                  |
| `usage`        | object | Resource usage information (if applicable)     |

## Admin Setting

Returned by admin settings endpoints:

```json
{
  "key": "password_policy",
  "value": {
    "minLength": 8,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSpecialChars": false
  },
  "type": "object",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### Admin Setting Fields

| Field       | Type   | Description                                                   |
| ----------- | ------ | ------------------------------------------------------------- |
| `key`       | string | Setting identifier                                            |
| `value`     | any    | Setting value (can be string, number, boolean, object, array) |
| `type`      | string | Value type: `string`, `number`, `boolean`, `object`, `array`  |
| `createdAt` | string | Setting creation timestamp (ISO date)                         |
| `updatedAt` | string | Last update timestamp (ISO date)                              |

## OAuth Provider Information

Available OAuth providers and their configuration:

```json
{
  "providers": ["google", "github", "linkedin"],
  "configuration": {
    "google": {
      "enabled": true,
      "clientId": "google-client-id",
      "scopes": ["openid", "email", "profile"]
    },
    "github": {
      "enabled": true,
      "clientId": "github-client-id",
      "scopes": ["user:email", "read:user"]
    },
    "linkedin": {
      "enabled": true,
      "clientId": "linkedin-client-id",
      "scopes": ["r_emailaddress", "r_liteprofile"]
    }
  }
}
```

## Error Response

All errors return a consistent format:

```json
{
  "error": "Error message describing what went wrong",
  "details": "Additional details or validation information",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

### Error Field Descriptions

| Field       | Type   | Description                            |
| ----------- | ------ | -------------------------------------- |
| `error`     | string | Human-readable error message           |
| `details`   | string | Additional error details (optional)    |
| `code`      | string | Machine-readable error code (optional) |
| `timestamp` | string | Error timestamp (ISO date)             |

### Common Error Codes

| Code                       | Description                      |
| -------------------------- | -------------------------------- |
| `VALIDATION_ERROR`         | Request validation failed        |
| `AUTHENTICATION_REQUIRED`  | Authentication token required    |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions  |
| `USER_NOT_FOUND`           | User does not exist              |
| `EMAIL_ALREADY_EXISTS`     | Email address already in use     |
| `INVALID_CREDENTIALS`      | Invalid login credentials        |
| `ACCOUNT_LOCKED`           | Account is temporarily locked    |
| `TOKEN_EXPIRED`            | Authentication token has expired |
| `RATE_LIMIT_EXCEEDED`      | Too many requests                |
| `OAUTH_ERROR`              | OAuth authentication failed      |

## Validation Schemas

### User Registration

```json
{
  "firstName": {
    "type": "string",
    "minLength": 1,
    "maxLength": 100,
    "required": true
  },
  "lastName": {
    "type": "string",
    "minLength": 1,
    "maxLength": 100,
    "required": true
  },
  "email": {
    "type": "string",
    "format": "email",
    "maxLength": 255,
    "required": true
  },
  "password": {
    "type": "string",
    "minLength": 8,
    "maxLength": 128,
    "required": true,
    "pattern": "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$"
  }
}
```

### User Login

```json
{
  "email": {
    "type": "string",
    "format": "email",
    "required": true
  },
  "password": {
    "type": "string",
    "required": true
  }
}
```

### Password Change

```json
{
  "currentPassword": {
    "type": "string",
    "required": true
  },
  "newPassword": {
    "type": "string",
    "minLength": 8,
    "maxLength": 128,
    "required": true,
    "pattern": "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$"
  }
}
```

## Field Formats

### Date/Time Format

All timestamps use ISO 8601 format with UTC timezone:

```
2025-01-01T10:00:00.000Z
```

### Email Format

Standard email format validation:

```
user@example.com
```

### Password Requirements

Default password policy (configurable via admin settings):

- Minimum 8 characters
- At least one lowercase letter (a-z)
- At least one uppercase letter (A-Z)
- At least one number (0-9)
- Special characters optional (configurable)

### User ID Format

User IDs are generated as:

```
user-[random-string]
```

Example: `user-abc123def456`

### Token Formats

- **Access Token**: JWT format (3 base64 segments separated by dots)
- **Refresh Token**: JWT format
- **Verification Token**: Random string (32-64 characters)

Example JWT structure:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoiam9obkBleGFtcGxlLmNvbSIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNjM1NzI0ODAwLCJleHAiOjE2MzU3MjU3MDB9.signature
```

Decoded payload example:

```json
{
  "sub": "user-123",
  "email": "john@example.com",
  "role": "student",
  "iat": 1635724800,
  "exp": 1635725700
}
```
