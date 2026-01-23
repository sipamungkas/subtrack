# SubTrack - Subscription Tracking Application Design

**Date**: 2026-01-10
**Version**: 1.0
**Target Users**: Freelancers and small businesses tracking 20-50 subscriptions

## Overview

SubTrack is a subscription tracking web application that helps users remember which payment methods and accounts they used for various subscriptions, with Telegram notifications for upcoming renewals.

### Tech Stack

- **Backend**: Bun + Hono + Drizzle ORM + NeonDB (PostgreSQL) + Better-auth
- **Frontend**: Vite + React + shadcn/ui + Better-auth client
- **Notifications**: Telegram Bot API
- **Deployment**: Separate frontend and backend apps with JWT/session-based authentication

### High-Level Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│  React Frontend │ ◄─────► │  Hono Backend    │ ◄─────► │  NeonDB     │
│  (Vite + ShadCN)│   JWT   │  (Bun + Drizzle) │         │ (Postgres)  │
└─────────────────┘         └──────────────────┘         └─────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │  Telegram Bot   │
                            │  (Notifications)│
                            └─────────────────┘
```

## Core Features

1. **Subscription Management** - Track service name, renewal date, cost, payment method, account name
2. **Telegram Notifications** - Configurable reminders before renewal dates
3. **Subscription Limits** - Default 10 subscriptions per user, admin can upgrade
4. **Admin Dashboard** - User management, limit upgrades, system stats

---

## Database Schema

### users
- `id` - UUID primary key
- `email` - Unique, required
- `name` - Optional
- `telegram_chat_id` - Nullable, for Telegram notifications
- `subscription_limit` - Integer, default 10
- `is_active` - Boolean, default true (for admin disable/enable)
- `role` - Enum: 'user' | 'admin'
- `created_at`, `updated_at` - Timestamps
- *Better-auth handles additional tables (sessions, accounts, etc.)*

### subscriptions
- `id` - UUID primary key
- `user_id` - Foreign key to users
- `service_name` - String, required (e.g., "Netflix", "GitHub Pro")
- `renewal_date` - Date, required
- `cost` - Decimal, required
- `currency` - String, default "USD"
- `billing_cycle` - Enum: 'monthly' | 'yearly' | 'quarterly' | 'custom'
- `payment_method` - Text, free form (e.g., "BCA Credit Card ending 1234")
- `account_name` - String (email/username used for the service)
- `reminder_days` - Integer array (e.g., [7, 3, 1])
- `notes` - Text, optional
- `is_active` - Boolean (for soft delete/pause tracking)
- `created_at`, `updated_at` - Timestamps

### notification_logs
- `id` - UUID primary key
- `subscription_id` - Foreign key
- `sent_at` - Timestamp
- `notification_type` - Enum: 'telegram'
- `status` - Enum: 'sent' | 'failed'
- `days_before` - Integer

### telegram_verifications
- `id` - UUID primary key
- `user_id` - Foreign key to users
- `code` - String, unique, indexed (6-8 character alphanumeric)
- `expires_at` - Timestamp (valid for 15 minutes)
- `is_used` - Boolean, default false
- `created_at` - Timestamp

---

## Backend API Structure

### Authentication (`/api/auth/*`)
Better-auth handles:
- `POST /api/auth/sign-in` - Sign in
- `POST /api/auth/sign-up` - Sign up
- `POST /api/auth/sign-out` - Sign out
- `GET /api/auth/session` - Get current session

### Subscriptions (`/api/subscriptions`)
- `GET /api/subscriptions` - List user's subscriptions (filters: active, upcoming)
- `GET /api/subscriptions/:id` - Get single subscription
- `POST /api/subscriptions` - Create new (check limit before creation)
- `PUT /api/subscriptions/:id` - Update subscription
- `DELETE /api/subscriptions/:id` - Soft delete (set is_active = false)
- `GET /api/subscriptions/stats` - User's subscription stats (total cost, count, upcoming)

### User Profile (`/api/user`)
- `GET /api/user/profile` - Get current user info
- `PUT /api/user/profile` - Update profile
- `POST /api/user/telegram/connect` - Generate verification code
- `DELETE /api/user/telegram/disconnect` - Disconnect Telegram
- `POST /api/user/telegram/test` - Send test notification

### Telegram Integration (`/api/telegram`)
- `POST /api/telegram/verify` - Verify code and save chat_id (called by bot)

### Admin Routes (`/api/admin/*`)
Role-protected:
- `GET /api/admin/users` - List all users with pagination
- `GET /api/admin/users/:id` - Get user details
- `PUT /api/admin/users/:id/limit` - Update subscription limit
- `PUT /api/admin/users/:id/status` - Enable/disable account
- `GET /api/admin/stats` - System stats (total users, subscriptions, notifications sent)

---

## Notification System

### Telegram Bot Setup
1. Create bot via BotFather, get Bot Token
2. Store token in environment: `TELEGRAM_BOT_TOKEN`
3. Implement bot commands:
   - `/start` (no code) - Show instructions
   - `/start <code>` - Verify and link account
   - `/disconnect` - Unlink account
   - `/test` - Send test notification

### Telegram Connection Flow

**Step 1 - Web App**:
- User clicks "Connect Telegram"
- Backend generates unique verification code (6-8 chars)
- Store in `telegram_verifications` table (expires in 15 minutes)
- Display: "Send `/start ABC123XYZ` to @SubTrackBot"

**Step 2 - Telegram**:
- User sends command to bot
- Bot extracts chat_id and code
- Bot calls `POST /api/telegram/verify` with code and chat_id

**Step 3 - Backend**:
- Validate code (exists, not expired, not used)
- Update user's `telegram_chat_id`
- Mark code as used

**Step 4 - Confirmation**:
- Bot sends: "✅ Connected!"
- Web app shows success

### Notification Scheduler

**Cron Job** (runs daily at 8 AM):
```typescript
const notificationJob = new CronJob('0 8 * * *', async () => {
  // 1. Query subscriptions where renewal_date - current_date IN reminder_days
  // 2. Exclude already-sent notifications (check notification_logs)
  // 3. For each subscription:
  //    - Get user's telegram_chat_id
  //    - Format message
  //    - Send via Telegram Bot API
  //    - Log to notification_logs
})
```

**Message Format**:
```
🔔 Reminder: [Service Name] renews in [X] days

Cost: $[amount]
Payment: [payment_method]
Account: [account_name]
```

**Error Handling**:
- Telegram API failure: Retry with exponential backoff (3 attempts)
- Invalid chat_id: Mark user as disconnected
- Rate limits: Batch notifications
- Log all failures for admin review

---

## Frontend Structure

### Routes
- `/login` - Sign in
- `/register` - Sign up
- `/dashboard` - Main dashboard (subscription list, stats)
- `/subscriptions/new` - Add subscription
- `/subscriptions/:id/edit` - Edit subscription
- `/profile` - User profile & Telegram connection
- `/admin/users` - Admin user management
- `/admin/dashboard` - Admin stats

### Key Components

**Dashboard**:
- `SubscriptionCard` - Display subscription details
- `SubscriptionList` - Grid/list with filters
- `DashboardStats` - Overview cards (total subs, monthly cost, upcoming)
- `UpcomingRenewals` - Timeline of renewals

**Subscription Management**:
- `SubscriptionForm` - Create/edit form with validation
- `ReminderDaysSelector` - Multi-select for reminder days
- `SubscriptionLimitWarning` - Alert when approaching limit

**Profile**:
- `ProfileForm` - Update name, email
- `TelegramConnect` - Connection instructions and verification
- `SubscriptionLimitBadge` - Display usage: "10/10 subscriptions"

**Admin**:
- `UserTable` - User list with management actions
- `UserLimitDialog` - Modal to update limits
- `AdminStatsCards` - System metrics

---

## Security

### Authentication & Authorization
- Better-auth handles password hashing
- JWT tokens in httpOnly cookies (prevents XSS)
- CSRF protection via Better-auth
- Role-based access control (RBAC) middleware
- Rate limiting on auth endpoints

### API Security
- CORS: Allow frontend domain only
- Request validation using Zod schemas
- SQL injection protection (Drizzle ORM parameterized queries)
- Subscription limit enforcement
- Users can only access their own subscriptions

### Telegram Security
- Verification codes expire after 15 minutes
- One-time use codes (prevent replay attacks)
- Validate bot requests from Telegram servers only
- Secure bot token storage

### Data Protection
- Input sanitization for free-text fields
- Soft deletes (preserve data)
- Admin action audit trail

---

## Environment Configuration

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://user:pass@neon.tech/subtrack

# Better-auth
BETTER_AUTH_SECRET=random-secret-key
BETTER_AUTH_URL=http://localhost:3000

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_BOT_USERNAME=SubTrackBot

# App
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Admin
ADMIN_EMAIL=admin@example.com
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:3000
VITE_TELEGRAM_BOT_USERNAME=SubTrackBot
```

---

## Error Handling & UX

### Frontend Error States
- API failures: Toast notifications with retry
- Form validation: Inline error messages
- Network errors: Offline indicator
- Subscription limit: Modal with upgrade request
- Loading states: Skeletons

### Backend Error Format
```json
{
  "error": "SUBSCRIPTION_LIMIT_REACHED",
  "message": "You've reached your limit of 10 subscriptions",
  "details": { "current": 15, "limit": 15 }
}
```

### User Experience

**Onboarding**:
1. Sign up → Welcome screen
2. Prompt to connect Telegram (skippable)
3. Add first subscription with guided tooltip
4. Dashboard tour

**Dashboard UX**:
- Default view: Upcoming renewals (next 30 days)
- Color coding: Green (30+ days), Yellow (7-30 days), Red (<7 days), Gray (overdue)
- Quick actions: "Add Subscription" FAB, filter/search
- Empty states: Friendly illustrations with CTA

**Mobile Responsiveness**:
- Responsive design using Tailwind
- Mobile-first card layouts
- Bottom navigation
- Swipe actions on cards

---

## Deployment

- **Backend**: Railway, Fly.io, or VPS (Bun support required)
- **Frontend**: Vercel, Netlify, or Cloudflare Pages
- **Database**: NeonDB serverless PostgreSQL
- **Secrets**: Use platform environment variable systems

---

## Future Enhancements (Out of Scope)

- Email notifications
- Web push notifications
- Multi-currency support with conversion
- Expense reports and analytics
- Shared subscriptions (family/team plans)
- Integration with banking APIs for auto-tracking
- Mobile apps (React Native)
