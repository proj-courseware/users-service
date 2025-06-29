# Local Development Setup Guide

This guide provides step-by-step instructions for setting up the Users Service for local development.

## Prerequisites

Before starting, ensure you have the following installed:

- [Docker Desktop](https://docs.docker.com/get-docker/) (Recommended)
- [VS Code](https://code.visualstudio.com/) with [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
- **OR** [Node.js 20+](https://nodejs.org/en/) and [pnpm](https://pnpm.io/)
- [Git](https://git-scm.com/)

## Quick Start (Docker - Recommended)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd users-api/backend-template
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` file with your settings (see [Environment Variables Guide](./environment-variables.md) for details):

```bash
# Required for basic functionality
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/users-service

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Email Configuration (MailHog for development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@localhost
```

### 3. Start with Docker

```bash
# Open in VS Code
code .

# In VS Code, press Cmd+Shift+P (or Ctrl+Shift+P)
# Type: "Dev Containers: Rebuild and Reopen in Container"
# Select the option to start the development environment
```

### 4. Start the Services

Once in the container terminal:

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

The API will be available at `http://localhost:3000`

## Alternative Setup (Node.js Direct)

### 1. Install Dependencies

```bash
git clone <repository-url>
cd users-api/backend-template
cp .env.example .env
pnpm install
```

### 2. Start MongoDB

You'll need MongoDB running locally:

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or install MongoDB locally
# Follow instructions at: https://docs.mongodb.com/manual/installation/
```

### 3. Start MailHog (Email Testing)

```bash
# Using Docker
docker run -d -p 1025:1025 -p 8025:8025 --name mailhog mailhog/mailhog

# Or download binary from: https://github.com/mailhog/MailHog
```

### 4. Start Development Server

```bash
pnpm dev
```

## Development Commands

```bash
# Start development server with hot reload
pnpm dev

# Run tests
pnpm test
pnpm test:watch
pnpm test:coverage

# Code quality
pnpm lint
pnpm lint:fix
pnpm type-check

# Build for production
pnpm build
```

## Development Tools Setup

### MongoDB GUI (Optional)

Install MongoDB Compass for a visual interface:

- Download: https://www.mongodb.com/products/compass
- Connect to: `mongodb://localhost:27017`

### Email Testing

MailHog provides a web interface for testing emails:

- Web UI: http://localhost:8025
- All emails sent by the service will appear here

### API Testing

The service includes comprehensive API documentation:

- Local API docs: http://localhost:3000 (when running)
- See [API Documentation](../index.md)

## VS Code Configuration

The project includes pre-configured VS Code settings:

### Extensions (Auto-installed in Dev Container)

- TypeScript support
- ESLint integration
- Prettier formatting
- MongoDB for VS Code
- REST Client for API testing

### Debugging

- Press `F5` to start debugging
- Breakpoints work in TypeScript files
- Debug configuration in `.vscode/launch.json`

### Recommended Workflow

1. Use integrated terminal for commands
2. File explorer for navigation
3. Built-in Git integration
4. Problems panel for linting issues

## Testing Your Setup

### 1. Health Check

```bash
curl http://localhost:3000/health
# Expected: {"status":"ok"}
```

### 2. Register a User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'
```

### 3. Check Email

Visit http://localhost:8025 to see the verification email

### 4. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'
```

## OAuth Setup (Optional)

For social login functionality, see provider-specific guides:

- [Google OAuth Setup](./google-oauth-setup.md)
- [GitHub OAuth Setup](./github-oauth-setup.md)
- [LinkedIn OAuth Setup](./linkedin-oauth-setup.md)

## Troubleshooting

### Common Issues

**Port Already in Use**

```bash
# Kill process on port 3000
npx kill-port 3000
```

**MongoDB Connection Issues**

```bash
# Check if MongoDB is running
docker ps | grep mongo

# Restart MongoDB
docker restart mongodb
```

**Permission Issues (Linux/Mac)**

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

**Environment Variables Not Loading**

- Ensure `.env` file exists in project root
- Check for typos in variable names
- Restart development server after changes

### Debug Mode

Enable debug logging:

```bash
# In .env file
DEBUG=*
LOG_LEVEL=debug

# Restart server
pnpm dev
```

### Container Issues

```bash
# Rebuild container
docker-compose down
docker-compose build --no-cache
docker-compose up
```

## Next Steps

Once your local environment is running:

1. Read the [API Documentation](../index.md)
2. Explore the [Memory Bank](../memory-bank/) for architecture details
3. Check out the test files for usage examples
4. See [Deployment Guide](./deployment.md) for production setup

## Development Tips

### Hot Reload

- Changes to TypeScript files trigger automatic restart
- No need to manually restart during development
- Check terminal for compilation errors

### Database Management

- MongoDB data persists between restarts
- Reset database: `docker exec mongodb mongosh --eval "db.dropDatabase()"`
- View collections in MongoDB Compass

### Email Testing

- All emails go to MailHog during development
- No real emails are sent
- Test email templates in web interface

### Code Quality

- ESLint runs on save
- Prettier formats on save
- Type checking is continuous
- Address warnings promptly

For deployment instructions, see the [Deployment Guide](./deployment.md).
