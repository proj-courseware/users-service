# Technical Context

## Technology Stack

### Core Technologies

- **Runtime**: Node.js (v24+)
- **Language**: TypeScript (v5.8+) with strict type checking
- **Framework**: Hono.js (v4.7+) - Modern, lightweight web framework
- **Database**: MongoDB - Document-based NoSQL database for user data
- **Package Manager**: pnpm (preferred for performance and disk efficiency)
- **Module System**: ES Modules (`"type": "module"` in package.json)

### Development Tools

- **Build Tool**: Tsup (production builds) + tsx (development with hot reload)
- **Linter**: ESLint v9 with TypeScript ESLint plugin
- **Formatter**: Prettier with ESLint integration
- **Testing**: Vitest with coverage reporting and UI
- **Type Checking**: TypeScript compiler with strict settings

### Validation and Schemas

- **Schema Validation**: Zod (v3.25+) for runtime validation and type inference
- **Environment Variables**: Zod-validated environment configuration
- **Request/Response**: Schema-first API design with automatic type generation

### Development Environment

- **Editor**: VS Code with recommended extensions
- **Containerization**: Docker with development containers support
- **Debugging**: VS Code debugger with source map support
- **Hot Reload**: tsx watch for instant development feedback

## Development Setup

### Prerequisites

- Node.js v24+ (Bullseye slim in Docker)
- pnpm package manager
- MongoDB instance (local or cloud)
- Docker and Docker Compose (for containerized development)
- VS Code with Remote Containers extension (recommended)

### Environment Configuration

- **Environment Files**: `.env` (local), `.env.example` (template)
- **Validation**: All environment variables validated with Zod schemas in `src/env.ts`
- **Type Safety**: Environment variables are typed and validated at startup

## Testing Infrastructure and Current Issues

### Testing Framework Stack

- **Test Runner**: Vitest with coverage reporting and UI
- **Test Types**: Unit tests, integration tests, repository tests
- **Mocking**: Vitest mocks for services and external dependencies
- **Coverage**: Istanbul-based coverage reporting

### Current Testing Status ⚠️

**Date**: July 17, 2025
**Status**: 🚨 **CRITICAL ISSUES** - 29 failing tests block deployment

#### Test Suite Health
- 🔴 **Failing Tests**: 29 tests across multiple critical components
- 🟡 **Coverage Gaps**: 12 source files without tests (24% missing coverage)
- 🟢 **Passing Tests**: Core user controller (21/21) and some authentication flows

#### Critical Test Failures by Component

**Authentication Service** (8 failures):
- Issue: Password validation errors due to `undefined.join()` calls
- Root Cause: Error handling in password validation service
- Impact: Core authentication functionality testing compromised

**Auth Middleware** (3 failures):
- Issue: Missing `getUserFromToken` method in authentication service
- Root Cause: Interface mismatch between middleware and service
- Impact: Authentication middleware cannot function properly

**OAuth Controller** (5 failures):
- Issue: OAuth account unlink returning 500 instead of expected status codes
- Root Cause: Error handling in OAuth unlink functionality
- Impact: Social login features may be broken

**Progressive Lockout Middleware** (4 failures):
- Issue: Missing refresh token repository methods
- Root Cause: Interface dependency not properly implemented
- Impact: Account security features not working

**Schema and Configuration** (9 failures):
- Issues: Import path issues, console mock problems, validation errors
- Root Cause: Test setup and configuration issues
- Impact: Development workflow and schema validation affected

#### Missing Test Coverage

**Files without tests** (12 files):
- `src/config/mongodb.setup.ts` - Database configuration
- `src/errors.ts` - Error handling definitions
- `src/server.ts` - Server startup and configuration
- `src/routes/*.ts` - All router files (5 files)
- `src/repositories/*.ts` - Repository interface files (3 files)
- `src/schemas/app-env.schema.ts` - Environment schema
- `src/schemas/oauth.schema.ts` - OAuth schema definitions

### Technical Debt Analysis

#### Test Infrastructure Issues
- **Structural Problems**: Test file organization doesn't match src directory
- **Mock Implementations**: Incomplete mocking in several test files
- **Setup/Teardown**: Some tests lack proper cleanup procedures
- **Integration Issues**: Services not properly mocked in controller tests

#### Quality Indicators
- **Test Reliability**: 29 failures indicate test suite instability
- **Coverage Gaps**: 24% of source files without tests
- **Maintenance**: Test failures suggest maintenance debt
- **CI/CD Impact**: Failing tests block deployment pipeline

