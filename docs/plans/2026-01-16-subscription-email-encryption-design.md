# Design Document: Subscription Account Name Encryption

**Date:** 2026-01-16  
**Status:** Draft  
**Author:** AI Assistant

## Overview

Encrypt the `accountName` field in the subscriptions table so only the subscription owner can access the plaintext value. The user's login email in the `users` table remains unencrypted.

## Goals

1. **Database breach protection** - Encrypted data unreadable without server secret
2. **Admin/staff protection** - Admins cannot read user subscription emails
3. **API response protection** - Only authenticated owner receives plaintext
4. **Transparent to frontend** - No frontend changes required
5. **Telegram notifications work** - Backend decrypts for notification messages

## Non-Goals

- Encrypting other subscription fields
- Encrypting user login email
- Client-side encryption

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  User enters: "myemail@gmail.com"                               │
│  User sees:   "myemail@gmail.com" (plaintext)                   │
└─────────────────────────────────────────────────────────────────┘
                              │ ▲
                    POST/PUT  │ │ GET (decrypted)
                              ▼ │
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND API                               │
│  • On CREATE/UPDATE: encrypt(accountName, userKey)              │
│  • On READ (owner):  decrypt(encryptedAccountName, userKey)     │
│  • On READ (admin):  return masked or "[encrypted]"             │
└─────────────────────────────────────────────────────────────────┘
                              │ ▲
                              ▼ │
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE                                  │
│  accountName: "enc:iv:ciphertext:authTag"                       │
│  (always stored encrypted)                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TELEGRAM NOTIFICATIONS                         │
│  Backend decrypts accountName before sending reminder           │
└─────────────────────────────────────────────────────────────────┘
```

## Technical Design

### Encryption Algorithm

- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Key derivation:** HMAC-SHA256(server_secret, user_id + "subscription-account")
- **Format:** `enc:<iv_base64>:<ciphertext_base64>:<authTag_base64>`

### Key Management

- **Server secret:** 32-character random string stored in `ENCRYPTION_SECRET` env var
- **Per-user keys:** Derived from server secret + user ID (unique per user)
- **No key storage:** Keys derived on-demand, not stored in database

### Implementation

#### New File: `backend/src/lib/crypto.ts`

```typescript
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
    return encrypted; // Legacy plaintext
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
```

#### Modified Files

| File | Changes |
|------|---------|
| `backend/src/routes/subscriptions.ts` | Encrypt on POST/PUT, decrypt on GET |
| `backend/src/services/notifications.ts` | Decrypt before Telegram notification |
| `backend/src/routes/admin.ts` | Return masked value for admin views |
| `.env.example` | Document `ENCRYPTION_SECRET` requirement |

### Migration Strategy

**Gradual migration** - no database migration required:
- New/updated subscriptions: stored encrypted
- Existing subscriptions: remain plaintext until edited
- Read logic: detects format and handles both

### Access Control Matrix

| Actor | DB Access | API Access | Can Decrypt? |
|-------|-----------|------------|--------------|
| Owner (user) | No | Yes | ✅ Yes |
| Admin | Yes | Yes | ❌ No (sees masked) |
| DB Attacker | Yes | No | ❌ No |
| Server Attacker | Yes | Yes | ⚠️ Only with ENCRYPTION_SECRET |

## Implementation Plan

1. Create `backend/src/lib/crypto.ts` with encryption utilities
2. Add `ENCRYPTION_SECRET` to `.env` and `.env.example`
3. Update `backend/src/routes/subscriptions.ts` (encrypt/decrypt)
4. Update `backend/src/services/notifications.ts` (decrypt for Telegram)
5. Update `backend/src/routes/admin.ts` (mask for admin views)
6. Add unit tests for `crypto.ts`
7. Test end-to-end flow

## Environment Variables

```bash
# .env
ENCRYPTION_SECRET=<32-character-random-string>

# Generate with:
# openssl rand -base64 32 | head -c 32
```

## Security Considerations

1. **Never commit** `ENCRYPTION_SECRET` to git
2. **Use secrets manager** in production (AWS Secrets Manager, Vault, etc.)
3. **Log decryption errors** server-side only (no details to client)
4. **Future:** Add key rotation with `keyVersion` field

## Testing

- Unit tests for encrypt/decrypt functions
- Integration tests for subscription CRUD with encryption
- Verify Telegram notifications receive decrypted values
- Verify admin cannot see plaintext
