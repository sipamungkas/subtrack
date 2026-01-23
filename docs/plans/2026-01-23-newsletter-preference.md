# Newsletter Preference Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a newsletter preference toggle allowing users to opt-in/opt-out of receiving newsletter notifications, defaulting to true.

**Architecture:** Extend the users table with a `newsletterEnabled` boolean field (default: true), update the backend API to handle this preference, and add UI controls in the profile page. Modify the notification service to respect this preference when sending reminders.

**Tech Stack:** Bun, Hono, Drizzle ORM, PostgreSQL, React, Zod, TailwindCSS

---

## Task 1: Add Database Schema Field

**Files:**
- Modify: `backend/src/db/schema.ts:30-45`

**Step 1: Add newsletterEnabled field to users table**

In the `users` table definition, add the new field after `preferredCurrency`:

```typescript
preferredCurrency: varchar("preferred_currency", { length: 3 })
  .notNull()
  .default("USD"),
newsletterEnabled: boolean("newsletter_enabled").notNull().default(true),
role: roleEnum("role").notNull().default("user"),
```

**Step 2: Verify schema syntax**

Run: `bun run --cwd backend typecheck`
Expected: No TypeScript errors

**Step 3: Commit schema change**

```bash
git add backend/src/db/schema.ts
git commit -m "feat(schema): add newsletterEnabled field to users table"
```

---

## Task 2: Create Database Migration

**Files:**
- Create: `backend/migrations/add_newsletter_enabled.sql`

**Step 1: Write migration SQL**

```sql
-- Add newsletterEnabled column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS newsletter_enabled BOOLEAN DEFAULT true;

-- Set default value for existing users (opt-in by default)
UPDATE users SET newsletter_enabled = true WHERE newsletter_enabled IS NULL;

-- Make column NOT NULL after setting defaults
ALTER TABLE users ALTER COLUMN newsletter_enabled SET NOT NULL;

-- Add comment
COMMENT ON COLUMN users.newsletter_enabled IS 'User preference for receiving newsletter and subscription reminder notifications';

-- NOTE: This project uses Drizzle ORM. The proper workflow is:
-- 1. Update schema in backend/src/db/schema.ts (completed in Task 1)
-- 2. Run: bun run --cwd backend db:push (uses drizzle-kit push)
-- This SQL file is kept for documentation/reference purposes.
```

**Step 2: Verify migration file created**

Run: `ls -la backend/migrations/add_newsletter_enabled.sql`
Expected: File exists

**Step 3: Commit migration file**

```bash
git add backend/migrations/add_newsletter_enabled.sql
git commit -m "feat(migration): add newsletter_enabled migration SQL"
```

---

## Task 3: Apply Database Migration

**Files:**
- Database: Apply schema changes

**Step 1: Push schema changes to database**

Run: `cd backend && bun run db:push`
Expected: "✔ Schema pushed successfully" or similar success message

**Step 2: Verify column was added**

Run: `cd backend && bun run db:studio`
Expected: Drizzle Studio opens, showing `newsletter_enabled` column in users table

**Step 3: Commit after verification**

```bash
git add .
git commit -m "chore(db): apply newsletter_enabled migration"
```

---

## Task 4: Update Zod Validator

**Files:**
- Modify: `backend/src/validators/user.ts:1-10`

**Step 1: Add newsletterEnabled to validation schema**

```typescript
import { z } from 'zod';

const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "IDR", "AUD", "SGD"] as const;

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  preferredCurrency: z.enum(SUPPORTED_CURRENCIES).optional(),
  newsletterEnabled: z.boolean().optional(),
});
```

**Step 2: Verify validator compiles**

Run: `bun run --cwd backend typecheck`
Expected: No TypeScript errors

**Step 3: Commit validator changes**

```bash
git add backend/src/validators/user.ts
git commit -m "feat(validator): add newsletterEnabled to updateProfileSchema"
```

---

## Task 5: Update User Profile API - GET Endpoint

