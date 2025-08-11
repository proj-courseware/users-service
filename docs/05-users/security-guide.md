# Security Guide

This document covers security best practices, considerations, and built-in security features of the Authentication Service.

## Overview

The Authentication Service implements enterprise-grade security features designed to protect user accounts and prevent common attack vectors. This guide covers both the built-in security features and best practices for integrating applications.

## Built-in Security Features

### Progressive Account Lockout

The service implements intelligent account lockout to prevent brute force attacks:

**Lockout Levels:**

- **Level 0** (0-2 failed attempts): No lockout
- **Level 1** (3-5 failed attempts): 1 minute lockout
- **Level 2** (6-8 failed attempts): 5 minutes lockout
- **Level 3** (9-11 failed attempts): 15 minutes lockout
- **Level 4** (12+ failed attempts): 60 minutes lockout

**Features:**

- Automatic unlock after lockout period expires
- Progressive difficulty with increasing failed attempts
- Admin override capability for manual unlocking
- Event logging for security monitoring

### Password Security

**Argon2id Hashing:**

- Industry-standard password hashing algorithm
- Configurable work factors for performance/security balance
- Salt generation for each password
- Memory-hard function resistant to GPU attacks

**Default Password Policy:**

```javascript
{
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false  // Configurable
}
```

**Password Validation Example:**

```javascript
// Valid passwords
"SecurePass123";
"MyPassword2024!";
"Complex@Pass1";

// Invalid passwords
"password"; // No uppercase/numbers
"PASSWORD123"; // No lowercase
"MyPassword"; // No numbers
"Short1A"; // Too short
```

### JWT Token Security

**Access Token Features:**

- Short expiration time (15 minutes default)
- Signed with secure HMAC-SHA256
- Contains minimal user information
- Stateless validation

**Refresh Token Features:**

- Single-use tokens (rotate on refresh)
- Longer expiration time for convenience
- Secure storage recommended
- Automatic cleanup of expired tokens

**Token Structure:**

```javascript
// Access token payload
{
  "sub": "user-123",           // Subject (user ID)
  "email": "user@example.com", // User email
  "role": "student",           // User role
  "iat": 1635724800,          // Issued at
  "exp": 1635725700           // Expires at
}
```

### Rate Limiting

**Per-Endpoint Limits:**

- **Authentication endpoints**: 5 requests per 15 minutes per IP
- **Standard endpoints**: 100 requests per 15 minutes per IP
- **Admin endpoints**: Higher limits for administrative operations

**Rate Limit Headers:**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1635724800
```

### Input Validation and Sanitization

**Zod Schema Validation:**

- All inputs validated against strict schemas
- Type checking and format validation
- Automatic sanitization of dangerous content
- Detailed validation error messages

**Example Validation:**

```javascript
// Registration schema
const registerSchema = z.object({
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
});
```

### CSRF Protection

**Features:**

- Session-based CSRF tokens for cookie authentication
- Double-submit cookie pattern
- SameSite cookie attributes
- Token rotation on sensitive operations

### Security Headers

The service automatically applies security headers:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Authentication Best Practices

### Token Storage

**Web Applications:**

✅ **Recommended: httpOnly Cookies**

```javascript
// Server-side cookie setup
app.use(cookieParser());

// Set secure httpOnly cookie
res.cookie("accessToken", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 15 * 60 * 1000, // 15 minutes
});
```

⚠️ **Acceptable: localStorage (with caution)**

```javascript
// Only for development or when httpOnly cookies aren't possible
localStorage.setItem("accessToken", token);

// Always check for XSS vulnerabilities
// Consider token expiration and refresh logic
```

❌ **Avoid: sessionStorage or global variables**

**Mobile Applications:**

✅ **Use Secure Storage**

```javascript
// React Native with Expo SecureStore
import * as SecureStore from "expo-secure-store";

await SecureStore.setItemAsync("accessToken", token);
const token = await SecureStore.getItemAsync("accessToken");

