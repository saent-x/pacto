import type { ReactNode } from 'react';
import { createContext, createElement, useContext, useEffect, useMemo } from 'react';
import { db } from '@/src/lib/instant';

/**
 * InstantDB link results may be an array (even for has-one) or a single object.
 * This helper normalises either shape to a single value.
 */
function resolveLink<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return (value as T) ?? null;
}

export type SessionRoute =
  | '/(auth)/sign-in'
  | '/(auth)/onboarding'
  | '/(tabs)/home';

type SessionValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  route: SessionRoute | null;
  user: { id: string; email: string } | null;
  session: {
    profile: { id: string; displayName: string; avatarUrl: string | null; email: string };
    activeCouple: {
      couple: { id: string; name: string; anniversary: string | null; inviteCode?: string | null };
      membership: { id: string; userId: string; role: string };
      memberCount: number;
      partner: { id: string; displayName: string; avatarUrl: string | null } | null;
    };
  } | null;
  profile: SessionValue['session'] extends null ? null : NonNullable<SessionValue['session']>['profile'];
  activeCouple: SessionValue['session'] extends null ? null : NonNullable<SessionValue['session']>['activeCouple'];
  refetch: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function getSessionRoute({
  isAuthenticated,
  hasActiveCouple,
}: {
  isAuthenticated: boolean;
  hasActiveCouple: boolean;
}): SessionRoute {
  if (!isAuthenticated) {
    return '/(auth)/sign-in';
  }

  if (!hasActiveCouple) {
    return '/(auth)/onboarding';
  }

  return '/(tabs)/home';
}

function useSessionValue(): SessionValue {
  const { isLoading: authLoading, user, error } = db.useAuth();

  // Auto sign-out on stale/invalid token (e.g. "Record not found: app-user")
  useEffect(() => {
    if (error && !authLoading && !user) {
      db.auth.signOut();
    }
  }, [error, authLoading, user]);

  const { isLoading: membershipLoading, data: membershipData } = db.useQuery(
    user
      ? {
          memberships: {
            $: { where: { 'user.id': user.id, status: 'active' } },
            couple: {},
            user: {},
          },
        }
      : null,
  );

  const activeMembership = membershipData?.memberships?.[0] ?? null;
  const couple = resolveLink<{ id: string; name: string; anniversary?: string | null; inviteCode?: string | null }>(activeMembership?.couple);
  const memberUser = resolveLink<{ id: string; email?: string }>(activeMembership?.user);

  // Query partner info if we have a couple
  const coupleId = couple?.id ?? null;
  const { data: coupleData } = db.useQuery(
    coupleId
      ? {
          memberships: {
            $: { where: { 'couple.id': coupleId, status: 'active' } },
            user: {},
          },
        }
      : null,
  );

  const allMembers = coupleData?.memberships ?? [];
  const partner = useMemo(() => {
    if (!user) return null;
    const partnerMembership = allMembers.find((m) => {
      const linked = resolveLink<{ id: string }>(m.user);
      return linked?.id !== user.id;
    });
    const partnerUser = resolveLink<{ id: string; displayName?: string; email?: string; avatarUrl?: string | null }>(partnerMembership?.user);
    if (!partnerUser) return null;
    return {
      id: partnerUser.id,
      displayName: partnerUser.displayName ?? partnerUser.email ?? 'Partner',
      avatarUrl: partnerUser.avatarUrl ?? null,
    };
  }, [allMembers, user]);

  const isAuthenticated = !!user;
  const hasActiveCouple = !!couple;
  const isLoading = authLoading || (isAuthenticated && membershipLoading);

  const profile = useMemo(() => {
    if (!user) return null;
    const u = user as { id: string; email?: string; displayName?: string; avatarUrl?: string | null };
    return {
      id: u.id,
      displayName: u.displayName ?? u.email ?? '',
      avatarUrl: u.avatarUrl ?? null,
      email: u.email ?? '',
    };
  }, [user]);

  const activeCouple = useMemo(() => {
    if (!couple || !activeMembership || !user) return null;
    return {
      couple: {
        id: couple.id,
        name: couple.name,
        anniversary: couple.anniversary ?? null,
        inviteCode: couple.inviteCode ?? null,
      },
      membership: {
        id: activeMembership.id,
        userId: user.id,
        role: activeMembership.role,
      },
      memberCount: allMembers.length,
      partner,
    };
  }, [couple, activeMembership, user, allMembers.length, partner]);

  const session = useMemo(() => {
    if (!profile || !activeCouple) return null;
    return { profile, activeCouple };
  }, [profile, activeCouple]);

  return {
    isLoading,
    isAuthenticated,
    route: isLoading
      ? null
      : getSessionRoute({ isAuthenticated, hasActiveCouple }),
    user: user ? { id: user.id, email: user.email ?? '' } : null,
    session,
    profile: profile as SessionValue['profile'],
    activeCouple: activeCouple as SessionValue['activeCouple'],
    refetch: async () => {
      // InstantDB queries are reactive — no manual refetch needed.
      // This is kept for interface compatibility.
    },
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const value = useSessionValue();

  return createElement(SessionContext.Provider, { value }, children);
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSession must be used within SessionProvider.');
  }

  return context;
}
