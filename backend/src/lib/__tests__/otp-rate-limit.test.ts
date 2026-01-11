import { describe, it, expect, beforeEach, vi } from "vitest";

// Create mock redis before importing the module
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};

vi.mock("../redis", () => ({
  redis: mockRedis,
}));

// Import after mocking
const { canResendOTP, recordResendAttempt, clearResendLimit } = await import("../otp-rate-limit");

describe("OTP Rate Limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canResendOTP", () => {
    it("allows first attempt", async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await canResendOTP("test@example.com");

      expect(result.allowed).toBe(true);
      expect(result.attemptsLeft).toBe(3);
    });

    it("blocks during short cooldown", async () => {
      const state = {
        count: 1,
        lastAttempt: Date.now() - 30000, // 30 seconds ago
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(state));

      const result = await canResendOTP("test@example.com");

      expect(result.allowed).toBe(false);
      expect(result.waitSeconds).toBeGreaterThan(0);
      expect(result.waitSeconds).toBeLessThanOrEqual(30);
    });

    it("allows after short cooldown expires", async () => {
      const state = {
        count: 1,
        lastAttempt: Date.now() - 61000, // 61 seconds ago
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(state));

      const result = await canResendOTP("test@example.com");

      expect(result.allowed).toBe(true);
      expect(result.attemptsLeft).toBe(2);
    });

    it("enforces long cooldown after 3 attempts", async () => {
      const state = {
        count: 3,
        lastAttempt: Date.now() - 60000, // 1 minute ago
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(state));

      const result = await canResendOTP("test@example.com");

      expect(result.allowed).toBe(false);
      expect(result.waitSeconds).toBeGreaterThan(800); // ~14 min remaining
    });

    it("resets after long cooldown expires", async () => {
      const state = {
        count: 3,
        lastAttempt: Date.now() - 901000, // 15+ minutes ago
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(state));

      const result = await canResendOTP("test@example.com");

      expect(result.allowed).toBe(true);
      expect(result.attemptsLeft).toBe(3);
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe("recordResendAttempt", () => {
    it("increments attempt count", async () => {
      mockRedis.get.mockResolvedValue(null);

      await recordResendAttempt("test@example.com");

      expect(mockRedis.set).toHaveBeenCalledWith(
        "otp-resend:test@example.com",
        expect.stringContaining('"count":1'),
        "EX",
        900
      );
    });
  });

  describe("clearResendLimit", () => {
    it("deletes the rate limit key", async () => {
      await clearResendLimit("test@example.com");

      expect(mockRedis.del).toHaveBeenCalledWith("otp-resend:test@example.com");
    });
  });
});
