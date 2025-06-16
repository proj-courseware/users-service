# Project Brief

## Project Overview

This is a **Authentication Service** project that provides centralized user identity management, authentication, and authorization for a microservices ecosystem. It serves as the authentication authority for other services, handling user registration, login (password-based and social), role management, and credential issuance (sessions and tokens).

## Core Purpose

- Provide a production-ready authentication service for TypeScript backend microservices
- Demonstrate best practices for identity management and security in Node.js applications
- Include comprehensive authentication flows (password-based, social login, token-based)
- Support both session-based and stateless token-based authentication mechanisms
- Showcase proper user data modeling, email management, and role-based authorization

## Key Requirements

### Functional Requirements

- User registration with email/password and social login (Google, GitHub, LinkedIn)
- Email verification system with token-based verification
- Multiple email address management per user with primary email designation
- Password reset functionality with secure token-based flow
- Session-based authentication with HTTP-only cookies and CSRF protection
- Token-based authentication with JWT access tokens and refresh token management
- Role-based authorization system (admin, teacher, student roles)
- Social account linking based on verified email addresses
- Admin user management with CRUD operations and role assignment
- System configuration management for password policies and email patterns

### Technical Requirements

- **Language**: TypeScript with strict type checking
- **Framework**: Hono.js for HTTP handling
- **Database**: MongoDB for user data storage
- **Architecture**: Layered architecture (6 layers)
- **Testing**: Vitest with 90%+ coverage target
- **Bundling**: Tsup for production builds, tsx for development
- **Code Quality**: ESLint + Prettier
- **Containerization**: Docker with development containers support

### Security Requirements

- Secure password hashing using Argon2id or bcrypt
- JWT token security with proper signing algorithms (RS256/ES256/HS256)
- Short-lived access tokens (15-60 minutes) and longer-lived refresh tokens
- Account lockout after multiple failed login attempts
- Rate limiting on authentication endpoints
- HTTPS enforcement for all communication
- OAuth2/OIDC best practices for social login integration
- Input validation and sanitization for all user inputs

## Success Criteria

1. Secure user authentication and authorization system
2. Multiple authentication mechanisms (session + token based)
3. Social login integration with account linking
4. Comprehensive email management system
5. Admin capabilities for user and system management
6. High security standards with proper threat mitigation
7. Comprehensive test coverage (90%+)
8. Production-ready deployment configuration
9. Clear API documentation and usage examples

## Constraints

- Must use TypeScript for type safety
- MongoDB for user data persistence
- Node.js runtime environment
- Container-first deployment approach
- Stateless design for token-based authentication paths
- Secure by default with comprehensive security measures

## Current Implementation Status

The project will implement a complete User entity with authentication capabilities demonstrating all architectural layers:

- User model with Zod schemas for validation
- Repository pattern with MongoDB integration
- Service layer with business logic for authentication flows
- Controller layer for HTTP authentication endpoints
- Middleware for token validation and user context
- Routes with proper authentication flow organization

This serves as a production-ready authentication service for microservices architecture.