# Subnudge Backend - Docker Deployment Guide

## Quick Start

### Option 1: Using Docker Compose (Recommended for Development)

This will start PostgreSQL, Redis, and the backend API.

```bash
# 1. Copy environment template
cp .env.docker.example .env

# 2. Edit .env with your values (at minimum, set BETTER_AUTH_SECRET)
nano .env

# 3. Start services
docker compose up -d

# 4. Run database migrations
docker compose exec backend bun run db:migrate

# 5. Check logs
docker compose logs -f backend
```

### Option 2: Build and Run Standalone Container

Use this when you have external database and Redis services.

```bash
# 1. Build the image
docker build -t subnudge-backend:latest .

# 2. Run the container
docker run -d \
  --name subnudge-backend \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/database" \
  -e REDIS_URL="redis://your-redis-host:6379" \
  -e BETTER_AUTH_SECRET="your-secret-key-here" \
  -e BETTER_AUTH_URL="https://api.yourdomain.com" \
  -e FRONTEND_URL="https://yourdomain.com" \
  -e TELEGRAM_BOT_TOKEN="your-bot-token" \
  -e TELEGRAM_BOT_USERNAME="YourBot" \
  subnudge-backend:latest
```

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `BETTER_AUTH_SECRET` | Secret key for auth (32+ chars) | `your-super-secret-key-at-least-32-chars` |
| `BETTER_AUTH_URL` | Backend API URL | `https://api.example.com` |
| `FRONTEND_URL` | Frontend app URL (for CORS) | `https://app.example.com` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `production` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | - |
| `TELEGRAM_BOT_USERNAME` | Bot username | - |
| `TELEGRAM_BOT_SECRET` | Shared secret for bot-API auth | - |
| `FIXER_API_KEY` | Fixer.io API key for currency rates | - |
| `ADMIN_EMAIL` | Admin user email | - |

---

## Production Deployment

### Building for Production

```bash
# Build with specific tag
docker build -t subnudge-backend:v1.0.0 .

# Build with latest tag
docker build -t subnudge-backend:latest .
```

### Pushing to Registry

```bash
# Tag for your registry
docker tag subnudge-backend:latest your-registry.com/subnudge-backend:latest

# Push
docker push your-registry.com/subnudge-backend:latest
```

### Running in Production

```bash
docker run -d \
  --name subnudge-backend \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file /path/to/.env \
  subnudge-backend:latest
```

---

## Database Migrations

### Running Migrations

```bash
# With docker-compose
docker compose exec backend bun run db:migrate

# With standalone container
docker exec subnudge-backend bun run db:migrate
```

### Generating New Migrations

Migrations should be generated locally and committed to the repository:

```bash
# Local development
bun run db:generate
```

---

## Health Checks

The container includes a health check endpoint:

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' subnudge-backend

# Manual health check
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok"}
```

---

## Docker Commands Reference

### Container Management

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Restart
docker compose restart backend

# View logs
docker compose logs -f backend

# View logs (last 100 lines)
docker compose logs --tail 100 backend
```

### Debugging

```bash
# Enter container shell
docker compose exec backend sh

# Check running processes
docker compose exec backend ps aux

# Check memory usage
docker stats subnudge-backend
```

### Cleanup

```bash
# Remove containers and networks (keep volumes)
docker compose down

# Remove containers, networks, AND volumes (WARNING: deletes data)
docker compose down -v

# Remove unused images
docker image prune -a
```

---

## Deployment Platforms

### Railway

```bash
# railway.toml is auto-detected, or use:
railway up
```

### Fly.io

```bash
# Create fly.toml, then:
fly deploy
```

### DigitalOcean App Platform

1. Connect your repository
2. Select Dockerfile deployment
3. Set environment variables in dashboard
4. Deploy

### AWS ECS / Fargate

1. Push image to ECR
2. Create task definition with environment variables
3. Create ECS service

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs backend

# Common issues:
# - DATABASE_URL not set or incorrect
# - BETTER_AUTH_SECRET not set
# - Database not accessible
```

### Database connection errors

```bash
# Check if database is running
docker compose ps db

# Check database logs
docker compose logs db

# Test connection from backend container
docker compose exec backend sh
# Then: nc -zv db 5432
```

### Redis connection errors

```bash
# Check if Redis is running
docker compose ps redis

# Check Redis logs
docker compose logs redis

# Test connection from backend container
docker compose exec backend sh
# Then: nc -zv redis 6379

# Verify Redis is responding
docker compose exec redis redis-cli ping
# Should return: PONG
```

If Redis is unavailable, the app will log errors but continue running with degraded rate limiting functionality.

### Permission errors

The container runs as non-root user `subnudge` (UID 1001). If mounting volumes, ensure correct permissions:

```bash
# Fix permissions on host
sudo chown -R 1001:1001 /path/to/volume
```

---

## Image Details

| Property | Value |
|----------|-------|
| Base Image | `oven/bun:1.2-alpine` |
| User | `subnudge` (UID 1001) |
| Working Directory | `/app` |
| Exposed Port | `3000` |
| Health Check | `GET /health` |

### Image Size

The multi-stage build produces a minimal image:
- **Base**: ~150MB (Bun runtime)
- **App**: ~50MB (dependencies + code)
- **Total**: ~200MB
