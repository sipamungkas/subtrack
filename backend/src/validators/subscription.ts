import { z } from 'zod';

const baseSubscriptionSchema = z.object({
  serviceName: z.string().min(1).max(255),
  renewalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cost: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().length(3).default('USD'),
  billingCycle: z.enum(['monthly', 'yearly', 'quarterly', 'custom']).default('monthly'),
  customIntervalDays: z.number().int().positive().optional(),
  paymentMethod: z.string().min(1),
  accountName: z.string().min(1).max(255),
  reminderDays: z.array(z.number().int().positive()).default([7, 3, 1]),
  notes: z.string().optional(),
});

export const createSubscriptionSchema = baseSubscriptionSchema.superRefine((data, ctx) => {
  if (data.billingCycle === 'custom' && !data.customIntervalDays) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'customIntervalDays is required when billingCycle is custom',
      path: ['customIntervalDays'],
    });
  }
});

export const updateSubscriptionSchema = baseSubscriptionSchema.partial().superRefine((data, ctx) => {
  // Only validate if billingCycle is being set to custom
  if (data.billingCycle === 'custom' && data.customIntervalDays === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'customIntervalDays is required when billingCycle is custom',
      path: ['customIntervalDays'],
    });
  }
});

export const subscriptionQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional(),
  upcoming: z.enum(['true', 'false']).optional(),
});
