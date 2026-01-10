import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to avoid hoisting issues
const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../../db', () => ({
  db: mockDb,
}));

// Mock telegram utilities
vi.mock('../../lib/telegram', () => ({
  sendTelegramMessage: vi.fn(),
}));

import { handleStart, handleDisconnect, handleTest } from '../../bot/commands';

describe('Bot Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('handleStart', () => {
    it('should show welcome message without code', async () => {
      const mockCtx: any = {
        message: { text: '/start' },
        chat: { id: 123456 },
        reply: vi.fn(),
      };

      await handleStart(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Welcome to SubTrack')
      );
    });

    it('should verify code when provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      const mockCtx: any = {
        message: { text: '/start ABC12345' },
        chat: { id: 123456 },
        reply: vi.fn(),
      };

      await handleStart(mockCtx);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/telegram/verify'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('ABC12345'),
        })
      );
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Connected successfully')
      );
    });

    it('should handle verification failure', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Invalid code' }),
      });
      global.fetch = mockFetch;

      const mockCtx: any = {
        message: { text: '/start INVALID' },
        chat: { id: 123456 },
        reply: vi.fn(),
      };

      await handleStart(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Invalid code')
      );
    });

    it('should handle missing chat ID', async () => {
      const mockCtx: any = {
        message: { text: '/start ABC12345' },
        chat: null,
        reply: vi.fn(),
      };

      await handleStart(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Unable to get chat ID')
      );
    });

    it('should handle network errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      const mockCtx: any = {
        message: { text: '/start ABC12345' },
        chat: { id: 123456 },
        reply: vi.fn(),
      };

      await handleStart(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('error occurred')
      );
    });
  });

  describe('handleDisconnect', () => {
    it('should disconnect user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        telegramChatId: '123456',
      };

      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.limit.mockResolvedValue([mockUser]);

      mockDb.update.mockReturnValue(mockDb);
      mockDb.set.mockReturnValue(mockDb);
      mockDb.where.mockResolvedValue({});

      const mockCtx: any = {
        chat: { id: 123456 },
        reply: vi.fn(),
      };

      await handleDisconnect(mockCtx);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Disconnected successfully')
      );
    });

    it('should handle user not found', async () => {
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.limit.mockResolvedValue([]);

      const mockCtx: any = {
        chat: { id: 123456 },
        reply: vi.fn(),
      };

      await handleDisconnect(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('No connected account found')
      );
    });

    it('should handle missing chat ID', async () => {
      const mockCtx: any = {
        chat: null,
        reply: vi.fn(),
      };

      await handleDisconnect(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Unable to get chat ID')
      );
    });

    it('should handle database errors', async () => {
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.limit.mockRejectedValue(new Error('Database error'));

      const mockCtx: any = {
        chat: { id: 123456 },
        reply: vi.fn(),
      };

      await handleDisconnect(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('error occurred')
      );
    });
  });

  describe('handleTest', () => {
    it('should send test message successfully', async () => {
      const mockUser = {
        id: 'user-1',
        telegramChatId: '123456',
      };

      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.limit.mockResolvedValue([mockUser]);

      const mockCtx: any = {
        chat: { id: 123456 },
        reply: vi.fn(),
      };

      await handleTest(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Test Notification')
      );
    });

    it('should handle user not connected', async () => {
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.limit.mockResolvedValue([]);

      const mockCtx: any = {
        chat: { id: 123456 },
        reply: vi.fn(),
      };

      await handleTest(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('No connected account found')
      );
    });

    it('should handle missing chat ID', async () => {
      const mockCtx: any = {
        chat: null,
        reply: vi.fn(),
      };

      await handleTest(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Unable to get chat ID')
      );
    });
  });
});
