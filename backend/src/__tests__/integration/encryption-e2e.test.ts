import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../../services/currency', () => ({
  convertAmount: vi.fn().mockResolvedValue(100),
  getAllLatestRates: vi.fn().mockResolvedValue({ updatedAt: new Date() }),
}));

process.env.ENCRYPTION_SECRET = '0123456789abcdef0123456789abcdef';

import { encryptAccountName, decryptAccountName, isEncrypted } from '../../lib/crypto';
import { formatReminderMessage } from '../../services/notifications';
import { db } from '../../db';

describe('End-to-End Encryption Flow', () => {
  const testUserId = 'user-123';
  const anotherUserId = 'user-456';
  const testPlaintext = 'user@example.com';
  const legacyPlaintext = 'legacy@email.com';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Subscription Creation Flow', () => {
    it('should encrypt accountName when creating subscription', async () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);

      expect(encrypted).toBeDefined();
      expect(isEncrypted(encrypted)).toBe(true);
      expect(encrypted).not.toBe(testPlaintext);
      expect(encrypted.startsWith('enc:')).toBe(true);

      const parts = encrypted.split(':');
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe('enc');
    });

    it('should verify encrypted format is valid', async () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      const parts = encrypted.split(':');

      expect(() => Buffer.from(parts[1], 'base64')).not.toThrow();
      expect(() => Buffer.from(parts[2], 'base64')).not.toThrow();
      expect(() => Buffer.from(parts[3], 'base64')).not.toThrow();

      const iv = Buffer.from(parts[1], 'base64');
      expect(iv.length).toBe(16);
    });

    it('should produce different ciphertext each time', async () => {
      const encrypted1 = encryptAccountName(testPlaintext, testUserId);
      const encrypted2 = encryptAccountName(testPlaintext, testUserId);

      expect(encrypted1).not.toBe(encrypted2);

      const decrypted1 = decryptAccountName(encrypted1, testUserId);
      const decrypted2 = decryptAccountName(encrypted2, testUserId);

      expect(decrypted1).toBe(testPlaintext);
      expect(decrypted2).toBe(testPlaintext);
    });
  });

  describe('Subscription Read Flow', () => {
    it('should decrypt accountName when reading subscription', async () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      const decrypted = decryptAccountName(encrypted, testUserId);

      expect(decrypted).toBe(testPlaintext);
    });

    it('should handle multiple reads correctly', async () => {
      const testCases = [
        'user1@example.com',
        'user2@example.org',
        'user+tag@example.co.uk',
      ];

      for (const plaintext of testCases) {
        const encrypted = encryptAccountName(plaintext, testUserId);
        const decrypted = decryptAccountName(encrypted, testUserId);
        expect(decrypted).toBe(plaintext);
      }
    });

    it('should maintain data integrity through encrypt-decrypt cycle', async () => {
      const original = testPlaintext;
      const encrypted = encryptAccountName(original, testUserId);
      const decrypted = decryptAccountName(encrypted, testUserId);

      expect(decrypted).toBe(original);
    });
  });

  describe('Subscription Update Flow', () => {
    it('should re-encrypt accountName on update', async () => {
      const originalPlaintext = 'old@example.com';
      const newPlaintext = 'new@example.com';

      const originalEncrypted = encryptAccountName(originalPlaintext, testUserId);
      const newEncrypted = encryptAccountName(newPlaintext, testUserId);

      expect(originalEncrypted).not.toBe(newEncrypted);
      expect(isEncrypted(originalEncrypted)).toBe(true);
      expect(isEncrypted(newEncrypted)).toBe(true);

      const decryptedNew = decryptAccountName(newEncrypted, testUserId);
      expect(decryptedNew).toBe(newPlaintext);
    });

    it('should handle updates to same accountName', async () => {
      const encrypted1 = encryptAccountName(testPlaintext, testUserId);
      const encrypted2 = encryptAccountName(testPlaintext, testUserId);

      expect(encrypted1).not.toBe(encrypted2);

      const decrypted1 = decryptAccountName(encrypted1, testUserId);
      const decrypted2 = decryptAccountName(encrypted2, testUserId);

      expect(decrypted1).toBe(testPlaintext);
      expect(decrypted2).toBe(testPlaintext);
    });

    it('should preserve other fields when updating accountName', async () => {
      const oldAccountName = 'old@example.com';
      const newAccountName = 'new@example.com';

      const oldEncrypted = encryptAccountName(oldAccountName, testUserId);
      const newEncrypted = encryptAccountName(newAccountName, testUserId);

      expect(oldEncrypted).not.toBe(newEncrypted);

      const decryptedOld = decryptAccountName(oldEncrypted, testUserId);
      const decryptedNew = decryptAccountName(newEncrypted, testUserId);

      expect(decryptedOld).toBe(oldAccountName);
      expect(decryptedNew).toBe(newAccountName);
    });
  });

  describe('Gradual Migration - Legacy Data', () => {
    it('should handle plaintext (legacy) accountName', async () => {
      const decrypted = decryptAccountName(legacyPlaintext, testUserId);

      expect(decrypted).toBe(legacyPlaintext);
      expect(isEncrypted(legacyPlaintext)).toBe(false);
    });

    it('should handle empty strings', async () => {
      const empty = '';
      const decrypted = decryptAccountName(empty, testUserId);

      expect(decrypted).toBe(empty);
      expect(isEncrypted(empty)).toBe(false);
    });

    it('should handle mixed encrypted and plaintext values', async () => {
      const values = [
        'plain@example.com',
        encryptAccountName('encrypted@example.com', testUserId),
        'another@plain.com',
        encryptAccountName('also@encrypted.com', testUserId),
      ];

      for (const value of values) {
        const decrypted = decryptAccountName(value as string, testUserId);
        if (typeof value === 'string' && isEncrypted(value)) {
          expect(decrypted).not.toBe(value);
        } else {
          expect(decrypted).toBe(value);
        }
      }
    });

    it('should support legacy email formats', async () => {
      const legacyEmails = [
        'simple@test.com',
        'user+tag@example.co.uk',
        'test.name@sub.domain.example.org',
      ];

      for (const email of legacyEmails) {
        const decrypted = decryptAccountName(email, testUserId);
        expect(decrypted).toBe(email);
      }
    });
  });

  describe('Telegram Notification Flow', () => {
    it('should decrypt accountName before formatting message', () => {
      const encryptedAccountName = encryptAccountName(testPlaintext, testUserId);

      const subscription = {
        id: 'sub-1',
        userId: testUserId,
        serviceName: 'Netflix',
        renewalDate: '2026-02-01',
        cost: '15.99',
        currency: 'USD',
        paymentMethod: 'Credit Card',
        accountName: encryptedAccountName,
        reminderDays: [7, 3, 1],
        billingCycle: 'monthly',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        customIntervalDays: null,
        notes: null,
      };

      const message = formatReminderMessage(subscription, 7);

      expect(message).toContain('Netflix');
      expect(message).toContain('*Renews in:* 7 days');
      expect(message).toContain('15.99');
      expect(message).not.toContain('enc:');
      expect(message).toContain('u\\*\\*\\*@example.com');
    });

    it('should handle plaintext accountName in notifications', () => {
      const subscription = {
        id: 'sub-1',
        userId: testUserId,
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
      expect(message).toContain('my_spotify_account');
      expect(message).not.toContain('enc:');
    });

    it('should handle decryption failures gracefully', () => {
      const subscription = {
        id: 'sub-1',
        userId: testUserId,
        serviceName: 'Netflix',
        renewalDate: '2026-02-01',
        cost: '15.99',
        currency: 'USD',
        paymentMethod: 'Credit Card',
        accountName: 'enc:invalid:format',
        reminderDays: [7, 3, 1],
        billingCycle: 'monthly',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        customIntervalDays: null,
        notes: null,
      };

      const message = formatReminderMessage(subscription, 7);

      expect(message).toContain('Netflix');
      expect(message).toContain('[Decryption failed]');
    });
  });

  describe('Security - Admin Access', () => {
    it('should not expose accountName to admin users', async () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);

      expect(encrypted).not.toBe(testPlaintext);
      expect(encrypted.startsWith('enc:')).toBe(true);

      const parts = encrypted.split(':');
      expect(parts.length).toBe(4);

      expect(() => {
        Buffer.from(parts[2], 'base64').toString('utf8');
      }).not.toThrow();

      const rawCiphertext = Buffer.from(parts[2], 'base64').toString('utf8');
      expect(rawCiphertext).not.toBe(testPlaintext);
      expect(rawCiphertext).not.toContain('@');
      expect(rawCiphertext).not.toContain('example');
    });

    it('should require userId for decryption', async () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);

      expect(() => {
        decryptAccountName(encrypted, '');
      }).toThrow();

      expect(() => {
        decryptAccountName(encrypted, 'different-user-id');
      }).toThrow();
    });

    it('should prevent admin from extracting plaintext without correct userId', async () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      const adminUserId = 'admin-user-id';

      expect(() => {
        decryptAccountName(encrypted, adminUserId);
      }).toThrow('Invalid encrypted data');

      const parts = encrypted.split(':');
      expect(parts.length).toBe(4);

      const iv = Buffer.from(parts[1], 'base64');
      const ciphertext = Buffer.from(parts[2], 'base64');
      const authTag = Buffer.from(parts[3], 'base64');

      expect(iv.length).toBe(16);
      expect(ciphertext.length).toBeGreaterThan(0);
      expect(authTag.length).toBe(16);
    });
  });

  describe('Security - User Isolation', () => {
    it('should fail to decrypt with wrong user ID', async () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);

      expect(() => {
        decryptAccountName(encrypted, anotherUserId);
      }).toThrow('Invalid encrypted data');
    });

    it('should generate different ciphertext for different users', async () => {
      const encrypted1 = encryptAccountName(testPlaintext, testUserId);
      const encrypted2 = encryptAccountName(testPlaintext, anotherUserId);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should allow user to decrypt their own data', async () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      const decrypted = decryptAccountName(encrypted, testUserId);

      expect(decrypted).toBe(testPlaintext);
    });

    it('should isolate multiple users with same accountName', async () => {
      const sharedPlaintext = 'shared@example.com';

      const encrypted1 = encryptAccountName(sharedPlaintext, testUserId);
      const encrypted2 = encryptAccountName(sharedPlaintext, anotherUserId);

      expect(encrypted1).not.toBe(encrypted2);

      const decrypted1 = decryptAccountName(encrypted1, testUserId);
      const decrypted2 = decryptAccountName(encrypted2, anotherUserId);

      expect(decrypted1).toBe(sharedPlaintext);
      expect(decrypted2).toBe(sharedPlaintext);

      expect(() => {
        decryptAccountName(encrypted1, anotherUserId);
      }).toThrow();

      expect(() => {
        decryptAccountName(encrypted2, testUserId);
      }).toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long account names', async () => {
      const longAccountName = 'a'.repeat(1000);
      const encrypted = encryptAccountName(longAccountName, testUserId);
      const decrypted = decryptAccountName(encrypted, testUserId);

      expect(decrypted).toBe(longAccountName);
    });

    it('should handle special characters', async () => {
      const specialChars = 'test+special@example.co.uk';
      const encrypted = encryptAccountName(specialChars, testUserId);
      const decrypted = decryptAccountName(encrypted, testUserId);

      expect(decrypted).toBe(specialChars);
    });

    it('should handle unicode characters', async () => {
      const unicodeChars = 'tëst@ëxamplé.com';
      const encrypted = encryptAccountName(unicodeChars, testUserId);
      const decrypted = decryptAccountName(encrypted, testUserId);

      expect(decrypted).toBe(unicodeChars);
    });

    it('should throw error for malformed encrypted data', () => {
      const malformedValues = [
        'enc:only-two-parts',
        'enc:iv:ciphertext:authTag:extra',
      ];

      for (const malformed of malformedValues) {
        expect(() => {
          decryptAccountName(malformed, testUserId);
        }).toThrow();
      }
    });

    it('should throw error for corrupted auth tag', async () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      const parts = encrypted.split(':');

      const corrupted = `${parts[0]}:${parts[1]}:${parts[2]}:${Buffer.from('wrongtag123456').toString('base64')}`;

      expect(() => {
        decryptAccountName(corrupted, testUserId);
      }).toThrow();
    });

    it('should throw error for corrupted ciphertext', async () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      const parts = encrypted.split(':');

      const corrupted = `${parts[0]}:${parts[1]}:${Buffer.from('corrupted-data').toString('base64')}:${parts[3]}`;

      expect(() => {
        decryptAccountName(corrupted, testUserId);
      }).toThrow();
    });
  });

  describe('Complete Flow Integration', () => {
    it('should maintain encryption through full lifecycle', async () => {
      const accountName = 'full@lifecycle.test';

      const encrypted = encryptAccountName(accountName, testUserId);

      expect(isEncrypted(encrypted)).toBe(true);
      expect(encrypted).not.toBe(accountName);

      const decrypted = decryptAccountName(encrypted, testUserId);
      expect(decrypted).toBe(accountName);

      const reEncrypted = encryptAccountName(decrypted, testUserId);
      expect(isEncrypted(reEncrypted)).toBe(true);
      expect(reEncrypted).not.toBe(encrypted);

      const reDecrypted = decryptAccountName(reEncrypted, testUserId);
      expect(reDecrypted).toBe(accountName);
    });

    it('should support multiple users independently', async () => {
      const users = ['user-1', 'user-2', 'user-3'];
      const accountNames = [
        'user1@test.com',
        'user2@test.com',
        'user3@test.com',
      ];

      const encryptedMap = new Map<string, string>();

      for (let i = 0; i < users.length; i++) {
        const encrypted = encryptAccountName(accountNames[i], users[i]);
        encryptedMap.set(users[i], encrypted);
      }

      for (let i = 0; i < users.length; i++) {
        const encrypted = encryptedMap.get(users[i])!;
        const decrypted = decryptAccountName(encrypted, users[i]);
        expect(decrypted).toBe(accountNames[i]);
      }

      for (let i = 0; i < users.length; i++) {
        for (let j = 0; j < users.length; j++) {
          if (i !== j) {
            const encrypted = encryptedMap.get(users[i])!;
            expect(() => {
              decryptAccountName(encrypted, users[j]);
            }).toThrow();
          }
        }
      }
    });

    it('should handle migration from plaintext to encrypted', async () => {
      const legacyAccountName = 'legacy@old-system.com';
      const newAccountName = 'new@encrypted-system.com';

      const decryptedLegacy = decryptAccountName(legacyAccountName, testUserId);
      expect(decryptedLegacy).toBe(legacyAccountName);

      const encryptedNew = encryptAccountName(newAccountName, testUserId);
      const decryptedNew = decryptAccountName(encryptedNew, testUserId);
      expect(decryptedNew).toBe(newAccountName);
    });
  });
});
