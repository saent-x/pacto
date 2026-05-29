import { useMemo } from 'react';
import { db } from '@/src/lib/instant';
import { relationWhere, uniqueSpaceIds } from '@/src/lib/space-scope';
import { MEMORY_POST_RELATIONS } from './queryRelations';

/**
 * Topic chips drive the feed filter. The set is dynamic — `'all' | 'us' | 'mine'`
 * are always present; tag chips are derived from posted hashtags via `useMemoryTopics`.
 */
export type FeedTopic = string; // 'all' | 'us' | 'mine' | <tag>

interface BuildFeedArgs {
  spaceId?: string;
  spaceIds?: string[];
}

type FeedFilterOptions = {
  personalSpaceId?: string | null;
};

function linkHasId(link: unknown): boolean {
  if (!link) return false;
  if (Array.isArray(link)) {
    return link.some(linkHasId);
  }
  if (typeof link === 'object') {
    const id = (link as { id?: unknown }).id;
    return typeof id === 'string' && id.length > 0;
  }
  return false;
}

export function isReplyMemory(memory: any): boolean {
  return memory?.kind === 'reply' || linkHasId(memory?.replyTo);
}

export function topLevelMemories(memories: any[]): any[] {
  return memories.filter((memory) => !isReplyMemory(memory));
}

export function filterFeedMemories(
  memories: any[],
  topic: FeedTopic,
  userId: string | null | undefined,
  options: FeedFilterOptions = {},
): any[] {
  const topLevel = topLevelMemories(memories)
    .filter((memory) => memoryVisibleForPersonalSpace(memory, userId, options.personalSpaceId))
    .map((memory) => normalizeFeedMemoryPrivacy(memory, options.personalSpaceId));

  if (topic === 'all') return topLevel;
  if (topic === 'mine') {
    return topLevel.filter((m) => {
      const aId = m.author?.id ?? m.author?.[0]?.id;
      return aId === userId;
    });
  }
  if (topic === 'us') {
    return topLevel.filter((m) => {
      const aId = m.author?.id ?? m.author?.[0]?.id;
      return Boolean(userId) && aId !== userId && !isPersonalSpaceMemory(m, options.personalSpaceId);
    });
  }
  return topLevel.filter((m) => {
    const tags: string[] = Array.isArray(m.tags) ? m.tags : [];
    return tags.includes(topic);
  });
}

export function buildFeedQuery(args: BuildFeedArgs) {
  const where = relationWhere('space', spaceIdsFromArgs(args));
  return {
    memories: {
      $: {
        where,
        order: { createdAt: 'desc' as const },
        limit: 50,
      },
      ...MEMORY_POST_RELATIONS,
    },
  };
}

export function useMemoriesFeed(
  topic: FeedTopic,
  spaceId: string | string[] | null | undefined,
  userId: string | null | undefined,
  personalSpaceId?: string | null,
) {
  const spaceIds = Array.isArray(spaceId) ? spaceId : [spaceId];
  const ids = uniqueSpaceIds(spaceIds);
  const idsKey = ids.join('|');
  const query = useMemo(() => {
    const resolvedIds = idsKey ? idsKey.split('|') : [];
    if (resolvedIds.length === 0 || !userId) return null;
    return buildFeedQuery({ spaceIds: resolvedIds });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, userId]);

  const { data, isLoading, error } = db.useQuery(query as any);
  const all: any[] = (data as any)?.memories ?? [];

  const memories = useMemo(() => {
    return filterFeedMemories(all, topic, userId, { personalSpaceId });
  }, [all, topic, userId, personalSpaceId]);

  return { memories, isLoading, error };
}

export function normalizeFeedMemoryPrivacy(memory: any, personalSpaceId?: string | null): any {
  if (!isPersonalSpaceMemory(memory, personalSpaceId) || memory?.isPrivate === true) return memory;
  return { ...memory, isPrivate: true };
}

export function isPersonalSpaceMemory(memory: any, personalSpaceId?: string | null): boolean {
  if (!personalSpaceId) return false;
  const memorySpaceId = firstRel(memory?.space)?.id ?? null;
  return memorySpaceId === personalSpaceId;
}

function spaceIdsFromArgs(args: BuildFeedArgs) {
  return uniqueSpaceIds([...(args.spaceIds ?? []), args.spaceId]);
}

function firstRel(value: any): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function memoryVisibleForPersonalSpace(
  memory: any,
  userId: string | null | undefined,
  personalSpaceId?: string | null,
): boolean {
  if (!isPersonalSpaceMemory(memory, personalSpaceId)) return true;
  const authorId = firstRel(memory?.author)?.id ?? null;
  return !(authorId && authorId !== userId);
}
