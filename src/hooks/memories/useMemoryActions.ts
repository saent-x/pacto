import { useCallback } from 'react';
import { id } from '@/src/lib/instant';
import { db } from '@/src/lib/instant';
import { useSession } from '@/src/hooks/useSession';

export function useMemoryActions() {
  const { user, activeCouple } = useSession() as any;
  const spaceId = activeCouple?.couple?.id;

  const react = useCallback(async (memoryId: string, emoji: 'heart' = 'heart') => {
    if (!user?.id) return;
    const reactionId = id();
    await db.transact([
      db.tx.memoryReactions[reactionId]
        .update({ emoji, createdAt: Date.now() })
        .link({ memory: memoryId, user: user.id }),
    ]);
  }, [user?.id]);

  const unreact = useCallback(async (reactionId: string) => {
    await db.transact([db.tx.memoryReactions[reactionId].delete()]);
  }, []);

  const repost = useCallback(async (sourceMemoryId: string) => {
    if (!user?.id || !spaceId) return;
    const newId = id();
    await db.transact([
      db.tx.memories[newId]
        .update({ body: '', kind: 'repost', createdAt: Date.now() })
        .link({ space: spaceId, author: user.id, repostOf: sourceMemoryId }),
    ]);
  }, [user?.id, spaceId]);

  const remove = useCallback(async (memoryId: string) => {
    await db.transact([db.tx.memories[memoryId].delete()]);
  }, []);

  const togglePin = useCallback(async (memoryId: string, isPinned: boolean) => {
    await db.transact([db.tx.memories[memoryId].update({ isPinned: !isPinned, updatedAt: Date.now() })]);
  }, []);

  return { react, unreact, repost, remove, togglePin };
}
