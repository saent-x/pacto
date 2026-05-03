import { useMemo } from 'react';
import { db } from '@/src/lib/instant';

/**
 * Topic chips drive the feed filter. The set is dynamic — `'all' | 'us' | 'mine'`
 * are always present; tag chips are derived from posted hashtags via `useMemoryTopics`.
 */
export type FeedTopic = string; // 'all' | 'us' | 'mine' | <tag>

interface BuildFeedArgs {
  spaceId: string;
}

export function buildFeedQuery({ spaceId }: BuildFeedArgs) {
  return {
    memories: {
      $: {
        where: { 'space.id': spaceId },
        order: { createdAt: 'desc' as const },
        limit: 50,
      },
      author: {},
      attachments: {},
      reactions: { user: {} },
      poll: { options: { votes: {} } },
      replyTo: {},
      quoteOf: { author: {}, attachments: {} },
      repostOf: { author: {}, attachments: {} },
    },
  };
}

export function useMemoriesFeed(
  topic: FeedTopic,
  spaceId: string | null | undefined,
  userId: string | null | undefined,
) {
  const query = useMemo(() => {
    if (!spaceId || !userId) return null;
    return buildFeedQuery({ spaceId });
  }, [spaceId, userId]);

  const { data, isLoading, error } = db.useQuery(query as any);
  const all: any[] = (data as any)?.memories ?? [];

  const memories = useMemo(() => {
    if (topic === 'all') return all;
    if (topic === 'mine') {
      return all.filter((m) => {
        const aId = m.author?.id ?? m.author?.[0]?.id;
        return aId === userId;
      });
    }
    if (topic === 'us') {
      return all.filter((m) => {
        const aId = m.author?.id ?? m.author?.[0]?.id;
        return aId && aId !== userId;
      });
    }
    // tag filter
    return all.filter((m) => {
      const tags: string[] = Array.isArray(m.tags) ? m.tags : [];
      return tags.includes(topic);
    });
  }, [all, topic, userId]);

  return { memories, isLoading, error };
}
