import { describe, it, expect, beforeEach } from "vitest";

describe("Crypto Utilities", () => {
  const testUserId = "user123";
  const testPlaintext = "test@subscription.com";
  const anotherUserId = "user456";
  
  let encryptAccountName: any;
  let decryptAccountName: any;
  let isEncrypted: any;
  
  beforeEach(async () => {
    process.env.ENCRYPTION_SECRET = "0123456789abcdef0123456789abcdef";
    const crypto = await import("../crypto");
    encryptAccountName = crypto.encryptAccountName;
    decryptAccountName = crypto.decryptAccountName;
    isEncrypted = crypto.isEncrypted;
  });

  describe("encryptAccountName", () => {
    it("encrypts a plaintext string", () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe("string");
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it("produces different ciphertext for each encryption", () => {
      const encrypted1 = encryptAccountName(testPlaintext, testUserId);
      const encrypted2 = encryptAccountName(testPlaintext, testUserId);
      
      expect(encrypted1).not.toBe(encrypted2);
    });

    it("produces correct format", () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      const parts = encrypted.split(':');
      
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe("enc");
      expect(parts[1]).toBeDefined(); 
      expect(parts[2]).toBeDefined();
      expect(parts[3]).toBeDefined();
    });

    it("produces different ciphertext for different users", () => {
      const encrypted1 = encryptAccountName(testPlaintext, testUserId);
      const encrypted2 = encryptAccountName(testPlaintext, anotherUserId);
      
      expect(encrypted1).not.toBe(encrypted2);
    });

    it("handles empty strings", () => {
      const encrypted = encryptAccountName("", testUserId);
      
      expect(encrypted).toBeDefined();
      expect(encrypted.startsWith("enc:")).toBe(true);
    });

    it("handles special characters", () => {
      const specialPlaintext = "test+special@example.co.uk";
      const encrypted = encryptAccountName(specialPlaintext, testUserId);
      
      expect(encrypted).toBeDefined();
    });

    it("handles unicode characters", () => {
      const unicodePlaintext = "tëst@ëxamplé.com";
      const encrypted = encryptAccountName(unicodePlaintext, testUserId);
      
      expect(encrypted).toBeDefined();
    });
  });

  describe("decryptAccountName", () => {
    it("decrypts encrypted text correctly", () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      const decrypted = decryptAccountName(encrypted, testUserId);
      
      expect(decrypted).toBe(testPlaintext);
    });

    it("returns plaintext unchanged if not encrypted", () => {
      const plaintext = "plain@text.com";
      const decrypted = decryptAccountName(plaintext, testUserId);
      
      expect(decrypted).toBe(plaintext);
    });

    it("returns empty string if not encrypted", () => {
      const empty = "";
      const decrypted = decryptAccountName(empty, testUserId);
      
      expect(decrypted).toBe(empty);
    });

    it("handles legacy plaintext values", () => {
      const legacyPlaintext = "legacy@email.com";
      const decrypted = decryptAccountName(legacyPlaintext, testUserId);
      
      expect(decrypted).toBe(legacyPlaintext);
    });

    it("decrypts correctly for the same user", () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      const decrypted = decryptAccountName(encrypted, testUserId);
      
      expect(decrypted).toBe(testPlaintext);
    });

    it("fails to decrypt with different user", () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      
      expect(() => {
        decryptAccountName(encrypted, anotherUserId);
      }).toThrow();
    });

    it("handles empty encrypted strings", () => {
      const encrypted = encryptAccountName("", testUserId);
      const decrypted = decryptAccountName(encrypted, testUserId);
      
      expect(decrypted).toBe("");
    });

    it("handles special characters", () => {
      const specialPlaintext = "test+special@example.co.uk";
      const encrypted = encryptAccountName(specialPlaintext, testUserId);
      const decrypted = decryptAccountName(encrypted, testUserId);
      
      expect(decrypted).toBe(specialPlaintext);
    });

    it("handles unicode characters", () => {
      const unicodePlaintext = "tëst@ëxamplé.com";
      const encrypted = encryptAccountName(unicodePlaintext, testUserId);
      const decrypted = decryptAccountName(encrypted, testUserId);
      
      expect(decrypted).toBe(unicodePlaintext);
    });

    it("handles long email addresses", () => {
      const longPlaintext = "very.long.email.address@very.long.domain.example.com";
      const encrypted = encryptAccountName(longPlaintext, testUserId);
      const decrypted = decryptAccountName(encrypted, testUserId);
      
      expect(decrypted).toBe(longPlaintext);
    });
  });

  describe("isEncrypted", () => {
    it("returns true for encrypted values", () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("returns false for plaintext values", () => {
      expect(isEncrypted(testPlaintext)).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isEncrypted("")).toBe(false);
    });

    it("returns true for values starting with 'enc:' regardless of format", () => {
      expect(isEncrypted("enc:not-really-encrypted")).toBe(true);
    });

    it("returns false for strings with 'enc:' in middle", () => {
      expect(isEncrypted("somethingenc:something")).toBe(false);
    });
  });

  describe("round-trip encryption", () => {
    it("maintains data integrity through encrypt-decrypt cycle", () => {
      const testCases = [
        "simple@test.com",
        "user+tag@example.co.uk",
        "test.name@sub.domain.example.org",
        "a@b.co",
        "",
        "very.long.email.address@very.long.domain.example.com",
      ];

      testCases.forEach((testCase) => {
        const encrypted = encryptAccountName(testCase, testUserId);
        const decrypted = decryptAccountName(encrypted, testUserId);
        
        expect(decrypted).toBe(testCase);
      });
    });

    it("produces deterministic encryption for same user and data", () => {
      const encrypted1 = encryptAccountName(testPlaintext, testUserId);
      const encrypted2 = encryptAccountName(testPlaintext, testUserId);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      const decrypted1 = decryptAccountName(encrypted1, testUserId);
      const decrypted2 = decryptAccountName(encrypted2, testUserId);
      
      expect(decrypted1).toBe(testPlaintext);
      expect(decrypted2).toBe(testPlaintext);
    });
  });

  describe("user-specific encryption", () => {
    it("generates different keys for different users", () => {
      const encrypted1 = encryptAccountName(testPlaintext, testUserId);
      const encrypted2 = encryptAccountName(testPlaintext, anotherUserId);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      const decrypted1 = decryptAccountName(encrypted1, testUserId);
      const decrypted2 = decryptAccountName(encrypted2, anotherUserId);
      
      expect(decrypted1).toBe(testPlaintext);
      expect(decrypted2).toBe(testPlaintext);
    });

    it("cannot decrypt with different user ID", () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      
      expect(() => {
        decryptAccountName(encrypted, anotherUserId);
      }).toThrow();
    });
  });

  describe("encryption format validation", () => {
    it("produces valid base64 for IV", () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      const parts = encrypted.split(':');
      
      expect(() => {
        Buffer.from(parts[1], 'base64');
      }).not.toThrow();
    });

    it("produces valid base64 for ciphertext", () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      const parts = encrypted.split(':');
      
      expect(() => {
        Buffer.from(parts[2], 'base64');
      }).not.toThrow();
    });

    it("produces valid base64 for auth tag", () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      const parts = encrypted.split(':');
      
      expect(() => {
        Buffer.from(parts[3], 'base64');
      }).not.toThrow();
    });

    it("produces 16-byte IV", () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      const parts = encrypted.split(':');
      const iv = Buffer.from(parts[1], 'base64');
      
      expect(iv.length).toBe(16);
    });
  });

  describe("error handling", () => {
    it("throws error for malformed encrypted string (missing parts)", () => {
      const malformed = "enc:ivonly";
      
      expect(() => {
        decryptAccountName(malformed, testUserId);
      }).toThrow("Invalid encrypted format");
    });

    it("throws error for malformed encrypted string (extra parts)", () => {
      const malformed = "enc:iv:ciphertext:authtag:extra";
      
      expect(() => {
        decryptAccountName(malformed, testUserId);
      }).toThrow("Invalid encrypted format");
    });

    it("throws error for invalid base64 in IV", () => {
      const invalid = "enc:not!base64:ciphertext:authtag";
      
      expect(() => {
        decryptAccountName(invalid, testUserId);
      }).toThrow("Decryption failed");
    });

    it("throws error for invalid base64 in ciphertext", () => {
      const invalid = `enc:${Buffer.from('a'.repeat(16)).toString('base64')}:not!base64:authtag`;
      
      expect(() => {
        decryptAccountName(invalid, testUserId);
      }).toThrow("Decryption failed");
    });

    it("throws error for invalid base64 in auth tag", () => {
      const invalid = `enc:${Buffer.from('a'.repeat(16)).toString('base64')}:${Buffer.from('test').toString('base64')}:not!base64`;
      
      expect(() => {
        decryptAccountName(invalid, testUserId);
      }).toThrow("Decryption failed");
    });

    it("throws error for corrupted auth tag", () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      const parts = encrypted.split(':');
      
      const corrupted = `${parts[0]}:${parts[1]}:${parts[2]}:${Buffer.from('wrongauthtag').toString('base64')}`;
      
      expect(() => {
        decryptAccountName(corrupted, testUserId);
      }).toThrow("Decryption failed");
    });

    it("throws error for wrong key (wrong user)", () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      
      expect(() => {
        decryptAccountName(encrypted, anotherUserId);
      }).toThrow("Decryption failed");
    });

    it("throws error for corrupted ciphertext", () => {
      const encrypted = encryptAccountName(testPlaintext, testUserId);
      const parts = encrypted.split(':');
      
      const corrupted = `${parts[0]}:${parts[1]}:${Buffer.from('corrupted').toString('base64')}:${parts[3]}`;
      
      expect(() => {
        decryptAccountName(corrupted, testUserId);
      }).toThrow("Decryption failed");
    });

    it("throws error for empty IV", () => {
      const invalid = `enc::${Buffer.from('test').toString('base64')}:${Buffer.from('auth').toString('base64')}`;
      
      expect(() => {
        decryptAccountName(invalid, testUserId);
      }).toThrow("Decryption failed");
    });

    it("throws error for empty ciphertext", () => {
      const invalid = `enc:${Buffer.from('a'.repeat(16)).toString('base64')}::${Buffer.from('auth').toString('base64')}`;
      
      expect(() => {
        decryptAccountName(invalid, testUserId);
      }).toThrow("Decryption failed");
    });
  });
});
