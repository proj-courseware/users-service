# Authentication Service - User Documentation

Welcome to the Authentication Service user documentation. This service provides comprehensive user identity management, authentication, and authorization capabilities.

## Quick Start

New to the Authentication Service? Start here:

📚 **[Getting Started Guide](./getting-started.md)** - Quick integration and basic usage

## Documentation Index

### Core Documentation

🔧 **[API Reference](./api-reference.md)** - Complete endpoint documentation with examples  
🔐 **[Authentication Guide](./authentication-guide.md)** - Auth flows, token management, and OAuth  
📊 **[Data Models](./data-models.md)** - Schema definitions and response formats

### Integration Resources

💻 **[Integration Examples](./integration-examples.md)** - Code samples for different frameworks  
❌ **[Error Handling](./error-handling.md)** - Error codes, troubleshooting, and best practices  
⚡ **[Real-time Events](./realtime-events.md)** - Server-Sent Events documentation

### Security & Best Practices

🔒 **[Security Guide](./security-guide.md)** - Security features and implementation best practices

---

## Service Overview

**Base URLs:**

- Development: `http://localhost:3000`
- Production: `https://your-domain.com`
- Testing: `https://test.your-domain.com`

**Key Features:**

- Email/password and OAuth authentication (Google, GitHub, LinkedIn)
- JWT token-based authentication with refresh tokens
- Progressive account lockout and rate limiting
- Real-time event streaming via Server-Sent Events
- Administrative user management
- Multi-email support with verification
- Role-based access control (Admin, Teacher, Student)

**Quick Integration Example:**

```bash
curl -X POST https://your-domain.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'
```

## Need Help?

For specific topics, see the individual documentation files above. Each guide includes:

- Detailed explanations
- Code examples
- Best practices
- Troubleshooting tips

**Most Common Needs:**

- First time integration → [Getting Started](./getting-started.md)
- Endpoint reference → [API Reference](./api-reference.md)
- Framework examples → [Integration Examples](./integration-examples.md)
- Error troubleshooting → [Error Handling](./error-handling.md)

---

For comprehensive implementation details, examples, and advanced topics, please refer to the individual documentation files linked above. Each guide provides detailed explanations, complete code examples, and best practices for successful integration.
