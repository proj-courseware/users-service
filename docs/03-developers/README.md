# Authentication Service - Developers Documentation

Welcome to the developers documentation for the Authentication Service. This section provides comprehensive guides, technical knowledge, and development workflows for building and contributing to the authentication service.

## Quick Navigation

🚀 **New developer?** Start with [Local Development Setup](./guides/local-development.md)  
🔧 **Need to configure something?** Check [Environment Variables Guide](./guides/environment-variables.md)

## Documentation Structure

### Development Guides (Process & "How To")

🚀 **[Local Development Setup](./guides/local-development.md)** - Complete local environment setup  
**Content:** Docker setup, VS Code dev containers, database configuration, testing workflow  
**Key Features:** Quick start guide, troubleshooting, development tools setup

⚙️ **[Environment Variables](./guides/environment-variables.md)** - Comprehensive configuration guide  
**Content:** All environment variables, development/staging/production configs, security best practices  
**Key Features:** Environment-specific examples, validation patterns, common issues resolution

📝 **[TypeScript Setup](./guides/typescript.md)** - Modern TypeScript development configuration  
**Content:** TypeScript compiler setup, tsconfig.json explanation, build tools integration  
**Key Features:** Modern tooling (tsx, tsup), multiple config files, best practices

🛠️ **[VS Code Configuration](./guides/vscode.md)** - IDE setup and optimization  
**Content:** Extensions, debugging setup, workspace configuration, productivity tips  
**Key Features:** Dev container integration, debugging configuration, recommended workflow

### Technical Knowledge (Technology & "How It Works")

🐳 **[Docker Guide](./knowledge/docker.md)** - Complete containerization education  
**Content:** Docker fundamentals, multi-stage builds, development vs production containers  
**Key Features:** Dockerfile explanation, docker-compose patterns, service integration guidelines

📧 **[Email & SMTP](./knowledge/email-smtp.md)** - Email system development guide  
**Content:** Why authentication needs email, SMTP vs Mailpit, production email setup  
**Key Features:** Development testing with Mailpit, production security, email templates

⚡ **[Server-Sent Events](./knowledge/server-sent-events.md)** - Real-time events implementation  
**Content:** SSE architecture, event-driven design, client-server communication patterns  
**Key Features:** Complete SSE implementation guide, authorization integration, testing strategies

### Sprint Documentation (Development Planning)

📋 **[Sprints Overview](./sprints/)** - Development sprint documentation  
**Structure:** Each sprint contains requirements.md, design.md, and tasks.md files  
**Coverage:** 6 completed sprints + 1 planned future sprint

**Sprint Progression:**

1. ✅ **[Core Foundation](./sprints/sprint-01-core-foundation/)** - Basic authentication architecture
2. ✅ **[Security Protection](./sprints/sprint-02-security-protection/)** - Security middleware and validation
3. ✅ **[User Management](./sprints/sprint-03-user-management/)** - User CRUD and profile management
4. ✅ **[OAuth Social Auth](./sprints/sprint-04-oauth-social-authentication/)** - Social login integration
5. ✅ **[Administrative Features](./sprints/sprint-05-administrative-features/)** - Admin functionality
6. ✅ **[Events & Monitoring](./sprints/sprint-06-events-monitoring/)** - Real-time events system
7. 📋 **[Multi-Mode Auth](./sprints/sprint-07-multi-mode-auth/)** - Enhanced authentication modes (Planned)

---

## Documentation Overview

### Target Audience

This documentation serves:

- **Full-Stack Developers** - Building applications that integrate with the auth service
- **Backend Engineers** - Contributing to the authentication service codebase
- **Frontend Developers** - Implementing authentication flows in client applications
- **DevOps Engineers** - Setting up development and testing environments
- **Technical Team Leads** - Understanding architecture and development processes

### Development Philosophy

**🎯 Developer Experience First:**

- **Simple Setup** - Get running in minutes with Docker dev containers
- **Comprehensive Guides** - No guessing about configuration or setup
- **Educational Content** - Understand the 'why' behind technical decisions
- **Practical Examples** - Real code samples and working configurations

### Technology Stack Understanding

**🏗️ Core Technologies Covered:**

- **TypeScript** - Modern type-safe development with strict configuration
- **Docker** - Containerized development and production deployment
- **Node.js & Hono.js** - Runtime and web framework fundamentals
- **MongoDB** - Database integration and data modeling patterns
- **SMTP/Email** - Email service integration and testing strategies
- **Server-Sent Events** - Real-time communication implementation

---

## Quick Reference

### Essential Development Commands

```bash
# Environment Setup
cp docker/.env.example docker/.env     # Copy environment template
code .                                  # Open in VS Code
# Choose: "Rebuild and Reopen in Container"

# Development Workflow
pnpm install                           # Install dependencies
pnpm dev                              # Start development server
pnpm test                             # Run test suite
pnpm test:watch                       # Watch mode testing

# Code Quality
pnpm lint                             # ESLint checking
pnpm lint:fix                         # Auto-fix linting issues
pnpm type-check                       # TypeScript validation
pnpm build                            # Production build

# Docker Operations
pnpm docker:dev                       # Start development environment
pnpm docker:dev:down                  # Stop development environment
pnpm docker:prod                      # Start production environment
pnpm docker:prod:down                 # Stop production environment
# Or manually:
docker compose -f docker/docker-compose.dev.yml up
docker compose -f docker/docker-compose.dev.yml down
```

