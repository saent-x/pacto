import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { db } from './db';

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically strong nonce for Apple Sign In.
 *
 * Uses the Web Crypto API, which is globally available in this app via the
 * `react-native-get-random-values` polyfill (the same source `src/lib/crypto.ts`
 * relies on). `Math.random()` is NOT cryptographically secure and must not be
 * used for an auth nonce.
 */
function generateSecureNonce(): string {
  const cryptoApi = (globalThis as { crypto?: Crypto }).crypto;
  if (typeof cryptoApi?.randomUUID === 'function') {
    // Two UUIDs => 256 bits of entropy, hex-only characters.
    return `${cryptoApi.randomUUID()}${cryptoApi.randomUUID()}`.replace(/-/g, '');
  }
  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(32));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('Secure random source unavailable for Apple Sign In nonce');
}

export async function signInWithApple(): Promise<void> {
  const nonce = generateSecureNonce();
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce,
    });
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED') return;
    throw e;
  }

  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token');
  }

  await db.auth.signInWithIdToken({
    clientName: 'apple',
    idToken: credential.identityToken,
    nonce,
  });
}
