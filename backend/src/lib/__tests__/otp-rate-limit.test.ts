import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

// Import after mocking
const { canResendOTP, recordResendAttempt, clearResendLimit } = await import("../otp-rate-limit");
import { redis } from "../redis";

describe("OTP Rate Limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canResendOTP", () => {
    it("allows first attempt", async () => {
      (redis.get as any).mockResolvedValue(null);

      const result = await canResendOTP("test@example.com");

      expect(result.allowed).toBe(true);
      expect(result.attemptsLeft).toBe(3);
    });

    it("blocks during short cooldown", async () => {
      const state = {
        count: 1,
        lastAttempt: Date.now() - 30000, // 30 seconds ago
      };
      (redis.get as any).mockResolvedValue(JSON.stringify(state));

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
      (redis.get as any).mockResolvedValue(JSON.stringify(state));

      const result = await canResendOTP("test@example.com");

      expect(result.allowed).toBe(true);
      expect(result.attemptsLeft).toBe(2);
    });

    it("enforces long cooldown after 3 attempts", async () => {
      const state = {
        count: 3,
        lastAttempt: Date.now() - 60000, // 1 minute ago
      };
      (redis.get as any).mockResolvedValue(JSON.stringify(state));

      const result = await canResendOTP("test@example.com");

      expect(result.allowed).toBe(false);
      expect(result.waitSeconds).toBeGreaterThan(800); // ~14 min remaining
    });

    it("resets after long cooldown expires", async () => {
      const state = {
        count: 3,
        lastAttempt: Date.now() - 901000, // 15+ minutes ago
      };
      (redis.get as any).mockResolvedValue(JSON.stringify(state));

      const result = await canResendOTP("test@example.com");

      expect(result.allowed).toBe(true);
      expect(result.attemptsLeft).toBe(3);
      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe("recordResendAttempt", () => {
    it("increments attempt count", async () => {
      (redis.get as any).mockResolvedValue(null);

      await recordResendAttempt("test@example.com");

      expect(redis.set).toHaveBeenCalledWith(
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

      expect(redis.del).toHaveBeenCalledWith("otp-resend:test@example.com");
    });
  });
});
