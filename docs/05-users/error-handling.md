# Error Handling

This document covers error responses, status codes, and troubleshooting for the Authentication Service.

## Error Response Format

All errors return a consistent JSON format:

```json
{
  "error": "Error message describing what went wrong",
  "details": "Additional details or validation information",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

## HTTP Status Codes

### Success Codes

| Code | Status  | Description                   |
| ---- | ------- | ----------------------------- |
| 200  | OK      | Request successful            |
| 201  | Created | Resource created successfully |

### Client Error Codes

| Code | Status            | Description                                    |
| ---- | ----------------- | ---------------------------------------------- |
| 400  | Bad Request       | Invalid request data or validation error       |
| 401  | Unauthorized      | Authentication required or invalid credentials |
| 403  | Forbidden         | Access denied (insufficient permissions)       |
| 404  | Not Found         | Resource not found                             |
| 409  | Conflict          | Resource already exists or conflict            |
| 429  | Too Many Requests | Rate limit exceeded                            |

### Server Error Codes

| Code | Status                | Description                     |
| ---- | --------------------- | ------------------------------- |
| 500  | Internal Server Error | Unexpected server error         |
| 503  | Service Unavailable   | Service temporarily unavailable |

## Common Error Scenarios

### Authentication Errors

#### 400 Bad Request - Validation Error

```json
{
  "error": "Validation failed",
  "details": "Password must be at least 8 characters and contain uppercase, lowercase, and numbers",
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

**Common causes:**

- Invalid email format
- Password doesn't meet requirements
- Missing required fields
- Invalid data types

#### 401 Unauthorized - Authentication Required

```json
{
  "error": "Authentication required",
  "details": "Please provide a valid access token",
  "code": "AUTHENTICATION_REQUIRED",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

**Common causes:**

- Missing Authorization header
- Invalid or expired access token
- Malformed Bearer token

#### 401 Unauthorized - Invalid Credentials

```json
{
  "error": "Invalid email or password",
  "details": "Please check your credentials and try again",
  "code": "INVALID_CREDENTIALS",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

#### 401 Unauthorized - Token Expired

```json
{
  "error": "Access token has expired",
  "details": "Use refresh token to obtain a new access token",
  "code": "TOKEN_EXPIRED",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

### Permission Errors

#### 403 Forbidden - Insufficient Permissions

```json
{
  "error": "Access forbidden",
  "details": "Admin role required for this operation",
  "code": "INSUFFICIENT_PERMISSIONS",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

### Resource Errors

#### 404 Not Found - User Not Found

```json
{
  "error": "User not found",
  "details": "No user found with the specified ID",
  "code": "USER_NOT_FOUND",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

#### 409 Conflict - Email Already Exists

```json
{
  "error": "A user with this email already exists",
  "details": "Please use a different email address or try logging in",
  "code": "EMAIL_ALREADY_EXISTS",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

### Security Errors

#### 401 Unauthorized - Account Locked

```json
{
  "error": "Account is temporarily locked",
  "details": "Too many failed login attempts. Try again in 5 minutes.",
  "code": "ACCOUNT_LOCKED",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

#### 429 Too Many Requests - Rate Limited

```json
{
  "error": "Too many requests",
  "details": "Please wait before making another request",
  "code": "RATE_LIMIT_EXCEEDED",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

### OAuth Errors

#### 400 Bad Request - OAuth Error

```json
{
  "error": "OAuth authentication failed",
  "details": "Invalid or expired authorization code",
  "code": "OAUTH_ERROR",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

## Error Handling Best Practices

### Client-Side Error Handling

```javascript
async function handleApiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, options);

    if (!response.ok) {
      const errorData = await response.json();

      switch (response.status) {
        case 400:
          throw new ValidationError(errorData.error, errorData.details);
        case 401:
          handleAuthError(errorData);
          throw new AuthError(errorData.error);
        case 403:
          throw new PermissionError(errorData.error);
        case 404:
          throw new NotFoundError(errorData.error);
        case 409:
          throw new ConflictError(errorData.error);
        case 429:
          throw new RateLimitError(errorData.error, errorData.details);
        case 500:
          throw new ServerError("Internal server error");
        default:
          throw new ApiError(errorData.error || "Unknown error occurred");
      }
    }

    return await response.json();
  } catch (error) {
    console.error("API call failed:", error);
    throw error;
  }
}

// Handle authentication errors
function handleAuthError(errorData) {
  if (errorData.code === "TOKEN_EXPIRED") {
    // Try to refresh token
    attemptTokenRefresh();
  } else if (errorData.code === "ACCOUNT_LOCKED") {
    // Show lockout message
    showLockoutMessage(errorData.details);
  } else {
    // Redirect to login
    redirectToLogin();
  }
}

// Handle rate limiting
function handleRateLimit(response, errorData) {
  const resetTime = response.headers.get("X-RateLimit-Reset");
  const retryAfter = response.headers.get("Retry-After");

  if (resetTime) {
    const waitTime = resetTime * 1000 - Date.now();
    console.log(`Rate limited. Retry after ${waitTime}ms`);

    // Schedule retry
    setTimeout(() => {
      // Retry the request
    }, waitTime);
  }
}
```

### Custom Error Classes

```javascript
// Custom error classes for better error handling
class ApiError extends Error {
  constructor(message, code = null, details = null) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

class ValidationError extends ApiError {
  constructor(message, details) {
    super(message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

class AuthError extends ApiError {
  constructor(message, code = "AUTH_ERROR") {
    super(message, code);
    this.name = "AuthError";
  }
}

class PermissionError extends ApiError {
  constructor(message) {
    super(message, "PERMISSION_ERROR");
    this.name = "PermissionError";
  }
}

class RateLimitError extends ApiError {
  constructor(message, retryAfter = null) {
    super(message, "RATE_LIMIT_ERROR");
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

class ConflictError extends ApiError {
  constructor(message) {
    super(message, "CONFLICT_ERROR");
    this.name = "ConflictError";
  }
}

class NotFoundError extends ApiError {
  constructor(message) {
    super(message, "NOT_FOUND_ERROR");
    this.name = "NotFoundError";
  }
}

class ServerError extends ApiError {
  constructor(message) {
    super(message, "SERVER_ERROR");
    this.name = "ServerError";
  }
}
```

### Retry Logic with Exponential Backoff

```javascript
class RetryClient {
  constructor(baseURL, maxRetries = 3) {
    this.baseURL = baseURL;
    this.maxRetries = maxRetries;
  }

  async request(endpoint, options = {}, retryCount = 0) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, options);

      if (!response.ok) {
        const errorData = await response.json();

        // Check if we should retry
        if (this.shouldRetry(response.status) && retryCount < this.maxRetries) {
          const delay = this.calculateDelay(retryCount);
          console.log(
            `Retrying request in ${delay}ms (attempt ${retryCount + 1})`,
          );

          await this.wait(delay);
          return this.request(endpoint, options, retryCount + 1);
        }

        throw new ApiError(errorData.error, errorData.code, errorData.details);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Network error - retry if attempts remaining
      if (retryCount < this.maxRetries) {
        const delay = this.calculateDelay(retryCount);
        console.log(`Network error, retrying in ${delay}ms`);

        await this.wait(delay);
        return this.request(endpoint, options, retryCount + 1);
      }

      throw new ServerError("Network error");
    }
  }

  shouldRetry(status) {
    // Retry on server errors and rate limits
    return status >= 500 || status === 429;
  }

  calculateDelay(retryCount) {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    return Math.min(1000 * Math.pow(2, retryCount), 30000);
  }

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: `401 Unauthorized` on protected endpoints

**Symptoms:**

- Getting 401 errors when calling authenticated endpoints
- "Authentication required" or "Invalid token" errors

**Solutions:**

1. **Check Authorization Header:**

   ```javascript
   // Correct format
   headers: {
     'Authorization': 'Bearer ' + accessToken
   }

   // Common mistakes
   headers: {
     'Authorization': accessToken,        // Missing 'Bearer '
     'authorization': 'Bearer ' + token,  // Wrong case
     'Auth': 'Bearer ' + token           // Wrong header name
   }
   ```

2. **Verify Token Validity:**

   ```javascript
   // Check if token exists
   const token = localStorage.getItem("accessToken");
   if (!token) {
     redirectToLogin();
     return;
   }

   // Check token expiration (if you store it)
   const tokenData = JSON.parse(atob(token.split(".")[1]));
   if (tokenData.exp * 1000 < Date.now()) {
     // Token expired, refresh it
     await refreshToken();
   }
   ```

3. **Implement Token Refresh:**

   ```javascript
   async function refreshTokenIfNeeded() {
     try {
       const response = await fetch("/auth/refresh", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           refreshToken: localStorage.getItem("refreshToken"),
         }),
       });

       if (response.ok) {
         const { tokens } = await response.json();
         localStorage.setItem("accessToken", tokens.accessToken);
         localStorage.setItem("refreshToken", tokens.refreshToken);
       } else {
         // Refresh failed, redirect to login
         redirectToLogin();
       }
     } catch (error) {
       redirectToLogin();
     }
   }
   ```

#### Issue: Email verification not working

**Symptoms:**

- Users not receiving verification emails
- Verification tokens not working
- "Invalid token" errors during verification

**Solutions:**

1. **Check Email Service Configuration:**

   - Verify SMTP settings in production
   - Check Mailpit at `http://localhost:8025` in development
   - Ensure environment variables are set correctly

2. **Verify Token Format:**

   ```javascript
   // Correct verification request
   await fetch("/auth/verify-email", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ token: verificationToken }),
   });
   ```

3. **Check Token Expiration:**

   - Verification tokens expire after 24 hours
   - Use `/auth/resend-verification` to send a new token

4. **Resend Verification:**
   ```javascript
   await fetch("/auth/resend-verification", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ email: userEmail }),
   });
   ```

#### Issue: OAuth login fails

**Symptoms:**

- Redirects to error page after OAuth
- "OAuth authentication failed" errors
- Users not being logged in after OAuth consent

**Solutions:**

1. **Check OAuth Configuration:**

   - Verify client ID and secret in environment variables
   - Ensure redirect URLs match exactly in provider settings
   - Check that OAuth provider is enabled

2. **Debug OAuth Flow:**

   ```javascript
   // Check for errors in callback URL
   const urlParams = new URLSearchParams(window.location.search);
   const error = urlParams.get("error");
   const errorDescription = urlParams.get("error_description");

   if (error) {
     console.error("OAuth Error:", error, errorDescription);
   }
   ```

3. **Verify Redirect URLs:**
   - Development: `http://localhost:3000/auth/oauth/[provider]/callback`
   - Production: `https://yourdomain.com/auth/oauth/[provider]/callback`
   - Must match exactly in OAuth provider settings

#### Issue: Rate limit errors

**Symptoms:**

- Getting 429 "Too Many Requests" errors
- Requests being blocked temporarily

**Solutions:**

1. **Check Rate Limit Headers:**

   ```javascript
   const response = await fetch(endpoint);

   console.log("Rate limit info:", {
     limit: response.headers.get("X-RateLimit-Limit"),
     remaining: response.headers.get("X-RateLimit-Remaining"),
     reset: response.headers.get("X-RateLimit-Reset"),
   });
   ```

2. **Implement Request Queuing:**

   ```javascript
   class RequestQueue {
     constructor() {
       this.queue = [];
       this.processing = false;
     }

     async add(requestFn) {
       return new Promise((resolve, reject) => {
         this.queue.push({ requestFn, resolve, reject });
         this.process();
       });
     }

     async process() {
       if (this.processing || this.queue.length === 0) return;

       this.processing = true;

       while (this.queue.length > 0) {
         const { requestFn, resolve, reject } = this.queue.shift();

         try {
           const result = await requestFn();
           resolve(result);
         } catch (error) {
           if (error.code === "RATE_LIMIT_EXCEEDED") {
             // Wait and retry
             await this.wait(60000); // Wait 1 minute
             this.queue.unshift({ requestFn, resolve, reject });
             continue;
           }
           reject(error);
         }

         // Small delay between requests
         await this.wait(100);
       }

       this.processing = false;
     }

     wait(ms) {
       return new Promise((resolve) => setTimeout(resolve, ms));
     }
   }
   ```

3. **Respect Rate Limits:**
   - Authentication endpoints: Max 5 requests per 15 minutes per IP
   - Standard endpoints: Max 100 requests per 15 minutes per IP
   - Implement client-side throttling

#### Issue: Server-Sent Events connection fails

**Symptoms:**

- EventSource connection errors
- Not receiving real-time events
- Connection dropping frequently

**Solutions:**

1. **Check Authorization:**

   ```javascript
   // EventSource doesn't support custom headers directly
   // Use query parameter for authentication
   const token = localStorage.getItem("accessToken");
   const eventSource = new EventSource(`/events?token=${token}`);

   // Or use EventSource polyfill that supports headers
   const eventSource = new EventSource("/events", {
     headers: {
       Authorization: `Bearer ${token}`,
     },
   });
   ```

2. **Implement Reconnection Logic:**

   ```javascript
   class ReconnectingEventSource {
     constructor(url, options = {}) {
       this.url = url;
       this.options = options;
       this.eventSource = null;
       this.reconnectAttempts = 0;
       this.maxReconnectAttempts = 5;
       this.connect();
     }

     connect() {
       this.eventSource = new EventSource(this.url, this.options);

       this.eventSource.onopen = () => {
         console.log("EventSource connected");
         this.reconnectAttempts = 0;
       };

       this.eventSource.onerror = (error) => {
         console.error("EventSource error:", error);
         this.handleReconnect();
       };
     }

     handleReconnect() {
       if (this.reconnectAttempts < this.maxReconnectAttempts) {
         this.reconnectAttempts++;
         const delay = Math.pow(2, this.reconnectAttempts) * 1000;

         setTimeout(() => {
           console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
           this.connect();
         }, delay);
       }
     }

     close() {
       if (this.eventSource) {
         this.eventSource.close();
       }
     }
   }
   ```

### Debugging Tips

1. **Enable Detailed Logging:**

   ```javascript
   // Add request/response logging
   const originalFetch = window.fetch;
   window.fetch = function (...args) {
     console.log("Request:", args);
     return originalFetch.apply(this, args).then((response) => {
       console.log("Response:", response.status, response.statusText);
       return response;
     });
   };
   ```

2. **Check Network Tab:**

   - Open browser DevTools → Network tab
   - Look for failed requests (red status codes)
   - Check request headers and response bodies
   - Verify correct Content-Type headers

3. **Validate JSON Payloads:**

   ```javascript
   // Ensure JSON is properly formatted
   const payload = {
     email: "user@example.com",
     password: "password123",
   };

   // This might fail silently if payload has circular references
   const body = JSON.stringify(payload);
   console.log("Request body:", body);
   ```

4. **Test with cURL:**

   ```bash
   # Test registration
   curl -X POST http://localhost:3000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"TestPass123!"}' \
     -v

   # Test authenticated endpoint
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/me \
     -v
   ```

### Getting Help

If you encounter issues not covered in this guide:

1. **Check API Health:** Use `/health` endpoint to verify service status
2. **Review Logs:** Check browser console and network requests
3. **Verify Configuration:** Ensure environment variables are correct
4. **Test with Minimal Example:** Create a simple test case
5. **Check Documentation:** Review other documentation sections
6. **Contact Support:** Include error messages, request/response details, and steps to reproduce
