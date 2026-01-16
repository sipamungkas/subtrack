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
    decryptAccountName: vi.fn((encrypted: string, userId: string) => {
      if (encrypted.startsWith('enc:THROW_ERROR')) {
        throw new Error('Decryption failed');
      }
      if (!encrypted.startsWith('enc:')) {
        return encrypted;
      }
      return encrypted.replace('enc:', '');
    }),
  };
});

const { sendSubscriptionReminders, calculateNextRenewalDate, advancePassedRenewalDates, formatReminderMessage } = await import('../../services/notifications');
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

describe('formatReminderMessage', () => {
  it('should format message with encrypted email accountName', () => {
    const subscription = {
      id: 'sub-1',
      userId: 'user-1',
      serviceName: 'Netflix',
      renewalDate: '2026-02-01',
      cost: '15.99',
      currency: 'USD',
      paymentMethod: 'Credit Card',
      accountName: 'enc:user@example.com',
      reminderDays: [7, 3, 1],
      billingCycle: 'monthly',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      customIntervalDays: null,
      notes: 'Family plan',
    };

    const message = formatReminderMessage(subscription, 3);

    expect(message).toContain('Netflix');
    expect(message).toContain('*Renews in:* 3 days');
    expect(message).toContain('15.99');
    expect(message).toContain('Credit Card');
    expect(message).toContain('u\\*\\*\\*@example.com');
    expect(message).toContain('Family plan');
  });

  it('should format message with plaintext accountName', () => {
    const subscription = {
      id: 'sub-1',
      userId: 'user-1',
      serviceName: 'Spotify',
      renewalDate: '2026-02-01',
      cost: '9.99',
      currency: 'USD',
      paymentMethod: 'PayPal',
      accountName: 'my_spotify_account',
      reminderDays: [7, 3, 1],
      billingCycle: 'monthly',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      customIntervalDays: null,
      notes: null,
    };

    const message = formatReminderMessage(subscription, 7);

    expect(message).toContain('Spotify');
    expect(message).toContain('*Renews in:* 7 days');
    expect(message).toContain('my_spotify_account');
  });

  it('should handle decryption failures gracefully', () => {
    const subscription = {
      id: 'sub-1',
      userId: 'user-1',
      serviceName: 'YouTube',
      renewalDate: '2026-02-01',
      cost: '11.99',
      currency: 'USD',
      paymentMethod: 'Credit Card',
      accountName: 'enc:THROW_ERROR',
      reminderDays: [7, 3, 1],
      billingCycle: 'monthly',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      customIntervalDays: null,
      notes: null,
    };

    const message = formatReminderMessage(subscription, 1);

    expect(message).toContain('YouTube');
    expect(message).toContain('*Renews in:* 1 day');
    expect(message).toContain('[Decryption failed]');
  });

  it('should use urgent emoji for 1 day remaining', () => {
    const subscription = {
      id: 'sub-1',
      userId: 'user-1',
      serviceName: 'Netflix',
      renewalDate: '2026-02-01',
      cost: '15.99',
      currency: 'USD',
      paymentMethod: 'Credit Card',
      accountName: 'enc:user@example.com',
      reminderDays: [7, 3, 1],
      billingCycle: 'monthly',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      customIntervalDays: null,
      notes: null,
    };

    const message = formatReminderMessage(subscription, 1);

    expect(message).toContain('🚨');
  });

  it('should use warning emoji for 3 days remaining', () => {
    const subscription = {
      id: 'sub-1',
      userId: 'user-1',
      serviceName: 'Netflix',
      renewalDate: '2026-02-01',
      cost: '15.99',
      currency: 'USD',
      paymentMethod: 'Credit Card',
      accountName: 'enc:user@example.com',
      reminderDays: [7, 3, 1],
      billingCycle: 'monthly',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      customIntervalDays: null,
      notes: null,
    };

    const message = formatReminderMessage(subscription, 3);

    expect(message).toContain('⚠️');
  });

  it('should use bell emoji for 7+ days remaining', () => {
    const subscription = {
      id: 'sub-1',
      userId: 'user-1',
      serviceName: 'Netflix',
      renewalDate: '2026-02-01',
      cost: '15.99',
      currency: 'USD',
      paymentMethod: 'Credit Card',
      accountName: 'enc:user@example.com',
      reminderDays: [7, 3, 1],
      billingCycle: 'monthly',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      customIntervalDays: null,
      notes: null,
    };

    const message = formatReminderMessage(subscription, 7);

    expect(message).toContain('🔔');
  });
});
