# Auto-Advance Renewal Date Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically advance subscription renewal dates to the next billing cycle when they pass, ensuring reminders continue to work for recurring subscriptions.

**Architecture:** Add a `customIntervalDays` field for custom billing cycles. Before sending reminders, check all subscriptions with past renewal dates and advance them to the nearest future date based on their billing cycle. No notifications are sent for auto-advances (silent operation).

**Tech Stack:** Drizzle ORM, PostgreSQL, Zod validation, React, TypeScript

---

## Task 1: Add Database Schema Field

**Files:**
- Modify: `backend/src/db/schema.ts:86-104`

**Step 1: Add customIntervalDays field to subscriptions table**

In `backend/src/db/schema.ts`, add the new field after `billingCycle`:

```typescript
// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  serviceName: varchar("service_name", { length: 255 }).notNull(),
  renewalDate: date("renewal_date").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  billingCycle: billingCycleEnum("billing_cycle").notNull().default("monthly"),
  customIntervalDays: integer("custom_interval_days"), // NEW: Only used when billingCycle = "custom"
  paymentMethod: text("payment_method").notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  reminderDays: integer("reminder_days").array().notNull().default([7, 3, 1]),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

**Step 2: Generate database migration**

Run: `cd backend && bun run db:generate`

Expected: Migration file created in `backend/drizzle/` folder

**Step 3: Apply the migration**

Run: `cd backend && bun run db:migrate`

Expected: Migration applied successfully

**Step 4: Commit**

```bash
git add backend/src/db/schema.ts backend/drizzle/
git commit -m "feat(db): add customIntervalDays field to subscriptions table

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Update Backend Validation Schema

**Files:**
- Modify: `backend/src/validators/subscription.ts`
- Test: `backend/src/__tests__/validators/subscription.test.ts`

**Step 1: Write failing test for customIntervalDays validation**

Add to `backend/src/__tests__/validators/subscription.test.ts`:

```typescript
describe('customIntervalDays validation', () => {
  it('should accept customIntervalDays when billingCycle is custom', () => {
    const result = createSubscriptionSchema.safeParse({
      serviceName: 'Test Service',
      renewalDate: '2026-01-20',
      cost: '9.99',
      billingCycle: 'custom',
      customIntervalDays: 45,
      paymentMethod: 'Credit Card',
      accountName: 'test@example.com',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customIntervalDays).toBe(45);
    }
  });

  it('should require customIntervalDays when billingCycle is custom', () => {
    const result = createSubscriptionSchema.safeParse({
      serviceName: 'Test Service',
      renewalDate: '2026-01-20',
      cost: '9.99',
      billingCycle: 'custom',
      paymentMethod: 'Credit Card',
      accountName: 'test@example.com',
    });
    expect(result.success).toBe(false);
  });

  it('should reject customIntervalDays less than 1', () => {
    const result = createSubscriptionSchema.safeParse({
      serviceName: 'Test Service',
      renewalDate: '2026-01-20',
      cost: '9.99',
      billingCycle: 'custom',
      customIntervalDays: 0,
      paymentMethod: 'Credit Card',
      accountName: 'test@example.com',
    });
    expect(result.success).toBe(false);
  });

  it('should ignore customIntervalDays when billingCycle is not custom', () => {
    const result = createSubscriptionSchema.safeParse({
      serviceName: 'Test Service',
      renewalDate: '2026-01-20',
      cost: '9.99',
      billingCycle: 'monthly',
      customIntervalDays: 45,
      paymentMethod: 'Credit Card',
      accountName: 'test@example.com',
    });
    expect(result.success).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && bun test src/__tests__/validators/subscription.test.ts`

Expected: FAIL - customIntervalDays not recognized

**Step 3: Update validation schema**

Replace `backend/src/validators/subscription.ts`:

