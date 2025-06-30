# Users Service

A production-ready authentication and user management service built with TypeScript and Hono.js. This service provides comprehensive user identity management, authentication, and authorization capabilities for microservices architectures.

## 🚀 Features

- **🔐 Multiple Authentication Methods**: Email/password, social login (Google, GitHub, LinkedIn), JWT tokens
- **👥 User Management**: Registration, profiles, email verification, role-based access control
- **🛡️ Enterprise Security**: Progressive account lockout, rate limiting, password policies, CSRF protection
- **📧 Email Integration**: SMTP support with professional HTML templates
- **⚡ Real-time Events**: Server-Sent Events for authentication monitoring
- **🔧 Admin Dashboard**: Complete user administration and system configuration
- **🏗️ Production Ready**: Comprehensive logging, health checks, monitoring

## 🏛️ Architecture

The service follows a **6-layer architecture** pattern for maintainability and scalability:

1. **Routes Layer**: HTTP route definitions and middleware application
2. **Controllers Layer**: HTTP request/response handling and validation
3. **Middlewares Layer**: Cross-cutting concerns (authentication, rate limiting, security)
4. **Services Layer**: Business logic and authentication orchestration
5. **Repositories Layer**: Data access abstraction (MongoDB, in-memory testing)
6. **Models/Schemas Layer**: Data structure definitions and validation (Zod schemas)