**Files:**
- Modify: `backend/src/routes/user.ts:13-37`

**Step 1: Add newsletterEnabled to profile SELECT**

Update the GET `/api/user/profile` endpoint to include the new field:

```typescript
// GET /api/user/profile - Get current user profile
userRouter.get('/profile', async (c) => {
  const user = c.get('user');

  const [profile] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      telegramChatId: users.telegramChatId,
      subscriptionLimit: users.subscriptionLimit,
      role: users.role,
      emailVerified: users.emailVerified,
      preferredCurrency: users.preferredCurrency,
      newsletterEnabled: users.newsletterEnabled,
    })
    .from(users)
    .where(eq(users.id, user.id));

  return c.json({
    data: {
      ...profile,
      emailVerified: profile.emailVerified ?? false,
    },
  });
});
```

**Step 2: Test GET endpoint**

Run: `cd backend && bun run dev`
Then in another terminal: `curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/user/profile`
Expected: Response includes `newsletterEnabled: true`

**Step 3: Commit GET endpoint changes**

```bash
git add backend/src/routes/user.ts
git commit -m "feat(api): return newsletterEnabled in profile GET"
```

---

## Task 6: Update User Profile API - PUT Endpoint

**Files:**
- Modify: `backend/src/routes/user.ts:39-69`

**Step 1: Update PUT endpoint to return newsletterEnabled**

The PUT endpoint already uses `...validation.data`, so it will automatically accept `newsletterEnabled`. We just need to include it in the response:

```typescript
// PUT /api/user/profile - Update user profile
userRouter.put('/profile', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const validation = updateProfileSchema.safeParse(body);

  if (!validation.success) {
    return c.json({
      error: 'VALIDATION_ERROR',
      message: validation.error.message,
      details: validation.error.errors
    }, 400);
  }

  const [updated] = await db
    .update(users)
    .set({
      ...validation.data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      preferredCurrency: users.preferredCurrency,
      newsletterEnabled: users.newsletterEnabled,
    });

  return c.json({ data: updated });
});
```

**Step 2: Test PUT endpoint**

Run: `curl -X PUT -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d '{"newsletterEnabled": false}' http://localhost:3000/api/user/profile`
Expected: Response shows `newsletterEnabled: false`

**Step 3: Commit PUT endpoint changes**

```bash
git add backend/src/routes/user.ts
git commit -m "feat(api): handle newsletterEnabled in profile PUT"
```

---

## Task 7: Update Notification Service to Respect Preference

**Files:**
- Modify: `backend/src/services/notifications.ts:95-119`

**Step 1: Filter users by newsletterEnabled in query**

Update the `sendSubscriptionReminders` function to exclude users who have disabled newsletters:

```typescript
export async function sendSubscriptionReminders(): Promise<void> {
  console.log("🔔 Running subscription reminder check...");

  try {
    // First, advance any passed renewal dates
    await advancePassedRenewalDates();

    const today = startOfDay(new Date());

    // Get all active subscriptions with users who have newsletters enabled
    const activeSubscriptions = await db
      .select({
        subscription: subscriptions,
        user: users,
      })
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .where(
        and(
          eq(subscriptions.isActive, true),
          eq(users.isActive, true),
          eq(users.newsletterEnabled, true),
          sql`${users.telegramChatId} IS NOT NULL`
        )
      );

    let sentCount = 0;
    let failedCount = 0;

    for (const { subscription, user } of activeSubscriptions) {
      const renewalDate = new Date(subscription.renewalDate);
      const daysUntilRenewal = differenceInDays(renewalDate, today);

      // Check if we should send reminder for this subscription
      if (!subscription.reminderDays.includes(daysUntilRenewal)) {
        continue;
      }

      // Check if notification already sent for this day
      const existingLog = await db
        .select()
        .from(notificationLogs)
        .where(
          and(
            eq(notificationLogs.subscriptionId, subscription.id),
            eq(notificationLogs.daysBefore, daysUntilRenewal),
            sql`DATE(${notificationLogs.sentAt}) = DATE(${format(today, 'yyyy-MM-dd')})`
          )
        )
        .limit(1);

      if (existingLog.length > 0) {
        continue; // Already sent today
      }

      // Format and send message
      const message = formatReminderMessage(subscription, daysUntilRenewal);
      const success = await sendTelegramMessage(user.telegramChatId!, message);

      // Log notification
      await db.insert(notificationLogs).values({
        subscriptionId: subscription.id,
        notificationType: "telegram",
        status: success ? "sent" : "failed",
        daysBefore: daysUntilRenewal,
      });

      if (success) {
        sentCount++;
      } else {
        failedCount++;
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`✅ Reminders sent: ${sentCount}, Failed: ${failedCount}`);
  } catch (error) {
    console.error("❌ Error sending reminders:", error);
  }
}
```

