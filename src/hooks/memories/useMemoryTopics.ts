import { useMemo } from 'react';
import { db } from '@/src/lib/instant';
import {
  isPersonalSpaceMemory,
  memoryVisibleForPersonalSpace,
  normalizeFeedMemoryPrivacy,
  topLevelMemories,
} from './useMemoriesFeed';
import { relationWhere, uniqueSpaceIds } from '@/src/lib/space-scope';

export interface MemoryTopic {
  id: string;            // 'all' | 'us' | 'mine' | tag string
  label: string;
  count: number | null;  // null = "no count badge"
}

/**
 * Build the topic chip strip for the memories feed:
 * - "For you" (all) — always present, no count
 * - "Just us"       — pair/crew only; count = memories not authored by current user
 * - "Just me"       — count = memories authored by current user
 * - "#tag"          — one chip per distinct tag in the space, sorted by count desc
 */
export function useMemoryTopics(
  spaceId: string | string[] | null | undefined,
  userId: string | null | undefined,
  personalSpaceId?: string | null,
) {
  const spaceIdsResolved = uniqueSpaceIds(Array.isArray(spaceId) ? spaceId : [spaceId]);
  const spaceIdsKey = spaceIdsResolved.join('|');
  const query = useMemo(() => {
    const ids = spaceIdsKey ? spaceIdsKey.split('|') : [];
    if (ids.length === 0) return null;
    return {
      memories: {
        $: {
          where: relationWhere('space', ids),
          order: { createdAt: 'desc' as const },
          limit: 500,
        },
        space: {},
        author: {},
        replyTo: {},
      },
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceIdsKey]);

  const { data, isLoading } = db.useQuery(query as any);
  const memories = topLevelMemories((data as any)?.memories ?? [])
    .filter((memory) => memoryVisibleForPersonalSpace(memory, userId, personalSpaceId))
    .map((memory) => normalizeFeedMemoryPrivacy(memory, personalSpaceId));

  return useMemo<{ topics: MemoryTopic[]; isLoading: boolean }>(() => {
    const tagCounts = new Map<string, number>();
    let usCount = 0;
    let mineCount = 0;

    for (const m of memories) {
      const authorId = m.author?.id ?? m.author?.[0]?.id;
      if (authorId === userId) mineCount += 1;
      else if (userId && !isPersonalSpaceMemory(m, personalSpaceId)) usCount += 1;
      const tags: string[] = Array.isArray(m.tags) ? m.tags : [];
      for (const t of tags) {
        if (!t) continue;
        tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
      }
    }

    const tagChips: MemoryTopic[] = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ id: tag, label: `#${tag}`, count }));

    const topics: MemoryTopic[] = [
      { id: 'all', label: 'For you', count: null },
      { id: 'us', label: 'Just us', count: usCount },
      { id: 'mine', label: 'Just me', count: mineCount },
      ...tagChips,
    ];

    return { topics, isLoading };
  }, [memories, userId, isLoading, personalSpaceId]);
}
