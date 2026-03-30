import type { ReactNode } from 'react';
import { createContext, createElement, useContext } from 'react';
import { useConvex, useConvexAuth, useQuery } from 'convex/react';
import { makeFunctionReference } from 'convex/server';

import type { AppSession } from '@/convex/lib/auth';
import { authClient } from '@/src/lib/auth-client';

const getCurrentSessionUserQuery = makeFunctionReference<
  'query',
  {},
  AppSession | null
>('users:getCurrentSessionUser');

export type SessionRoute =
  | '/(auth)/sign-in'
  | '/(auth)/onboarding'
  | '/(tabs)/home';

type SessionValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  route: SessionRoute | null;
  authSession: ReturnType<typeof authClient.useSession>['data'] | null;
  user: NonNullable<ReturnType<typeof authClient.useSession>['data']>['user'] | null;
  session: AppSession | null;
  profile: AppSession['profile'];
  activeCouple: AppSession['activeCouple'];
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
  const auth = authClient.useSession();
  const convex = useConvex();
  const convexAuth = useConvexAuth();
  const hasAuthSession = !!auth.data?.session;
  const shouldLoadSession = convexAuth.isAuthenticated;
  const session = useQuery(
    getCurrentSessionUserQuery,
    shouldLoadSession ? {} : 'skip',
  );
  const isLoading =
    auth.isPending ||
    (hasAuthSession && (convexAuth.isLoading || session === undefined));
  const isAuthenticated = hasAuthSession && convexAuth.isAuthenticated;
  const activeCouple = session?.activeCouple ?? null;

  return {
    isLoading,
    isAuthenticated,
    route: isLoading
      ? null
      : getSessionRoute({
          isAuthenticated,
          hasActiveCouple: !!activeCouple,
        }),
    authSession: auth.data ?? null,
    user: auth.data?.user ?? null,
    session: session ?? null,
    profile: session?.profile ?? null,
    activeCouple,
    refetch: async () => {
      if (!shouldLoadSession) return;
      await convex.query(getCurrentSessionUserQuery, {});
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
