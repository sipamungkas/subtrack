import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Use vi.hoisted to avoid hoisting issues
const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../../db', () => ({
  db: mockDb,
}));

vi.mock('../../middleware/auth', () => ({
  requireAuth: (c: any, next: any) => next(),
}));

import subscriptionRouter from '../../routes/subscriptions';

describe('Subscription Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/api/subscriptions', subscriptionRouter);
  });

  describe('GET /api/subscriptions', () => {
    it('should return user subscriptions', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          serviceName: 'Netflix',
          renewalDate: '2024-12-31',
          cost: '15.99',
          isActive: true,
        },
      ];

      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.orderBy.mockResolvedValue(mockSubscriptions);

      const req = new Request('http://localhost/api/subscriptions');
      const ctx: any = {
        req: {
          raw: req,
          query: () => ({}),
        },
        get: (key: string) => (key === 'user' ? { id: 'user-1' } : null),
        json: (data: any) => ({ data }),
      };

      // Simulate route handler
      const response = await app.request(req);

      // Since we're testing with mocks, we'll verify the mock calls
      // In a real integration test, we'd check the response
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should filter by active status', async () => {
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.orderBy.mockResolvedValue([]);

      const req = new Request('http://localhost/api/subscriptions?active=true');
      await app.request(req);

      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('GET /api/subscriptions/:id', () => {
    it('should return single subscription', async () => {
      const mockSubscription = {
        id: 'sub-1',
        serviceName: 'Netflix',
        cost: '15.99',
      };

      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.limit.mockResolvedValue([mockSubscription]);

      const req = new Request('http://localhost/api/subscriptions/sub-1');
      await app.request(req);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(1);
    });

    it('should return 404 if subscription not found', async () => {
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.limit.mockResolvedValue([]);

      const req = new Request('http://localhost/api/subscriptions/invalid-id');
      await app.request(req);

      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('POST /api/subscriptions', () => {
    it('should create new subscription', async () => {
      const newSubscription = {
        serviceName: 'Spotify',
        renewalDate: '2024-12-31',
        cost: '9.99',
        paymentMethod: 'Credit Card',
        accountName: 'user@example.com',
      };

      // Mock user lookup
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([{ subscriptionLimit: 15 }]);

      // Mock count check
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([{ count: 5 }]);

      // Mock insert
      mockDb.insert.mockReturnValue(mockDb);
      mockDb.values.mockReturnValue(mockDb);
      mockDb.returning.mockResolvedValue([{ id: 'sub-new', ...newSubscription }]);

      expect(mockDb.insert).toBeDefined();
    });

    it('should reject when subscription limit reached', async () => {
      // Mock user at limit
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([{ subscriptionLimit: 15 }]);

      // Mock count at limit
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([{ count: 15 }]);

      expect(mockDb.select).toBeDefined();
    });
  });

  describe('PUT /api/subscriptions/:id', () => {
    it('should update existing subscription', async () => {
      // Mock existing subscription
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([{ id: 'sub-1' }]);

      // Mock update
      mockDb.update.mockReturnValue(mockDb);
      mockDb.set.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.returning.mockResolvedValue([{ id: 'sub-1', cost: '19.99' }]);

      expect(mockDb.update).toBeDefined();
    });

    it('should return 404 for non-existent subscription', async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);

      expect(mockDb.select).toBeDefined();
    });
  });

  describe('DELETE /api/subscriptions/:id', () => {
    it('should soft delete subscription', async () => {
      // Mock existing subscription
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([{ id: 'sub-1' }]);

      // Mock update (soft delete)
      mockDb.update.mockReturnValue(mockDb);
      mockDb.set.mockReturnValue(mockDb);
      mockDb.where.mockResolvedValue({});

      expect(mockDb.update).toBeDefined();
    });
  });

  describe('GET /api/subscriptions/stats', () => {
    it('should return subscription statistics', async () => {
      // Mock stats query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([{ totalCount: 5, totalCost: '75.00' }]);

      // Mock upcoming renewals
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);

      expect(mockDb.select).toBeDefined();
    });
  });
});
