import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { db } from '../../db';
import { emailLogs } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { sendOTPEmail } from '../email';

describe('Email Logging', () => {
  beforeEach(async () => {
    // Clean up test email logs
    await db.delete(emailLogs).where(eq(emailLogs.email, 'test@example.com'));
  });

  afterEach(async () => {
    // Clean up test email logs
    await db.delete(emailLogs).where(eq(emailLogs.email, 'test@example.com'));
  });

  it('should log OTP email attempt', async () => {
    // Note: This will use console fallback if SMTP not configured
    await sendOTPEmail('test@example.com', '123456', 'email-verification');

    const [log] = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.email, 'test@example.com'))
      .orderBy(desc(emailLogs.createdAt))
      .limit(1);

    expect(log).toBeDefined();
    expect(log.emailType).toBe('otp');
    expect(log.status).toBe('sent');

    // Check metadata contains OTP type
    const metadata = log.metadata ? JSON.parse(log.metadata) : {};
    expect(metadata.otpType).toBe('email-verification');
  });

  it('should store email type correctly', async () => {
    await sendOTPEmail('test@example.com', '654321', 'sign-in');

    const [log] = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.email, 'test@example.com'))
      .orderBy(desc(emailLogs.createdAt))
      .limit(1);

    expect(log).toBeDefined();
    expect(log.emailType).toBe('otp');

    const metadata = log.metadata ? JSON.parse(log.metadata) : {};
    expect(metadata.otpType).toBe('sign-in');
  });
});
