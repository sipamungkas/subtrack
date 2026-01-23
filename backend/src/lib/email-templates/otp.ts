export function getOTPEmailHtml(otp: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">
                Verify Your Email
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                Your verification code for Subnudge.app is:
              </p>
            </td>
          </tr>
          <!-- OTP Code -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); border-radius: 12px; padding: 24px; text-align: center;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ffffff; font-family: monospace;">
                  ${otp}
                </span>
              </div>
            </td>
          </tr>
          <!-- Expiry notice -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0; font-size: 14px; color: #71717a; text-align: center;">
                This code expires in 5 minutes.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 14px; color: #a1a1aa; text-align: center;">
                If you didn't request this code, you can safely ignore this email.
              </p>
              <p style="margin: 10px 0 0; font-size: 14px; color: #a1a1aa; text-align: center;">
                &copy; ${new Date().getFullYear()} Subnudge. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
