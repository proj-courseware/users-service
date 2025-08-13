# Docker Usage for Development and Production

This directory contains **all** the necessary files to build and run your users authentication service using Docker for both development and production environments. This is the single source of truth for Docker configuration.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed on your machine.
- Copy or create the following environment files in this `docker` directory:
  - `.env` (for development)
  - `.env.production` (for production)

**Note**: The root-level Docker files have been removed. All Docker operations now use the files in this `docker/` folder.

**Example `.env` file:**

```env
NODE_ENV=development
PORT=3000

# MongoDB Configuration
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=users-service
MONGODB_USER=admin
MONGODB_PASSWORD=admin

# JWT Configuration
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_ACCESS_EXPIRY_MINUTES=15
JWT_REFRESH_EXPIRY_DAYS=7

# Email Configuration (Mailpit for development)
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=

# Mailpit Docker Service Configuration
MAILPIT_SMTP_PORT=1025
MAILPIT_WEB_PORT=8025

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redispassword

# Frontend Configuration
FRONTEND_URL=http://localhost:3001
```

Make sure to update the values as needed for your setup.

## Development

### 1. Build and Start All Services

**Recommended**: Use the package.json scripts from the project root:

```bash
# From project root
pnpm docker:dev
```

**Alternative**: Run Docker Compose directly:

```bash
# From project root
docker compose --env-file docker/.env -f docker/docker-compose.dev.yml up --build
```

- This will build the development image using `Dockerfile.dev` and start the app along with MongoDB, Mailpit, and Redis containers.
- The app source code is mounted as a volume for live reload.
- The app will be available at `http://localhost:${PORT}` (default: 3000).

### 2. Stopping Services

**Recommended**: Use the package.json scripts:

```bash
pnpm docker:dev:down
```

**Alternative**: Run Docker Compose directly:

```bash
docker compose -f docker/docker-compose.dev.yml down
```

## Production

### 1. Build and Start the App

**Recommended**: Use the package.json scripts from the project root:

```bash
# From project root
pnpm docker:prod
```

**Alternative**: Run Docker Compose directly:

```bash
# From project root
docker compose --env-file docker/.env.production -f docker/docker-compose.prod.yml up --build
```

- This will build the production image using `Dockerfile.prod` and start the app container.
- The app will be available at `http://localhost:${PORT}` (default: 3000).
- No source code is mounted; the image contains only the built app.

### 2. Stopping the App

**Recommended**: Use the package.json scripts:

```bash
pnpm docker:prod:down
```

**Alternative**: Run Docker Compose directly:

```bash
docker compose -f docker/docker-compose.prod.yml down
```

## Notes

- **Environment Files:** Both `.env` and `.env.production` must be present in the `docker` directory before running the respective compose files.
- **Package.json Scripts:** Use `pnpm docker:dev` and `pnpm docker:prod` for easier Docker management from the project root.
- **Database Access:** In development, you can connect to the databases using the credentials and ports defined in your `.env` file.
- **Production Databases:** The production compose file does **not** start database containers. For production, use managed database services or external databases.
- **Single Source of Truth:** All Docker configuration is now centralized in this `docker/` folder. Root-level Docker files have been removed.

## Troubleshooting

- **Port Issues:** If you encounter issues with ports, ensure the `PORT` and other variables in your `.env` files match your application's configuration.
- **Dependencies:** If you change dependencies, rebuild the images with the `--build` flag or use the package.json scripts.
- **Environment Files:** Make sure your `.env` files are in the `docker/` directory, not in the project root.
- **VS Code Dev Container:** The `.devcontainer/devcontainer.json` now points to `docker/docker-compose.dev.yml`. If you have issues, ensure this path is correct.

For more details, see the main [`docs/03-developers/knowledge/docker.md`](../docs/03-developers/knowledge/docker.md).
