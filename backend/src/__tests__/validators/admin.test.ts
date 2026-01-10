import { describe, it, expect } from 'vitest';
import {
  updateUserLimitSchema,
  updateUserStatusSchema,
  paginationSchema,
} from '../../validators/admin';

describe('Admin Validators', () => {
  describe('updateUserLimitSchema', () => {
    it('should validate valid subscription limit', () => {
      const validData = { subscriptionLimit: 50 };
      const result = updateUserLimitSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject limit below minimum', () => {
      const invalidData = { subscriptionLimit: 0 };
      const result = updateUserLimitSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject limit above maximum', () => {
      const invalidData = { subscriptionLimit: 1001 };
      const result = updateUserLimitSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer values', () => {
      const invalidData = { subscriptionLimit: 15.5 };
      const result = updateUserLimitSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updateUserStatusSchema', () => {
    it('should validate boolean status', () => {
      const result1 = updateUserStatusSchema.safeParse({ isActive: true });
      const result2 = updateUserStatusSchema.safeParse({ isActive: false });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should reject non-boolean values', () => {
      const invalidData = { isActive: 'yes' };
      const result = updateUserStatusSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('paginationSchema', () => {
    it('should use default values', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe('1'); // String since it's from query params
        expect(result.data.limit).toBe('20'); // String since it's from query params
      }
    });

    it('should validate custom pagination', () => {
      const result = paginationSchema.safeParse({ page: '3', limit: '50' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should reject limit above maximum', () => {
      const result = paginationSchema.safeParse({ limit: '101' });
      expect(result.success).toBe(false);
    });

    it('should reject negative page numbers', () => {
      const result = paginationSchema.safeParse({ page: '-1' });
      expect(result.success).toBe(false);
    });
  });
});
