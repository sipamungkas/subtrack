export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getCodeExpiration(): Date {
  const expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + 15);
  return expiration;
}

export async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN not configured');
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Telegram API error:', error);
    return false;
  }
}