// React Native with Keychain
import * as Keychain from "react-native-keychain";

await Keychain.setInternetCredentials("auth", "token", accessToken);
const credentials = await Keychain.getInternetCredentials("auth");
```

### Token Refresh Strategy

**Proactive Refresh:**

```javascript
class TokenManager {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.refreshTimer = null;
  }

  setTokens(tokens) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;

    // Schedule proactive refresh (80% of expiration time)
    const expiresIn = tokens.expiresIn || 900; // 15 minutes default
    const refreshIn = expiresIn * 0.8 * 1000; // 80% of expiration

    clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.refreshAccessToken();
    }, refreshIn);
  }

  async refreshAccessToken() {
    try {
      const response = await fetch("/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (response.ok) {
        const tokens = await response.json();
        this.setTokens(tokens.tokens);
        return true;
      } else {
        this.logout();
        return false;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      this.logout();
      return false;
    }
  }

  logout() {
    clearTimeout(this.refreshTimer);
    this.accessToken = null;
    this.refreshToken = null;
    // Clear storage and redirect to login
  }
}
```

### Password Management

**Strong Password Generation:**

```javascript
function generateSecurePassword(length = 16) {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";

  // Ensure at least one character from each required set
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
  password += "0123456789"[Math.floor(Math.random() * 10)];

  // Fill remaining length
  for (let i = 3; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

// Password strength validation
function validatePasswordStrength(password) {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  return {
    score,
    strength: score < 3 ? "weak" : score < 4 ? "medium" : "strong",
    checks,
  };
}
```

### Session Management

**Secure Session Handling:**

```javascript
class SessionManager {
  constructor() {
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.warningTimeout = 5 * 60 * 1000; // 5 minutes before expiry
    this.lastActivity = Date.now();
    this.warningTimer = null;
    this.logoutTimer = null;

    this.setupActivityTracking();
  }

  setupActivityTracking() {
    // Track user activity
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];

    events.forEach((event) => {
      document.addEventListener(event, () => {
        this.updateLastActivity();
      });
    });

    this.resetSessionTimers();
  }

  updateLastActivity() {
    this.lastActivity = Date.now();
    this.resetSessionTimers();
  }

  resetSessionTimers() {
    clearTimeout(this.warningTimer);
    clearTimeout(this.logoutTimer);

    // Show warning before logout
    this.warningTimer = setTimeout(() => {
      this.showSessionWarning();
    }, this.sessionTimeout - this.warningTimeout);

    // Auto logout
    this.logoutTimer = setTimeout(() => {
      this.autoLogout();
    }, this.sessionTimeout);
  }

  showSessionWarning() {
    if (confirm("Your session will expire soon. Do you want to continue?")) {
      this.extendSession();
    }
  }

  async extendSession() {
    try {
      // Ping server to extend session
      await fetch("/auth/me", {
        headers: { Authorization: `Bearer ${this.getAccessToken()}` },
      });

      this.updateLastActivity();
    } catch (error) {
      this.autoLogout();
    }
  }

  autoLogout() {
    alert("Session expired. You will be logged out.");
    // Perform logout
    this.logout();
  }
}
```

## OAuth Security

### State Parameter Validation

```javascript
// Generate cryptographically secure state parameter
function generateOAuthState() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

// Store and validate state
function initiateOAuth(provider) {
  const state = generateOAuthState();
  sessionStorage.setItem("oauth_state", state);

  window.location.href = `/auth/oauth/${provider}?state=${state}`;
}

function validateOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const returnedState = urlParams.get("state");
  const storedState = sessionStorage.getItem("oauth_state");

  if (!returnedState || returnedState !== storedState) {
    throw new Error("Invalid OAuth state parameter");
  }

  sessionStorage.removeItem("oauth_state");
  // Continue with OAuth flow
}
```

### Provider-Specific Security

**Google OAuth:**

```javascript
// Validate Google ID token (if implementing custom validation)
async function validateGoogleToken(idToken) {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
  );
  const payload = await response.json();

  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error("Invalid audience");
  }

  if (
    payload.iss !== "accounts.google.com" &&
    payload.iss !== "https://accounts.google.com"
  ) {
    throw new Error("Invalid issuer");
  }

  return payload;
}
```

## Network Security

### HTTPS Enforcement

**Production Configuration:**

```javascript
// Express.js HTTPS enforcement
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// Nginx configuration
server {
  listen 80;
  return 301 https://$server_name$request_uri;
}
```

### API Security Headers

```javascript
// Custom security middleware
function securityHeaders(req, res, next) {
  // Prevent MIME sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Enable XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Control referrer information
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy
  res.setHeader("Content-Security-Policy", "default-src 'self'");

  // HSTS (HTTPS only)
  if (req.secure) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  next();
}
```

### CORS Configuration

```javascript
// Secure CORS setup
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://yourdomain.com",
      "https://app.yourdomain.com",
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
```

## Data Protection

### Sensitive Data Handling

**Data Minimization:**

```javascript
// Remove sensitive fields before sending to client
function sanitizeUser(user) {
  const {
    passwordHash,
    passwordResetToken,
    passwordResetExpires,
    lockoutInfo,
    ...publicUser
  } = user;

  // Only include verified emails in public view
  if (publicUser.emails) {
    publicUser.emails = publicUser.emails.map((email) => ({
      address: email.address,
      isVerified: email.isVerified,
      isPrimary: email.isPrimary,
    }));
  }

  return publicUser;
}
```

### Audit Logging

**Security Event Logging:**

```javascript
function logSecurityEvent(eventType, details) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    userId: details.userId,
    ipAddress: details.ipAddress,
    userAgent: details.userAgent,
    success: details.success,
    details: details.additionalInfo,
  };

  // Log to secure audit system
  auditLogger.info("Security Event", logEntry);

  // Send to SIEM if available
  if (siemClient) {
    siemClient.sendEvent(logEntry);
  }
}

