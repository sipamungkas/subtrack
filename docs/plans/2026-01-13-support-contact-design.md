# Support Contact Integration Design

## Overview

Add support contact information (Telegram bot and email) across multiple locations in the application to make it easy for users to get help.

**Support Channels:**
- Telegram: https://t.me/SubnudgeSupport_bot
- Email: support@subnudge.app

## Implementation Locations

### 1. Frontend Footer Component

**File:** `src/components/layout/Footer.tsx`

A simple footer displayed on all pages with support contact text:

- Text: "Need help? Chat with us on Telegram or email support@subnudge.app"
- Telegram link opens `https://t.me/SubnudgeSupport_bot`
- Email uses `mailto:support@subnudge.app`
- Styled with muted text and semi-transparent background (matches glassmorphism aesthetic)
- Positioned at bottom of content (not fixed/sticky)
- Integrated into `Layout.tsx`

### 2. Profile Page Support Section

**File:** `src/pages/ProfilePage.tsx`

A "Need Help?" card added after existing sections:

- Card styling matches existing cards (subtle border, glassmorphism)
- Heading: "Need Help?"
- Subtext: "Chat with us on Telegram or email support@subnudge.app"
- Two action buttons side by side:
  - Telegram icon + "Telegram Support" → opens bot link
  - Mail icon + "Email Support" → opens mailto

### 3. Telegram Notification Footer

**File:** `backend/src/services/notifications.ts`

Append support footer to all subscription reminder messages:

```
---
💬 Need help? @SubnudgeSupport_bot | ✉️ support@subnudge.app
```

- Added after existing message content
- Separator line for visual distinction
- `@SubnudgeSupport_bot` auto-links in Telegram
- Email included as alternative contact method

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/components/layout/Footer.tsx` | New file - footer component |
| `frontend/src/components/layout/Layout.tsx` | Import and add Footer |
| `frontend/src/pages/ProfilePage.tsx` | Add support section card |
| `backend/src/services/notifications.ts` | Add footer to `formatReminderMessage` |
