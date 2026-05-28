import { useMemo } from 'react';
import { db } from '@/src/lib/instant';
import { safeInstantId } from '@/src/lib/instant-id';
import { relationWhere, uniqueSpaceIds } from '@/src/lib/space-scope';
import {
  memoryVisibleForPersonalSpace,
  normalizeFeedMemoryPrivacy,
  topLevelMemories,
} from './useMemoriesFeed';
import { MEMORY_POST_RELATIONS } from './queryRelations';

export function useMemberProfile(
  userId: string | null | undefined,
  spaceId: string | string[] | null | undefined,
  personalSpaceId?: string | null,
  viewerUserId?: string | null,
) {
  const query = useMemo(() => {
    const spaceIds = uniqueSpaceIds(Array.isArray(spaceId) ? spaceId : [spaceId]);
    const safeUserId = safeInstantId(userId);
    if (!safeUserId || spaceIds.length === 0) return null;
    return buildMemberProfileQuery(safeUserId, spaceIds);
  }, [userId, Array.isArray(spaceId) ? spaceId.join('|') : spaceId]);

  const { data, isLoading } = db.useQuery(query);
  return {
    user: (data as any)?.$users?.[0] ?? null,
    membership: (data as any)?.memberships?.[0] ?? null,
    memories: topLevelMemories((data as any)?.memories ?? [])
      .filter((memory) => memoryVisibleForPersonalSpace(memory, viewerUserId, personalSpaceId))
      .map((memory) => normalizeFeedMemoryPrivacy(memory, personalSpaceId)),
    isLoading,
  };
}

export function buildMemberProfileQuery(userId: string, spaceId: string | string[]) {
  const spaceIds = Array.isArray(spaceId) ? spaceId : [spaceId];
  const spaceWhere = relationWhere('space', spaceIds);
  return {
    $users: {
      $: { where: { id: userId } },
    },
    memberships: {
      $: { where: andWhere({ 'user.id': userId }, spaceWhere) },
    },
    memories: {
      $: {
        where: andWhere({ 'author.id': userId }, spaceWhere),
        order: { createdAt: 'desc' as const },
        limit: 50,
      },
      ...MEMORY_POST_RELATIONS,
    },
  };
}

function andWhere(base: Record<string, string>, scoped: any) {
  return scoped ? { and: [base, scoped] } : base;
}
