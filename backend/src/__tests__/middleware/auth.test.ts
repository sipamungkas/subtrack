import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContext } from '../mocks/context';

// Use vi.hoisted to avoid hoisting issues
const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}));

vi.mock('../../lib/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

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

      mockGetSession.mockResolvedValue(mockSession);

      const setFn = vi.fn();
      const ctx = createMockContext({
        set: setFn,
      });
      const next = vi.fn();

      await requireAuth(ctx, next);

      expect(setFn).toHaveBeenCalledWith('user', mockSession.user);
      expect(setFn).toHaveBeenCalledWith('session', mockSession.session);
      expect(next).toHaveBeenCalled();
    });

    it('should reject unauthenticated users', async () => {
      mockGetSession.mockResolvedValue(null);

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
      mockGetSession.mockRejectedValue(new Error('Session error'));

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

      mockGetSession.mockResolvedValue(mockSession);

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

      mockGetSession.mockResolvedValue(mockSession);

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
      mockGetSession.mockResolvedValue(null);

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
