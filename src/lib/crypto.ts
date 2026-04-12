/**
 * Client-side encryption for sensitive couple data.
 *
 * Uses AES-GCM via Web Crypto API (available in React Native Hermes).
 * The couple encryption key is generated once when a couple is created,
 * stored in expo-secure-store (hardware-backed keychain on iOS),
 * and exchanged with the partner during invite acceptance.
 *
 * InstantDB only ever sees ciphertext for encrypted fields.
 */
import * as SecureStore from 'expo-secure-store';

const COUPLE_KEY_PREFIX = 'coupl_ekey_';
const KEY_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96-bit IV for AES-GCM

function getCoupleKeyId(coupleId: string): string {
  return `${COUPLE_KEY_PREFIX}${coupleId}`;
}

/**
 * Generate a new AES-256-GCM key for a couple.
 * Called once when creating a couple.
 */
export async function generateCoupleKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    { name: KEY_ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt'],
  );
  const exported = await crypto.subtle.exportKey('raw', key);
  return bufferToBase64(exported);
}

/**
 * Validate that a base64 string is a valid AES-256 key by attempting import.
 * Throws if invalid.
 */
export async function validateKey(keyBase64: string): Promise<void> {
  const raw = base64ToBuffer(keyBase64);
  if (raw.byteLength !== 32) {
    throw new Error('Invalid key length: expected 256-bit (32 bytes).');
  }
  // Attempt import to verify the key is usable
  await crypto.subtle.importKey(
    'raw',
    raw,
    { name: KEY_ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Store the couple's encryption key in the device secure keychain.
 * Validates the key before storing.
 */
export async function storeCoupleKey(coupleId: string, keyBase64: string): Promise<void> {
  await validateKey(keyBase64);
  await SecureStore.setItemAsync(getCoupleKeyId(coupleId), keyBase64, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

/**
 * Retrieve the couple's encryption key from secure storage.
 * Returns null if no key is stored (e.g. partner hasn't received it yet).
 */
export async function getCoupleKey(coupleId: string): Promise<string | null> {
  return SecureStore.getItemAsync(getCoupleKeyId(coupleId));
}

/**
 * Delete the couple's encryption key (on account deletion or leaving couple).
 */
export async function deleteCoupleKey(coupleId: string): Promise<void> {
  await SecureStore.deleteItemAsync(getCoupleKeyId(coupleId));
}

/**
 * Encrypt a plaintext string. Returns "ENC:iv:ciphertext" base64 format.
 * If no key is available, returns the plaintext unchanged (graceful degradation).
 */
export async function encryptField(
  coupleId: string,
  plaintext: string,
): Promise<string> {
  const keyBase64 = await getCoupleKey(coupleId);
  if (!keyBase64) return plaintext;

  try {
    const key = await importKey(keyBase64);
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt(
      { name: KEY_ALGORITHM, iv },
      key,
      encoded,
    );

    const ivB64 = bufferToBase64(iv.buffer);
    const ctB64 = bufferToBase64(ciphertext);
    return `ENC:${ivB64}:${ctB64}`;
  } catch {
    // If encryption fails, return plaintext (don't block the user)
    return plaintext;
  }
}

/**
 * Decrypt an encrypted field. If the value isn't encrypted (no "ENC:" prefix),
 * returns it unchanged. Gracefully handles missing keys or corruption.
 */
export async function decryptField(
  coupleId: string,
  ciphertext: string,
): Promise<string> {
  if (!ciphertext.startsWith('ENC:')) return ciphertext;

  const keyBase64 = await getCoupleKey(coupleId);
  if (!keyBase64) return '[encrypted]';

  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) return '[encrypted]';

    const iv = base64ToBuffer(parts[1]);
    const ct = base64ToBuffer(parts[2]);
    const key = await importKey(keyBase64);
    const decrypted = await crypto.subtle.decrypt(
      { name: KEY_ALGORITHM, iv: new Uint8Array(iv) },
      key,
      ct,
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return '[encrypted]';
  }
}

/**
 * Check if a value is encrypted.
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith('ENC:');
}

// --- Internal helpers ---

async function importKey(keyBase64: string): Promise<CryptoKey> {
  const raw = base64ToBuffer(keyBase64);
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: KEY_ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
