import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { db } from './db';

export type SessionStatus = 'loading' | 'unauthed' | 'onboarding' | 'ready';

export type SessionUser = {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

// Schema-side kind values. Phase 9 will widen to also accept 'pair' and 'crew'
// during the rename migration. Until then the wire format stays 'solo' | 'couple'
// and we map 'couple' → 'pair' at the session boundary.
export type SpaceKindWire = 'solo' | 'couple' | 'pair' | 'crew';

// Pacto mode — what the UI consumes. Always one of solo/pair/crew.
export type SpaceMode = 'solo' | 'pair' | 'crew';

export type SessionSpace = {
  id: string;
  /** UI-facing mode (solo/pair/crew) — always normalized away from legacy 'couple'. */
  kind: SpaceMode;
  /** Raw wire value as stored — kept available for migration code. */
  kindRaw?: SpaceKindWire;
  name?: string | null;
  anniversary?: string | null;
  inviteCode?: string | null;
};

export type SessionMembership = {
  id: string;
  role: 'owner' | 'partner';
  lastNotificationsReadAt: number | null;
};

export type Session = {
  status: SessionStatus;
  user: SessionUser | null;
  space: SessionSpace | null;
  membership: SessionMembership | null;
  /** Derived: first non-self member of the space. Null in solo mode. */
  partner: SessionUser | null;
  /** All non-self members of the space. Empty in solo mode. */
  members: SessionUser[];
  /** UI mode — single source of truth for screen branching. */
  mode: SpaceMode;
  isSolo: boolean;
  isPair: boolean;
  isCrew: boolean;
  /** @deprecated Use isPair. Kept during Phase 9 schema migration. */
  isCouple: boolean;
};

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const { isLoading: authLoading, user } = db.useAuth();

  // Skip the query entirely until we have a real user — InstantDB rejects
  // non-UUID values for entity ids, so a placeholder won't fly.
  const { isLoading: queryLoading, data, error: queryError } = (db as any).useQuery(
    user?.id
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
      : null,
  );

  if (queryError) {
    console.warn('[session] query error', queryError);
  }

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

    console.log('[session] memberships count:', data.memberships?.length ?? 0);
    const myMembership = data.memberships?.[0];
    if (!myMembership) {
      return {
        ...emptySession('onboarding'),
        user: authUserToSessionUser(user),
      };
    }

    const space = myMembership.space;
    if (!space) {
      return {
        ...emptySession('onboarding'),
        user: authUserToSessionUser(user),
      };
    }

    const otherMemberships = (space.memberships ?? []).filter(
      (m: any) => m.user?.id !== user.id
    );
    const members = otherMemberships
      .map((m: any) => (m.user ? userToSessionUser(m.user) : null))
      .filter((u: SessionUser | null): u is SessionUser => u !== null);
    const partner = members[0] ?? null;

    const kindRaw = space.kind as SpaceKindWire;
    const mode = normalizeMode(kindRaw, members.length);

    return {
      status: 'ready',
      user: authUserToSessionUser(user),
      space: {
        id: space.id,
        kind: mode,
        kindRaw,
        name: space.name ?? null,
        anniversary: space.anniversary ?? null,
        inviteCode: space.inviteCode ?? null,
      },
      membership: {
        id: myMembership.id,
        role: myMembership.role as 'owner' | 'partner',
        lastNotificationsReadAt:
          (myMembership as any).lastNotificationsReadAt ?? null,
      },
      partner,
      members,
      mode,
      isSolo: mode === 'solo',
      isPair: mode === 'pair',
      isCrew: mode === 'crew',
      isCouple: mode === 'pair', // legacy alias
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
    members: [],
    mode: 'solo',
    isSolo: false,
    isPair: false,
    isCrew: false,
    isCouple: false,
  };
}

function normalizeMode(kindRaw: SpaceKindWire, otherCount: number): SpaceMode {
  if (kindRaw === 'solo') return 'solo';
  if (kindRaw === 'crew') return 'crew';
  if (kindRaw === 'pair') return 'pair';
  if (kindRaw === 'couple') return 'pair'; // legacy schema value
  // Fallback: infer from member count if kind is unrecognized.
  if (otherCount >= 2) return 'crew';
  if (otherCount === 1) return 'pair';
  return 'solo';
}

function authUserToSessionUser(u: { id: string; email?: string | null }): SessionUser {
  return { id: u.id, email: u.email ?? '' };
}

function userToSessionUser(u: any): SessionUser {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName ?? null,
    avatarUrl: u.avatarUrl ?? null,
  };
}
