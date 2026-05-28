import { db } from '@/src/lib/instant';
import {
  sendMemoryNotificationViaRelay,
  sendPushToUser,
  type MemoryNotificationKind,
} from '@/src/lib/push';

export interface ReactionPayload {
  actor: string;
  aggregate?: { others: number };
}

export interface DebouncerOptions {
  windowMs: number;
  send: (payload: ReactionPayload & { memoryId: string; recipientId: string }) => void;
}

interface PendingBucket {
  count: number;
  firstActor: string;
  timer: ReturnType<typeof setTimeout>;
}

export class ReactionDebouncer {
  private pending = new Map<string, PendingBucket>();

  constructor(private opts: DebouncerOptions) {}

  private key(memoryId: string, recipientId: string) {
    return `${memoryId}::${recipientId}`;
  }

  notify(memoryId: string, recipientId: string, payload: ReactionPayload) {
    const k = this.key(memoryId, recipientId);
    const existing = this.pending.get(k);

    if (!existing) {
      // First reaction in the window: send immediately, then start the window.
      this.opts.send({ memoryId, recipientId, actor: payload.actor });
      const timer = setTimeout(() => {
        const bucket = this.pending.get(k);
        if (bucket && bucket.count > 0) {
          this.opts.send({
            memoryId,
            recipientId,
            actor: bucket.firstActor,
            aggregate: { others: bucket.count },
          });
        }
        this.pending.delete(k);
      }, this.opts.windowMs);
      this.pending.set(k, { count: 0, firstActor: payload.actor, timer });
      return;
    }

    existing.count += 1;
  }
}

export async function notifyMemoryReaction(args: {
  memoryId: string;
  actorUserId: string;
  actorName: string;
  debouncer?: ReactionDebouncer;
}): Promise<void> {
  if (!args.debouncer && await tryTrustedMemoryRelay({
    kind: 'memoryReaction',
    sourceMemoryId: args.memoryId,
  })) {
    return;
  }

  const target = await getMemoryNotificationTarget(args.memoryId);
  if (!target || target.authorId === args.actorUserId) return;

  const debouncer = args.debouncer ?? defaultReactionDebouncer;
  debouncer.notify(args.memoryId, target.authorId, { actor: args.actorName });
}

export async function notifyMemoryRepost(args: {
  sourceMemoryId: string;
  actorUserId: string;
  actorName: string;
  routeMemoryId: string;
}): Promise<void> {
  if (await tryTrustedMemoryRelay({
    kind: 'memoryRepost',
    sourceMemoryId: args.sourceMemoryId,
    routeMemoryId: args.routeMemoryId,
  })) {
    return;
  }

  const target = await getMemoryNotificationTarget(args.sourceMemoryId);
  if (!target || target.authorId === args.actorUserId) return;

  await sendPushToUser({
    userId: target.authorId,
    title: 'Memory reposted',
    body: `${args.actorName} reposted your memory`,
    data: { route: `/(tabs)/memories/${args.routeMemoryId}` },
  });
}

export async function notifyMemoryQuote(args: {
  sourceMemoryId: string;
  actorUserId: string;
  actorName: string;
  routeMemoryId: string;
}): Promise<void> {
  if (await tryTrustedMemoryRelay({
    kind: 'memoryQuote',
    sourceMemoryId: args.sourceMemoryId,
    routeMemoryId: args.routeMemoryId,
  })) {
    return;
  }

  const target = await getMemoryNotificationTarget(args.sourceMemoryId);
  if (!target || target.authorId === args.actorUserId) return;

  await sendPushToUser({
    userId: target.authorId,
    title: 'Memory quoted',
    body: `${args.actorName} quoted your memory`,
    data: { route: `/(tabs)/memories/${args.routeMemoryId}` },
  });
}

async function getMemoryNotificationTarget(memoryId: string): Promise<{
  authorId: string;
} | null> {
  const { data } = await (db as any).queryOnce({
    memories: {
      $: { where: { id: memoryId } },
      author: {},
    },
  });
  const memory = data?.memories?.[0];
  if (memory?.isPrivate === true) return null;
  const author = firstRel<{ id?: string }>(memory?.author);
  return typeof author?.id === 'string' ? { authorId: author.id } : null;
}

function firstRel<T>(rel: T | T[] | undefined): T | undefined {
  if (!rel) return undefined;
  return Array.isArray(rel) ? rel[0] : rel;
}

async function tryTrustedMemoryRelay(args: {
  kind: MemoryNotificationKind;
  sourceMemoryId: string;
  routeMemoryId?: string;
}): Promise<boolean> {
  try {
    return await sendMemoryNotificationViaRelay(args);
  } catch (error) {
    console.warn('[memories] trusted memory push relay failed', error);
    return true;
  }
}

const defaultReactionDebouncer = new ReactionDebouncer({
  windowMs: 5 * 60_000,
  send: (payload) => {
    sendPushToUser({
      userId: payload.recipientId,
      title: 'New reaction',
      body: payload.aggregate
        ? `${payload.actor} and ${payload.aggregate.others} more reacted to your memory`
        : `${payload.actor} reacted to your memory`,
      data: { route: `/(tabs)/memories/${payload.memoryId}` },
    }).catch(() => undefined);
  },
});
