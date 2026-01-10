import { describe, it, expect } from 'vitest';
import { updateProfileSchema } from '../../validators/user';

describe('User Validators', () => {
  describe('updateProfileSchema', () => {
    it('should validate valid profile data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept partial updates', () => {
      const result = updateProfileSchema.safeParse({ name: 'Jane Doe' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept empty object', () => {
      const result = updateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});
