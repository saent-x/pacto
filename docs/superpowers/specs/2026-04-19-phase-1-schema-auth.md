# Phase 1 — InstantDB schema + auth + space model

## Goal

Wire InstantDB as the backend for Coupl. Establish the data model (solo + couple), auth flows (magic code + OAuth), and a single session context that gates navigation. This is the foundation all later feature phases build on.

## Non-goals (later phases)

- Feature-specific CRUD (tasks, reminders, love notes, etc.) — Phase 2
- Timetables / calendar / home rings — Phase 3
- Animations, haptics, offline niceties — Phase 4

## Architecture

```
app/_layout.tsx
  └── GestureHandlerRootView
      └── SafeAreaProvider
          └── ThemeProvider
              └── SessionProvider   ← NEW: provides { status, user, space, partner, ... }
                  └── SessionGate   ← NEW: redirects by status
                      └── Stack (existing routes)
```

Every screen reads auth state through `useSession()` — no direct `db.useAuth()` calls outside the provider.

## Data model

### Entities (`instant.schema.ts`, rewritten from scratch)

```ts
i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed(),
      displayName: i.string().optional(),
      avatarUrl: i.string().optional(),
      birthday: i.string().optional(),       // ISO date
      createdAt: i.number(),
    }),

    spaces: i.entity({
      kind: i.string(),                      // 'solo' | 'couple'
      name: i.string().optional(),           // couples pick a name; solo = null
      anniversary: i.string().optional(),    // ISO date, couple only
      inviteCode: i.string().optional().unique().indexed(), // 6-char, null when used or solo
      createdAt: i.number(),
      updatedAt: i.number(),
    }),

    memberships: i.entity({
      role: i.string(),                      // 'owner' | 'partner'
      joinedAt: i.number(),
    }),
  },
  links: {
    spaceCreator: {
      forward: { on: 'spaces', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdSpaces' },
    },
    membershipUser: {
      forward: { on: 'memberships', has: 'one', label: 'user' },
      reverse: { on: '$users', has: 'many', label: 'memberships' },
    },
    membershipSpace: {
      forward: { on: 'memberships', has: 'one', label: 'space', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'memberships' },
    },
  },
});
```

**Invariants (enforced by app logic, not DB):**
- Every `$user` has exactly one active membership. Exactly one `space`.
- `spaces.kind = 'solo'` → `memberships.length = 1`.
- `spaces.kind = 'couple'` → `memberships.length ∈ {1, 2}`. A 1-member couple is "awaiting partner".
- `spaces.inviteCode` is non-null iff the space is a couple with < 2 members.

**Future-proofing:** Phase 2 entities (tasks, reminders, etc.) will each link to `spaces` (`has: 'one'`) + `createdBy` (`$users`). Not defined in Phase 1.

### Permissions (`instant.perms.ts`, rewritten)

Standard row-level. Every rule reads `auth.id`.

```ts
{
  $users: {
    allow: {
      view: "auth.id == data.id || isCoMember(auth.id, data.id)",
      update: "auth.id == data.id",
    },
  },
  spaces: {
    allow: {
      view: "isMember(auth.id, data.id)",
      create: "auth.id != null",
      update: "isMember(auth.id, data.id)",
      delete: "isOwner(auth.id, data.id)",
    },
  },
  memberships: {
    allow: {
      view: "isMember(auth.id, data.space.id)",
      create: "canJoinSpace(auth.id, data.space.id)",   // space has inviteCode and < 2 members
      delete: "auth.id == data.user.id",                // leave space
    },
  },
}
```

Details of `isMember`, `isOwner`, `isCoMember`, `canJoinSpace` defined as CEL expressions in the perms file.

## Auth flows

### Flow A — Magic code

1. Sign-in screen: user enters email → press "Send code"
2. `db.auth.sendMagicCode({ email })`
3. Screen swaps to 6-slot code input (reuse existing `invite.tsx` pattern)
4. User enters code → `db.auth.signInWithMagicCode({ email, code })`
5. Session hook picks up new auth → status recomputed

### Flow B — OAuth (Apple + Google, both platforms)

