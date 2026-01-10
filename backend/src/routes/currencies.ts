import { Hono } from 'hono';
import { getAllLatestRates, refreshExchangeRates } from '../services/currency';
import { requireAuth, requireAdmin } from '../middleware/auth';

const currencies = new Hono();

/**
 * GET /api/currencies/rates
 * Get all current exchange rates (public endpoint)
 */
currencies.get('/rates', async (c) => {
  const { rates, updatedAt } = await getAllLatestRates();

  return c.json({
    base: 'USD',
    rates,
    updatedAt: updatedAt?.toISOString() || null,
  });
});

/**
 * POST /api/currencies/refresh
 * Manually refresh exchange rates (admin only)
 * Query param: ?force=true to force refresh even if already fetched today
 */
currencies.post('/refresh', requireAuth, requireAdmin, async (c) => {
  const force = c.req.query('force') === 'true';
  const success = await refreshExchangeRates(force);

  if (!success) {
    return c.json({ error: 'Failed to refresh exchange rates' }, 500);
  }

  const { rates, updatedAt } = await getAllLatestRates();

  return c.json({
    message: force ? 'Exchange rates force refreshed successfully' : 'Exchange rates refreshed successfully',
    base: 'USD',
    rates,
    updatedAt: updatedAt?.toISOString() || null,
  });
});

export default currencies;
