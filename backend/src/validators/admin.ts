import { z } from 'zod';

export const updateUserLimitSchema = z.object({
  subscriptionLimit: z.number().int().positive().min(1).max(1000),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().positive()).default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default('20'),
});
