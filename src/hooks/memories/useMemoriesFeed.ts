import { useMemo } from 'react';
import { db } from '@/src/lib/instant';

export type FeedTab = 'recent' | 'highlights' | 'private';

interface BuildFeedArgs {
  tab: FeedTab;
  spaceId: string;
  userId: string;
}

const HIGHLIGHT_REACTION_THRESHOLD = 3;

export function buildFeedQuery({ tab, spaceId, userId }: BuildFeedArgs) {
  const baseSpace = { 'space.id': spaceId };
  let where: Record<string, any>;

  if (tab === 'private') {
    where = { ...baseSpace, 'author.id': userId, isPrivate: true };
  } else if (tab === 'highlights') {
    where = {
      ...baseSpace,
      or: [
        { isPinned: true },
        { reactionCount: { $gte: HIGHLIGHT_REACTION_THRESHOLD } },
      ],
    };
  } else {
    where = baseSpace;
  }

  return {
    memories: {
      $: { where, order: { createdAt: 'desc' as const }, limit: 50 },
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

export function useMemoriesFeed(tab: FeedTab, spaceId: string | null | undefined, userId: string | null | undefined) {
  const query = useMemo(() => {
    if (!spaceId || !userId) return null;
    return buildFeedQuery({ tab, spaceId, userId });
  }, [tab, spaceId, userId]);

  const { data, isLoading, error } = db.useQuery(query);
  return {
    memories: (data as any)?.memories ?? [],
    isLoading,
    error,
  };
}
