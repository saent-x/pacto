import { useMemo } from 'react';
import { db } from '@/src/lib/instant';

export function useMemberProfile(userId: string | null | undefined, spaceId: string | null | undefined) {
  const query = useMemo(() => {
    if (!userId || !spaceId) return null;
    return {
      $users: {
        $: { where: { id: userId } },
      },
      memberships: {
        $: { where: { 'user.id': userId, 'space.id': spaceId } },
      },
      memories: {
        $: {
          where: { 'author.id': userId, 'space.id': spaceId },
          order: { createdAt: 'desc' as const },
          limit: 50,
        },
        attachments: {},
      },
    };
  }, [userId, spaceId]);

  const { data, isLoading } = db.useQuery(query);
  return {
    user: (data as any)?.$users?.[0] ?? null,
    membership: (data as any)?.memberships?.[0] ?? null,
    memories: (data as any)?.memories ?? [],
    isLoading,
  };
}
