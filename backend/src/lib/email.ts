import nodemailer from "nodemailer";
import { db } from "../db";
import { emailLogs } from "../db/schema";
import { getPasswordResetEmailHtml } from "./email-templates/password-reset";
import { getOTPEmailHtml } from "./email-templates/otp";

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  emailType?: string;
  metadata?: Record<string, unknown>;
}

// Email logging helper function
async function logEmailAttempt(
  email: string,
  emailType: string,
  status: "sent" | "failed",
  errorMessage?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(emailLogs).values({
      email,
      emailType,
      status,
      errorMessage: errorMessage || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch (error) {
    // Don't let logging failure break email flow
    console.error("Failed to log email attempt:", error);
  }
}

// Create a singleton transporter with connection pooling
// This fixes Bun's first-connection timeout issue by reusing connections
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
let transporterInitialized = false;

const getTransporter = () => {
  if (transporterInitialized) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  transporterInitialized = true;

  if (!host || !user || !pass) {
    console.warn("SMTP not configured. Emails will be logged to console.");
    return null;
  }

  // Log SMTP config once at initialization (hide password)
  console.log(
    `SMTP Config: host=${host}, port=${port}, secure=${secure}, user=${user}`,
  );

  transporter = nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
    tls: {
      // Do not fail on invalid certs in development
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
    // Use connection pooling to avoid Bun's first-connection timeout
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    // Increase timeout for slower SMTP servers
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  });

  return transporter;
};

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const emailTransporter = getTransporter();
  const from =
    process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@example.com";
  const emailType = options.emailType || "generic";

  if (!emailTransporter) {
    // Fallback: log to console in development
    console.log("=".repeat(50));
    console.log("📧 EMAIL (Console Fallback)");
    console.log("=".repeat(50));
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body: ${options.text}`);
    console.log("=".repeat(50));

    // Log as sent (console fallback is intentional in dev)
    await logEmailAttempt(options.to, emailType, "sent", undefined, {
      ...options.metadata,
      consoleFallback: true,
    });
    return true;
  }

  try {
    await emailTransporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    console.log(`Email sent to ${options.to}`);

    // Log successful send
    await logEmailAttempt(
      options.to,
      emailType,
      "sent",
      undefined,
      options.metadata,
    );
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Failed to send email:", error);

    // Log failed send
    await logEmailAttempt(
      options.to,
      emailType,
      "failed",
      errorMessage,
      options.metadata,
    );
    return false;
  }
}

// Email templates are now imported from ./email-templates/
export { getPasswordResetEmailHtml, getOTPEmailHtml };

export async function sendOTPEmail(
  email: string,
  otp: string,
  otpType: string = "email-verification",
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "Your verification code for Subnudge.app",
    text: `Your verification code is: ${otp}. This code expires in 5 minutes.`,
    html: getOTPEmailHtml(otp),
    emailType: "otp",
    metadata: { otpType },
  });
}
