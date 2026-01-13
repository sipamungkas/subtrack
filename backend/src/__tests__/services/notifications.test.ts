import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to avoid hoisting issues
const { mockDb, mockSendTelegramMessage } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
  },
  mockSendTelegramMessage: vi.fn(),
}));

vi.mock('../../db', () => ({
  db: mockDb,
}));

vi.mock('../../lib/telegram', () => ({
  sendTelegramMessage: mockSendTelegramMessage,
}));

import { sendSubscriptionReminders, calculateNextRenewalDate, advancePassedRenewalDates } from '../../services/notifications';

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendSubscriptionReminders', () => {
    it('should query active subscriptions with telegram users', async () => {
      // Mock database returning empty subscriptions
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.innerJoin.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([]);

      await sendSubscriptionReminders();

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.innerJoin).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockSendTelegramMessage).not.toHaveBeenCalled();
    });

    it('should not send notifications when no subscriptions returned', async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.innerJoin.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([]);

      await sendSubscriptionReminders();

      expect(mockSendTelegramMessage).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Mock database error
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.innerJoin.mockReturnValueOnce(mockDb);
      mockDb.where.mockRejectedValueOnce(new Error('Database error'));

      // Should not throw
      await expect(sendSubscriptionReminders()).resolves.not.toThrow();
    });
  });
});

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
