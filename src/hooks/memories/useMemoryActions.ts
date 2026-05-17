import { useCallback } from 'react';
import { id } from '@/src/lib/instant';
import { db } from '@/src/lib/instant';
import { useSession } from '@/src/hooks/useSession';
import {
  notifyMemoryReaction,
  notifyMemoryRepost,
} from '@/src/lib/memories/notifications';

export function useMemoryActions() {
  const session = useSession() as any;
  const { user, activeCouple } = session;
  const spaceId = activeCouple?.couple?.id;
  const mode = session?.mode ?? session?.space?.kind ?? null;

  const react = useCallback(async (memoryId: string, emoji: 'heart' = 'heart') => {
    if (!user?.id) return;
    const reactionId = id();
    await db.transact([
      db.tx.memoryReactions[reactionId]
        .update({ emoji, createdAt: Date.now() })
        .link({ memory: memoryId, user: user.id }),
    ]);
    await notifyMemoryReaction({
      memoryId,
      actorUserId: user.id,
      actorName: displayName(user),
    });
  }, [user]);

  const unreact = useCallback(async (reactionId: string) => {
    await db.transact([db.tx.memoryReactions[reactionId].delete()]);
  }, []);

  const repost = useCallback(async (sourceMemoryId: string) => {
    if (!user?.id || !spaceId || mode === 'solo') return;
    const newId = id();
    await db.transact([
      db.tx.memories[newId]
        .update({ body: '', kind: 'repost', createdAt: Date.now() })
        .link({ space: spaceId, author: user.id, repostOf: sourceMemoryId }),
    ]);
    await notifyMemoryRepost({
      sourceMemoryId,
      actorUserId: user.id,
      actorName: displayName(user),
      routeMemoryId: newId,
    });
  }, [user, spaceId, mode]);

  const remove = useCallback(async (memoryId: string) => {
    await db.transact([db.tx.memories[memoryId].delete()]);
  }, []);

  const togglePin = useCallback(async (memoryId: string, isPinned: boolean) => {
    await db.transact([db.tx.memories[memoryId].update({ isPinned: !isPinned, updatedAt: Date.now() })]);
  }, []);

  return { react, unreact, repost, remove, togglePin };
}

function displayName(user: any): string {
  return user?.displayName?.trim() || user?.email?.split('@')[0] || 'Someone';
}
