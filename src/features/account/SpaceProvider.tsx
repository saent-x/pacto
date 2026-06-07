import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { Id } from '@cvx/_generated/dataModel';

export type SpaceType = 'solo' | 'pair' | 'crew';

export type Member = {
  userId: Id<'users'>;
  displayName: string;
  avatarColor: string | null;
  role: 'owner' | 'member';
  isYou: boolean;
  joinedAt: number;
};

export type ActiveSpace = {
  id: Id<'spaces'>;
  type: SpaceType;
  name: string;
  memberCount: number;
  cap: number;
  createdAt: number;
};

export type UserProfile = {
  id: Id<'users'>;
  displayName: string;
  email: string | null;
  avatarColor: string | null;
  themePref: string | null;
  accentKey: string | null;
};

type SpaceContextValue = {
  loading: boolean;
  authed: boolean;
  user: UserProfile | null;
  space: ActiveSpace | null;
  spaceId: Id<'spaces'> | null;
  role: 'owner' | 'member' | null;
  members: Member[];
  isShared: boolean;
  /** Members other than you. */
  others: Member[];
  you: Member | null;
};

const SpaceContext = createContext<SpaceContextValue | null>(null);

export function SpaceProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const data = useQuery(api.spaces.currentContext, isAuthenticated ? {} : 'skip');
  const ensureSolo = useMutation(api.spaces.ensureSoloSpace);

  // Self-heal accounts created before the solo-space invariant was enforced
  // (e.g. users who onboarded straight into a pair/crew or via an invite).
  // Runs once per session and only after onboarding (active space exists), so
  // it never sets activeSpaceId during onboarding nor skips the onboarding gate.
  const healed = useRef(false);
  const pastOnboarding = isAuthenticated && !!data?.space;
  useEffect(() => {
    if (!pastOnboarding || healed.current) return;
    healed.current = true;
    ensureSolo({}).catch(() => {
      healed.current = false; // allow a retry on transient failure
    });
  }, [pastOnboarding, ensureSolo]);

  const value = useMemo<SpaceContextValue>(() => {
    const space = (data?.space ?? null) as ActiveSpace | null;
    const members = (data?.members ?? []) as Member[];
    return {
      loading: isAuthenticated && data === undefined,
      authed: isAuthenticated,
      user: (data?.user ?? null) as UserProfile | null,
      space,
      spaceId: space?.id ?? null,
      role: (data?.role ?? null) as 'owner' | 'member' | null,
      members,
      isShared: !!space && space.type !== 'solo',
      others: members.filter((m) => !m.isYou),
      you: members.find((m) => m.isYou) ?? null,
    };
  }, [data, isAuthenticated]);

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
}

export function useSpace() {
  const ctx = useContext(SpaceContext);
  if (!ctx) throw new Error('useSpace must be used within a SpaceProvider');
  return ctx;
}

export const avatarLetter = (name?: string | null) =>
  (name ?? '?').trim().charAt(0).toUpperCase() || '?';
