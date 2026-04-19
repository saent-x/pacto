# Phase 1 — InstantDB schema + auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire InstantDB as backend. Establish `spaces` + `memberships` data model (solo + couple), magic code + OAuth auth flows, and a `SessionProvider` that gates navigation by status.

**Architecture:** Single source of truth: `src/lib/db.ts` exports the InstantDB client. `SessionProvider` wraps the app under `ThemeProvider`, subscribes to `db.useAuth()` + membership query, derives `{ status, user, space, partner, ... }`. `SessionGate` calls `router.replace` based on status + current path. All auth screens dispatch mutations through `db.transact` — no intermediate services.

**Tech Stack:** `@instantdb/react-native` (already installed), `expo-web-browser` (already installed), `expo-secure-store` (already installed), InstantDB CLI for schema push.

**Spec reference:** `docs/superpowers/specs/2026-04-19-phase-1-schema-auth.md`

**Source-of-truth snippets for docs we rely on:**
- InstantDB RN SDK exports: `init`, `i`, `id`, `lookup`, `tx`. Auth methods on client: `auth.sendMagicCode`, `auth.signInWithMagicCode`, `auth.signInWithIdToken`, `auth.createAuthorizationURL`, `auth.exchangeOAuthCode`, `auth.signOut`, `useAuth()`.
- Reactive queries: `db.useQuery({...})`.
- Mutations: `db.transact([...])`. Entity creation: `db.tx.<entity>[id].update({...})`. Linking: `.link({ <label>: <id> | lookup('field', value) })`.

---

## File inventory (what exists when done)

**New files:**
- `instant.schema.ts` — rewritten
- `instant.perms.ts` — rewritten
- `src/lib/db.ts`
- `src/lib/invite-code.ts`
- `src/lib/oauth.ts`
- `src/lib/session.tsx`
- `src/lib/session-gate.tsx`
- `src/lib/space-actions.ts`
- `app/(auth)/invite-code.tsx`

