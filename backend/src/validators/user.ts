import { z } from 'zod';

const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "IDR", "AUD", "SGD"] as const;

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  preferredCurrency: z.enum(SUPPORTED_CURRENCIES).optional(),
});
