import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const ENCRYPTION_PREFIX = 'enc:';

if (!process.env.ENCRYPTION_SECRET) {
  throw new Error('ENCRYPTION_SECRET environment variable is required');
}

if (process.env.ENCRYPTION_SECRET.length !== 32) {
  throw new Error('ENCRYPTION_SECRET must be exactly 32 characters');
}

const SERVER_SECRET = process.env.ENCRYPTION_SECRET;

function deriveUserKey(userId: string): Buffer {
  return createHmac('sha256', SERVER_SECRET)
    .update(userId)
    .update('subscription-account')
    .digest();
}

/**
 * Encrypts a plaintext account name using AES-256-GCM
 * @param plaintext - The plaintext string to encrypt (e.g., email address)
 * @param userId - The user's unique identifier (used for key derivation)
 * @returns Encrypted string in format: enc:<iv_base64>:<ciphertext_base64>:<authTag_base64>
 */
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

/**
 * Decrypts an encrypted account name using AES-256-GCM
 * @param encrypted - Encrypted string in format: enc:<iv_base64>:<ciphertext_base64>:<authTag_base64>
 * @param userId - The user's unique identifier (used for key derivation)
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails or format is invalid
 */
export function decryptAccountName(encrypted: string, userId: string): string {
  if (!encrypted.startsWith(ENCRYPTION_PREFIX)) {
    return encrypted;
  }

  const parts = encrypted.split(':');
  
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted format: expected 4 colon-separated parts');
  }

  const [, ivB64, ciphertextB64, authTagB64] = parts;

  try {
    const key = deriveUserKey(userId);
    const iv = Buffer.from(ivB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return decipher.update(ciphertext) + decipher.final('utf8');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
    throw new Error('Decryption failed: unknown error');
  }
}

/**
 * Checks if a value is encrypted
 * @param value - The string to check
 * @returns true if the value starts with the encryption prefix, false otherwise
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTION_PREFIX);
}
