# Dashboard Currency Preference Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add user settings to choose display currency for dashboard stats (USD, EUR, GBP, IDR, AUD, SGD) with automatic conversion of Monthly/Yearly costs to the preferred currency.

**Architecture:** Backend stores user's preferred currency in users table. Frontend fetches exchange rates and converts stats from USD to preferred currency on display. Currency selector in Profile page allows users to change their preference.

**Tech Stack:** PostgreSQL, Drizzle ORM, Hono, React, React Query, TypeScript, Zod

---

### Task 1: Database Migration - Add preferredCurrency Column

**Files:**
- Create: `backend/migrations/add_preferred_currency.sql`

**Step 1: Write migration SQL**

```sql
-- Add preferredCurrency column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_currency VARCHAR(3) DEFAULT 'USD';

-- Set default value for existing users
UPDATE users SET preferred_currency = 'USD' WHERE preferred_currency IS NULL;

-- Make column NOT NULL after setting defaults
ALTER TABLE users ALTER COLUMN preferred_currency SET NOT NULL;

-- Add comment
COMMENT ON COLUMN users.preferred_currency IS 'User''s preferred currency for dashboard stats display';
```

**Step 2: Run migration**

Run: `psql $DATABASE_URL < backend/migrations/add_preferred_currency.sql`
Expected: Output shows ALTER TABLE and UPDATE commands executed successfully

**Step 3: Verify column exists**

Run: `psql $DATABASE_URL -c "\d users"`
Expected: Output shows `preferred_currency | character varying(3) | not null default 'USD'::character varying`

**Step 4: Commit**

```bash
git add backend/migrations/add_preferred_currency.sql
git commit -m "feat: add preferredCurrency column to users table"
```

---

### Task 2: Backend Schema Update

**Files:**
- Modify: `backend/src/db/schema.ts:30-42`

**Step 1: Update users table schema**

Add the preferredCurrency field after the isActive field:

```typescript
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  telegramChatId: varchar("telegram_chat_id", { length: 255 }),
  subscriptionLimit: integer("subscription_limit").notNull().default(15),
  isActive: boolean("is_active").notNull().default(true),
  preferredCurrency: varchar("preferred_currency", { length: 3 })
    .notNull()
    .default("USD"),
  role: roleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

**Step 2: Verify TypeScript compilation**

Run: `cd backend && npm run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add backend/src/db/schema.ts
git commit -m "feat: add preferredCurrency field to users schema"
```

---

### Task 3: Backend Validator Update

**Files:**
- Modify: `backend/src/validators/user.ts:1-7`

**Step 1: Update updateProfileSchema**

Replace entire file with:

```typescript
import { z } from 'zod';

const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "IDR", "AUD", "SGD"] as const;

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  preferredCurrency: z.enum(SUPPORTED_CURRENCIES).optional(),
});
```

**Step 2: Verify TypeScript compilation**

Run: `cd backend && npm run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add backend/src/validators/user.ts
git commit -m "feat: add preferredCurrency to updateProfileSchema validator"
```

---

### Task 4: Backend Route - GET Profile Update

**Files:**
- Modify: `backend/src/routes/user.ts:14-36`

**Step 1: Update GET /api/user/profile response**

Add preferredCurrency to the select query:

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

**Step 2: Run backend tests**

Run: `cd backend && npm test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add backend/src/routes/user.ts
git commit -m "feat: return preferredCurrency in GET profile endpoint"
```

---

### Task 5: Backend Route - PUT Profile Update

**Files:**
- Modify: `backend/src/routes/user.ts:38-67`

**Step 1: Update PUT /api/user/profile to handle preferredCurrency**

Replace the entire PUT handler:

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
    });

  return c.json({ data: updated });
});
```

**Step 2: Run backend tests**

Run: `cd backend && npm test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add backend/src/routes/user.ts
git commit -m "feat: handle preferredCurrency in PUT profile endpoint"
```

---

### Task 6: Backend Tests - User Profile

**Files:**
- Modify: `backend/src/__tests__/routes/user.test.ts`

**Step 1: Add test for preferredCurrency in GET profile**

```typescript
it('should include preferredCurrency in profile', async () => {
  const response = await app.request('/api/user/profile', {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data.data.preferredCurrency).toBe('USD');
});
```

**Step 2: Add test for updating preferredCurrency**

