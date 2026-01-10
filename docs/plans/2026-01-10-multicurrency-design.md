# Multi-Currency Exchange Rate Feature Design

## Overview

Add daily currency exchange rate fetching from Fixer.io API to support multi-currency subscription tracking. Rates are stored in the database and used to convert subscription costs to USD for dashboard totals.

## Approach

- **Per-subscription currencies**: Each subscription keeps its own currency
- **Dashboard totals in USD**: All costs are converted to USD for aggregate stats
- **Daily rate updates**: Cron job fetches rates from Fixer.io at 2:00 AM UTC

## Database Schema

New `currency_rates` table:

```sql
currency_rates
├── id (uuid, primary key)
├── base_currency (varchar) - always "USD"
├── target_currency (varchar) - e.g., "EUR", "GBP", "IDR"
├── rate (decimal) - exchange rate (1 USD = X target)
├── fetched_at (timestamp) - when this rate was fetched
├── created_at (timestamp)
```

- Rates stored with USD as base currency
- Old rates pruned after 30 days (weekly cleanup)

## Fixer.io API Integration

**Endpoint:** `http://data.fixer.io/api/latest?access_key=API_KEY`

**Note:** Free tier only supports EUR as base. We convert mathematically to USD base:

```typescript
// Fixer returns EUR-based rates
// EUR → USD = 1.163462
// EUR → IDR = 19595.776155

// Convert to USD base:
// USD → IDR = EUR→IDR / EUR→USD
// USD → IDR = 19595.776155 / 1.163462 = 16,843.12
```

**Environment Variable:** `FIXER_API_KEY`

## API Endpoints

### GET /api/currencies/rates
Returns current exchange rates.

```json
{
  "base": "USD",
  "rates": { "EUR": 0.859, "GBP": 0.746, "IDR": 16843.12 },
  "updatedAt": "2026-01-10T02:00:00Z"
}
```

### GET /api/subscriptions/stats (updated)
Returns subscription stats with converted totals.

```json
{
  "totalSubscriptions": 5,
  "monthlyCost": { "amount": 76.92, "currency": "USD" },
  "yearlyCost": { "amount": 923.04, "currency": "USD" },
  "upcomingRenewals": 2,
  "costBreakdown": [
    { "currency": "USD", "amount": 50.00, "convertedToUSD": 50.00 },
    { "currency": "EUR", "amount": 15.99, "convertedToUSD": 18.62 },
    { "currency": "IDR", "amount": 150000, "convertedToUSD": 8.90 }
  ]
}
```

## Cron Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Currency update | 2:00 AM UTC daily | Fetch rates from Fixer, convert to USD base, store |
| Notifications | 8:00 AM UTC daily | Existing job |
| Rate pruning | 3:00 AM UTC weekly | Delete rates older than 30 days |

## Error Handling

- **API failure**: Log error, continue using last known rates
- **Missing API key**: Skip currency fetch, log warning at startup
- **Missing rate for currency**: Treat as 1.0 (same as USD), log warning

## Files to Create/Modify

```
src/db/schema.ts           → Add currencyRates table
src/services/currency.ts   → New service for rate fetching/conversion
src/cron/index.ts          → Add currency update job
src/routes/currencies.ts   → New route for rates endpoint
src/routes/subscriptions.ts → Update stats with conversion
```

## Frontend Changes (Future)

- Dashboard stats show totals in USD
- Each subscription displays original currency
- Optional: "(≈ $X.XX)" hint next to non-USD subscriptions
