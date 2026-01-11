# Cloudflare Pages Deployment Guide - Subnudge Frontend

Step-by-step guide to deploy the Subnudge frontend to Cloudflare Pages.

---

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **GitHub Repository**: Your code pushed to GitHub
3. **Domain** (optional): `subnudge.app` or your custom domain

---

## Step 1: Create Cloudflare Pages Project

### 1.1 Access Cloudflare Pages

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account
3. Go to **Workers & Pages** in the sidebar
4. Click **Create application**
5. Select **Pages** tab
6. Click **Connect to Git**

### 1.2 Connect GitHub Repository

1. Click **Connect GitHub**
2. Authorize Cloudflare to access your repositories
3. Select the **subnudge** repository (or your repo name)
4. Click **Begin setup**

---

## Step 2: Configure Build Settings

### 2.1 Basic Configuration

| Setting | Value |
|---------|-------|
| **Project name** | `subnudge` |
| **Production branch** | `main` |
| **Framework preset** | `Vite` |

### 2.2 Build Settings

| Setting | Value |
|---------|-------|
| **Build command** | `cd frontend && npm install && npm run build` |
| **Build output directory** | `frontend/dist` |
| **Root directory** | `/` (leave empty) |

> **Note**: If your repo only contains the frontend, you can set Root directory to `frontend` and simplify the build command to `npm install && npm run build`.

### 2.3 Alternative: Monorepo Configuration

If using root directory as `frontend`:

| Setting | Value |
|---------|-------|
| **Root directory** | `frontend` |
| **Build command** | `npm install && npm run build` |
| **Build output directory** | `dist` |

---

## Step 3: Configure Environment Variables

There are **two ways** to add environment variables in Cloudflare Pages:

---

### Option A: During Initial Setup (First Deployment)

When you first connect your repository, you'll see the setup page:

1. After configuring build settings, scroll down
2. Find **Environment variables (advanced)** section
3. Click to expand it
4. Click **+ Add variable**
5. Add each variable:

| Variable Name | Value |
|---------------|-------|
| `VITE_API_URL` | `https://api.subnudge.app` |
| `VITE_TELEGRAM_BOT_USERNAME` | `SubnudgeBot` |
| `VITE_TURNSTILE_SITE_KEY` | (your site key from Turnstile) |

6. Click **Save and Deploy**

---

### Option B: After Deployment (Settings Page)

If you already deployed or need to update variables:

#### Step-by-Step Navigation:

```
Cloudflare Dashboard
    └── Workers & Pages (left sidebar)
        └── Click on "subnudge" (your project)
            └── Settings (top tab)
                └── Environment variables (left sidebar)
```

#### Detailed Steps:

