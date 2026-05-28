import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  queryOnce: vi.fn(),
}));
const sendPushToUser = vi.hoisted(() => vi.fn(async () => undefined));
const sendMemoryNotificationViaRelay = vi.hoisted(() => vi.fn(async () => false));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
}));
vi.mock('@/src/lib/push', () => ({
  sendPushToUser,
  sendMemoryNotificationViaRelay,
}));

import {
  notifyMemoryQuote,
  notifyMemoryReaction,
  notifyMemoryRepost,
  ReactionDebouncer,
} from '@/src/lib/memories/notifications';

beforeEach(() => {
  vi.clearAllMocks();
  sendMemoryNotificationViaRelay.mockResolvedValue(false);
});

describe('ReactionDebouncer', () => {
  it('emits the first reaction immediately', async () => {
    const send = vi.fn();
    const d = new ReactionDebouncer({ windowMs: 1000, send });
    d.notify('memory-1', 'recipient-1', { actor: 'A' });
    await new Promise((r) => setTimeout(r, 5));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('batches subsequent reactions within the window', async () => {
    const send = vi.fn();
    const d = new ReactionDebouncer({ windowMs: 100, send });
    d.notify('memory-1', 'recipient-1', { actor: 'A' });
    d.notify('memory-1', 'recipient-1', { actor: 'B' });
    d.notify('memory-1', 'recipient-1', { actor: 'C' });
    await new Promise((r) => setTimeout(r, 150));
    expect(send).toHaveBeenCalledTimes(2);
    const lastCall = send.mock.calls[1][0];
    expect(lastCall.aggregate.others).toBe(2);
  });

  it('does not batch reactions to different memories', async () => {
    const send = vi.fn();
    const d = new ReactionDebouncer({ windowMs: 100, send });
    d.notify('memory-1', 'r1', { actor: 'A' });
    d.notify('memory-2', 'r1', { actor: 'B' });
    await new Promise((r) => setTimeout(r, 150));
    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe('memory notification targeting', () => {
  it('uses the trusted relay for memory notifications when available', async () => {
    sendMemoryNotificationViaRelay.mockResolvedValue(true);
    sendPushToUser.mockClear();
    dbMock.queryOnce.mockClear();

    await notifyMemoryReaction({
      memoryId: 'source-1',
      actorUserId: 'actor-1',
      actorName: 'Ari',
    });
    await notifyMemoryRepost({
      sourceMemoryId: 'source-1',
      actorUserId: 'actor-1',
      actorName: 'Ari',
      routeMemoryId: 'repost-1',
    });
    await notifyMemoryQuote({
      sourceMemoryId: 'source-1',
      actorUserId: 'actor-1',
      actorName: 'Ari',
      routeMemoryId: 'quote-1',
    });

    expect(sendMemoryNotificationViaRelay).toHaveBeenCalledWith({
      kind: 'memoryReaction',
      sourceMemoryId: 'source-1',
    });
    expect(sendMemoryNotificationViaRelay).toHaveBeenCalledWith({
      kind: 'memoryRepost',
      sourceMemoryId: 'source-1',
      routeMemoryId: 'repost-1',
    });
    expect(sendMemoryNotificationViaRelay).toHaveBeenCalledWith({
      kind: 'memoryQuote',
      sourceMemoryId: 'source-1',
      routeMemoryId: 'quote-1',
    });
    expect(dbMock.queryOnce).not.toHaveBeenCalled();
    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  it('sends reactions to the memory author and skips self-reactions', async () => {
    const debouncer = new ReactionDebouncer({ windowMs: 1000, send: vi.fn() });
    dbMock.queryOnce.mockResolvedValueOnce({
      data: { memories: [{ author: [{ id: 'author-1' }] }] },
    });

    await notifyMemoryReaction({
      memoryId: 'memory-1',
      actorUserId: 'actor-1',
      actorName: 'Ari',
      debouncer,
    });

    expect((debouncer as any).opts.send).toHaveBeenCalledWith({
      memoryId: 'memory-1',
      recipientId: 'author-1',
      actor: 'Ari',
    });

    dbMock.queryOnce.mockResolvedValueOnce({
      data: { memories: [{ author: [{ id: 'actor-1' }] }] },
    });
    await notifyMemoryReaction({
      memoryId: 'memory-1',
      actorUserId: 'actor-1',
      actorName: 'Ari',
      debouncer,
    });

    expect((debouncer as any).opts.send).toHaveBeenCalledTimes(1);
  });

  it('does not notify for private source memories', async () => {
    const debouncer = new ReactionDebouncer({ windowMs: 1000, send: vi.fn() });
    dbMock.queryOnce
      .mockResolvedValueOnce({
        data: { memories: [{ isPrivate: true, author: [{ id: 'author-1' }] }] },
      })
      .mockResolvedValueOnce({
        data: { memories: [{ isPrivate: true, author: [{ id: 'author-1' }] }] },
      })
      .mockResolvedValueOnce({
        data: { memories: [{ isPrivate: true, author: [{ id: 'author-1' }] }] },
      });
    sendPushToUser.mockClear();

    await notifyMemoryReaction({
      memoryId: 'private-memory-1',
      actorUserId: 'actor-1',
      actorName: 'Ari',
      debouncer,
    });
    await notifyMemoryRepost({
      sourceMemoryId: 'private-memory-1',
      actorUserId: 'actor-1',
      actorName: 'Ari',
      routeMemoryId: 'repost-1',
    });
    await notifyMemoryQuote({
      sourceMemoryId: 'private-memory-1',
      actorUserId: 'actor-1',
      actorName: 'Ari',
      routeMemoryId: 'quote-1',
    });

    expect((debouncer as any).opts.send).not.toHaveBeenCalled();
    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  it('sends repost and quote pushes to the source memory author', async () => {
    dbMock.queryOnce
      .mockResolvedValueOnce({ data: { memories: [{ author: [{ id: 'author-1' }] }] } })
      .mockResolvedValueOnce({ data: { memories: [{ author: [{ id: 'author-1' }] }] } });
    sendPushToUser.mockClear();

    await notifyMemoryRepost({
      sourceMemoryId: 'source-1',
      actorUserId: 'actor-1',
      actorName: 'Ari',
      routeMemoryId: 'repost-1',
    });
    await notifyMemoryQuote({
      sourceMemoryId: 'source-1',
      actorUserId: 'actor-1',
      actorName: 'Ari',
      routeMemoryId: 'quote-1',
    });

    expect(sendPushToUser).toHaveBeenCalledWith({
      userId: 'author-1',
      title: 'Memory reposted',
      body: 'Ari reposted your memory',
      data: { route: '/(tabs)/memories/repost-1' },
    });
    expect(sendPushToUser).toHaveBeenCalledWith({
      userId: 'author-1',
      title: 'Memory quoted',
      body: 'Ari quoted your memory',
      data: { route: '/(tabs)/memories/quote-1' },
    });
  });
});
