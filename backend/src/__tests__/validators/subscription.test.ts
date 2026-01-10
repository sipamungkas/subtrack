import { describe, it, expect } from 'vitest';
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  subscriptionQuerySchema,
} from '../../validators/subscription';

describe('Subscription Validators', () => {
  describe('createSubscriptionSchema', () => {
    it('should validate valid subscription data', () => {
      const validData = {
        serviceName: 'Netflix',
        renewalDate: '2024-12-31',
        cost: '15.99',
        currency: 'USD',
        billingCycle: 'monthly',
        paymentMethod: 'Credit Card',
        accountName: 'user@example.com',
        reminderDays: [7, 3, 1],
        notes: 'Optional notes',
      };

      const result = createSubscriptionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should use default values for optional fields', () => {
      const minimalData = {
        serviceName: 'GitHub',
        renewalDate: '2024-12-31',
        cost: '10.00',
        paymentMethod: 'PayPal',
        accountName: 'dev@example.com',
      };

      const result = createSubscriptionSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('USD');
        expect(result.data.billingCycle).toBe('monthly');
        expect(result.data.reminderDays).toEqual([7, 3, 1]);
      }
    });

    it('should reject invalid date format', () => {
      const invalidData = {
        serviceName: 'Spotify',
        renewalDate: '31-12-2024', // Wrong format
        cost: '9.99',
        paymentMethod: 'Credit Card',
        accountName: 'user@example.com',
      };

      const result = createSubscriptionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid cost format', () => {
      const invalidData = {
        serviceName: 'Spotify',
        renewalDate: '2024-12-31',
        cost: 'invalid', // Not a number
        paymentMethod: 'Credit Card',
        accountName: 'user@example.com',
      };

      const result = createSubscriptionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid billing cycle', () => {
      const invalidData = {
        serviceName: 'Spotify',
        renewalDate: '2024-12-31',
        cost: '9.99',
        billingCycle: 'weekly', // Invalid option
        paymentMethod: 'Credit Card',
        accountName: 'user@example.com',
      };

      const result = createSubscriptionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject service name that is too long', () => {
      const invalidData = {
        serviceName: 'a'.repeat(256), // Exceeds max length
        renewalDate: '2024-12-31',
        cost: '9.99',
        paymentMethod: 'Credit Card',
        accountName: 'user@example.com',
      };

      const result = createSubscriptionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updateSubscriptionSchema', () => {
    it('should accept partial updates', () => {
      const partialData = {
        cost: '19.99',
      };

      const result = updateSubscriptionSchema.safeParse(partialData);
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      const result = updateSubscriptionSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate fields that are provided', () => {
      const invalidData = {
        renewalDate: 'invalid-date',
      };

      const result = updateSubscriptionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('subscriptionQuerySchema', () => {
    it('should validate active filter', () => {
      const result = subscriptionQuerySchema.safeParse({ active: 'true' });
      expect(result.success).toBe(true);
    });

    it('should validate upcoming filter', () => {
      const result = subscriptionQuerySchema.safeParse({ upcoming: 'true' });
      expect(result.success).toBe(true);
    });

    it('should accept no filters', () => {
      const result = subscriptionQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject invalid active value', () => {
      const result = subscriptionQuerySchema.safeParse({ active: 'yes' });
      expect(result.success).toBe(false);
    });
  });
});