// Usage examples
logSecurityEvent("LOGIN_ATTEMPT", {
  userId: "user-123",
  ipAddress: req.ip,
  userAgent: req.get("User-Agent"),
  success: true,
});

logSecurityEvent("ACCOUNT_LOCKED", {
  userId: "user-123",
  ipAddress: req.ip,
  additionalInfo: { lockoutLevel: 2, attemptCount: 6 },
});
```

## Vulnerability Prevention

### SQL Injection Prevention

The service uses MongoDB with Mongoose ODM, which provides built-in protection against injection attacks through:

- Parameterized queries
- Input validation
- Schema enforcement

### XSS Prevention

**Input Sanitization:**

```javascript
import DOMPurify from "dompurify";

function sanitizeInput(input) {
  if (typeof input === "string") {
    return DOMPurify.sanitize(input);
  }
  return input;
}

// Apply to all user inputs
const sanitizedData = {
  firstName: sanitizeInput(req.body.firstName),
  lastName: sanitizeInput(req.body.lastName),
  // ... other fields
};
```

**Output Encoding:**

```javascript
// HTML encoding for display
function htmlEncode(str) {
  return str.replace(/[&<>"']/g, function (match) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
    };
    return map[match];
  });
}
```

### CSRF Prevention

**Double Submit Cookie Pattern:**

```javascript
// Generate CSRF token
function generateCSRFToken() {
  return crypto.randomBytes(32).toString("hex");
}