## 🛠️ Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript with strict type checking
- **Framework**: Hono.js (lightweight, modern web framework)
- **Database**: MongoDB with document-based storage
- **Validation**: Zod schemas for type-safe validation
- **Authentication**: JWT tokens + Argon2id password hashing
- **Testing**: Vitest with comprehensive coverage
- **Development**: Docker containers with VS Code integration
- **Build**: Tsup for optimized production builds

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://docs.docker.com/get-docker/) and [VS Code](https://code.visualstudio.com/) (Recommended)
- **OR** [Node.js 20+](https://nodejs.org/) and [pnpm](https://pnpm.io/)

### 1. Get Started (30 seconds)

```bash
# Clone the repository
git clone https://github.com/proj-courseware/users-service.git
cd users-service

# Setup environment
cp .env.example .env
# Edit .env with your settings (see guide below)

# Start with Docker (Recommended)
code .  # Open in VS Code
# Press Cmd+Shift+P → "Dev Containers: Rebuild and Reopen in Container"
# Then in container terminal:
pnpm install && pnpm dev

# OR start with Node.js directly
pnpm install && pnpm dev
```

### 2. Verify Setup

```bash
# Check health
curl http://localhost:3000/health

# Register first user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"SecurePass123!"}'

# Check verification email at http://localhost:8025 (MailHog)
```

**🎉 You're ready!** The API is running at `http://localhost:3000`

### 📖 Comprehensive Guides

For detailed setup instructions, see:

- **📚 [Local Development Guide](docs/guides/local-development.md)** - Complete development setup
- **⚙️ [Environment Variables Guide](docs/guides/environment-variables.md)** - Configuration details
- **🚀 [Deployment Guide](docs/guides/deployment.md)** - Production deployment

## 📋 API Documentation

### Quick Reference

| Endpoint             | Method | Description               | Auth  |
| -------------------- | ------ | ------------------------- | ----- |
| `/auth/register`     | POST   | Register new user         | No    |
| `/auth/login`        | POST   | Login with email/password | No    |
| `/auth/oauth/google` | GET    | Google OAuth login        | No    |
| `/me`                | GET    | Get user profile          | Yes   |
| `/me/emails`         | POST   | Add email address         | Yes   |
| `/admin/users`       | GET    | List all users            | Admin |
| `/events`            | GET    | Real-time events (SSE)    | Yes   |

**📖 Complete API Documentation**: [docs/index.md](docs/index.md)

### Authentication Examples

```bash
# Register a new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'

# Use JWT token for authenticated requests
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/me
```

## 🏗️ Production Deployment

### Quick Deploy with Docker

```bash
# 1. Clone and configure
git clone https://github.com/proj-courseware/users-service.git
cd users-service
cp .env.example .env.production
# Edit .env.production with production settings

# 2. Deploy
docker-compose -f docker-compose.prod.yml up -d --build

# 3. Verify
curl https://your-domain.com/health
```

**📚 Full Deployment Guide**: [docs/guides/deployment.md](docs/guides/deployment.md)

### Deployment Options

- **🐳 Docker**: Recommended for scalability and consistency
- **☁️ Cloud Platforms**: AWS ECS, Vercel, Railway
- **🖥️ VPS**: Manual Node.js deployment with PM2
- **🏢 Kubernetes**: Enterprise container orchestration

## 🧪 Development & Testing

### Development Commands

```bash
# Development server with hot reload
pnpm dev

# Build for production
pnpm build
pnpm start

# Code quality
pnpm lint
pnpm lint:fix
pnpm type-check
```

### Testing

Comprehensive test suite with [Vitest](https://vitest.dev/):

```bash
# Run all tests
pnpm test

# Watch mode for development
pnpm test:watch

# Coverage report
pnpm test:coverage
# View at coverage/index.html

# Specific test files
pnpm test auth.controller.test.ts
```

**Test Coverage**: 290+ tests across all layers

- Repository Layer: 51/51 tests passing
- Service Layer: 163/163 tests passing
- Controller Layer: 95/95 tests passing

### Code Quality Standards

- **ESLint**: Zero errors and warnings
- **TypeScript**: Strict mode with full coverage
- **Prettier**: Consistent code formatting
- **Test Coverage**: 90%+ across all layers

## 🔒 Security Features

### Built-in Security

- **🔐 Password Security**: Argon2id hashing with configurable policies
- **🛡️ Account Protection**: Progressive lockout with exponential backoff
- **⚡ Rate Limiting**: Configurable per-endpoint and per-IP limits
- **🔒 JWT Security**: Short-lived access tokens with refresh rotation
- **📧 Email Verification**: Secure token-based email verification
- **🌐 CSRF Protection**: Session-based CSRF tokens
- **🔍 Input Validation**: Comprehensive Zod schema validation

### OAuth Social Login

Pre-configured OAuth providers:

- **Google**: [Setup Guide](docs/guides/google-oauth-setup.md)
- **GitHub**: [Setup Guide](docs/guides/github-oauth-setup.md)
- **LinkedIn**: [Setup Guide](docs/guides/linkedin-oauth-setup.md)

## 📊 Features & Capabilities

### Authentication & User Management

- ✅ User registration with email verification
- ✅ Password-based login with security features
- ✅ Social login (Google, GitHub, LinkedIn)
- ✅ JWT token authentication with refresh rotation
- ✅ Multi-email support per user
- ✅ Role-based access control (Admin, Teacher, Student)

### Administrative Features

- ✅ Complete user management (CRUD operations)
- ✅ System configuration via admin settings
- ✅ User search, filtering, and bulk operations
- ✅ Account management (lock/unlock, password reset)
- ✅ System statistics and health monitoring
- ✅ Password policy management

### Real-time & Integration

- ✅ Server-Sent Events for authentication monitoring
- ✅ Email service integration with professional templates
- ✅ Health checks and system monitoring
- ✅ RESTful API design with proper HTTP status codes

## 📁 Project Structure

```plaintext
users-service/
├── src/
│   ├── schemas/          # Zod schemas and TypeScript types
│   ├── repositories/     # Data access layer (MongoDB + MockDB)
│   ├── services/         # Business logic and authentication
│   ├── controllers/      # HTTP request/response handling
│   ├── middlewares/      # Security and validation middleware
│   ├── routes/           # Route definitions and mounting
│   └── errors/           # Error definitions and handling
├── tests/                # Comprehensive test suite
├── docs/                 # Documentation and guides
│   ├── guides/           # Setup and deployment guides
│   └── memory-bank/      # Architecture and patterns
├── docker/               # Docker configuration
└── scripts/              # Utility scripts
```

## 📚 Documentation

### Core Documentation

- **📖 [API Documentation](docs/index.md)** - Complete endpoint reference
- **🏗️ [Architecture Guide](docs/memory-bank/03-system-patterns.md)** - Design patterns and conventions
- **🔧 [Memory Bank](docs/memory-bank/)** - Complete project documentation

### Setup Guides

- **🚀 [Local Development](docs/guides/local-development.md)** - Development environment setup
- **⚙️ [Environment Variables](docs/guides/environment-variables.md)** - Configuration guide
- **🌐 [Deployment](docs/guides/deployment.md)** - Production deployment options
- **🔐 [OAuth Setup](docs/guides/oauth-providers-overview.md)** - Social login configuration

### Additional Guides

- **🐳 [Docker Setup](docs/guides/docker.md)** - Container development
- **📧 [Email Integration](docs/guides/email-smtp.md)** - SMTP configuration
- **⚡ [Server-Sent Events](docs/guides/server-sent-events.md)** - Real-time events
- **💻 [VS Code Setup](docs/guides/vscode.md)** - IDE configuration

## 🤝 Contributing

1. **Read the documentation** in `docs/memory-bank/` to understand the architecture
2. **Follow established patterns** documented in `docs/memory-bank/03-system-patterns.md`
3. **Write comprehensive tests** for all new functionality
4. **Update documentation** when adding new features or patterns

### Development Workflow

1. **Research Phase**: Read memory bank files for current context
2. **Implementation Phase**: Follow established architectural patterns
3. **Testing Phase**: Write comprehensive tests with full coverage
4. **Documentation Phase**: Update memory bank and guides

## 📊 Production Status

**✅ Production Ready**: Complete authentication service with enterprise-grade features

### Implementation Status

- ✅ **Core Authentication**: User registration, login, JWT tokens
- ✅ **Security Features**: Account lockout, rate limiting, password policies
- ✅ **Social Login**: Google, GitHub, LinkedIn OAuth integration
- ✅ **Admin Features**: User management, system configuration
- ✅ **Email Integration**: SMTP service with professional templates
- ✅ **Real-time Events**: Authentication event streaming
- ✅ **Testing**: 290+ tests with 90%+ coverage
- ✅ **Documentation**: Comprehensive guides and API docs

### Key Metrics

- **📈 Test Coverage**: 90%+ across all architectural layers
- **🚀 Performance**: Sub-200ms response times for auth endpoints
- **🛡️ Security**: Enterprise-grade security implementation
- **📚 Documentation**: Complete setup and deployment guides

## 💡 Need Help?

- **📖 Check the guides** in `docs/guides/` for detailed instructions
- **🔍 Review the memory bank** in `docs/memory-bank/` for architecture details
- **🧪 Look at test files** for usage examples and patterns
- **📋 Read API docs** in `docs/index.md` for endpoint details

---

**Built with ❤️ using TypeScript, Hono.js, and modern development practices**
