import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../db', () => {
  return {
    db: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    },
  };
});

vi.mock('../../lib/telegram', () => {
  return {
    sendTelegramMessage: vi.fn(),
  };
});

vi.mock('../../lib/crypto', () => {
  return {
    decryptAccountName: vi.fn((encrypted: string, userId: string) => encrypted),
  };
});

const { sendSubscriptionReminders, calculateNextRenewalDate, advancePassedRenewalDates } = await import('../../services/notifications');
import { db } from '../../db';

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendSubscriptionReminders', () => {
    it('should query active subscriptions with telegram users', async () => {
      (db.select as any).mockReturnValueOnce(db);
      (db.from as any).mockReturnValueOnce(db);
      (db.innerJoin as any).mockReturnValueOnce(db);
      (db.where as any).mockResolvedValueOnce([]);

      await sendSubscriptionReminders();

      expect(db.select).toHaveBeenCalled();
      expect(db.innerJoin).toHaveBeenCalled();
      expect(db.where).toHaveBeenCalled();
    });

    it('should not send notifications when no subscriptions returned', async () => {
      (db.select as any).mockReturnValueOnce(db);
      (db.from as any).mockReturnValueOnce(db);
      (db.innerJoin as any).mockReturnValueOnce(db);
      (db.where as any).mockResolvedValueOnce([]);

      await sendSubscriptionReminders();

      expect(db.insert).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (db.select as any).mockReturnValueOnce(db);
      (db.from as any).mockReturnValueOnce(db);
      (db.innerJoin as any).mockReturnValueOnce(db);
      (db.where as any).mockRejectedValueOnce(new Error('Database error'));

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
