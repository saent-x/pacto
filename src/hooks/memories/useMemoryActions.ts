import { useCallback, useRef } from 'react';
import { id, lookup } from '@/src/lib/instant';
import { db } from '@/src/lib/instant';
import { useSession } from '@/src/hooks/useSession';
import { relationWhere, uniqueSpaceIds } from '@/src/lib/space-scope';
import {
  notifyMemoryReaction,
  notifyMemoryRepost,
} from '@/src/lib/memories/notifications';

const MEMORY_NOT_FOUND = 'Memory not found';
const REACTION_NOT_FOUND = 'Reaction not found';
const MEMORY_NOT_OWNED = 'Memory not owned';

export function useMemoryActions() {
  const session = useSession() as any;
  const { user, activeCouple } = session;
  const pendingActionsRef = useRef(new Set<string>());
  const mode = session?.mode ?? session?.space?.kind ?? null;
  const spaceId =
    session?.sharedSpaceId ??
    session?.sharedSpace?.id ??
    (mode === 'solo' ? null : session?.space?.id) ??
    activeCouple?.couple?.id;
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
    const pending = pendingActionsRef.current;
    if (pending.has(key)) return;
    pending.add(key);
    try {
      await action();
    } finally {
      pending.delete(key);
    }
  }, []);

  const react = useCallback(async (
    memoryId: string,
    emoji: 'heart' = 'heart',
    options?: { isPrivate?: boolean },
  ) => {
    if (options?.isPrivate) return;
    if (!user?.id) return;
    await runExclusive(`react:${memoryId}:${emoji}`, async () => {
      await queryPublicMemoryForAction(memoryId, readableSpaceIds, personalSpaceId);
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
    });
  }, [runExclusive, user, readableSpaceScopeKey]);

  const unreact = useCallback(async (reactionId: string) => {
    if (!user?.id) return;
    await runExclusive(`unreact:${reactionId}`, async () => {
      await queryOwnedReactionForAction(reactionId, user.id, readableSpaceIds, personalSpaceId);
      await db.transact([db.tx.memoryReactions[reactionId].delete()]);
    });
  }, [runExclusive, user?.id, readableSpaceScopeKey]);

  const repost = useCallback(async (
    sourceMemoryId: string,
    options?: { isPrivate?: boolean },
  ) => {
    if (options?.isPrivate || !user?.id || !spaceId || mode === 'solo') return;
    await runExclusive(`repost:${sourceMemoryId}`, async () => {
      await queryPublicMemoryForAction(sourceMemoryId, readableSpaceIds, personalSpaceId);
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
    });
  }, [runExclusive, user, spaceId, mode, readableSpaceScopeKey]);

  const remove = useCallback(async (memoryId: string) => {
    if (!user?.id) return;
    await runExclusive(`remove:${memoryId}`, async () => {
      const memory = await queryOwnedMemoryForAction(memoryId, user.id, readableSpaceIds);
      const mediaPaths = collectOwnedMemoryMediaPaths(memory?.attachments, user.id);
      const fileDeletes = mediaPaths.map((path) =>
        db.tx.$files[lookup('path', path)].delete(),
      );
      await db.transact([
        ...fileDeletes,
        db.tx.memories[memoryId].delete(),
      ]);
    });
  }, [runExclusive, user?.id, readableSpaceScopeKey]);

  const togglePin = useCallback(async (memoryId: string, isPinned: boolean) => {
    if (!user?.id) return;
    await runExclusive(`pin:${memoryId}`, async () => {
      await queryOwnedMemoryForAction(memoryId, user.id, readableSpaceIds);
      await db.transact([db.tx.memories[memoryId].update({ isPinned: !isPinned, updatedAt: Date.now() })]);
    });
  }, [runExclusive, user?.id, readableSpaceScopeKey]);

  return { react, unreact, repost, remove, togglePin };
}

async function queryMemoryForAction(memoryId: string, readableSpaceIds: string[]): Promise<any> {
  if (!memoryId || readableSpaceIds.length === 0) throw new Error(MEMORY_NOT_FOUND);
  const result = await db.queryOnce({
    memories: {
      $: {
        where: { id: memoryId, ...(relationWhere('space', readableSpaceIds) ?? {}) },
        limit: 1,
      },
      space: {},
      author: {},
      attachments: {},
    },
  });
  const memory = result?.data?.memories?.[0] ?? null;
  if (!memory) throw new Error(MEMORY_NOT_FOUND);
  const spaceId = firstRel(memory.space)?.id;
  if (!spaceId || !readableSpaceIds.includes(spaceId)) throw new Error(MEMORY_NOT_FOUND);
  return memory;
}

async function queryPublicMemoryForAction(
  memoryId: string,
  readableSpaceIds: string[],
  personalSpaceId?: string | null,
): Promise<any> {
  const memory = await queryMemoryForAction(memoryId, readableSpaceIds);
  if (!isPublicSharedMemory(memory, readableSpaceIds, personalSpaceId)) throw new Error(MEMORY_NOT_FOUND);
  return memory;
}

async function queryOwnedMemoryForAction(memoryId: string, userId: string, readableSpaceIds: string[]): Promise<any> {
  const memory = await queryMemoryForAction(memoryId, readableSpaceIds);
  if (firstRel(memory.author)?.id !== userId) throw new Error(MEMORY_NOT_OWNED);
  return memory;
}

async function queryOwnedReactionForAction(
  reactionId: string,
  userId: string,
  readableSpaceIds: string[],
  personalSpaceId?: string | null,
): Promise<any> {
  if (!reactionId || readableSpaceIds.length === 0) throw new Error(REACTION_NOT_FOUND);
  const result = await db.queryOnce({
    memoryReactions: {
      $: { where: { id: reactionId }, limit: 1 },
      user: {},
      memory: {
        space: {},
      },
    },
  });
  const reaction = result?.data?.memoryReactions?.[0] ?? null;
  if (!reaction || firstRel(reaction.user)?.id !== userId) throw new Error(REACTION_NOT_FOUND);
  const memory = firstRel(reaction.memory);
  if (!isPublicSharedMemory(memory, readableSpaceIds, personalSpaceId)) {
    throw new Error(REACTION_NOT_FOUND);
  }
  return reaction;
}

function isPublicSharedMemory(
  memory: any,
  readableSpaceIds: string[],
  personalSpaceId?: string | null,
): boolean {
  const spaceId = firstRel(memory?.space)?.id;
  return Boolean(
    memory &&
    memory.isPrivate !== true &&
    spaceId &&
    spaceId !== personalSpaceId &&
    readableSpaceIds.includes(spaceId),
  );
}

function firstRel(value: any): any {
  return Array.isArray(value) ? value[0] : value;
}

function collectOwnedMemoryMediaPaths(attachments: unknown, userId: string): string[] {
  if (!Array.isArray(attachments)) return [];
  const ownerPrefix = `users/${userId}/spaces/`;
  const seen = new Set<string>();
  for (const attachment of attachments) {
    const mediaPath = (attachment as { mediaPath?: unknown } | null)?.mediaPath;
    if (typeof mediaPath !== 'string') continue;
    if (!mediaPath.startsWith(ownerPrefix)) continue;
    seen.add(mediaPath);
  }
  return [...seen];
}

function displayName(user: any): string {
  return user?.displayName?.trim() || user?.email?.split('@')[0] || 'Someone';
}
