import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
};

const mockSendTelegramMessage = vi.fn();

vi.mock('../../db', () => ({
  db: mockDb,
}));

vi.mock('../../lib/telegram', () => ({
  sendTelegramMessage: mockSendTelegramMessage,
}));

import { sendSubscriptionReminders } from '../../services/notifications';

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendSubscriptionReminders', () => {
    it('should send reminders for subscriptions with matching reminder days', async () => {
      const today = new Date();
      const renewalDate = new Date(today);
      renewalDate.setDate(renewalDate.getDate() + 7); // 7 days from now

      const mockSubscriptions = [
        {
          subscription: {
            id: 'sub-1',
            serviceName: 'Netflix',
            renewalDate: renewalDate.toISOString().split('T')[0],
            cost: '15.99',
            currency: 'USD',
            paymentMethod: 'Credit Card',
            accountName: 'user@example.com',
            reminderDays: [7, 3, 1],
            notes: null,
            isActive: true,
          },
          user: {
            id: 'user-1',
            telegramChatId: '123456',
            isActive: true,
          },
        },
      ];

      // Mock database queries
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.innerJoin.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockSubscriptions);

      // Mock no existing log
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);

      // Mock successful telegram send
      mockSendTelegramMessage.mockResolvedValue(true);

      // Mock insert for notification log
      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockResolvedValueOnce({});

      await sendSubscriptionReminders();

      expect(mockSendTelegramMessage).toHaveBeenCalledWith(
        '123456',
        expect.stringContaining('Netflix')
      );
    });

    it('should skip subscriptions already notified today', async () => {
      const today = new Date();
      const renewalDate = new Date(today);
      renewalDate.setDate(renewalDate.getDate() + 3);

      const mockSubscriptions = [
        {
          subscription: {
            id: 'sub-1',
            serviceName: 'Spotify',
            renewalDate: renewalDate.toISOString().split('T')[0],
            cost: '9.99',
            currency: 'USD',
            paymentMethod: 'PayPal',
            accountName: 'user@example.com',
            reminderDays: [3, 1],
            notes: null,
            isActive: true,
          },
          user: {
            id: 'user-1',
            telegramChatId: '123456',
            isActive: true,
          },
        },
      ];

      // Mock database queries
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.innerJoin.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockSubscriptions);

      // Mock existing log (already sent today)
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([{ id: 'log-1' }]);

      await sendSubscriptionReminders();

      expect(mockSendTelegramMessage).not.toHaveBeenCalled();
    });

    it('should log failed notifications', async () => {
      const today = new Date();
      const renewalDate = new Date(today);
      renewalDate.setDate(renewalDate.getDate() + 1);

      const mockSubscriptions = [
        {
          subscription: {
            id: 'sub-1',
            serviceName: 'GitHub',
            renewalDate: renewalDate.toISOString().split('T')[0],
            cost: '10.00',
            currency: 'USD',
            paymentMethod: 'Credit Card',
            accountName: 'dev@example.com',
            reminderDays: [1],
            notes: null,
            isActive: true,
          },
          user: {
            id: 'user-1',
            telegramChatId: '123456',
            isActive: true,
          },
        },
      ];

      // Mock database queries
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.innerJoin.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockSubscriptions);

      // Mock no existing log
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);

      // Mock failed telegram send
      mockSendTelegramMessage.mockResolvedValue(false);

      // Mock insert for notification log
      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockResolvedValueOnce({});

      await sendSubscriptionReminders();

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
        })
      );
    });

    it('should skip subscriptions without matching reminder days', async () => {
      const today = new Date();
      const renewalDate = new Date(today);
      renewalDate.setDate(renewalDate.getDate() + 5); // 5 days

      const mockSubscriptions = [
        {
          subscription: {
            id: 'sub-1',
            serviceName: 'Amazon Prime',
            renewalDate: renewalDate.toISOString().split('T')[0],
            cost: '12.99',
            currency: 'USD',
            paymentMethod: 'Credit Card',
            accountName: 'user@example.com',
            reminderDays: [7, 3, 1], // No 5-day reminder
            notes: null,
            isActive: true,
          },
          user: {
            id: 'user-1',
            telegramChatId: '123456',
            isActive: true,
          },
        },
      ];

      // Mock database queries
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.innerJoin.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockSubscriptions);

      await sendSubscriptionReminders();

      expect(mockSendTelegramMessage).not.toHaveBeenCalled();
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
