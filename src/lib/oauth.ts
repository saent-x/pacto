import * as WebBrowser from 'expo-web-browser';
import { db } from './db';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_URL = 'coupl://auth-callback';

export async function signInWithOAuth(provider: 'apple' | 'google'): Promise<void> {
  const url = db.auth.createAuthorizationURL({
    clientName: provider,
    redirectURL: REDIRECT_URL,
  });

  const result = await WebBrowser.openAuthSessionAsync(url, REDIRECT_URL);

  if (result.type !== 'success') {
    // user cancelled or dismissed — not an error condition
    return;
  }

  const parsed = new URL(result.url);
  const code = parsed.searchParams.get('code');
  if (!code) throw new Error('No auth code returned from provider');

  await db.auth.exchangeOAuthCode({ code });
}