Uses InstantDB's hosted OAuth + `expo-web-browser`:

1. Sign-in screen: "Continue with Apple" / "Continue with Google" buttons
2. Press button → `db.auth.createAuthorizationURL({ clientName: 'apple' | 'google', redirectURL })`
3. Open returned URL in `WebBrowser.openAuthSessionAsync(...)`
4. User completes OAuth on provider, redirected back with `code`
5. `db.auth.exchangeOAuthCode({ code, codeVerifier })` → session established
6. `WebBrowser.maybeCompleteAuthSession()` in sign-in module to handle the return

Redirect URL: `coupl://auth-callback` (uses existing `app.json` `scheme: "coupl"`).

### Flow C — Session reload / cold start

On cold start, `db.useAuth()` returns `{ isLoading: true }` briefly. `SessionProvider` treats that as `status = 'loading'`. Splash stays up until resolved.

Once auth resolves:
- No user → `unauthed`
- User but no membership → `onboarding`
- User with membership → `ready`

## Session provider

**File:** `src/lib/session.tsx` (new)

```tsx
type SessionStatus = 'loading' | 'unauthed' | 'onboarding' | 'ready';
type Session = {
  status: SessionStatus;
  user: User | null;
  space: Space | null;
  membership: Membership | null;
  partner: User | null;
  isSolo: boolean;
  isCouple: boolean;
};

export const SessionProvider: React.FC<PropsWithChildren>;
export function useSession(): Session;
```

