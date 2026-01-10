import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateVerificationCode,
  getCodeExpiration,
  sendTelegramMessage,
} from '../../lib/telegram';

describe('Telegram Utilities', () => {
  describe('generateVerificationCode', () => {
    it('should generate 8 character code', () => {
      const code = generateVerificationCode();
      expect(code).toHaveLength(8);
    });

    it('should only contain valid characters', () => {
      const code = generateVerificationCode();
      const validChars = /^[A-Z0-9]+$/;
      expect(validChars.test(code)).toBe(true);
    });

    it('should generate different codes', () => {
      const code1 = generateVerificationCode();
      const code2 = generateVerificationCode();
      // Highly unlikely to be the same
      expect(code1).not.toBe(code2);
    });
  });

  describe('getCodeExpiration', () => {
    it('should return date 15 minutes in the future', () => {
      const now = new Date();
      const expiration = getCodeExpiration();

      const diffMs = expiration.getTime() - now.getTime();
      const diffMinutes = diffMs / 1000 / 60;

      expect(diffMinutes).toBeGreaterThanOrEqual(14.9);
      expect(diffMinutes).toBeLessThanOrEqual(15.1);
    });

    it('should return a Date object', () => {
      const expiration = getCodeExpiration();
      expect(expiration).toBeInstanceOf(Date);
    });
  });

  describe('sendTelegramMessage', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      global.fetch = vi.fn();
    });

    it('should send message successfully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });
      global.fetch = mockFetch;

      const result = await sendTelegramMessage('123456', 'Test message');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sendMessage'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Test message'),
        })
      );
    });

    it('should handle failed API calls', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
      });
      global.fetch = mockFetch;

      const result = await sendTelegramMessage('123456', 'Test message');

      expect(result).toBe(false);
    });

    it('should handle network errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      const result = await sendTelegramMessage('123456', 'Test message');

      expect(result).toBe(false);
    });

    it('should throw error if bot token not configured', async () => {
      const originalToken = process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_BOT_TOKEN;

      await expect(
        sendTelegramMessage('123456', 'Test message')
      ).rejects.toThrow('TELEGRAM_BOT_TOKEN not configured');

      process.env.TELEGRAM_BOT_TOKEN = originalToken;
    });

    it('should send message with markdown parse mode', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });
      global.fetch = mockFetch;

      await sendTelegramMessage('123456', '*Bold* message');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"parse_mode":"Markdown"'),
        })
      );
    });
  });
});
