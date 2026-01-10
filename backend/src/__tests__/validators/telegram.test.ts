import { describe, it, expect } from 'vitest';
import { verifyTelegramSchema } from '../../validators/telegram';

describe('Telegram Validators', () => {
  describe('verifyTelegramSchema', () => {
    it('should validate correct verification data', () => {
      const validData = {
        code: 'ABC12345',
        chatId: '123456789',
      };

      const result = verifyTelegramSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject code with wrong length', () => {
      const invalidData = {
        code: 'ABC123', // Only 6 characters
        chatId: '123456789',
      };

      const result = verifyTelegramSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty chatId', () => {
      const invalidData = {
        code: 'ABC12345',
        chatId: '',
      };

      const result = verifyTelegramSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing fields', () => {
      const result = verifyTelegramSchema.safeParse({ code: 'ABC12345' });
      expect(result.success).toBe(false);
    });
  });
});