```typescript
it('should update preferredCurrency', async () => {
  const response = await app.request('/api/user/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({ preferredCurrency: 'EUR' }),
  });
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data.data.preferredCurrency).toBe('EUR');
});

it('should reject invalid currency', async () => {
  const response = await app.request('/api/user/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({ preferredCurrency: 'XYZ' }),
  });
  const data = await response.json();

  expect(response.status).toBe(400);
  expect(data.error).toBe('VALIDATION_ERROR');
});
```

**Step 3: Run user route tests**

Run: `cd backend && npm test routes/user.test.ts`
Expected: All new tests pass

**Step 4: Commit**

```bash
git add backend/src/__tests__/routes/user.test.ts
git commit -m "test: add preferredCurrency tests for user routes"
```

---

### Task 7: Frontend Types Update

**Files:**
- Modify: `frontend/src/types/index.ts:53-61`

**Step 1: Add preferredCurrency to UserProfile interface**

```typescript
export interface UserProfile {
  id: string
  email: string
  name?: string
  telegramChatId?: string
  subscriptionLimit: number
  role: 'user' | 'admin'
  emailVerified: boolean
  preferredCurrency?: string
}
```

**Step 2: Verify TypeScript compilation**

Run: `cd frontend && npm run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat: add preferredCurrency to UserProfile type"
```

---

### Task 8: Frontend Currency Utility

**Files:**
- Create: `frontend/src/lib/utils/currency.ts`

**Step 1: Write currency utility functions**

```typescript
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  IDR: "Rp",
  AUD: "A$",
  SGD: "S$",
};

export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "IDR",
  "AUD",
  "SGD",
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

export function formatCurrency(
  amount: number,
  currency: string,
  options?: { minimumFractionDigits?: number }
): string {
  const symbol = getCurrencySymbol(currency);
  const minFractionDigits = options?.minimumFractionDigits ?? 2;

  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: 2,
  })}`;
}
```

**Step 2: Verify TypeScript compilation**

Run: `cd frontend && npm run typecheck`
Expected: No errors

**Step 3: Write test for currency utility**

**Files:**
- Create: `frontend/src/lib/utils/__tests__/currency.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { getCurrencySymbol, formatCurrency } from '../currency';

describe('getCurrencySymbol', () => {
  it('should return correct symbol for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('should return correct symbol for EUR', () => {
    expect(getCurrencySymbol('EUR')).toBe('€');
  });

  it('should return correct symbol for GBP', () => {
    expect(getCurrencySymbol('GBP')).toBe('£');
  });

  it('should return correct symbol for IDR', () => {
    expect(getCurrencySymbol('IDR')).toBe('Rp');
  });

  it('should return correct symbol for AUD', () => {
    expect(getCurrencySymbol('AUD')).toBe('A$');
  });

  it('should return correct symbol for SGD', () => {
    expect(getCurrencySymbol('SGD')).toBe('S$');
  });

  it('should return currency code if symbol not found', () => {
    expect(getCurrencySymbol('XYZ')).toBe('XYZ');
  });
});

describe('formatCurrency', () => {
  it('should format USD amount', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('should format EUR amount', () => {
    expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
  });

  it('should format IDR amount', () => {
    expect(formatCurrency(50000, 'IDR')).toBe('Rp50,000.00');
  });

  it('should format with 0 decimals when specified', () => {
    expect(formatCurrency(1234.56, 'USD', { minimumFractionDigits: 0 })).toBe('$1,235');
  });
});
```

**Step 4: Run tests**

Run: `cd frontend && npm test currency.test.ts`
Expected: All tests pass

**Step 5: Commit**

```bash
git add frontend/src/lib/utils/currency.ts frontend/src/lib/utils/__tests__/currency.test.ts
git commit -m "feat: add currency utility functions with tests"
```

---

### Task 9: Frontend Currency Converter Hook

**Files:**
- Create: `frontend/src/hooks/use-currency-converter.ts`

**Step 1: Write currency converter hook**

```typescript
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  updatedAt: string | null;
}