Internally:
1. `db.useAuth()` → `{ user, isLoading }`
2. If `isLoading` → status `loading`
3. If `!user` → status `unauthed`
4. Else `db.useQuery({ memberships: { space: { memberships: { user: {} } } } })` filtered by user
5. If no membership → status `onboarding`
6. Else derive `space`, `partner` (other membership's user), `isSolo`, `isCouple`

### Session gate

**File:** `src/lib/session-gate.tsx` (new)

A thin wrapper that calls `useSession()` and uses `useRouter().replace(...)` + `usePathname()` to redirect based on status. Gate runs on every status transition. Never redirects when already on the correct route. Allows the current path if it's in the allowed set for the status:

- `loading` → no redirect, render `<Splash />`
- `unauthed` → allowed paths: `/(auth)/*`; anything else → `/(auth)/sign-in`
- `onboarding` → allowed: `/(auth)/onboarding`, `/(auth)/invite`; else → `/(auth)/onboarding`
- `ready` → allowed: `/(tabs)/*`, `/sheets/*`, `/notifications`; else → `/(tabs)/home`

## Onboarding UI changes

**Current:** 2-card choice (Create / I have a code).
**New:** 3-card choice.

`app/(auth)/onboarding.tsx` gets three `BlockCard`s stacked:

| Card | Visual | Action |
|---|---|---|
| Just me | peach card | create solo space → land in home |
| With partner | lavender card | create couple space → show invite code screen with generated code |
| I have a code | butter card | go to invite entry |

### New screen: Show invite code

**File:** `app/(auth)/invite-code.tsx` (new, distinct from existing `invite.tsx` which is for entering codes)

Shown right after couple-space creation. Displays the 6-char code prominently with copy + share buttons. A "I'll do this later" button writes the user into the solo-ish "awaiting partner" state and sends them to home (they can re-open this from settings).

## Sign-in screen rework

Current `sign-in.tsx` shows email + password + eye toggle. Replace with:

- Email field
- "Continue" primary button → triggers magic code flow (swap to code entry in-place, keep screen)
- Divider "or"
- "Continue with Apple" (black bg, white text)
- "Continue with Google" (white bg, dark text)
- Link: "New here? Create an account" → `/(auth)/onboarding`

When "Continue" is pressed without code sent yet:
- Call `sendMagicCode`
- Transition local state to `codeSent`
- Render 6-slot input below email (email becomes read-only)
- Third press calls `signInWithMagicCode`

## Settings additions

Phase 1 touches `app/sheets/profile.tsx` to add:
- Sign out button (calls `db.auth.signOut()`)
- "Invite partner" row — visible iff `space.kind === 'couple'` and `partner === null`. Opens the invite code screen.
- "Upgrade to couple" row — visible iff `space.kind === 'solo'`. Converts solo → couple: updates `space.kind`, generates `inviteCode`, opens invite code screen.
- "Leave space" — destructive. Deletes my membership. If I'm the only member, also deletes the space. Redirects to onboarding.

## Files changed

**New:**
- `instant.schema.ts` — full rewrite
- `instant.perms.ts` — full rewrite
- `src/lib/db.ts` — `init()` the InstantDB client, export singleton
- `src/lib/session.tsx` — `SessionProvider`, `useSession`
- `src/lib/session-gate.tsx` — route guard
- `src/lib/invite-code.ts` — `generateInviteCode()` (6-char A-Z, 0-9, no O/0/I/1)
- `src/lib/oauth.ts` — thin wrapper around InstantDB OAuth + expo-web-browser
- `app/(auth)/invite-code.tsx` — show generated code after couple creation

**Modified:**
- `app/_layout.tsx` — mount `SessionProvider` + `SessionGate`, call `WebBrowser.maybeCompleteAuthSession()`
- `app/index.tsx` — remove hardcoded redirect; let `SessionGate` decide
- `app/(auth)/sign-in.tsx` — magic code + OAuth, drop password
- `app/(auth)/onboarding.tsx` — 3-way choice (Just me / With partner / I have a code)
- `app/(auth)/invite.tsx` — wire to `db.transact` for joining via code
- `app/sheets/profile.tsx` — sign out + invite partner + upgrade + leave

**Preserved files to delete** (no longer accurate reference):
- `src/hooks/useSession.ts` + `useSession.test.tsx` — replaced
- `src/hooks/useAuthActions.ts` — replaced
- `src/hooks/useColors.ts` — use `useTheme()` directly
- `src/hooks/useEncryption.ts` — not used in Phase 1
- `src/providers/AppProviders.tsx` — superseded by new provider hierarchy

Other preserved feature hooks (`useTasks`, `useReminders`, etc.) stay untouched; they're Phase 2+ reference.

## Dependencies

All already installed:
- `@instantdb/react-native` ✓
- `expo-web-browser` ✓
- `expo-secure-store` ✓ (InstantDB uses for persistence)

Need to add:
- **None** for Phase 1.

## Configuration

- `EXPO_PUBLIC_INSTANT_APP_ID` environment variable (read by `src/lib/db.ts`)
- iOS `app.json` `scheme: "coupl"` already set — used as OAuth redirect
- Apple and Google OAuth clients configured in InstantDB dashboard (out-of-band, documented in README)

## Error handling

- Magic code: bad code → inline error text under code input, slot borders turn `C.error`
- Magic code: send failure → toast-style error banner at top
- OAuth: user cancels `WebBrowser` → no error shown; user stays on sign-in
- OAuth: code exchange fails → banner with retry
- Invite code entry: invalid / already-used code → inline error, slots shake (Phase 4 animates the shake; Phase 1 = static red)
- Session query errors → log to console, keep last known state

## Testing

Phase 1 ships without tests. Unit/integration tests for session logic + invite flow arrive in a dedicated testing sub-phase after Phase 2 first feature proves the stack.

Manual smoke (end of plan):
- Magic code round-trip on iOS simulator
- Apple + Google OAuth on iOS simulator
- Solo signup → lands in home, no invite UI
- Couple signup → invite code shown, second device joins with code, both see each other as partner
- Upgrade solo → couple
- Leave space → returns to onboarding
- Sign out → returns to sign-in

## Open risks

- InstantDB OAuth on iOS simulator can be flaky (Apple Sign In requires real device for full flow). Document workaround: test OAuth on device.
- 6-char code collision probability across active couples: 32^6 = ~1B. Negligible at expected scale. Retry-on-conflict in `generateInviteCode()` if the `unique()` constraint rejects.
- Race condition on partner join: two people enter the same code simultaneously. DB-side: `unique` on `inviteCode` plus our app logic checking `< 2 members` → second writer gets rejected. Shown as "Code no longer valid" inline error.
