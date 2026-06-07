import { useAuthActions } from '@convex-dev/auth/react';
import { makeRedirectUri } from 'expo-auth-session';
import { openAuthSessionAsync } from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

// GitHub + Google use the web-browser OAuth redirect flow; Apple is native.
export type OAuthProvider = 'github' | 'google';
export type PasswordFlow = 'signIn' | 'signUp';

export function useAuth() {
  const { signIn, signOut } = useAuthActions();
  const redirectTo = makeRedirectUri({ scheme: 'pacto' });

  /** Native two-call OAuth: get the provider URL, open the browser, finish with the code. */
  const oauth = async (provider: OAuthProvider) => {
    const { redirect } = await signIn(provider, { redirectTo });
    if (Platform.OS === 'web') return;
    const result = await openAuthSessionAsync(redirect!.toString(), redirectTo);
    if (result.type === 'success') {
      const code = new URL(result.url).searchParams.get('code');
      if (code) await signIn(provider, { code });
    }
  };

  /** Native Sign in with Apple → verified server-side via the 'apple' provider. */
  const appleNative = async () => {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    const identityToken = credential.identityToken;
    if (!identityToken) throw new Error('Apple did not return an identity token');
    const fullName = credential.fullName
      ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ').trim()
      : '';
    await signIn('apple', { identityToken, ...(fullName ? { fullName } : {}) });
  };

  const withPassword = async (
    email: string,
    password: string,
    flow: PasswordFlow,
    name?: string,
  ) => {
    await signIn('password', { email, password, flow, ...(name ? { name } : {}) });
  };

  return { oauth, appleNative, withPassword, signOut };
}