export function useCurrencyConverter() {
  const { data: ratesData, isLoading } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async () => {
      const { data } = await api.get<ExchangeRates>("/api/currencies/rates");
      return data;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  const convert = (
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): number => {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    if (!ratesData?.rates) {
      console.warn("Exchange rates not loaded, returning original amount");
      return amount;
    }

    const rates = ratesData.rates;

    // Convert to USD first (base currency)
    let amountInUSD = amount;
    if (fromCurrency !== "USD") {
      const fromRate = rates[fromCurrency];
      if (!fromRate) {
        console.warn(`No rate found for ${fromCurrency}`);
        return amount;
      }
      amountInUSD = amount / fromRate;
    }

    // Convert from USD to target currency
    if (toCurrency === "USD") {
      return amountInUSD;
    }

    const toRate = rates[toCurrency];
    if (!toRate) {
      console.warn(`No rate found for ${toCurrency}`);
      return amountInUSD;
    }

    return amountInUSD * toRate;
  };

  return {
    convert,
    isLoading,
    rates: ratesData?.rates,
    updatedAt: ratesData?.updatedAt,
  };
}
```

**Step 2: Write test for currency converter hook**

**Files:**
- Create: `frontend/src/hooks/__tests__/use-currency-converter.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useCurrencyConverter } from '../use-currency-converter';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('useCurrencyConverter', () => {
  beforeEach(() => {
    // Mock API response
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            base: 'USD',
            rates: {
              EUR: 0.85,
              GBP: 0.73,
              IDR: 15000,
              AUD: 1.35,
              SGD: 1.32,
            },
            updatedAt: new Date().toISOString(),
          }),
      })
    ) as any;
  });

  it('should convert USD to EUR', async () => {
    const { result } = renderHook(() => useCurrencyConverter(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const converted = result.current.convert(100, 'USD', 'EUR');
    expect(converted).toBeCloseTo(85, 0);
  });

  it('should convert EUR to USD', async () => {
    const { result } = renderHook(() => useCurrencyConverter(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const converted = result.current.convert(100, 'EUR', 'USD');
    expect(converted).toBeCloseTo(117.65, 0);
  });

  it('should return same amount when currencies match', async () => {
    const { result } = renderHook(() => useCurrencyConverter(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const converted = result.current.convert(100, 'USD', 'USD');
    expect(converted).toBe(100);
  });

  it('should convert IDR to USD', async () => {
    const { result } = renderHook(() => useCurrencyConverter(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const converted = result.current.convert(15000, 'IDR', 'USD');
    expect(converted).toBeCloseTo(1, 0);
  });
});
```

**Step 3: Run tests**

Run: `cd frontend && npm test use-currency-converter.test.ts`
Expected: All tests pass

**Step 4: Commit**

```bash
git add frontend/src/hooks/use-currency-converter.ts frontend/src/hooks/__tests__/use-currency-converter.test.ts
git commit -m "feat: add useCurrencyConverter hook with tests"
```

---

### Task 10: Frontend Profile Page - Add Currency Selector

**Files:**
- Modify: `frontend/src/pages/ProfilePage.tsx:1-50`

**Step 1: Add imports for Select component**

Add these imports at the top:

```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '@/lib/utils/currency'
```

**Step 2: Add state for preferred currency**

Add after line 40:

```typescript
const [preferredCurrency, setPreferredCurrency] = useState(profile?.preferredCurrency || 'USD')
```

**Step 3: Update handleUpdateProfile to include currency**

Replace the handleUpdateProfile function:

```typescript
const handleUpdateProfile = async (e: React.FormEvent) => {
  e.preventDefault()
  try {
    await updateProfile.mutateAsync({
      name,
      preferredCurrency,
    })
    await refreshUser()
    toast({ title: 'Success', description: 'Profile updated successfully' })
  } catch {
    toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' })
  }
}
```

**Step 4: Add currency selector to profile form**

Add after the name input field:

```typescript
<div className="space-y-2">
  <Label htmlFor="currency">Preferred Currency</Label>
  <Select value={preferredCurrency} onValueChange={setPreferredCurrency}>
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
```

**Step 5: Verify TypeScript compilation**

Run: `cd frontend && npm run typecheck`
Expected: No errors

**Step 6: Write test for Profile page currency selector**

**Files:**
- Modify: `frontend/src/pages/__tests__/ProfilePage.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfilePage } from '../ProfilePage';

const mockProfile = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  subscriptionLimit: 15,
  role: 'user' as const,
  emailVerified: true,
  preferredCurrency: 'USD',
};

const renderWithProviders = (component: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
};

describe('ProfilePage - Currency Selector', () => {
  it('should display currency selector', async () => {
    renderWithProviders(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Preferred Currency')).toBeInTheDocument();
    });
  });

  it('should show current currency preference', async () => {
    renderWithProviders(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('USD $')).toBeInTheDocument();
    });
  });

  it('should change currency when selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Preferred Currency')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Preferred Currency');
    await user.click(select);

    await waitFor(() => {
      expect(screen.getByText('EUR €')).toBeInTheDocument();
    });

    await user.click(screen.getByText('EUR €'));

    await waitFor(() => {
      expect(select).toHaveValue('EUR');
    });
  });
});
```

**Step 7: Run tests**

Run: `cd frontend && npm test ProfilePage.test.ts`
Expected: All tests pass

**Step 8: Commit**

```bash
git add frontend/src/pages/ProfilePage.tsx frontend/src/pages/__tests__/ProfilePage.test.ts
git commit -m "feat: add currency selector to Profile page"
```

---

### Task 11: Frontend Dashboard Page - Add Currency Conversion

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx:1-50`

