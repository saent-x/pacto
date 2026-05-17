import { useMemo } from 'react';
import { db } from '@/src/lib/instant';

export function useMemory(memoryId: string | null | undefined) {
  const query = useMemo(() => {
    if (!memoryId) return null;
    return {
      memories: {
        $: { where: { id: memoryId } },
        author: {},
        attachments: {},
        reactions: { user: {} },
        poll: { options: { votes: { user: {} } } },
        replies: {
          $: { order: { createdAt: 'asc' as const } },
          author: {},
          attachments: {},
        },
        quoteOf: { author: {}, attachments: {} },
        repostOf: { author: {}, attachments: {} },
      },
    };
  }, [memoryId]);

  const { data, isLoading, error } = db.useQuery(query);
  return {
    memory: (data as any)?.memories?.[0] ?? null,
    isLoading,
    error,
  };
}
