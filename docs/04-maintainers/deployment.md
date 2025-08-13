# Production Deployment Guide

This guide covers deploying the Users Service to production environments with best practices for security, scalability, and reliability.

## Deployment Options

### Option 1: Docker Deployment (Recommended)

- Easy scaling and management
- Consistent environments
- Built-in process management

### Option 2: Manual Node.js Deployment

- Direct server deployment
- Traditional hosting approach
- More configuration required

### Option 3: Cloud Platforms

- Platform-as-a-Service (PaaS)
- Serverless deployments
- Managed infrastructure

## Docker Deployment

### Prerequisites

- Docker and Docker Compose installed
- Domain name configured
- SSL certificate (Let's Encrypt recommended)
- MongoDB instance (Atlas or self-hosted)

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Reboot to apply group changes
sudo reboot
```

### 2. Application Deployment

```bash
# Clone repository
git clone https://github.com/proj-courseware/users-service.git
cd users-service

# Create production environment file
cp docker/.env.example docker/.env.production

# Edit production environment
nano docker/.env.production
```

### 3. Production Docker Compose

The project now includes a production Docker Compose file at `docker/docker-compose.prod.yml`. You can use it directly:

```bash
# Start production environment
pnpm docker:prod

# Or manually
docker compose --env-file docker/.env.production -f docker/docker-compose.prod.yml up --build
```

**Note**: The production compose file only includes the application container. For production, use managed database services or external databases instead of running MongoDB in containers.

### 4. Nginx Configuration

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream users_service {
        server users-service:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

        location / {
            limit_req zone=api burst=20 nodelay;

            proxy_pass http://users_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # WebSocket support for SSE
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        location /health {
            proxy_pass http://users_service/health;
            access_log off;
        }
    }
}
```

### 5. Deploy Application

```bash
# Build and start services
docker compose -f docker/docker-compose.prod.yml up -d --build

# Check logs
docker compose -f docker/docker-compose.prod.yml logs -f

# Verify health
curl https://your-domain.com/health
```

## Manual Node.js Deployment

### 1. Server Preparation

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2 for process management
npm install -g pm2

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 2. Application Setup

```bash
# Clone and build
git clone https://github.com/proj-courseware/users-service.git
cd users-service
cp docker/.env.example docker/.env
pnpm install
pnpm build
```

### 3. PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: "users-service",
      script: "./dist/index.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_file: "docker/.env",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
      max_memory_restart: "1G",
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};
```

### 4. Start Application

```bash
# Create logs directory
mkdir logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup

# Monitor
pm2 monit
```

## Cloud Platform Deployments

### AWS Deployment

#### Using ECS (Recommended)

1. **Build and Push Image**

```bash
# Build for multi-arch
docker buildx build --platform linux/amd64,linux/arm64 -t users-service .

# Tag for ECR
docker tag users-service:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/users-service:latest

