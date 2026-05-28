import { useCallback, useRef } from 'react';
import { id } from '@/src/lib/instant';
import { db } from '@/src/lib/instant';
import { useSession } from '@/src/hooks/useSession';
import { uniqueSpaceIds } from '@/src/lib/space-scope';
import { safeInstantId } from '@/src/lib/instant-id';

const POLL_OPTION_NOT_FOUND = 'Poll option not found';
const POLL_VOTE_NOT_FOUND = 'Poll vote not found';

export function usePollVote() {
  const session = useSession() as any;
  const { user, activeCouple } = session;
  const pendingVotesRef = useRef(new Set<string>());
  const readableSpaceIds = uniqueSpaceIds([
    session?.personalSpaceId,
    session?.sharedSpaceId,
    session?.sharedSpace?.id,
    session?.space?.id,
    activeCouple?.couple?.id,
  ]);
  const personalSpaceId = session?.personalSpaceId ?? null;
  const readableSpaceScopeKey = readableSpaceIds.join('|');

  const runExclusive = useCallback(async (key: string, action: () => Promise<void>) => {
    const pending = pendingVotesRef.current;
    if (pending.has(key)) return;
    pending.add(key);
    try {
      await action();
    } finally {
      pending.delete(key);
    }
  }, []);

  const cast = useCallback(async (optionId: string) => {
    if (!user?.id) return;
    await runExclusive(`cast:${optionId}`, async () => {
      await queryPollOptionForAction(optionId, readableSpaceIds, personalSpaceId);
      const voteId = id();
      await db.transact([
        db.tx.memoryPollVotes[voteId]
          .update({ createdAt: Date.now() })
          .link({ option: optionId, user: user.id }),
      ]);
    });
  }, [runExclusive, user?.id, readableSpaceScopeKey]);

  const revoke = useCallback(async (voteId: string) => {
    if (!user?.id) return;
    await runExclusive(`revoke:${voteId}`, async () => {
      await queryOwnedPollVoteForAction(voteId, user.id, readableSpaceIds, personalSpaceId);
      await db.transact([db.tx.memoryPollVotes[voteId].delete()]);
    });
  }, [runExclusive, user?.id, readableSpaceScopeKey]);

  const switchVote = useCallback(async (voteId: string, optionId: string) => {
    if (!user?.id) return;
    await runExclusive(`switch:${voteId}:${optionId}`, async () => {
      const currentVote = await queryOwnedPollVoteForAction(voteId, user.id, readableSpaceIds, personalSpaceId);
      const nextOption = await queryPollOptionForAction(optionId, readableSpaceIds, personalSpaceId);
      if (pollIdFor(currentVote?.option) !== pollIdFor(nextOption)) {
        throw new Error(POLL_OPTION_NOT_FOUND);
      }
      const nextVoteId = id();
      await db.transact([
        db.tx.memoryPollVotes[voteId].delete(),
        db.tx.memoryPollVotes[nextVoteId]
          .update({ createdAt: Date.now() })
          .link({ option: optionId, user: user.id }),
      ]);
    });
  }, [runExclusive, user?.id, readableSpaceScopeKey]);

  return { cast, revoke, switchVote };
}

async function queryPollOptionForAction(
  optionId: string,
  readableSpaceIds: string[],
  personalSpaceId?: string | null,
): Promise<any> {
  const safeOptionId = safeInstantId(optionId);
  if (!safeOptionId || readableSpaceIds.length === 0) throw new Error(POLL_OPTION_NOT_FOUND);
  const result = await db.queryOnce({
    memoryPollOptions: {
      $: { where: { id: safeOptionId }, limit: 1 },
      poll: {
        memory: {
          space: {},
        },
      },
    },
  });
  const option = result?.data?.memoryPollOptions?.[0] ?? null;
  if (!option || !isPollTargetReadable(option, readableSpaceIds, personalSpaceId)) {
    throw new Error(POLL_OPTION_NOT_FOUND);
  }
  return option;
}

async function queryOwnedPollVoteForAction(
  voteId: string,
  userId: string,
  readableSpaceIds: string[],
  personalSpaceId?: string | null,
): Promise<any> {
  const safeVoteId = safeInstantId(voteId);
  if (!safeVoteId || readableSpaceIds.length === 0) throw new Error(POLL_VOTE_NOT_FOUND);
  const result = await db.queryOnce({
    memoryPollVotes: {
      $: { where: { id: safeVoteId }, limit: 1 },
      user: {},
      option: {
        poll: {
          memory: {
            space: {},
          },
        },
      },
    },
  });
  const vote = result?.data?.memoryPollVotes?.[0] ?? null;
  if (!vote || firstRel(vote.user)?.id !== userId || !isPollTargetReadable(vote.option, readableSpaceIds, personalSpaceId)) {
    throw new Error(POLL_VOTE_NOT_FOUND);
  }
  return vote;
}

function isPollTargetReadable(
  option: any,
  readableSpaceIds: string[],
  personalSpaceId?: string | null,
): boolean {
  const memory = memoryFor(option);
  const spaceId = firstRel(memory?.space)?.id;
  return Boolean(
    memory &&
    memory.isPrivate !== true &&
    spaceId &&
    spaceId !== personalSpaceId &&
    readableSpaceIds.includes(spaceId),
  );
}

function pollIdFor(option: any): string | null {
  return firstRel(option?.poll)?.id ?? null;
}

function memoryFor(option: any): any {
  return firstRel(firstRel(option?.poll)?.memory);
}

function firstRel(value: any): any {
  return Array.isArray(value) ? value[0] : value;
}