**Modified files:**
- `app/_layout.tsx` — mount SessionProvider + SessionGate, register WebBrowser
- `app/index.tsx` — no-op splash; SessionGate handles routing
- `app/(auth)/sign-in.tsx` — magic code + OAuth, drop password
- `app/(auth)/onboarding.tsx` — 3-way choice
- `app/(auth)/invite.tsx` — wire join via code
- `app/sheets/profile.tsx` — sign out / invite / upgrade / leave
- `tsconfig.json` — un-exclude `src/lib` (remove `src/lib/auth` carve-out since we're creating new files under `src/lib`)

**Deleted files:**
- `src/hooks/useSession.ts`
- `src/hooks/useSession.test.tsx`
- `src/hooks/useAuthActions.ts`
- `src/hooks/useColors.ts`
- `src/hooks/useEncryption.ts`
- `src/providers/AppProviders.tsx`

---

## Task 1: Environment variable + InstantDB app id

**Files:**
- Create: `.env` (if missing — .gitignored)
- Modify: `.env.example` (or create)

- [ ] **Step 1: Confirm `.env` is in `.gitignore`**

```bash
grep -q "^\.env$" .gitignore || echo ".env" >> .gitignore
```

- [ ] **Step 2: Ask user for the InstantDB App ID**

If you're the implementer: STOP and ask the controller: "What is the InstantDB app ID? Format: 32-char UUID from https://instantdb.com/dash." If no app exists, ask user to create one at instantdb.com and provide the ID.

- [ ] **Step 3: Write `.env`**

```bash
cat > .env <<EOF
EXPO_PUBLIC_INSTANT_APP_ID=<the-app-id>
EOF
```

- [ ] **Step 4: Create `.env.example`**

```bash
cat > .env.example <<EOF
EXPO_PUBLIC_INSTANT_APP_ID=
EOF
```

- [ ] **Step 5: Commit `.env.example` only**

```bash
git add .env.example .gitignore
git commit -m "chore(env): document EXPO_PUBLIC_INSTANT_APP_ID"
```

---

## Task 2: Rewrite `instant.schema.ts`

**Files:**
- Modify: `instant.schema.ts` (full replacement)

- [ ] **Step 1: Overwrite with new schema**

```ts
import { i } from '@instantdb/react-native';

const _schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed(),
      displayName: i.string().optional(),
      avatarUrl: i.string().optional(),
      birthday: i.string().optional(),
      createdAt: i.number(),
    }),
    spaces: i.entity({
      kind: i.string(),                                     // 'solo' | 'couple'
      name: i.string().optional(),
      anniversary: i.string().optional(),
      inviteCode: i.string().optional().unique().indexed(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    memberships: i.entity({
      role: i.string(),                                     // 'owner' | 'partner'
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

type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
```

- [ ] **Step 2: Push schema to InstantDB**

```bash
npx instant-cli@latest push schema
```
Expected: "Schema pushed successfully." If prompted to destroy columns from the old schema, confirm (dev data only — production data is not at risk because auth hasn't shipped).

- [ ] **Step 3: Commit**

```bash
git add instant.schema.ts
git commit -m "feat(db): rewrite schema around spaces + memberships"
```

---

## Task 3: Rewrite `instant.perms.ts`

**Files:**
- Modify: `instant.perms.ts` (full replacement)

- [ ] **Step 1: Overwrite**

```ts
import type { InstantRules } from '@instantdb/react-native';

const rules = {
  $users: {
    allow: {
      view: "auth.id == data.id || 'co_member' in data.ref('memberships.space.memberships.user.id')",
      update: "auth.id == data.id",
      create: "false",
      delete: "false",
    },
  },
  spaces: {
    allow: {
      view: "auth.id in data.ref('memberships.user.id')",
      create: "auth.id != null",
      update: "auth.id in data.ref('memberships.user.id')",
      delete: "auth.id in data.ref('memberships.user.id') && 'owner' in data.ref('memberships.role')",
    },
  },
  memberships: {
    allow: {
      view: "auth.id in data.ref('space.memberships.user.id')",
      create: "auth.id != null && auth.id == newData.ref('user.id')[0]",
      update: "false",
      delete: "auth.id == data.ref('user.id')[0]",
    },
  },
} satisfies InstantRules;

export default rules;
```

Note on `$users.view`: InstantDB's CEL variant may require a slightly different syntax for co-member detection. If the first form is rejected, fall back to `"auth.id == data.id"` (minimal) — we can relax later once real co-member queries surface issues.

- [ ] **Step 2: Push perms**

```bash
npx instant-cli@latest push perms
```
Expected: "Perms pushed successfully." If the `$users.view` rule fails to parse, replace with `"auth.id == data.id"` and re-push.

- [ ] **Step 3: Commit**

```bash
git add instant.perms.ts
git commit -m "feat(db): rewrite perms for spaces + memberships"
```

---

## Task 4: InstantDB client singleton

**Files:**
- Create: `src/lib/db.ts`

- [ ] **Step 1: Write the file**

```ts
import { init } from '@instantdb/react-native';
import schema from '../../instant.schema';

const appId = process.env.EXPO_PUBLIC_INSTANT_APP_ID;

if (!appId) {
  throw new Error(
    'EXPO_PUBLIC_INSTANT_APP_ID is not set. Copy .env.example to .env and fill in your InstantDB app ID.'
  );
}

export const db = init({ appId, schema });
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat(db): add InstantDB client singleton"
```

---

## Task 5: Invite-code generator

**Files:**
- Create: `src/lib/invite-code.ts`

- [ ] **Step 1: Write the file**

```ts
// Crockford-ish alphabet: removes O, 0, I, 1, L to avoid confusion.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 30 chars
const LENGTH = 6;

export function generateInviteCode(): string {
  let out = '';
  for (let i = 0; i < LENGTH; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function isValidInviteCode(code: string): boolean {
  if (code.length !== LENGTH) return false;
  for (const ch of code) if (!ALPHABET.includes(ch)) return false;
  return true;
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add src/lib/invite-code.ts
git commit -m "feat(lib): add invite-code generator"
```

---

## Task 6: OAuth wrapper

**Files:**
- Create: `src/lib/oauth.ts`

- [ ] **Step 1: Write the file**

```ts
import * as WebBrowser from 'expo-web-browser';
import { db } from './db';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_URL = 'coupl://auth-callback';

export async function signInWithOAuth(provider: 'apple' | 'google'): Promise<void> {
  const { url, codeVerifier } = db.auth.createAuthorizationURL({
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

  await db.auth.exchangeOAuthCode({ code, codeVerifier });
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add src/lib/oauth.ts
git commit -m "feat(auth): add OAuth wrapper"
```

---

## Task 7: Space + membership actions

**Files:**
- Create: `src/lib/space-actions.ts`

- [ ] **Step 1: Write the file**

```ts
import { id, lookup, tx } from '@instantdb/react-native';
import { db } from './db';
import { generateInviteCode } from './invite-code';

export type SpaceKind = 'solo' | 'couple';

function now() {
  return Date.now();
}

// Create a space and create the current user's owner membership in one transaction.
export async function createSpace(params: {
  userId: string;
  kind: SpaceKind;
  name?: string;
  anniversary?: string;
}): Promise<{ spaceId: string; inviteCode: string | null }> {
  const spaceId = id();
  const membershipId = id();
  const inviteCode = params.kind === 'couple' ? generateInviteCode() : null;
  const ts = now();

  await db.transact([
    tx.spaces[spaceId]
      .update({
        kind: params.kind,
        name: params.name,
        inviteCode: inviteCode ?? undefined,
        createdAt: ts,
        updatedAt: ts,
      })
      .link({ createdBy: params.userId }),
    tx.memberships[membershipId]
      .update({ role: 'owner', joinedAt: ts })
      .link({ user: params.userId, space: spaceId }),
  ]);

  return { spaceId, inviteCode };
}

// Join a space by invite code. Atomic: looks up by code, creates membership,
// nulls the code. If the code has already been nulled by a concurrent join,
// transact fails.
export async function joinSpaceByCode(params: {
  userId: string;
  code: string;
}): Promise<void> {
  const ts = now();
  const membershipId = id();

  await db.transact([
    tx.spaces[lookup('inviteCode', params.code)].update({
      inviteCode: undefined,
      updatedAt: ts,
    }),
    tx.memberships[membershipId]
      .update({ role: 'partner', joinedAt: ts })
      .link({
        user: params.userId,
        space: lookup('inviteCode', params.code),
      }),
  ]);
}

// Upgrade solo space → couple. Adds kind + generates invite code.
export async function upgradeSoloToCouple(params: { spaceId: string }): Promise<string> {
  const inviteCode = generateInviteCode();
  await db.transact([
    tx.spaces[params.spaceId].update({
      kind: 'couple',
      inviteCode,
      updatedAt: now(),
    }),
  ]);
  return inviteCode;
}

// Regenerate invite code (invalidates the old one).
export async function regenerateInviteCode(params: { spaceId: string }): Promise<string> {
  const inviteCode = generateInviteCode();
  await db.transact([
    tx.spaces[params.spaceId].update({ inviteCode, updatedAt: now() }),
  ]);
  return inviteCode;
}

// Leave space. Deletes my membership. If I'm the last member, deletes the space too.
export async function leaveSpace(params: {
  spaceId: string;
  membershipId: string;
  isLastMember: boolean;
}): Promise<void> {
  const ops = [tx.memberships[params.membershipId].delete()];
  if (params.isLastMember) {
    ops.push(tx.spaces[params.spaceId].delete());
  }
  await db.transact(ops);
}

// InstantDB auth auto-creates the $users row. This upsert touches only email
// so later updates (displayName etc.) can go through the same helper.
export async function ensureUserRow(params: {
  userId: string;
  email: string;
}): Promise<void> {
  await db.transact([
    tx.$users[params.userId].update({ email: params.email }),
  ]);
}
```

Note: InstantDB `lookup()` semantics — if the code was nulled between steps, the transact batch fails atomically because the second lookup returns "not found". That's our race-condition guard.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/space-actions.ts
git commit -m "feat(db): add space + membership actions"
```

---

## Task 8: SessionProvider + useSession

**Files:**
- Create: `src/lib/session.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { db } from './db';

export type SessionStatus = 'loading' | 'unauthed' | 'onboarding' | 'ready';

export type SessionUser = {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

export type SessionSpace = {
  id: string;
  kind: 'solo' | 'couple';
  name?: string | null;
  anniversary?: string | null;
  inviteCode?: string | null;
};

export type SessionMembership = {
  id: string;
  role: 'owner' | 'partner';
};

export type Session = {
  status: SessionStatus;
  user: SessionUser | null;
  space: SessionSpace | null;
  membership: SessionMembership | null;
  partner: SessionUser | null;
  isSolo: boolean;
  isCouple: boolean;
};

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const { isLoading: authLoading, user } = db.useAuth();

  const { isLoading: queryLoading, data } = db.useQuery(
    user
      ? {
          memberships: {
            $: { where: { 'user.id': user.id } },
            user: {},
            space: {
              memberships: {
                user: {},
              },
            },
          },
        }
      : null
  );

  const session = useMemo<Session>(() => {
    if (authLoading) {
      return emptySession('loading');
    }
    if (!user) {
      return emptySession('unauthed');
    }
    if (queryLoading || !data) {
      return emptySession('loading');
    }

    const myMembership = data.memberships?.[0];
    if (!myMembership) {
      return {
        ...emptySession('onboarding'),
        user: authUserToSessionUser(user),
      };
    }

    const space = myMembership.space;
    const otherMembership = space.memberships.find((m: any) => m.user.id !== user.id);
    const partner = otherMembership ? userToSessionUser(otherMembership.user) : null;

    return {
      status: 'ready',
      user: authUserToSessionUser(user),
      space: {
        id: space.id,
        kind: space.kind as 'solo' | 'couple',
        name: space.name ?? null,
        anniversary: space.anniversary ?? null,
        inviteCode: space.inviteCode ?? null,
      },
      membership: {
        id: myMembership.id,
        role: myMembership.role as 'owner' | 'partner',
      },
      partner,
      isSolo: space.kind === 'solo',
      isCouple: space.kind === 'couple',
    };
  }, [authLoading, user, queryLoading, data]);

  return <Ctx.Provider value={session}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

function emptySession(status: SessionStatus): Session {
  return {
    status,
    user: null,
    space: null,
    membership: null,
    partner: null,
    isSolo: false,
    isCouple: false,
  };
}

function authUserToSessionUser(u: { id: string; email: string }): SessionUser {
  return { id: u.id, email: u.email };
}

function userToSessionUser(u: any): SessionUser {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName ?? null,
    avatarUrl: u.avatarUrl ?? null,
  };
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add src/lib/session.tsx
git commit -m "feat(session): add SessionProvider + useSession"
```

---

## Task 9: SessionGate

**Files:**
- Create: `src/lib/session-gate.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { useRouter, usePathname } from 'expo-router';
import { useEffect, type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { useSession } from './session';

export function SessionGate({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();

  useEffect(() => {
    const target = routeFor(status, pathname);
    if (target && target !== pathname) {
      router.replace(target as any);
    }
  }, [status, pathname, router]);

  if (status === 'loading') {
    return <View style={{ flex: 1 }} />;
  }

  return <>{children}</>;
}

function routeFor(status: string, pathname: string): string | null {
  if (status === 'loading') return null;

  if (status === 'unauthed') {
    return pathname.startsWith('/(auth)') ? null : '/(auth)/sign-in';
  }

  if (status === 'onboarding') {
    const allowed = ['/(auth)/onboarding', '/(auth)/invite', '/(auth)/invite-code'];
    return allowed.includes(pathname) ? null : '/(auth)/onboarding';
  }

  if (status === 'ready') {
    if (pathname.startsWith('/(auth)')) return '/(tabs)/home';
    return null;
  }

  return null;
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add src/lib/session-gate.tsx
git commit -m "feat(session): add SessionGate route guard"
```

---

## Task 10: Mount SessionProvider + SessionGate

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Read current file**

```bash
cat app/_layout.tsx
```

- [ ] **Step 2: Add imports at top**

Add these import lines near the existing imports:

```tsx
import * as WebBrowser from 'expo-web-browser';
import { SessionProvider } from '@/src/lib/session';
import { SessionGate } from '@/src/lib/session-gate';

WebBrowser.maybeCompleteAuthSession();
```

- [ ] **Step 3: Wrap the existing `ThemedRoot` tree**

Inside the `return (...)` of `RootLayout()`, change the `<ThemeProvider>...<ThemedRoot /></ThemeProvider>` section to:

```tsx
<ThemeProvider>
  <SessionProvider>
    <SessionGate>
      <ThemedRoot />
    </SessionGate>
  </SessionProvider>
</ThemeProvider>
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(session): wire SessionProvider + SessionGate into root"
```

---

## Task 11: Simplify `app/index.tsx`

**Files:**
- Modify: `app/index.tsx`

- [ ] **Step 1: Overwrite**

```tsx
import { View } from 'react-native';

export default function Index() {
  // SessionGate handles routing. Render an empty view until status resolves.
  return <View style={{ flex: 1 }} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/index.tsx
git commit -m "feat(session): let SessionGate handle root routing"
```

---

## Task 12: Sign-in screen — magic code + OAuth

**Files:**
- Modify: `app/(auth)/sign-in.tsx` (full replacement)

- [ ] **Step 1: Overwrite**

```tsx
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { CouplRings, Display, Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { GoldRule } from '@/src/components/ui/WarmBlock';
import { Icon } from '@/src/components/ui/Icon';
import { useTheme } from '@/src/lib/theme';
import { db } from '@/src/lib/db';
import { signInWithOAuth } from '@/src/lib/oauth';

const CODE_LENGTH = 6;

type Stage = 'email' | 'code';

export default function SignIn() {
  const { C, F } = useTheme();
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    if (!email.includes('@')) {
      setError('Enter a valid email');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await db.auth.sendMagicCode({ email });
      setStage('code');
    } catch (e: any) {
      setError(e?.message ?? 'Could not send code');
    } finally {
      setBusy(false);
    }
  }

  async function submitCode() {
    const joined = code.join('');
    if (joined.length !== CODE_LENGTH) return;
    setBusy(true);
    setError(null);
    try {
      await db.auth.signInWithMagicCode({ email, code: joined });
      // SessionGate will route after auth state updates
    } catch (e: any) {
      setError(e?.message ?? 'Invalid code');
    } finally {
      setBusy(false);
    }
  }

  async function doOAuth(provider: 'apple' | 'google') {
    setBusy(true);
    setError(null);
    try {
      await signInWithOAuth(provider);
    } catch (e: any) {
      setError(e?.message ?? 'Sign-in cancelled');
    } finally {
      setBusy(false);
    }
  }

  const setCodeSlot = (i: number, v: string) => {
    const next = [...code];
    next[i] = v.slice(-1).toUpperCase();
    setCode(next);
  };

  const isSimulator = __DEV__ && !Constants.isDevice;

  return (
    <ScrollView
      contentContainerStyle={[styles.root, { backgroundColor: C.ink }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <CouplRings size={54} a={C.peach} b={C.lavender} />
        <Display size={52} style={{ marginTop: 20 }}>
          coupl<Text style={{ color: C.gold }}>.</Text>
        </Display>
        <GoldRule width={32} />
        <Text
          style={{
            fontFamily: F.serif, fontStyle: 'italic', fontSize: 18,
            color: C.mist, lineHeight: 25, marginTop: 16, maxWidth: 260,
          }}
        >
          Your quiet place, together.
        </Text>
      </View>

      <View style={{ gap: 24 }}>
        <View>
          <Overline style={{ marginBottom: 10 }}>Email</Overline>
          <View style={[styles.field, { borderBottomColor: stage === 'email' ? C.gold : C.ash }]}>
            <Icon name="mail" size={16} color={stage === 'email' ? C.gold : C.fog} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              editable={stage === 'email' && !busy}
              placeholder="you@coupl.app"
              placeholderTextColor={C.fog}
              autoCapitalize="none"
              keyboardType="email-address"
              style={{ flex: 1, color: C.bone, fontFamily: F.body, fontSize: 15 }}
            />
          </View>
        </View>

        {stage === 'code' && (
          <View>
            <Overline style={{ marginBottom: 10 }}>Code</Overline>
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
              {code.map((ch, i) => (
                <TextInput
                  key={i}
                  value={ch}
                  onChangeText={(v) => setCodeSlot(i, v)}
                  maxLength={1}
                  autoCapitalize="characters"
                  keyboardType="number-pad"
                  style={[
                    styles.slot,
                    {
                      borderColor: ch ? C.gold : error ? C.error : C.line,
                      backgroundColor: C.card,
                      color: C.bone,
                      fontFamily: F.display,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {error && (
          <Text style={{ color: C.error, fontSize: 13, fontFamily: F.body, textAlign: 'center' }}>
            {error}
          </Text>
        )}

        {stage === 'email' ? (
          <PrimaryButton onPress={sendCode} disabled={busy}>
            {busy ? 'Sending…' : 'Continue'}
          </PrimaryButton>
        ) : (
          <>
            <PrimaryButton onPress={submitCode} disabled={busy || code.some((c) => !c)}>
              {busy ? <ActivityIndicator color={C.ink} /> : 'Verify'}
            </PrimaryButton>
            <Pressable onPress={() => { setStage('email'); setCode(Array(CODE_LENGTH).fill('')); setError(null); }}>
              <Text style={{ color: C.mist, textAlign: 'center', fontSize: 13, fontFamily: F.body }}>
                Use a different email
              </Text>
            </Pressable>
          </>
        )}

        {stage === 'email' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
              <Text style={{ color: C.fog, fontSize: 11, fontFamily: F.bodyBold, letterSpacing: 1.2 }}>OR</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
            </View>

            <Pressable
              onPress={() => doOAuth('apple')}
              disabled={busy}
              style={[styles.oauth, { backgroundColor: '#000' }]}
            >
              <Text style={{ color: '#fff', fontFamily: F.bodyBold, fontSize: 14 }}>Continue with Apple</Text>
            </Pressable>
            <Pressable
              onPress={() => doOAuth('google')}
              disabled={busy}
              style={[styles.oauth, { backgroundColor: C.bone, borderColor: C.line, borderWidth: 1 }]}
            >
              <Text style={{ color: C.ink, fontFamily: F.bodyBold, fontSize: 14 }}>Continue with Google</Text>
            </Pressable>

            {isSimulator && (
              <Pressable
                onPress={() => setEmail('dev@coupl.app')}
                style={{ alignSelf: 'center', paddingVertical: 8 }}
              >
                <Text style={{ color: C.fog, fontSize: 11, fontFamily: F.body }}>
                  Dev: prefill test email
                </Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 24, paddingTop: 80, paddingBottom: 40 },
  hero: { marginBottom: 44 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 10, borderBottomWidth: 1 },
  slot: {
    width: 44, height: 52, borderWidth: 1, borderRadius: 10,
    textAlign: 'center', fontSize: 22, fontWeight: '700',
  },
  oauth: {
    paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
});
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(auth)/sign-in.tsx"
git commit -m "feat(auth): magic code + OAuth sign-in"
```

---

## Task 13: Onboarding — 3-way choice + action wiring

**Files:**
- Modify: `app/(auth)/onboarding.tsx` (full replacement)

- [ ] **Step 1: Overwrite**

```tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CouplRings, Display, Overline } from '@/src/components/ui/atoms';
import { GoldRule, BlockCard } from '@/src/components/ui/WarmBlock';
import { Icon } from '@/src/components/ui/Icon';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/lib/session';
import { createSpace, ensureUserRow } from '@/src/lib/space-actions';

export default function Onboarding() {
  const router = useRouter();
  const { C, F } = useTheme();
  const { user } = useSession();
  const [busy, setBusy] = useState<'solo' | 'couple' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createSolo() {
    if (!user) return;
    setBusy('solo');
    setError(null);
    try {
      await ensureUserRow({ userId: user.id, email: user.email });
      await createSpace({ userId: user.id, kind: 'solo' });
      // SessionGate will redirect to /(tabs)/home
    } catch (e: any) {
      setError(e?.message ?? 'Could not create space');
    } finally {
      setBusy(null);
    }
  }

  async function createCouple() {
    if (!user) return;
    setBusy('couple');
    setError(null);
    try {
      await ensureUserRow({ userId: user.id, email: user.email });
      const { inviteCode } = await createSpace({ userId: user.id, kind: 'couple' });
      router.push({ pathname: '/(auth)/invite-code', params: { code: inviteCode ?? '' } } as any);
    } catch (e: any) {
      setError(e?.message ?? 'Could not create space');
    } finally {
      setBusy(null);
    }
  }

  function goJoin() {
    router.push('/(auth)/invite' as any);
  }

  return (
    <ScrollView contentContainerStyle={[styles.root, { backgroundColor: C.ink }]}>
      <CouplRings size={48} a={C.peach} b={C.lavender} />
      <Display size={40} style={{ marginTop: 18 }}>
        Welcome<Text style={{ color: C.gold }}>.</Text>
      </Display>
      <GoldRule width={32} />
      <Text style={{ fontFamily: F.serif, fontStyle: 'italic', color: C.mist, fontSize: 16, marginTop: 14, maxWidth: 280 }}>
        A quiet place. Start alone, together, or join what's already there.
      </Text>

      {error && (
        <Text style={{ color: C.error, fontFamily: F.body, fontSize: 13, marginTop: 16 }}>
          {error}
        </Text>
      )}

      <View style={{ marginTop: 40, gap: 14 }}>
        <Pressable onPress={createSolo} disabled={busy !== null}>
          <BlockCard bg={C.peach} ink={C.peachInk}>
            <Overline>Just me</Overline>
            <Text style={{ fontFamily: F.display, fontSize: 26, color: C.peachInk, marginTop: 6, fontWeight: '700' }}>
              Solo space
            </Text>
            <Text style={{ fontFamily: F.body, color: C.peachInk, opacity: 0.7, fontSize: 13, marginTop: 6 }}>
              {busy === 'solo' ? 'Creating…' : 'Use Coupl on your own. Invite a partner later.'}
            </Text>
            <Row ink={C.peachInk} label="BEGIN" />
          </BlockCard>
        </Pressable>

        <Pressable onPress={createCouple} disabled={busy !== null}>
          <BlockCard bg={C.lavender} ink={C.lavenderInk}>
            <Overline>With partner</Overline>
            <Text style={{ fontFamily: F.display, fontSize: 26, color: C.lavenderInk, marginTop: 6, fontWeight: '700' }}>
              Create a couple
            </Text>
            <Text style={{ fontFamily: F.body, color: C.lavenderInk, opacity: 0.7, fontSize: 13, marginTop: 6 }}>
              {busy === 'couple' ? 'Creating…' : 'We\u2019ll generate a code for your partner.'}
            </Text>
            <Row ink={C.lavenderInk} label="BEGIN" />
          </BlockCard>
        </Pressable>

        <Pressable onPress={goJoin} disabled={busy !== null}>
          <BlockCard bg={C.butter} ink={C.butterInk}>
            <Overline>Invited</Overline>
            <Text style={{ fontFamily: F.display, fontSize: 26, color: C.butterInk, marginTop: 6, fontWeight: '700' }}>
              I have a code
            </Text>
            <Text style={{ fontFamily: F.body, color: C.butterInk, opacity: 0.7, fontSize: 13, marginTop: 6 }}>
              Enter the 6-character code your partner shared.
            </Text>
            <Row ink={C.butterInk} label="ENTER CODE" />
          </BlockCard>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Row({ ink, label }: { ink: string; label: string }) {
  const { F } = useTheme();
  return (
    <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ color: ink, fontFamily: F.bodyBold, fontSize: 12 }}>{label}</Text>
      <Icon name="arrowRight" size={14} color={ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 24, paddingTop: 80, paddingBottom: 60 },
});
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add "app/(auth)/onboarding.tsx"
git commit -m "feat(auth): 3-way onboarding with space creation"
```

---

## Task 14: New screen — show invite code

**Files:**
- Create: `app/(auth)/invite-code.tsx`

- [ ] **Step 1: Write the file**

```tsx
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { CouplRings, Display, Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { GoldRule } from '@/src/components/ui/WarmBlock';
import { Icon } from '@/src/components/ui/Icon';
import { useTheme } from '@/src/lib/theme';

export default function InviteCodeScreen() {
  const { C, F } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = params.code ?? '';
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function onShare() {
    await Share.share({
      message: `Join me on Coupl. Here's the code: ${code}`,
    });
  }

  return (
    <View style={[styles.root, { backgroundColor: C.ink }]}>
      <CouplRings size={48} a={C.peach} b={C.lavender} />
      <Display size={36} style={{ marginTop: 18 }}>
        Share the code<Text style={{ color: C.gold }}>.</Text>
      </Display>
      <GoldRule width={32} />
      <Text style={{ fontFamily: F.serif, fontStyle: 'italic', color: C.mist, fontSize: 15, marginTop: 14, maxWidth: 300 }}>
        Send this to your partner. Six characters — case doesn\u2019t matter.
      </Text>

      <View style={{ marginTop: 40 }}>
        <Overline style={{ marginBottom: 14, textAlign: 'center' }}>Your code</Overline>
        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
          {code.split('').map((ch, i) => (
            <View key={i} style={[styles.slot, { borderColor: C.gold, backgroundColor: C.card }]}>
              <Text style={{ color: C.bone, fontFamily: F.display, fontSize: 24, fontWeight: '700' }}>
                {ch}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 28, justifyContent: 'center' }}>
        <Pressable onPress={onCopy} style={[styles.btn, { borderColor: C.line }]}>
          <Icon name="copy" size={14} color={copied ? C.gold : C.mist} />
          <Text style={{ color: copied ? C.gold : C.mist, fontFamily: F.bodyBold, fontSize: 12 }}>
            {copied ? 'COPIED' : 'COPY'}
          </Text>
        </Pressable>
        <Pressable onPress={onShare} style={[styles.btn, { borderColor: C.line }]}>
          <Icon name="send" size={14} color={C.mist} />
          <Text style={{ color: C.mist, fontFamily: F.bodyBold, fontSize: 12 }}>SHARE</Text>
        </Pressable>
      </View>

      <View style={{ marginTop: 'auto', gap: 10 }}>
        <PrimaryButton onPress={() => router.replace('/(tabs)/home' as any)}>
          I&apos;ll do this later
        </PrimaryButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, paddingTop: 60, paddingBottom: 40 },
  slot: {
    width: 48, height: 56, borderWidth: 1, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1,
  },
});
```

Note: `expo-clipboard` is already in `package.json` (main project dep). No install needed.

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add "app/(auth)/invite-code.tsx"
git commit -m "feat(auth): add invite-code reveal screen"
```

---

## Task 15: Wire invite.tsx to join-by-code

**Files:**
- Modify: `app/(auth)/invite.tsx`

- [ ] **Step 1: Overwrite**

```tsx
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CouplRings, Display, Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { GoldRule } from '@/src/components/ui/WarmBlock';
import { Icon } from '@/src/components/ui/Icon';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/lib/session';
import { ensureUserRow, joinSpaceByCode } from '@/src/lib/space-actions';
import { isValidInviteCode } from '@/src/lib/invite-code';

const SLOTS = 6;

export default function Invite() {
  const router = useRouter();
  const { C, F } = useTheme();
  const { user } = useSession();
  const [code, setCode] = useState<string[]>(Array(SLOTS).fill(''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refs = useRef<Array<TextInput | null>>([]);

  const setSlot = (i: number, v: string) => {
    const next = [...code];
    next[i] = v.slice(-1).toUpperCase();
    setCode(next);
    setError(null);
    if (v && i < SLOTS - 1) refs.current[i + 1]?.focus();
  };

  const joined = code.join('');
  const filled = code.every((c) => c);

  async function submit() {
    if (!user || !isValidInviteCode(joined)) {
      setError('Invalid code');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await ensureUserRow({ userId: user.id, email: user.email });
      await joinSpaceByCode({ userId: user.id, code: joined });
      // SessionGate → /(tabs)/home
    } catch (e: any) {
      // Atomic transact failed — most likely code no longer valid
      setError('Code no longer valid');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: C.ink }]}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 40 }}>
        <Icon name="chevronLeft" size={22} color={C.mist} />
      </Pressable>

      <CouplRings size={48} a={C.peach} b={C.lavender} />
      <Display size={36} style={{ marginTop: 18 }}>
        Enter your code<Text style={{ color: C.gold }}>.</Text>
      </Display>
      <GoldRule width={32} />
      <Text style={{ fontFamily: F.serif, fontStyle: 'italic', color: C.mist, fontSize: 15, marginTop: 14, maxWidth: 300 }}>
        Six characters \u2014 case doesn\u2019t matter.
      </Text>

      <View style={{ marginTop: 48 }}>
        <Overline style={{ marginBottom: 14 }}>Invite code</Overline>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {code.map((ch, i) => (
            <TextInput
              key={i}
              ref={(r) => { refs.current[i] = r; }}
              value={ch}
              onChangeText={(v) => setSlot(i, v)}
              maxLength={1}
              autoCapitalize="characters"
              style={[
                styles.slot,
                {
                  borderColor: error ? C.error : ch ? C.gold : C.line,
                  color: C.bone,
                  fontFamily: F.display,
                  backgroundColor: C.card,
                },
              ]}
            />
          ))}
        </View>
        {error && (
          <Text style={{ color: C.error, marginTop: 12, fontFamily: F.body, fontSize: 13 }}>{error}</Text>
        )}
      </View>

      <View style={{ marginTop: 'auto' }}>
        <PrimaryButton onPress={submit} disabled={!filled || busy}>
          {busy ? 'Joining…' : 'Continue'}
        </PrimaryButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, paddingTop: 60, paddingBottom: 40 },
  slot: {
    width: 48, height: 56, borderWidth: 1, borderRadius: 12,
    textAlign: 'center', fontSize: 24, fontWeight: '700',
  },
});
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add "app/(auth)/invite.tsx"
git commit -m "feat(auth): wire invite-code join flow"
```

---

## Task 16: Profile sheet additions

**Files:**
- Modify: `app/sheets/profile.tsx`

- [ ] **Step 1: Read current file**

```bash
cat app/sheets/profile.tsx
```

Understand the existing structure (sections, row component). You will:
1. Add 4 action rows at the bottom: "Invite partner" (couples w/o partner), "Upgrade to couple" (solo), "Sign out", "Leave space" (destructive).
2. Wire actions via `useSession()` + `space-actions.ts` + `db.auth.signOut()`.

- [ ] **Step 2: Add imports at top of file**

```tsx
import { useRouter } from 'expo-router';
import { Pressable, Alert } from 'react-native';
import { useSession } from '@/src/lib/session';
import { db } from '@/src/lib/db';
import {
  leaveSpace,
  regenerateInviteCode,
  upgradeSoloToCouple,
} from '@/src/lib/space-actions';
```

(If `Alert`, `Pressable`, or `useRouter` are already imported, don't duplicate.)

- [ ] **Step 3: Inside the component, add hooks**

Right after existing hooks:

```tsx
const router = useRouter();
const session = useSession();
```

- [ ] **Step 4: Add action handlers**

```tsx
async function onInvitePartner() {
  if (!session.space || session.space.kind !== 'couple') return;
  let code = session.space.inviteCode;
  if (!code) {
    code = await regenerateInviteCode({ spaceId: session.space.id });
  }
  router.push({ pathname: '/(auth)/invite-code', params: { code } } as any);
}

async function onUpgrade() {
  if (!session.space || session.space.kind !== 'solo') return;
  const code = await upgradeSoloToCouple({ spaceId: session.space.id });
  router.push({ pathname: '/(auth)/invite-code', params: { code } } as any);
}

function onSignOut() {
  Alert.alert('Sign out?', 'You\u2019ll need to sign in again to see your space.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Sign out',
      style: 'destructive',
      onPress: async () => {
        await db.auth.signOut();
      },
    },
  ]);
}

function onLeave() {
  if (!session.space || !session.membership) return;
  const isLast = !session.partner;
  const msg = isLast
    ? 'This deletes your solo space and everything in it. Cannot be undone.'
    : 'You will no longer see shared content. Your partner keeps the space.';
  Alert.alert('Leave this space?', msg, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Leave',
      style: 'destructive',
      onPress: async () => {
        await leaveSpace({
          spaceId: session.space!.id,
          membershipId: session.membership!.id,
          isLastMember: isLast,
        });
      },
    },
  ]);
}
```

- [ ] **Step 5: Add action rows in the JSX**

Find a sensible place inside the scrolling content (after existing sections, before closing). Add this block:

```tsx
<View style={{ gap: 2, marginTop: 24 }}>
  {session.isCouple && !session.partner && (
    <Pressable onPress={onInvitePartner} style={rowStyle(C)}>
      <Icon name="send" size={16} color={C.gold} />
      <Text style={rowTextStyle(C, F)}>Invite partner</Text>
    </Pressable>
  )}
  {session.isSolo && (
    <Pressable onPress={onUpgrade} style={rowStyle(C)}>
      <Icon name="users" size={16} color={C.gold} />
      <Text style={rowTextStyle(C, F)}>Upgrade to couple</Text>
    </Pressable>
  )}
  <Pressable onPress={onSignOut} style={rowStyle(C)}>
    <Icon name="logOut" size={16} color={C.mist} />
    <Text style={rowTextStyle(C, F)}>Sign out</Text>
  </Pressable>
  <Pressable onPress={onLeave} style={rowStyle(C)}>
    <Icon name="trash" size={16} color={C.error} />
    <Text style={[rowTextStyle(C, F), { color: C.error }]}>Leave space</Text>
  </Pressable>
</View>
```

Add these style helpers at the bottom of the file (outside the component):

```tsx
function rowStyle(C: any) {
  return {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: C.card,
    borderRadius: 14,
  };
}

function rowTextStyle(C: any, F: any) {
  return { color: C.bone, fontFamily: F.body, fontSize: 15 };
}
```

- [ ] **Step 6: Type-check + commit**

```bash
npx tsc --noEmit
git add app/sheets/profile.tsx
git commit -m "feat(auth): add sign-out / invite / upgrade / leave actions"
```

---

## Task 17: Delete obsolete preserved backend files

**Files:**
- Delete: `src/hooks/useSession.ts`
- Delete: `src/hooks/useSession.test.tsx`
- Delete: `src/hooks/useAuthActions.ts`
- Delete: `src/hooks/useColors.ts`
- Delete: `src/hooks/useEncryption.ts`
- Delete: `src/providers/AppProviders.tsx`

These were Phase 1 references. We've replaced them with `src/lib/session.tsx` + `src/lib/space-actions.ts`.

- [ ] **Step 1: Delete**

```bash
rm src/hooks/useSession.ts \
   src/hooks/useSession.test.tsx \
   src/hooks/useAuthActions.ts \
   src/hooks/useColors.ts \
   src/hooks/useEncryption.ts \
   src/providers/AppProviders.tsx
```

Note: Other hooks (`useTasks`, `useReminders`, etc.) STAY — they're Phase 2 references.

- [ ] **Step 2: Verify no dangling imports in new code**

```bash
grep -rn "useSession\|useAuthActions\|useColors\|useEncryption\|AppProviders" src/lib app 2>/dev/null
```
Expected: only hits are our OWN `src/lib/session.tsx` and imports of `useSession` from `@/src/lib/session`.

- [ ] **Step 3: Commit**

```bash
git add -A src/hooks src/providers
git commit -m "chore(session): remove obsolete preserved auth files"
```

---

## Task 18: Re-tighten `tsconfig.json`

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: Inspect current excludes**

```bash
cat tsconfig.json
```

- [ ] **Step 2: Keep `src/hooks`, `src/providers`, `src/types`, `src/test` excluded (Phase 2+ reference)**

Remove `src/lib/auth` from `exclude` if present (we never created it; our new files live directly under `src/lib/`). The exclude array should read (order not important):

```json
"exclude": ["src/hooks", "src/providers", "src/types", "src/test", "node_modules"]
```

- [ ] **Step 3: Verify tsc is clean**

```bash
npx tsc --noEmit 2>&1 | grep -c 'error TS'
```
Expected: `0`

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json
git commit -m "chore(ts): narrow excludes to phase-2+ reference files"
```

---

## Task 19: OAuth config docs

**Files:**
- Create: `docs/superpowers/runbooks/oauth-setup.md`

- [ ] **Step 1: Write the runbook**

```markdown
# OAuth setup (Phase 1)

Coupl uses InstantDB's hosted OAuth. The client doesn't ship native OAuth SDKs —
everything happens through `expo-web-browser` + InstantDB's `createAuthorizationURL` /
`exchangeOAuthCode`.

## One-time setup (per platform, per provider)

1. Sign in at https://instantdb.com/dash, select this app.
2. Go to **Auth → OAuth**.
3. **Google:**
   - Create a project in Google Cloud Console.
   - Create OAuth 2.0 Client ID (type: Web application).
   - Authorized redirect URIs: copy the one shown in the InstantDB dash (looks like
     `https://auth.instantdb.com/callback`).
   - Paste the Client ID + secret back into InstantDB dash.
4. **Apple:**
   - In Apple Developer portal, create a Services ID.
   - Enable Sign in with Apple.
   - Redirect URL: InstantDB's callback.
   - Generate a private key for "Sign in with Apple".
   - Paste Team ID, Key ID, Services ID, and private key into InstantDB dash.

## App side

Our redirect URL is `coupl://auth-callback` (set in `src/lib/oauth.ts`).
This must match `app.json`'s `scheme: "coupl"`.

## Simulator caveat

Apple Sign In requires a real device with an Apple ID. On iOS simulator, use:
- Magic code (works everywhere), or
- The "Dev: prefill test email" button (sign-in screen, DEV only)

Google Sign In works on simulator.
```

- [ ] **Step 2: Commit**

```bash
git add -f docs/superpowers/runbooks/oauth-setup.md
git commit -m "docs: add OAuth setup runbook"
```

---

## Task 20: Manual smoke test

**Files:** none (human verification)

- [ ] **Step 1: Cold boot**

```bash
rm -rf .expo && npm run start -- --ios --reset-cache
```

- [ ] **Step 2: Magic code flow**

1. On sign-in, enter a real email, press "Continue"
2. Receive code in mailbox, enter in 6 slots, press "Verify"
3. Land on onboarding (3 cards visible)

- [ ] **Step 3: Solo space**

1. Tap "Solo space"
2. Expect: land on home tab
3. Open profile sheet → expect "Upgrade to couple" + "Sign out" + "Leave space"
4. Expect NO "Invite partner" row

- [ ] **Step 4: Solo → couple upgrade**

1. In profile, tap "Upgrade to couple"
2. Expect invite-code screen with 6 chars
3. Copy / share both work
4. Tap "I'll do this later" → back to home
5. Open profile → now shows "Invite partner" (no partner yet)

- [ ] **Step 5: Second device joins**

(If only one device: sign out, use new email to simulate.)

1. Device 2: sign-in with new email + magic code → onboarding
2. Tap "I have a code" → enter the code from device 1
3. Expect: land on home
4. Both devices: profile sheet shows the other as partner

- [ ] **Step 6: Invalid code**

1. Sign out, new email, magic code, onboarding → "I have a code"
2. Enter 6 random characters
3. Expect: red error text "Code no longer valid"

- [ ] **Step 7: Leave + sign out**

1. Tap "Leave space" → confirm → expect onboarding
2. Re-create space, then tap "Sign out" → confirm → expect sign-in screen

- [ ] **Step 8: OAuth (requires OAuth configured in dash)**

1. Tap "Continue with Google" → browser opens, complete flow → returns to app → session established
2. Tap "Continue with Apple" on real device — same flow

- [ ] **Step 9: If all pass, tag the completion**

```bash
git commit --allow-empty -m "chore: phase 1 verified end-to-end"
```

---

## Out of scope (Phase 2+)

- Any feature-entity schema (tasks/reminders/love notes/etc.)
- Home rings, streaks, calendar aggregation
- Push notifications
- Animations / haptics
- Real-time presence indicators ("Sofia is online")
- Encryption of journal entries / private flags on Phase 2 entities
