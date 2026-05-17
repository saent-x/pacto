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

export async function signInWithApple(): Promise<void> {
  const nonce = String(Math.random()) + String(Date.now());
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
