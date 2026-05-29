import { createContext, useContext, useEffect, useMemo, useRef, type PropsWithChildren } from 'react';
import { db } from './db';
import {
  type FeatureId,
  getDefaultFeatureIds,
} from '@/src/lib/features/registry';
import { ensureSoloSpaceForUser } from './space-actions';

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
  inviteCode?: string | null;
  plan?: string | null;
  enabledFeatures: FeatureId[];
  memberCount?: number;
};

export type SessionMembership = {
  id: string;
  role: 'owner' | 'partner';
  lastNotificationsReadAt: number | null;
};

export type Session = {
  status: SessionStatus;
  user: SessionUser | null;
  /** Active UI space: the newest shared pact when present, otherwise the permanent solo space. */
  space: SessionSpace | null;
  membership: SessionMembership | null;
  /** Permanent personal base space. Exists for every ready account after bootstrap/backfill. */
  soloSpace: SessionSpace | null;
  soloMembership: SessionMembership | null;
  /** Newest non-solo pact membership, if the user is currently in a shared pact. */
  sharedSpace: SessionSpace | null;
  sharedMembership: SessionMembership | null;
  personalSpaceId: string | null;
  sharedSpaceId: string | null;
  /** Derived: first non-self member of the space. Null in solo mode. */
  partner: SessionUser | null;
  /** All non-self members of the space. Empty in solo mode. */
  members: SessionUser[];
  /** UI mode — single source of truth for screen branching. */
  mode: SpaceMode;
  enabledFeatures: FeatureId[];
  isFeatureEnabled: (id: FeatureId) => boolean;
  isSolo: boolean;
  isPair: boolean;
  isCrew: boolean;
  /** @deprecated Use isPair. Kept during Phase 9 schema migration. */
  isCouple: boolean;
};

const Ctx = createContext<Session | null>(null);

const isNoFeatureEnabled = () => false;