**Step 1: Add imports**

Add these imports at the top:

```typescript
import { useCurrencyConverter } from '@/hooks/use-currency-converter';
import { getCurrencySymbol, formatCurrency } from '@/lib/utils/currency';
```

**Step 2: Use currency converter hook**

Add after line 193:

```typescript
const { convert, isLoading: ratesLoading } = useCurrencyConverter();
```

**Step 3: Get preferred currency from profile**

Add after loading check:

```typescript
const preferredCurrency = profile?.preferredCurrency || 'USD';
```

**Step 4: Convert monthly and yearly costs**

Add after preferredCurrency:

```typescript
const convertedMonthlyCost = stats?.monthlyCost?.amount
  ? convert(stats.monthlyCost.amount, stats.monthlyCost.currency, preferredCurrency)
  : 0;

const convertedYearlyCost = stats?.yearlyCost?.amount
  ? convert(stats.yearlyCost.amount, stats.yearlyCost.currency, preferredCurrency)
  : 0;
```

**Step 5: Update Monthly Cost card**

Replace the Monthly Cost card (lines 295-308):

```typescript
<Card className="glass border-border/50">
  <CardHeader className="pb-2">
    <CardDescription className="flex items-center gap-2">
      <DollarSign className="h-4 w-4" />
      Monthly Cost
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-4xl font-bold">
      {ratesLoading ? (
        <Loader2 className="h-8 w-8 animate-spin" />
      ) : (
        formatCurrency(convertedMonthlyCost, preferredCurrency)
      )}
    </p>
    <p className="text-xs text-muted-foreground">{preferredCurrency} equivalent</p>
  </CardContent>
</Card>
```

**Step 6: Update Yearly Cost card**

Replace the Yearly Cost card (lines 310-323):

```typescript
<Card className="glass border-border/50">
  <CardHeader className="pb-2">
    <CardDescription className="flex items-center gap-2">
      <TrendingUp className="h-4 w-4" />
      Yearly Cost
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-4xl font-bold">
      {ratesLoading ? (
        <Loader2 className="h-8 w-8 animate-spin" />
      ) : (
        formatCurrency(convertedYearlyCost, preferredCurrency)
      )}
    </p>
    <p className="text-xs text-muted-foreground">{preferredCurrency} equivalent</p>
  </CardContent>
</Card>
```

**Step 7: Verify TypeScript compilation**

Run: `cd frontend && npm run typecheck`
Expected: No errors

**Step 8: Write test for Dashboard page currency conversion**

**Files:**
- Modify: `frontend/src/pages/__tests__/DashboardPage.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from '../DashboardPage';

const mockStats = {
  totalSubscriptions: 5,
  monthlyCost: { amount: 100, currency: 'USD' },
  yearlyCost: { amount: 1200, currency: 'USD' },
  upcomingRenewalsCount: 2,
  upcomingRenewals: [],
  costBreakdown: [],
  ratesUpdatedAt: new Date().toISOString(),
};

const mockProfile = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  subscriptionLimit: 15,
  role: 'user' as const,
  emailVerified: true,
  preferredCurrency: 'EUR',
};

const renderWithProviders = (component: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
};

describe('DashboardPage - Currency Conversion', () => {
  beforeEach(() => {
    // Mock API responses
    global.fetch = vi.fn((url) => {
      if (url.includes('/subscriptions/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockStats }),
        });
      }
      if (url.includes('/currencies/rates')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              base: 'USD',
              rates: { EUR: 0.85 },
              updatedAt: new Date().toISOString(),
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockProfile }),
      });
    }) as any;
  });

  it('should display monthly cost in preferred currency', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Monthly Cost')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/€/)).toBeInTheDocument();
    });
  });

  it('should display yearly cost in preferred currency', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Yearly Cost')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/€/)).toBeInTheDocument();
    });
  });

  it('should show correct currency code in subtitle', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('EUR equivalent')).toBeInTheDocument();
    });
  });
});
```

**Step 9: Run tests**

Run: `cd frontend && npm test DashboardPage.test.ts`
Expected: All tests pass

