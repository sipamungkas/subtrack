# Dokploy Deployment Guide - Subnudge Backend

This guide explains how to deploy the Subnudge backend to Dokploy using GitHub Container Registry (GHCR).

## Prerequisites

1. **GitHub Repository**: Your code must be pushed to GitHub
2. **Dokploy Instance**: A running Dokploy server
3. **GitHub Actions**: Enabled on your repository (enabled by default)

---

## Step 1: Enable GitHub Packages

GitHub Container Registry (GHCR) is automatically available for your repository. The workflow uses `GITHUB_TOKEN` which has `packages:write` permission.

---

## Step 2: Push to GitHub

```bash
# Add all files and push
git add .
git commit -m "Add Docker and GitHub Actions configuration"
git push origin main
```

The GitHub Action will automatically:
1. Build the Docker image
2. Push to `ghcr.io/<your-username>/subnudge/backend:latest`

---

## Step 3: Configure Dokploy

### 3.1 Create New Application

1. Go to your Dokploy dashboard
2. Click **Create Application**
3. Choose **Docker** deployment type

### 3.2 Configure Docker Image

Set the image source:

```
ghcr.io/<your-github-username>/subnudge/backend:latest
```

Example:
```
ghcr.io/sipamungkas/subnudge/backend:latest
```

### 3.3 Configure Registry Authentication

Since GHCR is private by default, you need to add registry credentials:

1. Go to **Settings** → **Registry**
2. Add new registry:
   - **Registry URL**: `ghcr.io`
   - **Username**: Your GitHub username
   - **Password**: GitHub Personal Access Token (PAT) with `read:packages` scope

#### Creating a GitHub PAT for Dokploy

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click **Generate new token (classic)**
3. Name: `Dokploy Registry Access`
4. Select scopes:
   - `read:packages` (required)
   - `write:packages` (if you want Dokploy to push)
5. Generate and copy the token

### 3.4 Configure Environment Variables

In Dokploy, add these environment variables:

#### Required

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://user:password@host:5432/database` |
| `REDIS_URL` | `redis://your-redis-host:6379` (see Redis Setup below) |
| `BETTER_AUTH_SECRET` | A random string, 32+ characters |
| `BETTER_AUTH_URL` | Your backend URL (e.g., `https://api.yourdomain.com`) |
| `FRONTEND_URL` | Your frontend URL (e.g., `https://app.yourdomain.com`) |

#### Optional

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token |
| `TELEGRAM_BOT_USERNAME` | Your bot username |
| `TELEGRAM_BOT_SECRET` | Shared secret for bot authentication |
| `FIXER_API_KEY` | Fixer.io API key for currency rates |
| `ADMIN_EMAIL` | Admin user email |

### 3.5 Configure Ports

- **Container Port**: `3000`
- **Public Port**: `80` or `443` (with SSL)

### 3.6 Configure Health Check

- **Path**: `/health`
- **Port**: `3000`
- **Interval**: `30s`
- **Timeout**: `10s`

### 3.7 Deploy

Click **Deploy** and Dokploy will pull and run your container.

---

## Step 4: Database Setup

### Option A: Use Dokploy's PostgreSQL

1. In Dokploy, create a new PostgreSQL database
2. Copy the connection string
3. Set it as `DATABASE_URL` in your backend app

### Option B: Use External Database

Use any managed PostgreSQL service:
- Supabase
- Neon
- Railway
- DigitalOcean Managed Database
- AWS RDS

### Run Migrations

After the first deployment, run migrations:

```bash
# SSH into your Dokploy server
dokploy ssh <app-name>

# Or use Dokploy's terminal feature
bun run db:migrate
```

---

## Step 5: Redis Setup

Redis is required for rate limiting and OTP resend tracking.

### Option A: Use Dokploy's Redis

1. In Dokploy, create a new Redis service using the `redis:7-alpine` image
2. Note the service name (e.g., `subnudge-redis`)
3. Set `REDIS_URL` in your backend app:
   ```
   redis://subnudge-redis:6379
   ```

### Option B: Use Managed Redis (Recommended for Production)

Use a managed Redis service for better reliability:

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| [Upstash](https://upstash.com) | 10K commands/day | Serverless, great for low traffic |
| [Redis Cloud](https://redis.com/cloud) | 30MB | Managed by Redis Labs |
| [Railway](https://railway.app) | $5 credit | Easy setup |

After creating your Redis instance, set the `REDIS_URL` environment variable with the connection string provided by your provider.

### Verify Redis Connection

After deployment, check the logs to verify Redis connection:

```bash
# In Dokploy logs, you should see:
Redis connected
```

If Redis is unavailable, the app will log connection errors but continue running (with degraded rate limiting functionality).

---

## Step 6: Set Up Auto-Deploy (Optional)

### Using Dokploy Webhooks

1. In Dokploy, go to your app → **Settings** → **Webhooks**
2. Copy the deploy webhook URL
3. In GitHub, go to your repo → **Settings** → **Webhooks**
4. Add webhook:
   - **Payload URL**: Paste Dokploy webhook URL
   - **Content type**: `application/json`
   - **Events**: Select "Workflow runs" or "Packages"

### Using GitHub Actions (Alternative)

Add a deploy step to the workflow:

```yaml
# Add this job after build-and-push in backend-docker.yml

deploy:
  needs: build-and-push
  runs-on: ubuntu-latest
  if: github.event_name != 'pull_request'

  steps:
    - name: Trigger Dokploy Deploy
      run: |
        curl -X POST "${{ secrets.DOKPLOY_WEBHOOK_URL }}"
```

Then add `DOKPLOY_WEBHOOK_URL` to your GitHub repository secrets.

---

## Image Tags

The GitHub Action creates these tags:

| Tag Pattern | Example | When Created |
|------------|---------|--------------|
| `latest` | `latest` | Push to main/master |
| `sha-<commit>` | `sha-abc1234` | Every push |
| `<version>` | `1.0.0` | Git tag `v1.0.0` |
| `<major>.<minor>` | `1.0` | Git tag `v1.0.0` |
| `<major>` | `1` | Git tag `v1.0.0` |

### Using Specific Versions in Dokploy

For production stability, consider using a specific version tag instead of `latest`:

```
ghcr.io/<username>/subnudge/backend:1.0.0
```

---

## Troubleshooting

### Image Pull Failed

1. Check registry credentials in Dokploy
2. Verify the image name is correct
3. Check if the image exists: `docker pull ghcr.io/<username>/subnudge/backend:latest`

### Container Keeps Restarting

1. Check logs in Dokploy dashboard
2. Verify all required environment variables are set
3. Check database connectivity

### Health Check Failing

1. Ensure port 3000 is exposed
2. Check if the app is actually running
3. Test health endpoint: `curl http://localhost:3000/health`

### GitHub Action Failed

1. Check the Actions tab in your GitHub repository
2. Common issues:
   - Dockerfile syntax errors
   - Missing files in build context
   - Permission issues

---

## Making Image Public (Optional)

If you want to make the image public (no auth required):

1. Go to GitHub → Packages
2. Find your package
3. Click **Package settings**
4. Change visibility to **Public**

Then you can remove registry authentication from Dokploy.
