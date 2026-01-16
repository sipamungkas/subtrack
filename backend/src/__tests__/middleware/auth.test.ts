import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContext } from '../mocks/context';

// Mock db module
vi.mock('../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  },
}));

// Mock auth module
vi.mock('../../lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

import { auth } from '../../lib/auth';
import { db } from '../../db';
import { requireAuth, requireAdmin } from '../../middleware/auth';

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should allow authenticated users', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'user@example.com', role: 'user' },
        session: { id: 'session-1' },
      };

      (auth.api.getSession as any).mockResolvedValue(mockSession);

      const setFn = vi.fn();
      const ctx = createMockContext({
        set: setFn,
      });
      const next = vi.fn();

      (db.select as any).mockReturnValue(db);
      (db.from as any).mockReturnValue(db);
      (db.where as any).mockResolvedValue([{ preferredCurrency: 'USD' }]);

      await requireAuth(ctx, next);

      expect(setFn).toHaveBeenCalledWith('user', { ...mockSession.user, preferredCurrency: 'USD' });
      expect(setFn).toHaveBeenCalledWith('session', mockSession.session);
      expect(next).toHaveBeenCalled();
    });

    it('should reject unauthenticated users', async () => {
      (auth.api.getSession as any).mockResolvedValue(null);

      const ctx = createMockContext();
      const next = vi.fn();

      const result = await requireAuth(ctx, next);

      expect(result).toEqual({
        data: { error: 'UNAUTHORIZED', message: 'Authentication required' },
        status: 401,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle session retrieval errors', async () => {
      (auth.api.getSession as any).mockRejectedValue(new Error('Session error'));

      const ctx = createMockContext();
      const next = vi.fn();

      await expect(requireAuth(ctx, next)).rejects.toThrow('Session error');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin users', async () => {
      const mockSession = {
        user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
        session: { id: 'session-1' },
      };

      (auth.api.getSession as any).mockResolvedValue(mockSession);

      // Mock db query for admin role
      (db.select as any).mockReturnValue(db);
      (db.from as any).mockReturnValue(db);
      (db.where as any).mockResolvedValue([{ role: 'admin' }]);

      const userData = { role: 'admin' };
      const setFn = vi.fn();
      const ctx = createMockContext({
        get: (key: string) => (key === 'user' ? userData : null),
        set: setFn,
      });
      const next = vi.fn();

      await requireAdmin(ctx, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject non-admin users', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'user@example.com', role: 'user' },
        session: { id: 'session-1' },
      };

      (auth.api.getSession as any).mockResolvedValue(mockSession);

      // Mock db query for non-admin role
      (db.select as any).mockReturnValue(db);
      (db.from as any).mockReturnValue(db);
      (db.where as any).mockResolvedValue([{ role: 'user' }]);

      const userData = { role: 'user' };
      const setFn = vi.fn();
      const ctx = createMockContext({
        get: (key: string) => (key === 'user' ? userData : null),
        set: setFn,
      });
      const next = vi.fn();

      // requireAdmin calls requireAuth first, which sets the user
      // We need to make ctx.get return the user after it's been set
      let storedUser: any = null;
      ctx.get = (key: string) => {
        if (key === 'user') return storedUser || userData;
        return null;
      };
      ctx.set = (key: string, value: any) => {
        if (key === 'user') storedUser = value;
      };

      const result = await requireAdmin(ctx, next);

      expect(result).toEqual({
        data: { error: 'FORBIDDEN', message: 'Admin access required' },
        status: 403,
      });
    });

    it('should reject unauthenticated users', async () => {
      (auth.api.getSession as any).mockResolvedValue(null);

      const ctx = createMockContext();
      const next = vi.fn();

      const result = await requireAdmin(ctx, next);

      expect(result).toEqual({
        data: { error: 'UNAUTHORIZED', message: 'Authentication required' },
        status: 401,
      });
    });
  });
});