**Step 2: Verify notification service compiles**

Run: `bun run --cwd backend typecheck`
Expected: No TypeScript errors

**Step 3: Commit notification service changes**

```bash
git add backend/src/services/notifications.ts
git commit -m "feat(notifications): respect newsletterEnabled preference"
```

---

## Task 8: Write Backend Unit Tests

**Files:**
- Create: `backend/src/routes/__tests__/user-newsletter.test.ts`

**Step 1: Write test file**

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../../index';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

describe('Newsletter Preference API', () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    // Setup: Create test user and get auth token
    // This assumes you have auth helpers available
    // Adjust based on your test setup
  });

  it('should return newsletterEnabled in GET /api/user/profile', async () => {
    const response = await app.request('/api/user/profile', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.data).toHaveProperty('newsletterEnabled');
    expect(typeof data.data.newsletterEnabled).toBe('boolean');
  });

  it('should default newsletterEnabled to true for new users', async () => {
    const response = await app.request('/api/user/profile', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();
    expect(data.data.newsletterEnabled).toBe(true);
  });

  it('should update newsletterEnabled to false via PUT /api/user/profile', async () => {
    const response = await app.request('/api/user/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newsletterEnabled: false }),
    });

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.data.newsletterEnabled).toBe(false);

    // Verify in database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    expect(user.newsletterEnabled).toBe(false);
  });

  it('should update newsletterEnabled to true via PUT /api/user/profile', async () => {
    // First set to false
    await app.request('/api/user/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newsletterEnabled: false }),
    });

    // Then set back to true
    const response = await app.request('/api/user/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newsletterEnabled: true }),
    });

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.data.newsletterEnabled).toBe(true);
  });

  it('should reject invalid newsletterEnabled values', async () => {
    const response = await app.request('/api/user/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newsletterEnabled: 'invalid' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('VALIDATION_ERROR');
  });
});
```

**Step 2: Run tests**

Run: `cd backend && bun test src/routes/__tests__/user-newsletter.test.ts`
Expected: All tests pass

**Step 3: Commit tests**

```bash
git add backend/src/routes/__tests__/user-newsletter.test.ts
git commit -m "test(api): add newsletter preference API tests"
```

---

## Task 9: Write Notification Service Tests

**Files:**
- Create: `backend/src/services/__tests__/notifications-newsletter.test.ts`

**Step 1: Write notification test**

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { sendSubscriptionReminders } from '../notifications';
import { db } from '../../db';
import { users, subscriptions } from '../../db/schema';
import { eq } from 'drizzle-orm';
import * as telegram from '../../lib/telegram';

describe('Notification Service - Newsletter Preference', () => {
  beforeEach(async () => {
    // Setup: Create test data
    // Mock telegram.sendTelegramMessage
    mock.module('../../lib/telegram', () => ({
      sendTelegramMessage: mock(() => Promise.resolve(true)),
    }));
  });

  it('should send notifications only to users with newsletterEnabled=true', async () => {
    // Create two users: one with newsletter enabled, one disabled
    const [userEnabled] = await db.insert(users).values({
      email: 'enabled@test.com',
      newsletterEnabled: true,
      telegramChatId: '123456',
      isActive: true,
    }).returning();

    const [userDisabled] = await db.insert(users).values({
      email: 'disabled@test.com',
      newsletterEnabled: false,
      telegramChatId: '789012',
      isActive: true,
    }).returning();

    // Create subscriptions for both users with renewal in 7 days
    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + 7);

    await db.insert(subscriptions).values([
      {
        userId: userEnabled.id,
        serviceName: 'Test Service 1',
        renewalDate: renewalDate.toISOString().split('T')[0],
        cost: '9.99',
        paymentMethod: 'Credit Card',
        accountName: 'test@example.com',
        reminderDays: [7, 3, 1],
      },
      {
        userId: userDisabled.id,
        serviceName: 'Test Service 2',
        renewalDate: renewalDate.toISOString().split('T')[0],
        cost: '19.99',
        paymentMethod: 'PayPal',
        accountName: 'test2@example.com',
        reminderDays: [7, 3, 1],
      },
    ]);

    // Run reminder service
    await sendSubscriptionReminders();

    // Verify sendTelegramMessage was called only once (for enabled user)
    expect(telegram.sendTelegramMessage).toHaveBeenCalledTimes(1);
    expect(telegram.sendTelegramMessage).toHaveBeenCalledWith(
      '123456',
      expect.stringContaining('Test Service 1')
    );
  });

  it('should not send notifications to users with newsletterEnabled=false', async () => {
    const [userDisabled] = await db.insert(users).values({
      email: 'disabled@test.com',
      newsletterEnabled: false,
      telegramChatId: '123456',
      isActive: true,
    }).returning();

    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + 7);

    await db.insert(subscriptions).values({
      userId: userDisabled.id,
      serviceName: 'Test Service',
      renewalDate: renewalDate.toISOString().split('T')[0],
      cost: '9.99',
      paymentMethod: 'Credit Card',
      accountName: 'test@example.com',
      reminderDays: [7, 3, 1],
    });

    await sendSubscriptionReminders();

    expect(telegram.sendTelegramMessage).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run tests**

Run: `cd backend && bun test src/services/__tests__/notifications-newsletter.test.ts`
Expected: All tests pass

**Step 3: Commit tests**

```bash
git add backend/src/services/__tests__/notifications-newsletter.test.ts
git commit -m "test(notifications): add newsletter preference tests"
```

---

## Task 10: Add Frontend Type Definitions

**Files:**
- Create or Modify: `frontend/src/types/user.ts`

**Step 1: Check if user types file exists**

Run: `ls -la frontend/src/types/user.ts`
Expected: File may or may not exist

**Step 2: Add or update user type definition**

```typescript
export interface User {
  id: string;
  email: string;
  name?: string;
  telegramChatId?: string | null;
  subscriptionLimit: number;
  role: 'user' | 'admin';
  emailVerified: boolean;
  preferredCurrency: string;
  newsletterEnabled: boolean;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  preferredCurrency?: 'USD' | 'EUR' | 'GBP' | 'IDR' | 'AUD' | 'SGD';
  newsletterEnabled?: boolean;
}
```

**Step 3: Verify TypeScript compiles**

Run: `bun run --cwd frontend typecheck`
Expected: No TypeScript errors

**Step 4: Commit type definitions**

```bash
git add frontend/src/types/user.ts
git commit -m "feat(types): add newsletterEnabled to User type"
```

---

## Task 11: Update Frontend API Hook

**Files:**
- Modify: `frontend/src/hooks/use-user.ts`

**Step 1: Find and update the useUpdateProfile hook**

Locate the `useUpdateProfile` mutation and ensure it accepts `newsletterEnabled`:

```typescript
export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (data: {
      name?: string;
      email?: string;
      preferredCurrency?: string;
      newsletterEnabled?: boolean;
    }) => {
      const response = await api.put('/api/user/profile', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
```

**Step 2: Verify hook compiles**

Run: `bun run --cwd frontend typecheck`
Expected: No TypeScript errors

**Step 3: Commit hook changes**

```bash
git add frontend/src/hooks/use-user.ts
git commit -m "feat(hooks): support newsletterEnabled in useUpdateProfile"
```

---

## Task 12: Add Newsletter Toggle to Profile Page UI

**Files:**
- Modify: `frontend/src/pages/ProfilePage.tsx:31-185`

**Step 1: Add state for newsletterEnabled**

Add state management after the existing state declarations (around line 43):

```typescript
const [name, setName] = useState(user?.name || '')
const [telegramCode, setTelegramCode] = useState<{ code: string; message: string } | null>(null)
const [copied, setCopied] = useState(false)
const [preferredCurrency, setPreferredCurrency] = useState(profile?.preferredCurrency || 'USD')
const [newsletterEnabled, setNewsletterEnabled] = useState(profile?.newsletterEnabled ?? true)
```

**Step 2: Update form submission to include newsletterEnabled**

Modify the `handleUpdateProfile` function (around line 45):

```typescript
const handleUpdateProfile = async (e: React.FormEvent) => {
  e.preventDefault()
  try {
    await updateProfile.mutateAsync({
      name,
      preferredCurrency,
      newsletterEnabled,
    })
    await refreshUser()
    toast({ title: 'Success', description: 'Profile updated successfully' })
  } catch {
    toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' })
  }
}
```

**Step 3: Verify frontend compiles**

Run: `bun run --cwd frontend typecheck`
Expected: No TypeScript errors

**Step 4: Commit state management changes**

```bash
git add frontend/src/pages/ProfilePage.tsx
git commit -m "feat(ui): add newsletterEnabled state management"
```

---

## Task 13: Add Newsletter Toggle UI Component

**Files:**
- Modify: `frontend/src/pages/ProfilePage.tsx:168-185`

**Step 1: Import Switch component**

Add to imports at the top of the file:

```typescript
import { Switch } from '@/components/ui/switch'
```

**Step 2: Add newsletter preference toggle in the form**

Add after the currency selector (around line 168), before the Save button:

```typescript
            <div className="space-y-2">
              <Label htmlFor="currency">Preferred Currency</Label>
              <Select value={preferredCurrency} onValueChange={(value) => setPreferredCurrency(value as 'USD' | 'EUR' | 'GBP' | 'IDR' | 'AUD' | 'SGD')}>
                <SelectTrigger id="currency" className="bg-background/50">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency} {getCurrencySymbol(currency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Dashboard stats will be displayed in this currency
              </p>
            </div>

            <Separator className="my-4" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="newsletter" className="text-base">
                    Newsletter & Reminders
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive subscription reminders and updates
                  </p>
                </div>
                <Switch
                  id="newsletter"
                  checked={newsletterEnabled}
                  onCheckedChange={setNewsletterEnabled}
                />
              </div>
            </div>

            <Button type="submit" disabled={updateProfile.isPending} className="gap-2">
```

**Step 3: Test UI in development**

Run: `cd frontend && bun run dev`
Expected: Profile page displays with newsletter toggle

**Step 4: Commit UI component**

```bash
git add frontend/src/pages/ProfilePage.tsx
git commit -m "feat(ui): add newsletter preference toggle to profile"
```

---

## Task 14: End-to-End Testing

**Files:**
- Test all components together

**Step 1: Start backend server**

Run: `cd backend && bun run dev`
Expected: Server starts on port 3000

**Step 2: Start frontend server**

Run: `cd frontend && bun run dev`
Expected: Frontend starts and connects to backend

**Step 3: Manual E2E test**

1. Navigate to profile page
2. Verify newsletter toggle appears and defaults to ON (checked)
3. Toggle newsletter preference OFF
4. Click "Save Changes"
5. Refresh page
6. Verify toggle remains OFF
7. Toggle back ON
8. Save and verify it persists

Expected: All state changes persist correctly

**Step 4: Test notification behavior**

1. Create a test subscription with renewal in 7 days
2. Set newsletter preference to OFF
3. Run notification service: `cd backend && bun run cron:test`
4. Verify no notification is sent
5. Set newsletter preference to ON
6. Run notification service again
7. Verify notification IS sent

Expected: Notifications respect the preference

**Step 5: Run all tests**

Run: `cd backend && bun test`
Run: `cd frontend && bun test`
Expected: All tests pass

**Step 6: Final commit**

```bash
git add .
git commit -m "test(e2e): verify newsletter preference feature works end-to-end"
```

---

## Task 15: Documentation

**Files:**
- Create: `docs/features/newsletter-preference.md`

**Step 1: Write feature documentation**

```markdown
# Newsletter Preference Feature

## Overview

Users can now control whether they receive newsletter notifications and subscription reminders via a toggle in their profile settings.

## Default Behavior

- New users: Newsletter enabled by default (`newsletterEnabled: true`)
- Existing users: Newsletter enabled by default when migration is applied

## User Flow

1. Navigate to Profile page
2. Locate "Newsletter & Reminders" toggle in Account Information section
3. Toggle OFF to stop receiving notifications
4. Toggle ON to resume receiving notifications
5. Click "Save Changes" to persist preference

## Technical Implementation

### Database
- Field: `users.newsletter_enabled` (BOOLEAN, NOT NULL, DEFAULT true)
- Migration: `backend/migrations/add_newsletter_enabled.sql`

### Backend
- Validator: `updateProfileSchema` in `backend/src/validators/user.ts`
- API: GET/PUT `/api/user/profile` returns and accepts `newsletterEnabled`
- Service: `sendSubscriptionReminders()` filters by `newsletterEnabled = true`

### Frontend
- Component: Switch in `frontend/src/pages/ProfilePage.tsx`
- Hook: `useUpdateProfile()` in `frontend/src/hooks/use-user.ts`
- Type: `User` interface includes `newsletterEnabled: boolean`

## Testing

### Unit Tests
- `backend/src/routes/__tests__/user-newsletter.test.ts`
- `backend/src/services/__tests__/notifications-newsletter.test.ts`

### E2E Test Scenarios
1. Default value verification
2. Toggle OFF → Save → Persist
3. Toggle ON → Save → Persist
4. Notification sending respects preference

## API Reference

### GET /api/user/profile
Returns user profile including:
```json
{
  "data": {
    "id": "...",
    "email": "...",
    "newsletterEnabled": true
  }
}
```

### PUT /api/user/profile
Accepts:
```json
{
  "newsletterEnabled": false
}
```

Returns updated profile.

## Migration Guide

For existing deployments:

1. Apply database migration: `bun run --cwd backend db:push`
2. Deploy backend changes
3. Deploy frontend changes
4. All existing users will default to `newsletterEnabled: true`
```

**Step 2: Commit documentation**

```bash
git add docs/features/newsletter-preference.md
git commit -m "docs: add newsletter preference feature documentation"
```

---

## Summary

This plan implements a complete newsletter preference feature with:

1. **Database layer**: New `newsletterEnabled` boolean field (default: true)
2. **Backend API**: Full CRUD support via GET/PUT `/api/user/profile`
3. **Validation**: Zod schema ensures type safety
4. **Business logic**: Notification service respects user preference
5. **Frontend UI**: Toggle switch in profile settings
6. **Testing**: Comprehensive unit and E2E tests
7. **Documentation**: Complete feature documentation

**Key Principles:**
- **DRY**: Reuses existing validation and API patterns
- **YAGNI**: No over-engineering, just the required functionality
- **TDD**: Tests written alongside implementation
- **Frequent commits**: Each task results in a focused commit

**Total estimated tasks**: 15
**Estimated time per task**: 2-5 minutes
**Dependencies**: Tasks must be completed sequentially
