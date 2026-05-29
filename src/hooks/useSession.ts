import { useSession as useBaseSession } from '@/src/lib/session';
import type { FeatureId } from '@/src/lib/features/registry';

export type ActiveCouple = {
  couple: {
    id: string;
    name: string | null;
    kind: ReturnType<typeof useBaseSession>['mode'];
    plan?: string | null;
    enabledFeatures: FeatureId[];
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
  soloSpace: ReturnType<typeof useBaseSession>['soloSpace'];
  soloMembership: ReturnType<typeof useBaseSession>['soloMembership'];
  sharedSpace: ReturnType<typeof useBaseSession>['sharedSpace'];
  sharedMembership: ReturnType<typeof useBaseSession>['sharedMembership'];
  personalSpaceId: ReturnType<typeof useBaseSession>['personalSpaceId'];
  sharedSpaceId: ReturnType<typeof useBaseSession>['sharedSpaceId'];
  partner: ReturnType<typeof useBaseSession>['partner'];
  members: ReturnType<typeof useBaseSession>['members'];
  mode: ReturnType<typeof useBaseSession>['mode'];
  enabledFeatures: ReturnType<typeof useBaseSession>['enabledFeatures'];
  isFeatureEnabled: ReturnType<typeof useBaseSession>['isFeatureEnabled'];
  isSolo: boolean;
  isPair: boolean;
  isCrew: boolean;
  /** @deprecated Use isPair. */
  isCouple: boolean;
};

export function useSession(): HookSession {
  const s = useBaseSession();
  return buildHookSession(s);
}

export function buildHookSession(s: ReturnType<typeof useBaseSession>): HookSession {
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
          kind: s.space.kind,
          plan: s.space.plan ?? null,
          enabledFeatures: s.space.enabledFeatures,
        },
        memberCount: s.space.memberCount ?? 1 + s.members.length,
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
    soloSpace: s.soloSpace,
    soloMembership: s.soloMembership,
    sharedSpace: s.sharedSpace,
    sharedMembership: s.sharedMembership,
    personalSpaceId: s.personalSpaceId,
    sharedSpaceId: s.sharedSpaceId,
    partner: s.partner,
    members: s.members,
    mode: s.mode,
    enabledFeatures: s.enabledFeatures,
    isFeatureEnabled: s.isFeatureEnabled,
    isSolo: s.isSolo,
    isPair: s.isPair,
    isCrew: s.isCrew,
    isCouple: s.isCouple,
  };
}