### Testing Recovery Plan

**Phase 1 - Critical Fixes** (2-3 days):
- Fix authentication service password validation errors
- Add missing getUserFromToken method to authentication service
- Fix OAuth controller error handling
- Implement missing refresh token repository methods
- Fix import path issues in schema tests

**Phase 2 - Coverage Restoration** (3-4 days):
- Add tests for 12 missing source files
- Achieve 90%+ test coverage target
- Implement comprehensive error scenario testing

**Phase 3 - Quality Enhancement** (1-2 days):
- Reorganize test structure to match src directory
- Improve mock implementations and test utilities
- Add integration and end-to-end testing

### Best Practices for Testing Recovery

#### Test Organization
- Mirror src directory structure in tests
- Use descriptive test file names
- Group related tests in describe blocks
- Follow AAA pattern (Arrange, Act, Assert)

#### Mock Strategy
- Use interface-based mocking for dependencies
- Mock external services and databases
- Create reusable mock factories
- Maintain mock consistency across tests

#### Error Scenario Testing
- Test happy path and error conditions
- Validate error types and messages
- Test edge cases and boundary conditions
- Ensure proper error propagation

### Key Environment Variables

```bash
# Application
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=auth-service
MONGODB_USER=admin
MONGODB_PASSWORD=admin

# JWT Configuration
JWT_ACCESS_SECRET=your-access-token-secret
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_ACCESS_EXPIRY_MINUTES=15
JWT_REFRESH_EXPIRY_DAYS=7

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Social Login Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Frontend Configuration
FRONTEND_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3001,http://localhost:3000

# Security Configuration
PASSWORD_HASH_ROUNDS=12
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Build and Deployment

### Development Build

- **Command**: `pnpm dev`
- **Process**: tsx watch for hot reload development
- **Features**: Hot reload, source maps, TypeScript compilation on-the-fly

### Production Build

- **Command**: `pnpm build`
- **Tool**: Tsup with optimized configuration
- **Output**: `dist/` directory with compiled JavaScript
- **Optimization**: Tree shaking, minification, source maps

### Docker Configuration

#### Development Container

- **Base Image**: `node:24-bullseye-slim`
- **Features**: Volume mounting for live code changes, pnpm installation
- **VS Code Integration**: `.devcontainer/devcontainer.json` for seamless development

#### Production Container

- **Multi-stage Build**: Separate build and runtime stages
- **Optimization**: Minimal final image size, production dependencies only
- **Security**: Non-root user execution

## Testing Infrastructure

### Testing Framework

- **Primary**: Vitest (Jest-compatible API with better TypeScript support)
- **Coverage**: V8 coverage provider with HTML reports
- **UI**: Vitest UI for interactive test running
- **Watch Mode**: Automatic test re-running on file changes

### Testing Strategy

- **Unit Tests**: Each layer tested in isolation with mocked dependencies
- **Integration Tests**: Full authentication flow testing
- **Coverage Target**: 90%+ code coverage
- **Mock Strategy**: Vi.mock for modules, manual mocks for repositories and external services

### Test Organization

```plaintext
tests/
├── controllers/     # Controller layer tests
├── services/        # Service layer tests (authentication, password, JWT)
├── repositories/    # Repository layer tests
├── middlewares/     # Middleware tests (auth, rate limiting)
├── routes/          # Route configuration tests
└── schemas/         # Schema validation tests
```

## Code Quality Tools

### ESLint Configuration

- **Version**: ESLint v9 with flat config
- **Plugins**: TypeScript ESLint, Prettier integration
- **Rules**: Strict TypeScript rules, consistent code style
- **Integration**: VS Code extension for real-time feedback

### Prettier Configuration

- **Format on Save**: Automatic code formatting
- **Integration**: ESLint plugin for conflict resolution
- **Configuration**: `prettier.config.json` for project-wide settings

### TypeScript Configuration

- **Strict Mode**: All strict flags enabled
- **Path Mapping**: `@/*` alias for `src/*` imports
- **Target**: ES2022 for modern JavaScript features
- **Module Resolution**: Node.js resolution with ES modules

## External Dependencies

### Production Dependencies

- **@hono/node-server**: Node.js adapter for Hono.js
- **dotenv**: Environment variable loading
- **hono**: Core web framework
- **mongodb**: MongoDB driver for database operations
- **uuid**: UUID generation for user IDs
- **zod**: Schema validation and type inference

#### Authentication Dependencies

- **argon2**: Password hashing with Argon2id algorithm
- **jsonwebtoken**: JWT token generation and verification
- **nodemailer**: Email sending for verification and password reset
- **crypto**: Built-in cryptographic functions for token generation

#### Social Login Dependencies

- **axios**: HTTP client for OAuth provider communication
- **querystring**: URL query string parsing for OAuth flows

### Development Dependencies

- **@types/node**: Node.js type definitions
- **@types/jsonwebtoken**: JWT type definitions
- **@vitest/coverage-v8**: Test coverage reporting
- **eslint**: Code linting
- **prettier**: Code formatting
- **tsup**: Build tool for TypeScript
- **tsx**: TypeScript execution with hot reload
- **typescript**: TypeScript compiler
- **vitest**: Testing framework

## Authentication Architecture

### MongoDB Integration

- **Connection Management**: Singleton pattern with graceful shutdown
- **Document Modeling**: Native MongoDB documents with Zod validation
- **Indexing Strategy**: Optimized indexes for authentication queries
- **Data Mapping**: Clear separation between database documents and domain models

### JWT Token Management

- **Access Tokens**: Short-lived (15 minutes) for API authorization
- **Refresh Tokens**: Long-lived (7 days) stored hashed in database
- **Token Rotation**: Refresh tokens rotated on each refresh for security
- **Signing Algorithm**: Configurable (HS256/RS256/ES256) with secure key management

### Password Security

- **Hashing Algorithm**: Argon2id with configurable parameters
- **Salt Generation**: Automatic salt generation per password
- **Password Policies**: Configurable strength requirements
- **Secure Comparison**: Constant-time comparison to prevent timing attacks

### Email Services

- **SMTP Integration**: Configurable SMTP server for email sending
- **Template System**: HTML email templates for verification and password reset
- **Email Verification**: Token-based email verification with expiry
- **Rate Limiting**: Email sending rate limits to prevent abuse

## Development Workflow

### Local Development

1. **Setup**: Copy `.env.example` to `.env` and configure variables
2. **Install**: `pnpm install`
3. **Database**: Start MongoDB instance (local or Docker)
4. **Start**: `pnpm dev` (starts development server)
5. **Test**: `pnpm test` or `pnpm test:watch`

### Docker Development

1. **Container**: VS Code "Reopen in Container"
2. **Auto-setup**: Dependencies installed automatically
3. **Port Forwarding**: Automatic port mapping for services
4. **Volume Mounting**: Live code changes reflected in container

### Code Quality Workflow

1. **Pre-commit**: ESLint and Prettier checks
2. **Testing**: Vitest with coverage reporting
3. **Type Checking**: TypeScript compiler validation
4. **CI/CD Ready**: All tools configured for automation

## Performance Considerations

### Framework Choice

- **Hono.js**: Lightweight, fast, modern web framework optimized for edge computing
- **TypeScript**: Compile-time optimizations and type safety
- **ES Modules**: Modern module system for better tree shaking

### Database Optimizations

- **MongoDB Indexes**: Strategic indexing for authentication queries
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Optimized queries for user lookup and authentication
- **Document Structure**: Denormalized structure for faster reads

### Build Optimizations

- **Tsup**: Fast build tool with esbuild under the hood
- **Tree Shaking**: Automatic removal of unused code
- **Source Maps**: Development debugging without performance impact

### Runtime Optimizations

- **Stateless Design**: Horizontal scaling support for authentication service
- **Minimal Dependencies**: Reduced bundle size and startup time
- **Efficient Validation**: Zod schemas for fast runtime validation
- **Caching Strategy**: Redis-ready for session and token caching

## Monitoring and Observability

### Health Checks

- **Endpoint**: `/health` for service health monitoring
- **Database Check**: MongoDB connection health verification
- **Response**: JSON status indicator with database connectivity
- **Integration**: Ready for load balancer health checks

### Error Handling

- **Global Handler**: Centralized error processing
- **Structured Logging**: Consistent error format with context
- **HTTP Status Codes**: Proper status code mapping for authentication errors
- **Security Logging**: Authentication failure and security event logging

### Development Debugging

- **VS Code Integration**: Full debugging support with breakpoints
- **Source Maps**: TypeScript debugging in development
- **Console Logging**: Structured logging for development insights
- **Authentication Debugging**: Detailed logs for authentication flow debugging

## Security Infrastructure

### Authentication Security

- **Password Hashing**: Argon2id with strong parameters
- **Token Security**: Secure JWT implementation with proper algorithms
- **Account Protection**: Account lockout and rate limiting
- **Session Management**: Secure session handling with HTTP-only cookies

### Input Validation

- **Schema Validation**: Comprehensive Zod schemas for all authentication inputs
- **Email Validation**: Proper email format and domain validation
- **Password Policies**: Configurable password strength requirements
- **Input Sanitization**: Sanitize all user inputs to prevent injection attacks

### Network Security

- **HTTPS Enforcement**: Force HTTPS in production environments
- **CORS Configuration**: Proper CORS setup for frontend integration
- **Rate Limiting**: Comprehensive rate limiting on authentication endpoints
- **Security Headers**: Appropriate security headers for authentication service

## Integration Patterns

### Frontend Integration

- **Token-Based**: JWT tokens for SPA authentication
- **Session-Based**: HTTP-only cookies for traditional web apps
- **CORS Support**: Configurable CORS for cross-origin requests
- **Error Handling**: Standardized error responses for frontend consumption

### Microservice Integration

- **Service-to-Service**: JWT token validation for other services
- **User Context**: Standardized user context for service communication
- **Authentication Delegation**: Centralized authentication for entire ecosystem
- **API Standards**: RESTful API design for easy integration

### Social Login Integration

- **OAuth2 Flows**: Proper OAuth2 implementation for social providers
- **Account Linking**: Intelligent account linking based on verified emails
- **Provider Abstraction**: Unified interface for different social providers
- **Security**: Secure OAuth flow with state validation and PKCE support

## Microservices Architecture Considerations

### Service Positioning

**Authentication Service Role**:
- **Identity Authority**: Centralized user identity management for entire ecosystem
- **Token Issuer**: Issues JWT tokens for service-to-service authentication
- **Session Manager**: Manages user sessions across multiple applications
- **Security Gateway**: Provides authentication delegation for other services

### Configuration Management

**Service Branding**:
- **Configurable Service Name**: Environment-based service naming for different deployments
- **Dynamic Email Templates**: Service name configuration for email communications
- **Multi-Tenant Support**: Ability to serve multiple applications with different branding

**Environment Variables**:
```bash
# Service Branding
SERVICE_NAME=MyApp Authentication
APP_NAME=MyApp
FRONTEND_URL=https://myapp.com

# Email Configuration
EMAIL_FROM_NAME=${SERVICE_NAME}
EMAIL_REPLY_TO=support@myapp.com
```

### Future Service Extraction

**Notifications Service Architecture**:
- **Service Separation**: Extract email/notification functionality into dedicated microservice
- **Event-Driven Communication**: Authentication events trigger notifications
- **Specialized Features**: Dedicated service for email templates, SMS, push notifications
- **Independent Scaling**: Notifications service scales based on communication volume

**Extraction Benefits**:
- **Separation of Concerns**: Authentication focuses on identity, notifications handles communications
- **Reusability**: Other services can leverage notifications service
- **Specialization**: Dedicated team can focus on communication features
- **Technology Flexibility**: Different tech stack for notifications if needed

### Service Mesh Integration

**Communication Patterns**:
- **Service Discovery**: Integration with service registry (Consul, Eureka)
- **Load Balancing**: Proper load balancing for authentication requests
- **Circuit Breakers**: Fault tolerance for service-to-service communication
- **Distributed Tracing**: Cross-service request tracing for debugging

**Security Considerations**:
- **mTLS**: Mutual TLS for service-to-service communication
- **API Gateway**: Centralized authentication and authorization
- **Rate Limiting**: Distributed rate limiting across service mesh
- **Monitoring**: Centralized logging and metrics collection

### Deployment Patterns

**Container Architecture**:
- **Docker Containers**: Containerized deployment for orchestration
- **Health Checks**: Kubernetes-compatible health endpoints
- **Graceful Shutdown**: Proper shutdown handling for zero-downtime deployments
- **Resource Management**: CPU and memory limits for production deployment

**Scalability Considerations**:
- **Horizontal Scaling**: Stateless design for horizontal scaling
- **Database Scaling**: MongoDB replica sets for read scaling
- **Caching**: Redis for session and token caching
- **CDN Integration**: Static asset delivery for email templates
