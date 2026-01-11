import { Hono } from "hono";
import { auth } from "../lib/auth";
import { canResendOTP, recordResendAttempt } from "../lib/otp-rate-limit";

const authRouter = new Hono();

// OTP resend status check
authRouter.get("/otp-resend-status", async (c) => {
  const email = c.req.query("email");
  if (!email) {
    return c.json({ error: "Email required" }, 400);
  }

  const status = await canResendOTP(email);
  return c.json(status);
});

// Record resend attempt (called after sending OTP)
authRouter.post("/otp-resend-record", async (c) => {
  const { email } = await c.req.json();
  if (!email) {
    return c.json({ error: "Email required" }, 400);
  }

  await recordResendAttempt(email);
  return c.json({ success: true });
});

// Better-auth handles all other auth routes
authRouter.on(["POST", "GET"], "/*", (c) => {
  return auth.handler(c.req.raw);
});

export default authRouter;