### Key Development URLs

```bash
# Application
http://localhost:3000                 # API server
http://localhost:3000/health         # Health check

# Development Tools
http://localhost:8025                 # Mailpit (email testing)
mongodb://localhost:27017             # MongoDB connection
```

### Critical Environment Variables

```bash
# Core Application
NODE_ENV=development
PORT=3000

# Database
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=users-service

# JWT Security
JWT_ACCESS_SECRET=your-secure-secret
JWT_REFRESH_SECRET=your-secure-secret

# Email Testing (Mailpit)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
```

### Development Workflow Checklist

- [ ] Environment variables configured in `docker/.env`
- [ ] Docker containers running (`pnpm docker:dev`)
- [ ] Application starts successfully (`pnpm dev`)
- [ ] Database connection established
- [ ] Email testing working (Mailpit at localhost:8025)
- [ ] Tests passing (`pnpm test`)
- [ ] Code quality checks passing (`pnpm lint`, `pnpm type-check`)

---

## Integration with Other Documentation

### Related Documentation Sections

**🔗 For Production Deployment:**  
See [Maintainers Documentation](../04-maintainers/) for:

- Production deployment strategies
- OAuth provider setup (Google, GitHub, LinkedIn)
- Infrastructure and scaling considerations

**🔗 For API Integration:**  
See [Users Documentation](../05-users/) for:

- Complete API reference and endpoint documentation
- Client-side integration examples and patterns
- Authentication flows and security best practices

**🔗 For Architecture Understanding:**  
See Project Memory Bank for:

- System architecture and design patterns
- Business requirements and implementation phases
- Technical decisions and architectural context

### Cross-Referencing Strategy

**Environment Variables ↔ OAuth Setup:**

- Developer environment variables guide references maintainer OAuth setup guides
- OAuth setup guides reference developer configuration patterns

**Local Development ↔ Production Deployment:**

- Development setup prepares for production deployment concepts
- Production guides build upon development environment understanding

**Technical Knowledge ↔ API Usage:**

- Server-Sent Events guide shows implementation details
- Users documentation shows client-side SSE integration

---

## Getting Started Path

### For New Team Members

1. **📖 Start Here**: Read this README for overview and navigation
2. **🚀 Environment Setup**: Follow [Local Development Guide](./guides/local-development.md)
3. **⚙️ Configuration**: Configure with [Environment Variables Guide](./guides/environment-variables.md)
4. **🧪 Test Integration**: Verify setup works with provided test commands
5. **📚 Deep Dive**: Explore knowledge sections for technical understanding

### For Specific Tasks

**Setting up local development →** [Local Development Setup](./guides/local-development.md)  
**Configuring OAuth providers →** [Environment Variables](./guides/environment-variables.md) + [OAuth Setup Guides](../04-maintainers/)  
**Understanding Docker setup →** [Docker Guide](./knowledge/docker.md)  
**Implementing real-time features →** [Server-Sent Events](./knowledge/server-sent-events.md)  
**Email functionality development →** [Email & SMTP Guide](./knowledge/email-smtp.md)  
**TypeScript configuration →** [TypeScript Setup](./guides/typescript.md)

### For Architecture Understanding

**📋 Sprint Documentation:** Review sprint files to understand development progression and architectural decisions  
**🏗️ Technical Knowledge:** Read knowledge guides to understand implementation patterns and technology choices  
**🔗 Memory Bank:** Consult project memory bank for business context and architectural vision

---

## Support and Contribution

### Getting Help

- **Setup Issues**: Check troubleshooting sections in setup guides
- **Configuration Problems**: Review environment variables guide
- **Technical Questions**: Consult relevant knowledge documentation
- **Sprint Context**: Review sprint documentation for historical context

### Contributing Guidelines

**Git Workflow:**

1. Fork the repository and create your branch from `master`
2. Make your changes
3. Open a pull request and describe your changes

**Development Standards:**

- **Code Quality**: Follow established ESLint and TypeScript configurations
- **Testing**: Maintain test coverage for all new features
- **Documentation**: Update relevant guides when making changes
- **Focused Changes**: Keep contributions minimal and focused
- **Sprint Planning**: Use established sprint documentation patterns

### Development Standards

- **TypeScript Strict Mode**: All code must pass strict type checking
- **Test Coverage**: Comprehensive testing required for services and controllers
- **Environment Separation**: Clear development/staging/production configurations
- **Security First**: Follow established security patterns and best practices

---

Each guide in this section provides detailed explanations, practical examples, and best practices for successful development with the Authentication Service. The documentation emphasizes both immediate productivity and deep technical understanding.

**Next Steps:**

- Set up your development environment with the [Local Development Guide](./guides/local-development.md)
- Explore the technical foundations with our [Knowledge Guides](./knowledge/)
- Review development history and architecture decisions in [Sprint Documentation](./sprints/)
