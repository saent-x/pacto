import GitHub from '@auth/core/providers/github';
import Google from '@auth/core/providers/google';
import { ConvexCredentials } from '@convex-dev/auth/providers/ConvexCredentials';
import { Password } from '@convex-dev/auth/providers/Password';
import { convexAuth, createAccount, retrieveAccount } from '@convex-dev/auth/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { DataModel } from './_generated/dataModel';

// Apple's public keys for verifying the identity token from native Sign in with Apple.
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

/**
 * Native Sign in with Apple. The client (expo-apple-authentication) obtains an
 * identity token and passes it to `signIn('apple', { identityToken, fullName })`.
 * We verify the token against Apple's JWKS (issuer + audience = our bundle id),
 * then find or create the linked account. No Apple Service ID / client secret is
 * needed for the native flow.
 */
const AppleNative = ConvexCredentials<DataModel>({
  id: 'apple',
  authorize: async (credentials, ctx) => {
    const identityToken = credentials.identityToken;
    if (typeof identityToken !== 'string' || identityToken.length === 0) {
      throw new Error('Missing Apple identityToken');
    }
    const bundleId = process.env.APPLE_BUNDLE_ID;
    if (!bundleId) throw new Error('APPLE_BUNDLE_ID is not configured');

    const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
      issuer: 'https://appleid.apple.com',
      audience: bundleId,
    });

    const appleSub = payload.sub;
    if (!appleSub) throw new Error('Apple token missing subject');
    const email = typeof payload.email === 'string' ? payload.email : undefined;
    const fullName =
      typeof credentials.fullName === 'string' && credentials.fullName.trim().length > 0
        ? credentials.fullName.trim()
        : undefined;
    const displayName = fullName ?? (email ? email.split('@')[0] : 'Pacto user');

    const account = { id: appleSub };
    try {
      const existing = await retrieveAccount(ctx, { provider: 'apple', account });
      if (existing?.user?._id) return { userId: existing.user._id };
    } catch {
      // Account doesn't exist yet — fall through to create it.
    }
    const created = await createAccount(ctx, {
      provider: 'apple',
      account,
      // Omit email entirely when absent — the profile type rejects undefined values.
      profile: { displayName, ...(email ? { email } : {}) },
      // Apple verifies emails, so linking to an existing same-email user is safe.
      shouldLinkViaEmail: true,
    });
    return { userId: created.user._id };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Email + password (works immediately, no external credentials).
    Password<DataModel>({
      profile(params) {
        const email = params.email as string;
        const name = (params.name as string | undefined)?.trim();
        return {
          email,
          displayName: name && name.length > 0 ? name : email.split('@')[0],
        };
      },
    }),
    // GitHub + Google OAuth — credentials supplied as Convex env vars
    // (AUTH_<PROVIDER>_ID / _SECRET), web-browser redirect flow.
    GitHub,
    Google,
    // Apple — native flow (see above).
    AppleNative,
  ],
  callbacks: {
    // Allowlist the redirect targets the native app uses (deep link + Expo dev).
    async redirect({ redirectTo }) {
      // Custom app schemes (deep links): exact scheme match.
      const schemes = ['pacto://', 'exp://', 'exp+pacto://'];
      if (schemes.some((s) => redirectTo.startsWith(s))) return redirectTo;
      // http(s) only for localhost during development — match the host EXACTLY
      // (a startsWith('http://localhost') check would also accept
      // http://localhostattacker.com, leaking the OAuth code to an attacker domain).
      try {
        const u = new URL(redirectTo);
        if (
          (u.protocol === 'http:' || u.protocol === 'https:') &&
          (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
        ) {
          return redirectTo;
        }
      } catch {
        // not a parseable URL — reject below
      }
      throw new Error(`Invalid redirectTo URI: ${redirectTo}`);
    },
  },
});
