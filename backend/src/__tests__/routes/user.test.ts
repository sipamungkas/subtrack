import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

vi.mock('../../db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}));

vi.mock('../../middleware/auth', () => ({
  requireAuth: async (c: any, next: any) => {
    c.set('user', { id: 'user-1', email: 'test@example.com', role: 'user' });
    await next();
  },
}));

import userRouter from '../../routes/user';
import { db } from '../../db';

const userToken = 'mock-jwt-token';

describe('User Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/api/user', userRouter);
  });

  describe('GET /api/user/profile', () => {
    it('should include preferredCurrency in profile', async () => {
      const mockProfile = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        telegramChatId: null,
        subscriptionLimit: 10,
        role: 'user',
        emailVerified: true,
        preferredCurrency: 'USD',
      };

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockProfile]),
        }),
      });

      const response = await app.request('/api/user/profile', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.preferredCurrency).toBe('USD');
    });
  });

  describe('PUT /api/user/profile', () => {
    it('should update preferredCurrency', async () => {
      const updatedProfile = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        preferredCurrency: 'EUR',
      };

      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedProfile]),
          }),
        }),
      });

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
  });
});
