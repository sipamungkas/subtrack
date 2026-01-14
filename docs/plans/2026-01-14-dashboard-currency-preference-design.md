# Dashboard Currency Preference Design

## Overview
Add user settings to choose what currency to display in the dashboard stats. Users can select from USD, EUR, GBP, IDR, AUD, or SGD. The dashboard stats will be converted to the user's preferred currency.

## Requirements

### User Preferences
- Users can select their preferred currency from: USD, EUR, GBP, IDR, AUD, SGD
- Default currency is USD for all existing and new users
- Preference is stored in the user profile
- Setting is accessible via the Profile page

### Dashboard Display
- Monthly and Yearly cost stats display in the user's preferred currency
- Currency symbols and codes are properly displayed
- Shows 2 decimal places for converted amounts
- "USD equivalent" subtitle changes to the selected currency

## Architecture

### Database Schema
Add `preferredCurrency` field to users table:
- Type: `varchar(3)`
- Default: `"USD"`
- Nullable: Yes (for backward compatibility)

### Backend Changes

**Schema (backend/src/db/schema.ts)**
```typescript
export const users = pgTable("users", {
  // ... existing fields
  preferredCurrency: varchar("preferred_currency", { length: 3 }).default("USD"),
  // ...
});
```

**Validator (backend/src/validators/user.ts)**
```typescript
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  preferredCurrency: z.enum(["USD", "EUR", "GBP", "IDR", "AUD", "SGD"]).optional(),
});
```

**User Route (backend/src/routes/user.ts)**
- Update GET /api/user/profile to return preferredCurrency
- Update PUT /api/user/profile to accept and save preferredCurrency

### Frontend Changes

**Types (frontend/src/types/index.ts)**
```typescript
export interface UserProfile {
  // ... existing fields
  preferredCurrency?: string
}
```

**Currency Utility (frontend/src/lib/utils/currency.ts)**
```typescript
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  IDR: "Rp",
  AUD: "A$",
  SGD: "S$",
};

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}
```

**Currency Converter Hook (frontend/src/hooks/use-currency-converter.ts)**
- Fetches exchange rates from /api/currencies/rates
- Provides a function to convert amounts between currencies
- Caches rates to avoid repeated API calls

**Profile Page (frontend/src/pages/ProfilePage.tsx)**
- Add currency dropdown to "Account Information" card
- Available options: USD, EUR, GBP, IDR, AUD, SGD
- Save preference via updateProfile mutation

**Dashboard Page (frontend/src/pages/DashboardPage.tsx)**
- Fetch user profile to get preferredCurrency
- Convert stats amounts using useCurrencyConverter hook
- Display converted amounts with proper currency symbols
- Update subtitle to show selected currency

## Data Flow

### Setting Currency Preference
1. User selects currency in Profile page dropdown
2. User clicks "Save Changes"
3. Frontend sends PUT /api/user/profile with `{ preferredCurrency: "IDR" }`
4. Backend validates and updates users table
5. Frontend refreshes profile data
6. Preference is persisted

### Displaying Converted Stats
1. DashboardPage loads and fetches profile (includes preferredCurrency)
2. DashboardPage fetches stats (USD-based costs)
3. DashboardPage fetches exchange rates from /api/currencies/rates
4. Frontend converts amounts from USD to preferred currency
5. Converted amounts displayed with correct symbols

## Implementation Order

1. **Database Migration**
   - Add preferredCurrency column to users table
   - Set default value to "USD" for existing records

2. **Backend Updates**
   - Update schema definition
   - Update validators
   - Update profile endpoint

3. **Frontend Utilities**
   - Create currency utility functions
   - Create currency converter hook

4. **Frontend UI**
   - Update types
   - Add currency selector to Profile page
   - Update Dashboard to use converted amounts

5. **Testing**
   - Test setting currency preference
   - Test dashboard stats display in different currencies
   - Test conversion accuracy
   - Test default USD behavior

## Error Handling

- If exchange rates are unavailable, fallback to displaying in USD
- If currency conversion fails, show original USD amount with warning
- Validate currency codes on backend to prevent invalid values

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
- Unit tests for currency utilities (getCurrencySymbol, formatCurrency)
- Unit tests for currency converter hook (useCurrencyConverter)
- Integration tests for API endpoints (GET/PUT profile with preferredCurrency)
- Component tests for Profile page currency selector
- Component tests for Dashboard page currency conversion
- E2E tests for complete currency preference flow