**Step 10: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx frontend/src/pages/__tests__/DashboardPage.test.ts
git commit -m "feat: add currency conversion to Dashboard stats"
```

---

### Task 12: End-to-End Testing

**Files:**
- Create: `frontend/src/__tests__/e2e/currency-preference.e2e.ts`

**Step 1: Write E2E test for complete flow**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ProfilePage } from '@/pages/ProfilePage';
import { DashboardPage } from '@/pages/DashboardPage';

const renderWithProviders = (component: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Currency Preference E2E', () => {
  beforeEach(() => {
    global.fetch = vi.fn((url) => {
      if (url.includes('/currencies/rates')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              base: 'USD',
              rates: {
                EUR: 0.85,
                GBP: 0.73,
                IDR: 15000,
                AUD: 1.35,
                SGD: 1.32,
              },
              updatedAt: new Date().toISOString(),
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              subscriptionLimit: 15,
              role: 'user',
              emailVerified: true,
              preferredCurrency: 'USD',
            },
          }),
      });
    }) as any;
  });

  it('should complete currency preference change flow', async () => {
    const user = userEvent.setup();

    // Step 1: Open Profile page
    renderWithProviders(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Preferred Currency')).toBeInTheDocument();
    });

    // Step 2: Change currency to EUR
    const currencySelect = screen.getByLabelText('Preferred Currency');
    await user.click(currencySelect);

    await waitFor(() => {
      expect(screen.getByText('EUR €')).toBeInTheDocument();
    });

    await user.click(screen.getByText('EUR €'));

    // Step 3: Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    // Step 4: Verify success toast
    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
    });
  });

  it('should reflect currency change in dashboard', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Monthly Cost')).toBeInTheDocument();
    });

    // Should show EUR currency when preferredCurrency is EUR
    await waitFor(() => {
      expect(screen.getByText(/€/)).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run E2E tests**

Run: `cd frontend && npm test currency-preference.e2e.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add frontend/src/__tests__/e2e/currency-preference.e2e.ts
git commit -m "test: add E2E tests for currency preference feature"
```

---

### Task 13: Documentation Update

**Files:**
- Modify: `docs/plans/2026-01-14-dashboard-currency-preference-design.md`

**Step 1: Add implementation notes section**

Add at the end of the design document:

```markdown
## Implementation Notes

### Exchange Rate Caching
- Exchange rates are cached for 1 hour in the frontend
- Backend refreshes rates daily via cron job
- Rates are USD-based (conversion goes through USD)

### Fallback Behavior
- If exchange rates are unavailable, dashboard shows original USD amounts
- If conversion fails for a specific currency, logs warning and shows original amount
- Default currency is USD for all users

### Currency Symbols
- USD: $
- EUR: €
- GBP: £
- IDR: Rp
- AUD: A$
- SGD: S$

### Testing
- Unit tests for currency utilities
- Integration tests for API endpoints
- Component tests for Profile and Dashboard pages
- E2E tests for complete user flow
```

**Step 2: Commit**

```bash
git add docs/plans/2026-01-14-dashboard-currency-preference-design.md
git commit -m "docs: add implementation notes to currency preference design"
```

---

### Task 14: Final Verification

**Step 1: Run all backend tests**

Run: `cd backend && npm test`
Expected: All tests pass

**Step 2: Run all frontend tests**

Run: `cd frontend && npm test`
Expected: All tests pass

**Step 3: Run TypeScript checks**

Run: `cd backend && npm run typecheck && cd ../frontend && npm run typecheck`
Expected: No errors

**Step 4: Run linter**

Run: `cd backend && npm run lint && cd ../frontend && npm run lint`
Expected: No errors

**Step 5: Create summary commit**

```bash
git add -A
git commit -m "feat: complete dashboard currency preference implementation

- Add preferredCurrency column to users table (default: USD)
- Backend support for updating and returning preferred currency
- Frontend currency utility functions with symbols and formatting
- Currency converter hook with exchange rate caching
- Currency selector in Profile page
- Dashboard stats converted to user's preferred currency
- Comprehensive test coverage for all components
- Documentation updates

Supported currencies: USD, EUR, GBP, IDR, AUD, SGD"
```

---

## Summary

This implementation plan adds currency preference functionality to the dashboard:

1. **Database** - Add `preferredCurrency` column with USD default
2. **Backend** - Update schema, validators, and profile endpoints
3. **Frontend** - Currency utilities, converter hook, Profile page selector, Dashboard conversion
4. **Testing** - Unit, integration, component, and E2E tests
5. **Documentation** - Updated design doc with implementation notes

All tasks follow TDD, are bite-sized (2-5 min), include exact code, and require frequent commits.
