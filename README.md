# Users Service

A production-ready authentication and user management service for microservices architectures. Provides user registration, login, social OAuth, JWT tokens, role-based access control, and real-time authentication events.

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://docs.docker.com/get-docker/) and [VS Code](https://code.visualstudio.com/) - Recommended for zero-config development
- **OR** [Node.js 20+](https://nodejs.org/) and [pnpm](https://pnpm.io/) - For local development

### Get Started (30 seconds)

```bash
# Clone the repository
git clone https://github.com/proj-courseware/users-service.git
cd users-service

# Setup environment
cp .env.example .env
# Edit .env with your settings (see Configuration below)

# Start with Docker (Recommended)
code .  # Open in VS Code
# Press Cmd+Shift+P → "Dev Containers: Rebuild and Reopen in Container"
# Then in container terminal:
pnpm install && pnpm dev

# OR start with Node.js directly
pnpm install && pnpm dev
```

### Verify Setup

```bash
# Check that everything is working
curl http://localhost:3000/health

# Register first user to test authentication
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"SecurePass123!"}'
```

**🎉 You're ready!** The service is running at `http://localhost:3000`

## 🛠️ Development

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

```bash
# Run all tests
pnpm test

# Watch mode for development
pnpm test:watch

# Coverage report
pnpm test:coverage
```

### Project Structure

```plaintext
users-service/
├── src/
│   ├── schemas/          # Zod schemas and TypeScript types
│   ├── repositories/     # Data access layer (MongoDB + MockDB)
│   ├── services/         # Business logic and authentication
│   ├── controllers/      # HTTP request/response handling
│   ├── middlewares/      # Security and validation middleware
│   └── routes/           # Route definitions and mounting
├── tests/                # Comprehensive test suite (290+ tests)
├── docs/                 # API documentation and guides
├── specs/         # Feature development planning
└── docker/              # Docker configuration files
```

## ⚙️ Configuration

### Essential Environment Variables

```bash
# Database Configuration
MONGODB_HOST=localhost                    # MongoDB host
MONGODB_PORT=27017                       # MongoDB port
MONGODB_DATABASE=users-service           # Database name

# JWT Security
JWT_ACCESS_SECRET=your-secret-key        # JWT signing key (change in production)
JWT_REFRESH_SECRET=your-refresh-key      # Refresh token key (change in production)

# Email Service (Optional)
SMTP_HOST=localhost                      # SMTP server host (Mailpit for dev)
SMTP_PORT=1025                          # SMTP port
SMTP_FROM_ADDRESS=no-reply@example.com  # From email address
```

**Full configuration guide**: [docs/guides/environment-variables.md](docs/guides/environment-variables.md)

## 📚 Documentation

- **📖 [Complete API Documentation](docs/index.md)** - Endpoints, examples, and integration guides
- **🏗️ [Project Overview](OVERVIEW.md)** - Architecture and design principles
- **🔧 [Local Development Guide](docs/guides/local-development.md)** - Comprehensive setup instructions
- **🚀 [Deployment Guide](docs/guides/deployment.md)** - Production deployment options

## 🤝 Contributing

1. **Read the documentation** in [START-HERE.md](START-HERE.md) to understand the project structure
2. **Check** [specs/](./specs/) for current development work
3. **Follow established patterns** documented in the memory bank
4. **Write tests** for all new functionality

### Development Workflow

1. Create a branch for your feature
2. Make changes and add tests
3. Run `pnpm test && pnpm lint` to verify quality
4. Submit a pull request

## 🆘 Need Help?

- **Setup issues**: Check [docs/guides/local-development.md](docs/guides/local-development.md)
- **API questions**: See [docs/index.md](docs/index.md)
- **Architecture questions**: Read [OVERVIEW.md](OVERVIEW.md)
- **Current development**: Check [specs/](./specs/)

---

**Built with ❤️ using TypeScript, Hono.js, MongoDB, and modern development practices**
