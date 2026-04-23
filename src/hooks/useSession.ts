import { useSession as useBaseSession } from '@/src/lib/session';

export type ActiveCouple = {
  couple: {
    id: string;
    name: string | null;
    anniversary: string | null;
  };
  memberCount: number;
  partner: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
};

export type HookProfile = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type HookUser = HookProfile & {
  email: string;
};

export type HookSession = {
  status: ReturnType<typeof useBaseSession>['status'];
  user: HookUser | null;
  profile: HookProfile | null;
  activeCouple: ActiveCouple | null;
  space: ReturnType<typeof useBaseSession>['space'];
  membership: ReturnType<typeof useBaseSession>['membership'];
  partner: ReturnType<typeof useBaseSession>['partner'];
  isSolo: boolean;
  isCouple: boolean;
};

export function useSession(): HookSession {
  const s = useBaseSession();

  const user: HookUser | null = s.user
    ? {
        id: s.user.id,
        email: s.user.email,
        displayName: s.user.displayName ?? null,
        avatarUrl: s.user.avatarUrl ?? null,
      }
    : null;

  const activeCouple: ActiveCouple | null = s.space
    ? {
        couple: {
          id: s.space.id,
          name: s.space.name ?? null,
          anniversary: s.space.anniversary ?? null,
        },
        memberCount: s.partner ? 2 : 1,
        partner: s.partner
          ? {
              id: s.partner.id,
              displayName: s.partner.displayName ?? 'Partner',
              avatarUrl: s.partner.avatarUrl ?? null,
            }
          : null,
      }
    : null;

  return {
    status: s.status,
    user,
    profile: user
      ? { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl }
      : null,
    activeCouple,
    space: s.space,
    membership: s.membership,
    partner: s.partner,
    isSolo: s.isSolo,
    isCouple: s.isCouple,
  };
}
