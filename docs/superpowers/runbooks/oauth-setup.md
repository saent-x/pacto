# OAuth setup (Phase 1)

Coupl uses InstantDB's hosted OAuth. The client ships no native OAuth SDKs —
everything runs through `expo-web-browser` plus InstantDB's `createAuthorizationURL`
and `exchangeOAuthCode`.

## One-time setup (per provider)

1. Sign in at https://instantdb.com/dash, select this app.
2. Go to **Auth → OAuth**.

### Google

- In Google Cloud Console, create a project.
- Create OAuth 2.0 Client ID (type: **Web application**).
- Authorized redirect URI: copy the one shown in InstantDB dash (typically
  `https://api.instantdb.com/runtime/oauth/callback`).
- Paste Client ID + Client secret back into InstantDB dash.

### Apple

- In Apple Developer portal, create a **Services ID**.
- Enable **Sign in with Apple**.
- Redirect URL: the InstantDB callback (same as Google's).
- Generate a private key for Sign in with Apple.
- Paste Team ID, Key ID, Services ID, and private key into InstantDB dash.

## App side

Redirect URL: `coupl://auth-callback` — set in `src/lib/oauth.ts`. Matches
`app.json`'s `scheme: "coupl"`.

## Simulator caveats

- **Apple Sign In** requires a real device with an Apple ID. On iOS simulator,
  use magic code or the dev email prefill button (shown only when `__DEV__`).
- **Google Sign In** works on simulator.
- **Magic code** works everywhere.

## Smoke

See `docs/superpowers/plans/2026-04-19-phase-1-schema-auth.md` Task 20 for the
full smoke checklist.