// CSRF middleware
function csrfProtection(req, res, next) {
  if (req.method === "GET") {
    // Set CSRF token for GET requests
    const token = generateCSRFToken();
    res.cookie("csrf-token", token, { sameSite: "strict" });
    res.locals.csrfToken = token;
    return next();
  }

  // Validate CSRF token for state-changing requests
  const tokenFromHeader = req.get("X-CSRF-Token");
  const tokenFromCookie = req.cookies["csrf-token"];

  if (!tokenFromHeader || tokenFromHeader !== tokenFromCookie) {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  next();
}
```

## Monitoring and Alerting

### Security Metrics

**Key Metrics to Monitor:**

- Failed login attempts per IP/user
- Account lockout frequency
- Token refresh failures
- OAuth authentication failures
- Password reset requests
- Admin privilege escalations

**Implementation:**

```javascript
class SecurityMetrics {
  constructor() {
    this.metrics = new Map();
    this.alertThresholds = {
      failedLoginsPerIP: 10,
      accountLockouts: 5,
      tokenFailures: 20,
    };
  }

  recordEvent(eventType, identifier) {
    const key = `${eventType}:${identifier}`;
    const count = this.metrics.get(key) || 0;
    this.metrics.set(key, count + 1);

    // Check for alert thresholds
    this.checkAlerts(eventType, identifier, count + 1);
  }

  checkAlerts(eventType, identifier, count) {
    const threshold = this.alertThresholds[eventType];

    if (threshold && count >= threshold) {
      this.sendAlert({
        type: eventType,
        identifier,
        count,
        timestamp: new Date(),
      });
    }
  }

  sendAlert(alert) {
    console.error("Security Alert:", alert);

    // Send to monitoring system
    if (alertingService) {
      alertingService.send(alert);
    }
  }
}
```

### Real-time Monitoring

**EventSource Security Events:**

```javascript
// Monitor security events in real-time
const eventClient = new AuthEventClient(adminToken);

eventClient.on("security:failed_login_attempt", (data) => {
  if (data.attemptNumber >= 3) {
    console.warn(`Multiple failed login attempts for ${data.email}`);
  }
});

eventClient.on("security:account_locked", (data) => {
  console.error(`Account locked: ${data.email} (Level ${data.lockoutLevel})`);

  // Notify security team if high lockout level
  if (data.lockoutLevel >= 3) {
    notifySecurityTeam(data);
  }
});
```

## Compliance Considerations

### GDPR Compliance

**Data Subject Rights:**

- Right to access (GET /me endpoint)
- Right to rectification (PUT /me endpoint)
- Right to erasure (DELETE /me endpoint)
- Data portability (export user data)

**Implementation:**

```javascript
// Data export for user
async function exportUserData(userId) {
  const user = await userRepository.findById(userId);
  const auditLogs = await getAuditLogs(userId);

  return {
    profile: sanitizeUser(user),
    loginHistory: auditLogs.filter((log) => log.eventType === "LOGIN"),
    accountChanges: auditLogs.filter((log) => log.eventType.includes("UPDATE")),
    exportDate: new Date().toISOString(),
  };
}

// Data deletion with audit trail
async function deleteUserAccount(userId, reason) {
  // Create deletion audit record
  await auditLogger.info("ACCOUNT_DELETION", {
    userId,
    reason,
    timestamp: new Date(),
  });

  // Anonymize rather than delete for audit compliance
  await userRepository.anonymizeUser(userId);
}
```

### SOC 2 Compliance

**Key Controls:**

- Access controls and authentication
- Audit logging and monitoring
- Data encryption in transit and at rest
- Incident response procedures
- Change management processes

## Security Checklist

### Development

- [ ] Use HTTPS in all environments
- [ ] Implement proper input validation
- [ ] Use parameterized queries
- [ ] Apply security headers
- [ ] Enable audit logging
- [ ] Implement rate limiting
- [ ] Use secure password hashing
- [ ] Validate OAuth state parameters

### Deployment

- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Enable database encryption
- [ ] Configure secure cookie settings
- [ ] Set up backup and recovery
- [ ] Implement log rotation
- [ ] Configure CORS properly
- [ ] Set up intrusion detection

### Ongoing Maintenance

- [ ] Regular security updates
- [ ] Monitor security metrics
- [ ] Review audit logs
- [ ] Test incident response
- [ ] Update security policies
- [ ] Conduct security assessments
- [ ] Train development team
- [ ] Review access permissions

This security guide provides a comprehensive overview of the security features and best practices. Regular security reviews and updates are essential for maintaining a secure authentication service.
