export function getPasswordResetEmailHtml(resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
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
                Reset Your Password
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Button -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); text-decoration: none; border-radius: 8px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Link fallback -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0; font-size: 14px; color: #71717a; text-align: center;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 10px 0 0; font-size: 14px; color: #10b981; text-align: center; word-break: break-all;">
                ${resetUrl}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 14px; color: #a1a1aa; text-align: center;">
                This link will expire in 1 hour for security reasons.
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
