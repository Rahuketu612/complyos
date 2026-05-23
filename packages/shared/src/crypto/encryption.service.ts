/**
 * Encryption Service
 * Field-level encryption for sensitive data (PAN, Aadhaar, bank accounts)
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

interface EncryptionConfig {
  key: string;
  keyHash?: string;
}

let encryptionConfig: EncryptionConfig | null = null;

function deriveKey(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function initializeEncryption(): void {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  
  encryptionConfig = {
    key: deriveKey(key),
    keyHash: createHash('sha256').update(key).digest('hex').substring(0, 16),
  };
}

export function encrypt(plaintext: string): string {
  if (!encryptionConfig) {
    initializeEncryption();
  }
  
  const key = Buffer.from(encryptionConfig!.key, 'hex');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  if (!encryptionConfig) {
    initializeEncryption();
  }
  
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }
  
  const key = Buffer.from(encryptionConfig!.key, 'hex');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function maskPAN(pan: string): string {
  if (pan.length < 4) return '****';
  return '****'.repeat(4 - 1) + pan.slice(-4);
}

export function maskAadhaar(aadhaar: string): string {
  if (aadhaar.length < 4) return '****';
  return '*'.repeat(8) + aadhaar.slice(-4);
}

export function maskBankAccount(account: string): string {
  if (account.length < 4) return '****';
  return '*'.repeat(account.length - 4) + account.slice(-4);
}

export function encryptFields(
  data: Record<string, any>,
  fields: string[],
  tenantId: string
): Record<string, any> {
  const encrypted = { ...data };
  
  for (const field of fields) {
    if (encrypted[field] !== undefined && encrypted[field] !== null) {
      const encryptedValue = encrypt(String(encrypted[field]));
      encrypted[field] = encryptedValue;
      encrypted[`${field}_encrypted`] = true;
      encrypted[`${field}_tenant_id`] = tenantId;
    }
  }
  
  return encrypted;
}

export function decryptFields(
  data: Record<string, any>,
  fields: string[]
): Record<string, any> {
  const decrypted = { ...data };
  
  for (const field of fields) {
    if (decrypted[field] !== undefined && decrypted[field] !== null && decrypted[`${field}_encrypted`]) {
      if (decrypted[`${field}_tenant_id`]) {
        decrypted[field] = decrypt(String(decrypted[field]));
      }
    }
  }
  
  return decrypted;
}

export function generateToken(length = 32): string {
  return randomBytes(length).toString('hex');
}

export function isEncrypted(value: string): boolean {
  return value.includes(':') && value.split(':').length === 3;
}
