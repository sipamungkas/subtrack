import { z } from 'zod';

export const verifyTelegramSchema = z.object({
  code: z.string().length(8),
  chatId: z.string().min(1),
});
