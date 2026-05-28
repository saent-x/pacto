import { useMemo } from 'react';
import { db } from '@/src/lib/instant';
import { safeInstantId } from '@/src/lib/instant-id';
import { relationWhere, uniqueSpaceIds } from '@/src/lib/space-scope';
import { MEMORY_POST_RELATIONS } from './queryRelations';
import { memoryVisibleForPersonalSpace, normalizeFeedMemoryPrivacy } from './useMemoriesFeed';

export function useMemory(
  memoryId: string | null | undefined,
  spaceId?: string | string[] | null | undefined,
  personalSpaceId?: string | null,
  userId?: string | null,
) {
  const query = useMemo(() => {
    const safeMemoryId = safeInstantId(memoryId);
    if (!safeMemoryId) return null;
    const hasExplicitSpaceScope = arguments.length >= 2;
    const spaceIds = Array.isArray(spaceId) ? spaceId : [spaceId];
    const safeSpaceIds = uniqueSpaceIds(spaceIds);
    if (hasExplicitSpaceScope && safeSpaceIds.length === 0) return null;
    return buildMemoryDetailQuery(safeMemoryId, safeSpaceIds);
  }, [memoryId, Array.isArray(spaceId) ? spaceId.join('|') : spaceId]);

  const { data, isLoading, error } = db.useQuery(query);
  const memory = normalizeMemoryDetailPrivacy((data as any)?.memories?.[0] ?? null, personalSpaceId, userId);
  return {
    memory,
    isLoading,
    error,
  };
}

export function buildMemoryDetailQuery(
  memoryId: string,
  spaceId?: string | string[] | null | undefined,
) {
  const spaceIds = uniqueSpaceIds(Array.isArray(spaceId) ? spaceId : [spaceId]);
  const spaceWhere = relationWhere('space', spaceIds);
  const repliesScope = spaceWhere ? { where: spaceWhere } : {};
  return {
    memories: {
      $: { where: andWhere({ id: memoryId }, spaceWhere) },
      ...MEMORY_POST_RELATIONS,
      replies: {
        $: { ...repliesScope, order: { createdAt: 'asc' as const } },
        ...MEMORY_POST_RELATIONS,
      },
    },
  };
}

function andWhere(base: Record<string, string>, scoped: any): any {
  return scoped ? { and: [base, scoped] } : base;
}

function normalizeMemoryDetailPrivacy(memory: any, personalSpaceId?: string | null, userId?: string | null): any {
  if (!memory) return null;
  if (!memoryVisibleForPersonalSpace(memory, userId, personalSpaceId)) return null;
  const normalized = normalizeFeedMemoryPrivacy(memory, personalSpaceId);
  const replies = Array.isArray(normalized.replies)
    ? normalized.replies
        .filter((reply: any) => memoryVisibleForPersonalSpace(reply, userId, personalSpaceId))
        .map((reply: any) => normalizeFeedMemoryPrivacy(reply, personalSpaceId))
    : normalized.replies;
  return replies === normalized.replies ? normalized : { ...normalized, replies };
}
