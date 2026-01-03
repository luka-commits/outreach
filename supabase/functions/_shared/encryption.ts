/**
 * Shared encryption utilities for secure credential storage.
 *
 * Uses AES-256-GCM for authenticated encryption.
 * Requires ENCRYPTION_SECRET environment variable (32 bytes / 64 hex chars).
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // 128 bits

/**
 * Gets the encryption key from environment variable.
 * Key should be 32 bytes (64 hex characters).
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const secretHex = Deno.env.get('ENCRYPTION_SECRET');
  if (!secretHex) {
    throw new Error('ENCRYPTION_SECRET environment variable is required');
  }

  // Convert hex string to Uint8Array (32 bytes = 256 bits)
  if (secretHex.length !== 64) {
    throw new Error('ENCRYPTION_SECRET must be 64 hex characters (32 bytes)');
  }

  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    keyBytes[i] = parseInt(secretHex.substr(i * 2, 2), 16);
  }

  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string using AES-256-GCM.
 * Returns base64-encoded string: iv + ciphertext + tag
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encode plaintext
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
      tagLength: TAG_LENGTH,
    },
    key,
    plaintextBytes
  );

  // Combine IV + ciphertext (tag is appended by GCM)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a base64-encoded AES-256-GCM encrypted string.
 */
export async function decrypt(encryptedBase64: string): Promise<string> {
  const key = await getEncryptionKey();

  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  // Decrypt
  const plaintextBytes = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv,
      tagLength: TAG_LENGTH,
    },
    key,
    ciphertext
  );

  // Decode to string
  const decoder = new TextDecoder();
  return decoder.decode(plaintextBytes);
}

/**
 * Safely decrypts a value, returning null on error.
 * Useful for handling potentially corrupted or old data.
 */
export async function safeDecrypt(encryptedBase64: string | null): Promise<string | null> {
  if (!encryptedBase64) {
    return null;
  }

  try {
    return await decrypt(encryptedBase64);
  } catch (error) {
    console.error('Decryption failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Checks if encryption is properly configured.
 */
export function isEncryptionConfigured(): boolean {
  const secretHex = Deno.env.get('ENCRYPTION_SECRET');
  return !!secretHex && secretHex.length === 64;
}
