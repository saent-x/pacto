import type { ReactNode } from 'react';
import { createContext, createElement, useContext, useMemo } from 'react';
import { db } from '@/src/lib/instant';

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
      couple: { id: string; name: string; anniversary: string | null };
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
  const couple = activeMembership?.couple?.[0] ?? null;
  const memberUser = activeMembership?.user?.[0] ?? null;

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
    const partnerMembership = allMembers.find(
      (m) => m.user?.[0]?.id !== user.id,
    );
    const partnerUser = partnerMembership?.user?.[0] ?? null;
    if (!partnerUser) return null;
    return {
      id: partnerUser.id,
      displayName: (partnerUser as any).displayName ?? partnerUser.email ?? 'Partner',
      avatarUrl: (partnerUser as any).avatarUrl ?? null,
    };
  }, [allMembers, user]);

  const isAuthenticated = !!user;
  const hasActiveCouple = !!couple;
  const isLoading = authLoading || (isAuthenticated && membershipLoading);

  const profile = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      displayName: (user as any).displayName ?? user.email ?? '',
      avatarUrl: (user as any).avatarUrl ?? null,
      email: user.email ?? '',
    };
  }, [user]);

  const activeCouple = useMemo(() => {
    if (!couple || !activeMembership || !user) return null;
    return {
      couple: {
        id: couple.id,
        name: couple.name,
        anniversary: couple.anniversary ?? null,
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
    profile,
    activeCouple,
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