export function SessionProvider({ children }: PropsWithChildren) {
  const { isLoading: authLoading, user } = db.useAuth();
  const ensureStartedRef = useRef<Set<string>>(new Set());

  // Skip the query entirely until we have a real user — InstantDB rejects
  // non-UUID values for entity ids, so a placeholder won't fly.
  const { isLoading: queryLoading, data, error: queryError } = (db as any).useQuery(
    user?.id
      ? {
          $users: {
            $: { where: { id: user.id } },
            baseSoloSpace: {
              memberships: {
                user: {},
              },
            },
          },
          memberships: {
            $: { where: { 'user.id': user.id } },
            user: {
              baseSoloSpace: {
                memberships: {
                  user: {},
                },
              },
            },
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

  useEffect(() => {
    if (authLoading || queryLoading || !user?.id || !data) return;
    const selection = selectSessionMemberships(data, user.id);
    if (selection.soloMembership) return;
    if (!selection.hasMemberships) return;
    if (ensureStartedRef.current.has(user.id)) return;
    ensureStartedRef.current.add(user.id);
    ensureSoloSpaceForUser({ userId: user.id }).catch((error) => {
      ensureStartedRef.current.delete(user.id);
      console.warn('[session] failed to ensure base solo space', error);
    });
  }, [authLoading, queryLoading, user?.id, data]);

  const session = useMemo<Session>(
    () => buildSessionFromQueryResult({ authLoading, authUser: user, queryLoading, data }),
    [authLoading, user, queryLoading, data],
  );

  return <Ctx.Provider value={session}>{children}</Ctx.Provider>;
}

export function buildSessionFromQueryResult(args: {
  authLoading: boolean;
  authUser: { id: string; email?: string | null } | null | undefined;
  queryLoading: boolean;
  data: any;
}): Session {
  if (args.authLoading) {
    return emptySession('loading');
  }
  if (!args.authUser) {
    return emptySession('unauthed');
  }
  if (args.queryLoading || !args.data) {
    return emptySession('loading');
  }

  const selection = selectSessionMemberships(args.data, args.authUser.id);
  const user =
    selection.userRow
      ? userToSessionUser(selection.userRow)
      : selection.soloMembership?.user
        ? userToSessionUser(selection.soloMembership.user)
        : selection.sharedMembership?.user
          ? userToSessionUser(selection.sharedMembership.user)
          : authUserToSessionUser(args.authUser);

  if (selection.needsBaseSolo) {
    return {
      ...emptySession('loading'),
      user,
    };
  }

  if (!selection.activeMembership?.space) {
    return {
      ...emptySession('onboarding'),
      user,
    };
  }

  const soloSpace = selection.soloMembership?.space
    ? membershipSpaceToSessionSpace(selection.soloMembership, args.authUser.id, 'solo')
    : null;
  const sharedSpace = selection.sharedMembership?.space
    ? membershipSpaceToSessionSpace(selection.sharedMembership, args.authUser.id, null)
    : null;
  const activeSpace = sharedSpace ?? soloSpace!;
  const activeMembership = selection.sharedMembership ?? selection.soloMembership!;
  const activeMode = activeSpace.kind;
  const featureState = buildSessionFeatureState(activeSpace.enabledFeatures, activeMode);
  const activePeople = deriveMembers(selection.activeMembership, args.authUser.id);

  return {
    status: 'ready',
    user,
    space: { ...activeSpace, enabledFeatures: featureState.enabledFeatures },
    membership: membershipToSessionMembership(activeMembership),
    soloSpace,
    soloMembership: selection.soloMembership
      ? membershipToSessionMembership(selection.soloMembership)
      : null,
    sharedSpace,
    sharedMembership: selection.sharedMembership
      ? membershipToSessionMembership(selection.sharedMembership)
      : null,
    personalSpaceId: soloSpace?.id ?? null,
    sharedSpaceId: sharedSpace?.id ?? null,
    partner: activePeople.partner,
    members: activePeople.members,
    mode: activeMode,
    enabledFeatures: featureState.enabledFeatures,
    isFeatureEnabled: featureState.isFeatureEnabled,
    isSolo: activeMode === 'solo',
    isPair: activeMode === 'pair',
    isCrew: activeMode === 'crew',
    isCouple: activeMode === 'pair',
  };
}

type SessionMembershipSelection = {
  userRow: any | null;
  soloMembership: any | null;
  sharedMembership: any | null;
  activeMembership: any | null;
  hasMemberships: boolean;
  needsBaseSolo: boolean;
};

export function selectSessionMemberships(data: any, userId: string): SessionMembershipSelection {
  const memberships = Array.isArray(data?.memberships) ? data.memberships : [];
  const userRow = firstRel(data?.$users) ?? memberships.find((m: any) => m?.user)?.user ?? null;
  const linkedBaseSoloId = firstRel(userRow?.baseSoloSpace)?.id;
  const linkedBaseSoloMembership =
    linkedBaseSoloId
      ? memberships.find((m: any) => {
          const space = firstRel(m?.space);
          return space?.id === linkedBaseSoloId && space?.kind === 'solo';
        })
      : null;
  const soloMembership =
    linkedBaseSoloMembership ??
    memberships.find((m: any) => firstRel(m?.space)?.kind === 'solo') ??
    null;
  const sharedMembership =
    memberships
      .filter((m: any) => {
        const space = firstRel(m?.space);
        return space?.id && space.kind !== 'solo' && membershipMemberCount(m) > 1;
      })
      .sort(
        (a: any, b: any) =>
          joinedAtSortValue(b?.joinedAt) - joinedAtSortValue(a?.joinedAt),
      )[0] ?? null;

  return {
    userRow,
    soloMembership,
    sharedMembership,
    activeMembership: sharedMembership ?? soloMembership,
    hasMemberships: memberships.length > 0,
    needsBaseSolo: memberships.length > 0 && !soloMembership,
  };
}

function joinedAtSortValue(value: unknown): number {
  const timestamp =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : 0;
  return Number.isFinite(timestamp) && timestamp >= 0 && !Number.isNaN(new Date(timestamp).getTime())
    ? timestamp
    : 0;
}

export function buildSessionFeatureState(raw: unknown, mode: SpaceMode): {
  enabledFeatures: FeatureId[];
  isFeatureEnabled: (id: FeatureId) => boolean;
} {
  // Feature selection is no longer user-configurable. Legacy stored subsets are
  // ignored so every account gets the full supported feature set for its mode.
  void raw;
  const enabledFeatures = getDefaultFeatureIds(mode);
  const enabled = new Set<FeatureId>(enabledFeatures);

  return {
    enabledFeatures,
    isFeatureEnabled: (id: FeatureId) => enabled.has(id),
  };
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
    soloSpace: null,
    soloMembership: null,
    sharedSpace: null,
    sharedMembership: null,
    personalSpaceId: null,
    sharedSpaceId: null,
    partner: null,
    members: [],
    mode: 'solo',
    enabledFeatures: [],
    isFeatureEnabled: isNoFeatureEnabled,
    isSolo: false,
    isPair: false,
    isCrew: false,
    isCouple: false,
  };
}

export function normalizeMode(kindRaw: SpaceKindWire, otherCount: number): SpaceMode {
  if (otherCount >= 2) return 'crew';
  if (otherCount === 1) return 'pair';
  return 'solo';
}

function membershipSpaceToSessionSpace(
  membership: any,
  userId: string,
  forcedMode: SpaceMode | null,
): SessionSpace {
  const space = firstRel(membership?.space) ?? {};
  const allMemberships = Array.isArray(space.memberships) ? space.memberships : [];
  const memberCount = Math.max(allMemberships.length, 1);
  const kindRaw = (space.kind ?? 'solo') as SpaceKindWire;
  const mode = forcedMode ?? modeForActiveSpace(kindRaw, Math.max(memberCount - 1, 0));
  const featureState = buildSessionFeatureState(space.enabledFeatures, mode);

  return {
    id: String(space.id),
    kind: mode,
    kindRaw,
    name: space.name ?? null,
    inviteCode: space.inviteCode ?? null,
    plan: space.plan ?? null,
    enabledFeatures: featureState.enabledFeatures,
    memberCount,
  };
}

function membershipMemberCount(membership: any): number {
  const space = firstRel(membership?.space);
  const memberships = Array.isArray(space?.memberships) ? space.memberships : [];
  return memberships.length;
}

function modeForActiveSpace(kindRaw: SpaceKindWire, otherCount: number): SpaceMode {
  if (kindRaw === 'solo') return 'solo';
  if (kindRaw === 'crew' || otherCount >= 2) return 'crew';
  return 'pair';
}

function membershipToSessionMembership(membership: any): SessionMembership {
  return {
    id: membership.id,
    role: membership.role as 'owner' | 'partner',
    lastNotificationsReadAt:
      (membership as any).lastNotificationsReadAt ?? null,
  };
}

function deriveMembers(membership: any, userId: string): {
  partner: SessionUser | null;
  members: SessionUser[];
} {
  const space = firstRel(membership?.space);
  const allMemberships = Array.isArray(space?.memberships) ? space.memberships : [];
  const members = allMemberships
    .filter((m: any) => firstRel(m?.user)?.id !== userId)
    .map((m: any) => {
      const memberUser = firstRel(m?.user);
      return memberUser ? userToSessionUser(memberUser) : null;
    })
    .filter((u: SessionUser | null): u is SessionUser => u !== null);
  return {
    partner: members[0] ?? null,
    members,
  };
}

function firstRel(value: any): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
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
