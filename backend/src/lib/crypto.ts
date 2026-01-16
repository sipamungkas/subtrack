import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const ENCRYPTION_PREFIX = 'enc:';

const SERVER_SECRET = process.env.ENCRYPTION_SECRET!;

function deriveUserKey(userId: string): Buffer {
  return createHmac('sha256', SERVER_SECRET)
    .update(userId)
    .update('subscription-account')
    .digest();
}

export function encryptAccountName(plaintext: string, userId: string): string {
  const key = deriveUserKey(userId);
  const iv = randomBytes(IV_LENGTH);
  
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  
  return `${ENCRYPTION_PREFIX}${iv.toString('base64')}:${encrypted.toString('base64')}:${authTag.toString('base64')}`;
}

export function decryptAccountName(encrypted: string, userId: string): string {
  if (!encrypted.startsWith(ENCRYPTION_PREFIX)) {
    return encrypted; 
  }
  
  const [, ivB64, ciphertextB64, authTagB64] = encrypted.split(':');
  const key = deriveUserKey(userId);
  const iv = Buffer.from(ivB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  return decipher.update(ciphertext) + decipher.final('utf8');
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTION_PREFIX);
}