```typescript
import { z } from 'zod';

const baseSubscriptionSchema = z.object({
  serviceName: z.string().min(1).max(255),
  renewalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cost: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().length(3).default('USD'),
  billingCycle: z.enum(['monthly', 'yearly', 'quarterly', 'custom']).default('monthly'),
  customIntervalDays: z.number().int().positive().optional(),
  paymentMethod: z.string().min(1),
  accountName: z.string().min(1).max(255),
  reminderDays: z.array(z.number().int().positive()).default([7, 3, 1]),
  notes: z.string().optional(),
});

export const createSubscriptionSchema = baseSubscriptionSchema.superRefine((data, ctx) => {
  if (data.billingCycle === 'custom' && !data.customIntervalDays) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'customIntervalDays is required when billingCycle is custom',
      path: ['customIntervalDays'],
    });
  }
});

export const updateSubscriptionSchema = baseSubscriptionSchema.partial().superRefine((data, ctx) => {
  // Only validate if billingCycle is being set to custom
  if (data.billingCycle === 'custom' && data.customIntervalDays === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'customIntervalDays is required when billingCycle is custom',
      path: ['customIntervalDays'],
    });
  }
});

export const subscriptionQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional(),
  upcoming: z.enum(['true', 'false']).optional(),
});
```

**Step 4: Run test to verify it passes**

Run: `cd backend && bun test src/__tests__/validators/subscription.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/validators/subscription.ts backend/src/__tests__/validators/subscription.test.ts
git commit -m "feat(validation): add customIntervalDays validation for custom billing cycles

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Implement Auto-Advance Logic

**Files:**
- Modify: `backend/src/services/notifications.ts`
- Test: `backend/src/__tests__/services/notifications.test.ts`

**Step 1: Write failing test for calculateNextRenewalDate**

Add to `backend/src/__tests__/services/notifications.test.ts`:

```typescript
import { calculateNextRenewalDate, advancePassedRenewalDates } from '../../services/notifications';

