# Implementation Plan: Cloudflare Turnstile CAPTCHA

**Date:** 2026-01-10
**Feature:** Bot protection for authentication endpoints using Cloudflare Turnstile
**Priority:** High (Security Enhancement)

---

## Overview

Integrate Cloudflare Turnstile CAPTCHA into SubTrack's authentication flow to protect against:
- Brute force attacks on login
- Automated account creation (spam accounts)
- Bot-driven credential stuffing
- Denial of service via auth endpoints

Cloudflare Turnstile is a privacy-focused, user-friendly alternative to traditional CAPTCHA that doesn't require solving puzzles.

---

## Prerequisites

### 1. Cloudflare Account Setup

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Turnstile** section
3. Click **Add Site**
4. Configure:
   - **Site Name:** SubTrack
   - **Domain:** Your production domain (e.g., `subtrack.example.com`)
   - **Widget Mode:** `Managed` (recommended - Cloudflare decides challenge level)
5. Copy the credentials:
   - **Site Key** (public, used in frontend)
   - **Secret Key** (private, used in backend)

### 2. Environment Variables

```bash
# Backend (.env)
TURNSTILE_SECRET_KEY=your-turnstile-secret-key-here

# Frontend (.env)
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key-here
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │   LoginPage.tsx  │    │ RegisterPage.tsx │                  │
│  │                  │    │                  │                  │
│  │  ┌────────────┐  │    │  ┌────────────┐  │                  │
│  │  │ Turnstile  │  │    │  │ Turnstile  │  │                  │
│  │  │  Widget    │  │    │  │  Widget    │  │                  │
│  │  └────────────┘  │    │  └────────────┘  │                  │
│  └─────────┬────────┘    └─────────┬────────┘                  │
│            │                       │                            │
│            └───────────┬───────────┘                            │
│                        │                                        │
│            ┌───────────▼───────────┐                            │
│            │      auth.tsx         │                            │
│            │  signIn(email, pass,  │                            │
│            │        captchaToken)  │                            │
│            └───────────┬───────────┘                            │
│                        │                                        │
│            ┌───────────▼───────────┐                            │
│            │       api.ts          │                            │
│            │  x-captcha-response   │                            │
│            │       header          │                            │
│            └───────────┬───────────┘                            │
└────────────────────────┼────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend                                  │
│                                                                 │
│            ┌───────────────────────┐                            │
│            │     Better-Auth       │                            │
│            │                       │                            │
│            │  ┌─────────────────┐  │                            │
│            │  │ Captcha Plugin  │◄─┼── Validates token with    │
│            │  │                 │  │   Cloudflare API          │
│            │  └─────────────────┘  │                            │
│            │                       │                            │
│            │  Protected Endpoints: │                            │
│            │  - /sign-in/email    │                            │
│            │  - /sign-up/email    │                            │
│            │  - /reset-password   │                            │
│            └───────────────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Backend Configuration

#### Step 1.1: Update Backend Auth Configuration

**File:** `backend/src/lib/auth.ts`

- Import the captcha plugin from `better-auth/plugins`
- Add Cloudflare Turnstile configuration
- Protected endpoints: `/sign-in/email`, `/sign-up/email`

#### Step 1.2: Add Environment Variable

**File:** `backend/.env`

- Add `TURNSTILE_SECRET_KEY`

**File:** `backend/.env.example`

- Document the new variable

---

### Phase 2: Frontend Configuration

#### Step 2.1: Install React Turnstile Package

```bash
cd frontend
npm install @marsidev/react-turnstile
```

This is a lightweight React wrapper for Cloudflare Turnstile.

#### Step 2.2: Create Turnstile Component Wrapper

**File:** `frontend/src/components/ui/turnstile.tsx`

Create a reusable Turnstile component with:
- Loading states
- Error handling
- Theme support (light/dark)
- Callback for token retrieval

#### Step 2.3: Update Auth Context

**File:** `frontend/src/lib/auth.tsx`

- Modify `signIn` function to accept captcha token
- Modify `signUp` function to accept captcha token
- Pass token via `x-captcha-response` header

#### Step 2.4: Update Login Page

**File:** `frontend/src/pages/LoginPage.tsx`

- Add Turnstile widget below password field
- Store token in state
- Pass token to signIn function
- Handle validation errors (missing token)

#### Step 2.5: Update Register Page

**File:** `frontend/src/pages/RegisterPage.tsx`

- Add Turnstile widget below features list
- Store token in state
- Pass token to signUp function
- Handle validation errors (missing token)

#### Step 2.6: Add Environment Variable

**File:** `frontend/.env`

- Add `VITE_TURNSTILE_SITE_KEY`

**File:** `frontend/.env.example`

- Document the new variable

---

### Phase 3: Testing

#### Step 3.1: Development Testing Keys

Cloudflare provides test keys for development:

| Type | Site Key | Secret Key |
|------|----------|------------|
| Always Pass | `1x00000000000000000000AA` | `1x0000000000000000000000000000000AA` |
| Always Fail | `2x00000000000000000000AB` | `2x0000000000000000000000000000000AB` |
| Force Interactive | `3x00000000000000000000FF` | `3x0000000000000000000000000000000FF` |

#### Step 3.2: Test Cases

1. **Valid CAPTCHA:** Login/Register succeeds
2. **Missing CAPTCHA:** Returns 400 error
3. **Invalid CAPTCHA:** Returns 401/403 error
4. **Expired CAPTCHA:** Returns error, user can retry

---

## Files to Modify

### Backend

| File | Changes |
|------|---------|
| `backend/src/lib/auth.ts` | Add captcha plugin configuration |
| `backend/.env` | Add `TURNSTILE_SECRET_KEY` |
| `backend/.env.example` | Document `TURNSTILE_SECRET_KEY` |

### Frontend

| File | Changes |
|------|---------|
| `frontend/package.json` | Add `@marsidev/react-turnstile` |
| `frontend/src/components/ui/turnstile.tsx` | New: Turnstile wrapper component |
| `frontend/src/lib/auth.tsx` | Update signIn/signUp to accept token |
| `frontend/src/pages/LoginPage.tsx` | Add Turnstile widget |
| `frontend/src/pages/RegisterPage.tsx` | Add Turnstile widget |
| `frontend/.env` | Add `VITE_TURNSTILE_SITE_KEY` |
| `frontend/.env.example` | Document `VITE_TURNSTILE_SITE_KEY` |

---

## Rollback Plan

If issues occur after deployment:

1. **Quick disable:** Remove captcha plugin from `auth.ts`
2. **Frontend fallback:** Hide Turnstile component via environment flag
3. **Monitoring:** Watch for increased auth failures after rollout

---

## Success Metrics

- Zero bot-created accounts (track user agent patterns)
- No increase in legitimate user authentication failures
- Sub-second Turnstile widget load time
- Turnstile challenge rate < 5% (most users pass invisibly)

---

## Security Considerations

1. **Secret Key Protection:** Never expose `TURNSTILE_SECRET_KEY` in frontend
2. **Token Validation:** Always validate server-side, never trust frontend-only
3. **Replay Protection:** Cloudflare tokens are single-use
4. **Rate Limiting:** Keep rate limiting as defense in depth (CAPTCHA is not a replacement)

---

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Backend | 30 min | Pending |
| Phase 2: Frontend | 1 hour | Pending |
| Phase 3: Testing | 30 min | Pending |
| **Total** | **~2 hours** | |
