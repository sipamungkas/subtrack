/**
 * Masks an email address for privacy display
 * Examples:
 *   - sipamungkas@gmail.com → s***@gmail.com
 *   - john.doe@example.com → j***@example.com
 *   - ab@test.co → a***@test.co
 *   - a@b.com → a***@b.com
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';

  const [localPart, domain] = email.split('@');

  if (!localPart || !domain) {
    return email; // Invalid email format, return as-is
  }

  // Show first character, mask the rest with ***
  const maskedLocal = localPart.charAt(0) + '***';

  return `${maskedLocal}@${domain}`;
}

/**
 * Masks an email with more characters visible
 * Examples:
 *   - sipamungkas@gmail.com → sip***kas@gmail.com
 *   - john@example.com → jo***hn@example.com
 */
export function maskEmailPartial(email: string | null | undefined): string {
  if (!email) return '';

  const [localPart, domain] = email.split('@');

  if (!localPart || !domain) {
    return email; // Invalid email format, return as-is
  }

  if (localPart.length <= 3) {
    // Short local part - just show first char
    return `${localPart.charAt(0)}***@${domain}`;
  }

  // Show first 3 and last 3 characters
  const showChars = Math.min(3, Math.floor(localPart.length / 3));
  const start = localPart.slice(0, showChars);
  const end = localPart.slice(-showChars);

  return `${start}***${end}@${domain}`;
}
