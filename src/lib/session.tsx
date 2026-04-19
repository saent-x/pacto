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

  const { isLoading: queryLoading, data, error: queryError } = db.useQuery(
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

    const otherMembership = space.memberships?.find((m: any) => m.user?.id !== user.id);
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