# Push to ECR
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/users-service:latest
```

2. **ECS Task Definition**

```json
{
  "family": "users-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "users-service",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/users-service:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "MONGODB_HOST",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:users-service/mongodb-host"
        },
        {
          "name": "MONGODB_USER",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:users-service/mongodb-user"
        },
        {
          "name": "MONGODB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:users-service/mongodb-password"
        },
        {
          "name": "JWT_ACCESS_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:users-service/jwt-access-secret"
        },
        {
          "name": "JWT_REFRESH_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:users-service/jwt-refresh-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/users-service",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Using Lambda (Serverless)

1. **Install Serverless Framework**

```bash
npm install -g serverless
npm install --save-dev serverless-http
```

2. **Create serverless.yml**

```yaml
service: users-service

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  environment:
    NODE_ENV: production
    MONGODB_HOST: ${ssm:/users-service/mongodb-host}
    MONGODB_PORT: 27017
    MONGODB_DATABASE: users-service
    MONGODB_USER: ${ssm:/users-service/mongodb-user}
    MONGODB_PASSWORD: ${ssm:/users-service/mongodb-password}
    JWT_ACCESS_SECRET: ${ssm:/users-service/jwt-access-secret}
    JWT_REFRESH_SECRET: ${ssm:/users-service/jwt-refresh-secret}

functions:
  api:
    handler: dist/lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
      - http:
          path: /
          method: ANY

plugins:
  - serverless-offline
```

### Vercel Deployment

1. **Install Vercel CLI**

```bash
npm install -g vercel
```

2. **Create vercel.json**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

3. **Deploy**

```bash
vercel --prod
```

## Database Setup

### MongoDB Atlas (Recommended)

1. Create cluster at https://cloud.mongodb.com
2. Configure network access
3. Create database user
4. Get connection string
5. Update `MONGODB_URI` in environment

### Self-Hosted MongoDB

```bash
# Install MongoDB
sudo apt-get install mongodb-org

# Configure authentication
mongosh
> use admin
> db.createUser({
    user: "admin",
    pwd: "secure_password",
    roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase"]
  })

# Enable authentication in /etc/mongod.conf
security:
  authorization: enabled

# Restart MongoDB
sudo systemctl restart mongod
```

## Environment Configuration

### Required Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3000

# Database
MONGODB_HOST=your-mongodb-host
MONGODB_PORT=27017
MONGODB_DATABASE=users-service
MONGODB_USER=production_user
MONGODB_PASSWORD=secure_password

# JWT
JWT_ACCESS_SECRET=your-super-secure-access-secret-key
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key
JWT_ACCESS_EXPIRY_MINUTES=15
JWT_REFRESH_EXPIRY_DAYS=7

# Email (Production SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# OAuth (if enabled)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Security
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=100
```

### Secrets Management

**Using Docker Secrets:**

```bash
echo "your-jwt-secret" | docker secret create jwt_secret -
```

**Using AWS Secrets Manager:**

```bash
aws secretsmanager create-secret --name "users-service/jwt-access-secret" --secret-string "your-jwt-access-secret"
aws secretsmanager create-secret --name "users-service/jwt-refresh-secret" --secret-string "your-jwt-refresh-secret"
```

**Using Environment Files:**

```bash
# Secure file permissions
chmod 600 docker/.env.production
chown app:app docker/.env.production
```

## Monitoring and Logging

### Health Checks

```bash
# Basic health check
curl https://your-domain.com/health

# Admin health check (with auth)
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://your-domain.com/admin/health
```

### Log Management

**PM2 Logs:**

```bash
pm2 logs users-service --lines 100
pm2 flush  # Clear logs
```

**Docker Logs:**

```bash
# Using the new Docker structure
docker compose -f docker/docker-compose.prod.yml logs -f app
docker logs container-name --tail 100
```

### Application Monitoring

**PM2 Monitoring:**

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

**Health Monitoring Script:**

```bash
#!/bin/bash
# health-check.sh
HEALTH_URL="https://your-domain.com/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "Service is healthy"
    exit 0
else
    echo "Service is unhealthy (HTTP $RESPONSE)"
    exit 1
fi
```

## Security Considerations

### SSL/TLS Configuration

```bash
# Let's Encrypt SSL
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# Native module dependencies
# If running outside Docker, you must also install:
#   sudo apt-get install -y python3 make g++
```

### Firewall Configuration

```bash
# Ubuntu UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 3000  # Block direct app access
```

### Security Headers

Ensure Nginx includes security headers:

```nginx
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
add_header Content-Security-Policy "default-src 'self'";
```

## Backup and Recovery

### Database Backup

```bash
# MongoDB backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$MONGODB_URI" --out="/backups/mongodb_$DATE"
tar -czf "/backups/mongodb_$DATE.tar.gz" "/backups/mongodb_$DATE"
rm -rf "/backups/mongodb_$DATE"

# Keep only last 7 days
find /backups -name "mongodb_*.tar.gz" -mtime +7 -delete
```

### Application Backup

```bash
# Code and configuration backup
tar -czf "/backups/app_$(date +%Y%m%d).tar.gz" \
  /path/to/app \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=logs
```

## Scaling and Load Balancing

### Horizontal Scaling

**Docker Swarm:**

```bash
docker swarm init
docker stack deploy -c docker-compose.prod.yml users-service
docker service scale users-service_users-service=3
```

**Kubernetes:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: users-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: users-service
  template:
    metadata:
      labels:
        app: users-service
    spec:
      containers:
        - name: users-service
          image: users-service:latest
          ports:
            - containerPort: 3000
```

### Load Balancer Configuration

**Nginx Load Balancing:**

```nginx
upstream users_service {
    server app1:3000;
    server app2:3000;
    server app3:3000;
}
```

**AWS Application Load Balancer:**

- Configure target groups
- Set health check path to `/health`
- Enable sticky sessions for SSE endpoints

## Troubleshooting

### Common Issues

**Service Won't Start:**

```bash
# Check logs
docker compose -f docker/docker-compose.prod.yml logs app
pm2 logs users-service

# Check environment variables
printenv | grep -E "(MONGODB|JWT|SMTP)"
```

**Database Connection Issues:**

```bash
# Test MongoDB connection
mongosh "mongodb://$MONGODB_USER:$MONGODB_PASSWORD@$MONGODB_HOST:$MONGODB_PORT/$MONGODB_DATABASE" --eval "db.adminCommand('ping')"
```

**SSL Certificate Issues:**

```bash
# Renew Let's Encrypt certificate
sudo certbot renew --dry-run
```

**Memory Issues:**

```bash
# Monitor memory usage
docker stats
pm2 monit
```

### Performance Optimization

**Node.js Optimization:**

```bash
# Set NODE_OPTIONS for production
export NODE_OPTIONS="--max-old-space-size=2048"
```

**MongoDB Optimization:**

- Create appropriate indexes
- Use MongoDB profiler
- Monitor slow queries

**Nginx Optimization:**

```nginx
worker_processes auto;
worker_connections 1024;
keepalive_timeout 30;
client_max_body_size 10M;
gzip on;
gzip_types text/plain application/json application/javascript text/css;
```

## Continuous Deployment

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /path/to/app
            git pull origin main
            docker compose -f docker/docker-compose.prod.yml up -d --build
```

For detailed environment configuration, see the [Environment Variables Guide](./environment-variables.md).

For monitoring setup, see the [Monitoring Guide](./monitoring.md).