1. **Go to Cloudflare Dashboard**
   - Open [dash.cloudflare.com](https://dash.cloudflare.com)
   - Log in to your account

2. **Navigate to Workers & Pages**
   - In the left sidebar, click **Workers & Pages**

3. **Select Your Project**
   - Find and click on **subnudge** (or your project name)

4. **Go to Settings**
   - Click the **Settings** tab at the top of the page

5. **Find Environment Variables**
   - In the left sidebar under Settings, click **Environment variables**

6. **Add Production Variables**
   - Click **+ Add** button
   - You'll see a form with fields:
     - **Variable name**: Enter the variable name (e.g., `VITE_API_URL`)
     - **Value**: Enter the value (e.g., `https://api.subnudge.app`)
   - Under **Environment**, select:
     - ☑️ **Production** (checked)
     - ☐ **Preview** (optional)
   - Click **Save**

7. **Repeat for Each Variable**

   Add these one by one:

   ```
   ┌─────────────────────────────┬─────────────────────────────────┐
   │ Variable Name               │ Value                           │
   ├─────────────────────────────┼─────────────────────────────────┤
   │ VITE_API_URL                │ https://api.subnudge.app        │
   ├─────────────────────────────┼─────────────────────────────────┤
   │ VITE_TELEGRAM_BOT_USERNAME  │ SubnudgeBot                     │
   ├─────────────────────────────┼─────────────────────────────────┤
   │ VITE_TURNSTILE_SITE_KEY     │ (get from Turnstile - Step 5)   │
   └─────────────────────────────┴─────────────────────────────────┘
   ```

8. **Trigger Redeploy**
   - After adding/changing variables, you need to redeploy
   - Go to **Deployments** tab
   - Find your latest production deployment
   - Click the **⋮** (three dots) menu → **Retry deployment**
   - Or push a new commit to trigger automatic deployment

---

### Visual Guide: Finding Environment Variables

```
┌────────────────────────────────────────────────────────────────────┐
│  Cloudflare Dashboard                                              │
├──────────────────┬─────────────────────────────────────────────────┤
│                  │  subnudge                                       │
│  Workers & Pages │  ─────────────────────────────────────────────  │
│  ← You are here  │  [Deployments] [Settings] [Custom domains]      │
│                  │                    ↑                            │
│                  │              Click here                         │
├──────────────────┴─────────────────────────────────────────────────┤
│                                                                    │
│  Settings                                                          │
│  ─────────────────────────────────────────────────────────────     │
│                                                                    │
│  ┌─────────────────────┐  ┌──────────────────────────────────────┐ │
│  │ General             │  │                                      │ │
│  │ Builds & deployments│  │  Environment variables               │ │
│  │ Environment variables│ │  ════════════════════                │ │
│  │ ← Click here        │  │                                      │ │
│  │ Functions           │  │  Production variables                │ │
│  │ Access Policy       │  │  ┌────────────────┬────────────────┐ │ │
│  └─────────────────────┘  │  │ VITE_API_URL   │ https://api... │ │ │
│                           │  └────────────────┴────────────────┘ │ │
│                           │                                      │ │
│                           │  [+ Add]  ← Click to add new         │ │
│                           └──────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

---

### Environment Types Explained

When adding a variable, you choose which environment(s):

| Environment | When Used | Example |
|-------------|-----------|---------|
| **Production** | Deploys from `main` branch | Live site: `subnudge.app` |
| **Preview** | Deploys from other branches/PRs | Preview: `feature-x.subnudge.pages.dev` |

**Recommended Setup:**

| Variable | Production | Preview |
|----------|------------|---------|
| `VITE_API_URL` | `https://api.subnudge.app` | Same (or staging API) |
| `VITE_TELEGRAM_BOT_USERNAME` | `SubnudgeBot` | Same |
| `VITE_TURNSTILE_SITE_KEY` | Real key | `1x00000000000000000000AA` (test) |

---

## Step 4: Deploy

1. Click **Save and Deploy**
2. Wait for the build to complete (usually 1-3 minutes)
3. Once complete, you'll see a URL like `subnudge.pages.dev`

---

## Step 5: Set Up Cloudflare Turnstile (CAPTCHA)

### 5.1 Create Turnstile Widget

1. In Cloudflare Dashboard, go to **Turnstile** (sidebar)
2. Click **Add site**
3. Configure:

| Setting | Value |
|---------|-------|
| **Site name** | `Subnudge` |
| **Domain** | `subnudge.app` |
| **Widget Mode** | `Managed` (recommended) |

4. Click **Create**

### 5.2 Copy Keys

After creation, you'll see two keys:

| Key | Where to Use |
|-----|--------------|
| **Site Key** | Cloudflare Pages → `VITE_TURNSTILE_SITE_KEY` |
| **Secret Key** | Dokploy (backend) → `TURNSTILE_SECRET_KEY` |

### 5.3 Add Additional Domains (if needed)

If using preview deployments:

1. Go to Turnstile → Your widget → **Settings**
2. Add domain: `*.subnudge.pages.dev`
3. This allows Turnstile to work on preview URLs

---

## Step 6: Configure Custom Domain

### 6.1 Add Custom Domain

1. Go to your Pages project
2. Click **Custom domains** tab
3. Click **Set up a custom domain**
4. Enter: `subnudge.app`
5. Click **Continue**

### 6.2 DNS Configuration

#### If domain is on Cloudflare:

Cloudflare will automatically configure DNS. Just click **Activate domain**.

#### If domain is elsewhere:

Add a CNAME record:

| Type | Name | Target |
|------|------|--------|
| `CNAME` | `@` or `subnudge.app` | `subnudge.pages.dev` |

Or for www subdomain:

| Type | Name | Target |
|------|------|--------|
| `CNAME` | `www` | `subnudge.pages.dev` |

### 6.3 Wait for SSL

- Cloudflare automatically provisions SSL
- This can take a few minutes
- Status will show **Active** when ready

---

## Step 7: Configure API Subdomain (Backend)

Your backend runs on Dokploy. Point `api.subnudge.app` to it:

### 7.1 Add DNS Record

In Cloudflare DNS settings for `subnudge.app`:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| `A` | `api` | Your Dokploy server IP | Proxied (orange cloud) |

Or if using a hostname:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| `CNAME` | `api` | Your Dokploy hostname | Proxied |

### 7.2 SSL Mode

1. Go to **SSL/TLS** → **Overview**
2. Set SSL mode to **Full (strict)** if Dokploy has valid SSL
3. Or **Full** if using self-signed cert on Dokploy

---

## Environment Variables Summary

### Frontend (Cloudflare Pages)

| Variable | Production Value | Preview Value |
|----------|------------------|---------------|
| `VITE_API_URL` | `https://api.subnudge.app` | `https://api.subnudge.app` |
| `VITE_TELEGRAM_BOT_USERNAME` | `SubnudgeBot` | `SubnudgeBot` |
| `VITE_TURNSTILE_SITE_KEY` | From Turnstile dashboard | Test key or same |

### Backend (Dokploy)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Random 32+ character string |
| `BETTER_AUTH_URL` | `https://api.subnudge.app` |
| `FRONTEND_URL` | `https://subnudge.app` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `TELEGRAM_BOT_TOKEN` | From BotFather |
| `TELEGRAM_BOT_USERNAME` | `SubnudgeBot` |
| `TURNSTILE_SECRET_KEY` | From Turnstile dashboard |
| `FIXER_API_KEY` | From Fixer.io |
| `ADMIN_EMAIL` | Your admin email |

---

## Automatic Deployments

Cloudflare Pages automatically deploys when:

- **Push to main branch** → Production deployment
- **Push to other branches** → Preview deployment
- **Pull requests** → Preview deployment with unique URL

### Deployment URLs

| Type | URL Pattern |
|------|-------------|
| Production | `subnudge.app` or `subnudge.pages.dev` |
| Preview | `<branch>.<project>.pages.dev` |
| PR Preview | `<commit>.subnudge.pages.dev` |

---

## Troubleshooting

### Build Fails

**Error: "npm install failed"**
- Check if `package.json` exists in `frontend/`
- Verify Node.js version compatibility

**Error: "Build output directory not found"**
- Ensure build command outputs to `frontend/dist`
- Check Vite config for correct output directory

### Environment Variables Not Working

- VITE_ prefix is required for client-side variables
- Variables must be set **before** build (they're embedded at build time)
- After changing variables, trigger a new deployment

### Turnstile Not Working

- Verify domain is added to Turnstile widget settings
- Check if site key (not secret key) is used in frontend
- For preview URLs, add `*.subnudge.pages.dev` to allowed domains

### Custom Domain Not Working

- Wait 5-10 minutes for DNS propagation
- Check DNS records are correct
- Verify SSL certificate is active

### API Calls Failing (CORS)

- Ensure `FRONTEND_URL` in backend matches your domain exactly
- Check if `api.subnudge.app` resolves correctly
- Verify backend CORS configuration includes your frontend domain

---

## Useful Commands

### Manual Deployment via Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Build frontend
cd frontend
npm install
npm run build

# Deploy
wrangler pages deploy dist --project-name=subnudge
```

### Check Deployment Status

```bash
wrangler pages deployment list --project-name=subnudge
```

---

## Security Checklist

- [ ] VITE_TURNSTILE_SITE_KEY is set (not test key in production)
- [ ] TURNSTILE_SECRET_KEY is set in backend (not test key)
- [ ] Custom domain has SSL active
- [ ] API subdomain points to Dokploy correctly
- [ ] Backend FRONTEND_URL matches frontend domain exactly
- [ ] No sensitive data in frontend environment variables

---

## Next Steps

1. ✅ Deploy frontend to Cloudflare Pages
2. ✅ Configure environment variables
3. ✅ Set up Turnstile CAPTCHA
4. ✅ Configure custom domain
5. ✅ Point API subdomain to Dokploy
6. 🔄 Test the full flow (signup, login, subscriptions)
