import { useCallback } from 'react';
import { id } from '@/src/lib/instant';
import { db } from '@/src/lib/instant';
import { useSession } from '@/src/hooks/useSession';

export function usePollVote() {
  const { user } = useSession() as any;

  const cast = useCallback(async (optionId: string) => {
    if (!user?.id) return;
    const voteId = id();
    await db.transact([
      db.tx.memoryPollVotes[voteId]
        .update({ createdAt: Date.now() })
        .link({ option: optionId, user: user.id }),
    ]);
  }, [user?.id]);

  const revoke = useCallback(async (voteId: string) => {
    await db.transact([db.tx.memoryPollVotes[voteId].delete()]);
  }, []);

  return { cast, revoke };
}