describe('calculateNextRenewalDate', () => {
  it('should advance monthly subscription by 1 month', () => {
    const current = new Date('2026-01-15');
    const next = calculateNextRenewalDate(current, 'monthly');
    expect(next.toISOString().split('T')[0]).toBe('2026-02-15');
  });

  it('should advance quarterly subscription by 3 months', () => {
    const current = new Date('2026-01-15');
    const next = calculateNextRenewalDate(current, 'quarterly');
    expect(next.toISOString().split('T')[0]).toBe('2026-04-15');
  });

  it('should advance yearly subscription by 1 year', () => {
    const current = new Date('2026-01-15');
    const next = calculateNextRenewalDate(current, 'yearly');
    expect(next.toISOString().split('T')[0]).toBe('2027-01-15');
  });

  it('should advance custom subscription by customIntervalDays', () => {
    const current = new Date('2026-01-15');
    const next = calculateNextRenewalDate(current, 'custom', 45);
    expect(next.toISOString().split('T')[0]).toBe('2026-03-01');
  });

  it('should return same date for custom without interval', () => {
    const current = new Date('2026-01-15');
    const next = calculateNextRenewalDate(current, 'custom');
    expect(next.toISOString().split('T')[0]).toBe('2026-01-15');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && bun test src/__tests__/services/notifications.test.ts`

Expected: FAIL - calculateNextRenewalDate not exported

**Step 3: Implement calculateNextRenewalDate function**

Add to `backend/src/services/notifications.ts` (before sendSubscriptionReminders):

```typescript
export function calculateNextRenewalDate(
  currentDate: Date,
  billingCycle: string,
  customIntervalDays?: number | null
): Date {
  const next = new Date(currentDate);

  switch (billingCycle) {
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    case "custom":
      if (customIntervalDays) {
        next.setDate(next.getDate() + customIntervalDays);
      }
      break;
  }

  return next;
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && bun test src/__tests__/services/notifications.test.ts`

Expected: PASS

**Step 5: Implement advancePassedRenewalDates function**

Add to `backend/src/services/notifications.ts` (after calculateNextRenewalDate):

```typescript
export async function advancePassedRenewalDates(): Promise<void> {
  console.log("📅 Checking for passed renewal dates...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all active subscriptions with passed renewal dates
  const passedSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.isActive, true),
        sql`${subscriptions.renewalDate} < ${today.toISOString().split("T")[0]}`
      )
    );

  let advancedCount = 0;

  for (const subscription of passedSubscriptions) {
    // Skip custom subscriptions without interval
    if (subscription.billingCycle === "custom" && !subscription.customIntervalDays) {
      continue;
    }

    let renewalDate = new Date(subscription.renewalDate);

    // Keep advancing until we reach a future date
    while (renewalDate < today) {
      renewalDate = calculateNextRenewalDate(
        renewalDate,
        subscription.billingCycle,
        subscription.customIntervalDays
      );
    }

    // Update the subscription
    await db
      .update(subscriptions)
      .set({
        renewalDate: renewalDate.toISOString().split("T")[0],
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));

    advancedCount++;
  }

  console.log(`📅 Advanced ${advancedCount} subscription renewal dates`);
}
```

**Step 6: Call advancePassedRenewalDates in sendSubscriptionReminders**

Modify `sendSubscriptionReminders` to call the advance function first:

```typescript
export async function sendSubscriptionReminders(): Promise<void> {
  console.log("🔔 Running subscription reminder check...");

  try {
    // First, advance any passed renewal dates
    await advancePassedRenewalDates();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // ... rest of the function unchanged
```

**Step 7: Run all notification tests**

Run: `cd backend && bun test src/__tests__/services/notifications.test.ts`

Expected: PASS

**Step 8: Commit**

```bash
git add backend/src/services/notifications.ts backend/src/__tests__/services/notifications.test.ts
git commit -m "feat(notifications): auto-advance passed renewal dates before sending reminders

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Update Frontend - New Subscription Form

**Files:**
- Modify: `frontend/src/pages/SubscriptionNewPage.tsx`

**Step 1: Add customIntervalDays to form state**

Update the formData state to include the new field:

```typescript
const [formData, setFormData] = useState({
  serviceName: '',
  renewalDate: '',
  cost: '',
  currency: 'USD',
  billingCycle: 'monthly' as const,
  customIntervalDays: undefined as number | undefined,
  paymentMethod: '',
  accountName: '',
  reminderDays: [7, 3, 1],
  notes: '',
})
```

**Step 2: Add conditional input field for custom interval**

After the billing cycle select, add the custom interval input (inside the same grid):

```tsx
{/* Billing Cycle and Renewal Date */}
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label htmlFor="billingCycle">Billing Cycle</Label>
    <Select
      value={formData.billingCycle}
      onValueChange={(value) => setFormData((prev) => ({
        ...prev,
        billingCycle: value as typeof formData.billingCycle,
        customIntervalDays: value === 'custom' ? prev.customIntervalDays : undefined,
      }))}
    >
      <SelectTrigger className="bg-background/50">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {billingCycles.map((cycle) => (
          <SelectItem key={cycle.value} value={cycle.value}>
            {cycle.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
  <div className="space-y-2">
    <Label htmlFor="renewalDate">Next Renewal Date *</Label>
    <Input
      id="renewalDate"
      type="date"
      value={formData.renewalDate}
      onChange={(e) => setFormData((prev) => ({ ...prev, renewalDate: e.target.value }))}
      required
      className="bg-background/50"
    />
  </div>
</div>

{/* Custom Interval Days - shown only when billing cycle is custom */}
{formData.billingCycle === 'custom' && (
  <div className="space-y-2">
    <Label htmlFor="customIntervalDays">Renewal Interval (days) *</Label>
    <Input
      id="customIntervalDays"
      type="number"
      min="1"
      placeholder="e.g., 45 for every 45 days"
      value={formData.customIntervalDays || ''}
      onChange={(e) => setFormData((prev) => ({
        ...prev,
        customIntervalDays: e.target.value ? parseInt(e.target.value, 10) : undefined,
      }))}
      required
      className="bg-background/50"
    />
    <p className="text-xs text-muted-foreground">
      How many days between each renewal
    </p>
  </div>
)}
```

**Step 3: Run frontend to verify UI**

Run: `cd frontend && bun run dev`

Expected: Form shows "Renewal Interval (days)" field when "Custom" billing cycle is selected

**Step 4: Commit**

```bash
git add frontend/src/pages/SubscriptionNewPage.tsx
git commit -m "feat(frontend): add custom interval days input for custom billing cycles

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Update Frontend - Edit Subscription Form

**Files:**
- Modify: `frontend/src/pages/SubscriptionEditPage.tsx`

**Step 1: Add customIntervalDays to form state**

Update the formData state:

```typescript
const [formData, setFormData] = useState({
  serviceName: "",
  renewalDate: "",
  cost: "",
  currency: "USD",
  billingCycle: "monthly" as "monthly" | "yearly" | "quarterly" | "custom",
  customIntervalDays: undefined as number | undefined,
  paymentMethod: "",
  accountName: "",
  reminderDays: [7, 3, 1] as number[],
  notes: "",
});
```

**Step 2: Load customIntervalDays from subscription**

Update the useEffect to include customIntervalDays:

```typescript
useEffect(() => {
  if (subscription) {
    const billingCycle = isValidBillingCycle(subscription.billingCycle)
      ? subscription.billingCycle
      : "monthly";
    const currency = isValidCurrency(subscription.currency)
      ? subscription.currency
      : "USD";
    setFormData({
      serviceName: subscription.serviceName,
      renewalDate: subscription.renewalDate,
      cost: subscription.cost,
      currency,
      billingCycle,
      customIntervalDays: subscription.customIntervalDays ?? undefined,
      paymentMethod: subscription.paymentMethod,
      accountName: subscription.accountName,
      reminderDays: subscription.reminderDays,
      notes: subscription.notes || "",
    });
  }
}, [subscription]);
```

**Step 3: Add custom interval input field**

After the billing cycle select section (same pattern as new page):

```tsx
{/* Custom Interval Days - shown only when billing cycle is custom */}
{formData.billingCycle === 'custom' && (
  <div className="space-y-2">
    <Label htmlFor="customIntervalDays">Renewal Interval (days) *</Label>
    <Input
      id="customIntervalDays"
      type="number"
      min="1"
      placeholder="e.g., 45 for every 45 days"
      value={formData.customIntervalDays || ''}
      onChange={(e) => setFormData((prev) => ({
        ...prev,
        customIntervalDays: e.target.value ? parseInt(e.target.value, 10) : undefined,
      }))}
      required
      className="bg-background/50"
    />
    <p className="text-xs text-muted-foreground">
      How many days between each renewal
    </p>
  </div>
)}
```

**Step 4: Update billingCycle onValueChange to clear customIntervalDays**

```tsx
onValueChange={(value) => {
  if (isValidBillingCycle(value)) {
    setFormData((prev) => ({
      ...prev,
      billingCycle: value,
      customIntervalDays: value === 'custom' ? prev.customIntervalDays : undefined,
    }));
  }
}}
```

**Step 5: Run frontend to verify edit form**

Run: `cd frontend && bun run dev`

Expected: Edit form loads and displays customIntervalDays when billingCycle is custom

**Step 6: Commit**

```bash
git add frontend/src/pages/SubscriptionEditPage.tsx
git commit -m "feat(frontend): add custom interval days to subscription edit form

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Run Full Test Suite and Build

**Step 1: Run backend tests**

Run: `cd backend && bun test`

Expected: All tests pass

**Step 2: Run frontend tests**

Run: `cd frontend && bun test`

Expected: All tests pass

**Step 3: Build frontend**

Run: `cd frontend && bun run build`

Expected: Build succeeds without errors

**Step 4: Build backend (type check)**

Run: `cd backend && bun run build`

Expected: No TypeScript errors

**Step 5: Final commit (if any fixes needed)**

```bash
git add .
git commit -m "chore: fix any issues found during testing

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Summary

This implementation adds automatic renewal date advancement with the following behavior:

1. **New field:** `customIntervalDays` for custom billing cycles
2. **Auto-advance timing:** Runs at the start of the daily reminder cron (8:00 AM UTC)
3. **Advance logic:** Keeps advancing until `renewalDate >= today`
4. **Silent operation:** No notifications sent when dates are advanced
5. **Custom cycles:** Skipped if `customIntervalDays` is not set
6. **Frontend:** Shows interval input only when "Custom" billing cycle is selected
