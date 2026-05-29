import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const txCalls = vi.hoisted(() => ({
  links: [] as Array<{ table: string; id: string; payload: any }>,
  deletes: [] as Array<{ table: string; id: string }>,
}));

const OPTION_1_ID = '11111111-1111-4111-8111-111111111111';
const OPTION_2_ID = '22222222-2222-4222-8222-222222222222';
const OPTION_3_ID = '33333333-3333-4333-8333-333333333333';
const VOTE_1_ID = '44444444-4444-4444-8444-444444444444';
const VOTE_2_ID = '55555555-5555-4555-8555-555555555555';
const OLD_VOTE_ID = '66666666-6666-4666-8666-666666666666';

const dbMock = vi.hoisted(() => ({
  transact: vi.fn(async (ops: any[]) => ops),
  queryOnce: vi.fn(),
  tx: {
    memoryPollVotes: new Proxy({}, {
      get: (_target, rowId: string) => ({
        update: vi.fn(() => ({
          link: vi.fn((payload: any) => {
            txCalls.links.push({ table: 'memoryPollVotes', id: rowId, payload });
            return { table: 'memoryPollVotes', id: rowId, payload };
          }),
        })),
        delete: vi.fn(() => {
          txCalls.deletes.push({ table: 'memoryPollVotes', id: rowId });
          return { table: 'memoryPollVotes', id: rowId, delete: true };
        }),
      }),
    }),
  },
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
  id: vi.fn(() => 'new-vote-1'),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: vi.fn(() => ({
    user: { id: 'user-1', displayName: 'Tor' },
    personalSpaceId: 'solo-1',
    sharedSpaceId: 'shared-1',
    sharedSpace: { id: 'shared-1', kind: 'crew' },
    space: { id: 'shared-1', kind: 'crew' },
    mode: 'crew',
  })),
}));

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function pollOptionResult(overrides: any = {}) {
  return {
    data: {
      memoryPollOptions: [
        {
          id: OPTION_2_ID,
          poll: {
            id: 'poll-1',
            memory: {
              id: 'memory-1',
              isPrivate: false,
              space: [{ id: 'shared-1' }],
            },
          },
          ...overrides,
        },
      ],
    },
  };
}

function pollVoteResult(overrides: any = {}) {
  return {
    data: {
      memoryPollVotes: [
        {
          id: VOTE_1_ID,
          user: { id: 'user-1' },
          option: {
            id: OPTION_1_ID,
            poll: {
              id: 'poll-1',
              memory: {
                id: 'memory-1',
                isPrivate: false,
                space: [{ id: 'shared-1' }],
              },
            },
          },
          ...overrides,
        },
      ],
    },
  };
}

function installDefaultPollQueries() {
  dbMock.queryOnce.mockImplementation(async (query: any) => {
    if (query?.memoryPollVotes) {
      return pollVoteResult({ id: query.memoryPollVotes.$?.where?.id ?? VOTE_1_ID });
    }
    return pollOptionResult({ id: query?.memoryPollOptions?.$?.where?.id ?? OPTION_2_ID });
  });
}

async function renderHookValue<T>(useValue: () => T) {
  let latest: T | null = null;

  function Probe() {
    latest = useValue();
    return null;
  }

  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Probe));
    await flush();
  });

  return { latest: latest!, renderer };
}

describe('usePollVote', () => {
  beforeEach(() => {
    dbMock.transact.mockClear();
    dbMock.queryOnce.mockReset();
    installDefaultPollQueries();
    txCalls.links = [];
    txCalls.deletes = [];
  });

  it('switches votes in one transaction so a failed cast cannot drop the old vote', async () => {
    const { usePollVote } = await import('@/src/hooks/memories/usePollVote');
    const { latest, renderer } = await renderHookValue(() => usePollVote());

    await act(async () => {
      await latest.switchVote(OLD_VOTE_ID, OPTION_2_ID);
      await flush();
    });

    expect(dbMock.transact).toHaveBeenCalledTimes(1);
    expect(dbMock.transact.mock.calls[0][0]).toHaveLength(2);
    expect(txCalls.deletes).toEqual([{ table: 'memoryPollVotes', id: OLD_VOTE_ID }]);
    expect(txCalls.links).toEqual([
      {
        table: 'memoryPollVotes',
        id: 'new-vote-1',
        payload: { option: OPTION_2_ID, user: 'user-1' },
      },
    ]);

    act(() => renderer.unmount());
  });

  it('ignores duplicate casts while the first cast is pending', async () => {
    let releaseCast: (() => void) | undefined;
    dbMock.transact.mockImplementationOnce(
      () =>
        new Promise<any[]>((resolve) => {
          releaseCast = () => resolve([]);
        }),
    );
    const { usePollVote } = await import('@/src/hooks/memories/usePollVote');
    const { latest, renderer } = await renderHookValue(() => usePollVote());

    let firstCast: Promise<void> | undefined;
    let secondCast: Promise<void> | undefined;
    await act(async () => {
      firstCast = latest.cast(OPTION_1_ID);
      secondCast = latest.cast(OPTION_1_ID);
      await Promise.resolve();
    });

    expect(dbMock.transact).toHaveBeenCalledTimes(1);
    releaseCast?.();
    await act(async () => {
      await Promise.all([firstCast, secondCast]);
      await flush();
    });

    act(() => renderer.unmount());
  });

  it('fails closed before casting a vote for an option outside scoped spaces', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({ data: { memoryPollOptions: [] } });
    const { usePollVote } = await import('@/src/hooks/memories/usePollVote');
    const { latest, renderer } = await renderHookValue(() => usePollVote());

    await act(async () => {
      await expect(latest.cast(OPTION_3_ID)).rejects.toThrow('Poll option not found');
      await flush();
    });

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);

    act(() => renderer.unmount());
  });

  it('rejects malformed poll action ids before querying Instant', async () => {
    const { usePollVote } = await import('@/src/hooks/memories/usePollVote');
    const { latest, renderer } = await renderHookValue(() => usePollVote());

    await act(async () => {
      await expect(latest.cast('not-a-uuid')).rejects.toThrow('Poll option not found');
      await expect(latest.revoke('not-a-uuid')).rejects.toThrow('Poll vote not found');
      await expect(latest.switchVote('not-a-uuid', 'also-not-a-uuid')).rejects.toThrow('Poll vote not found');
      await flush();
    });

    expect(dbMock.queryOnce).not.toHaveBeenCalled();
    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    expect(txCalls.deletes).toEqual([]);

    act(() => renderer.unmount());
  });

  it('fails closed before casting a vote on stale public personal-space polls', async () => {
    dbMock.queryOnce.mockResolvedValueOnce(pollOptionResult({
      poll: {
        id: 'poll-1',
        memory: {
          id: 'legacy-personal-memory',
          isPrivate: false,
          space: [{ id: 'solo-1' }],
        },
      },
    }));
    const { usePollVote } = await import('@/src/hooks/memories/usePollVote');
    const { latest, renderer } = await renderHookValue(() => usePollVote());

    await act(async () => {
      await expect(latest.cast(OPTION_3_ID)).rejects.toThrow('Poll option not found');
      await flush();
    });

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);

    act(() => renderer.unmount());
  });

  it('ignores duplicate revokes while the first revoke is pending', async () => {
    let releaseRevoke: (() => void) | undefined;
    dbMock.transact.mockImplementationOnce(
      () =>
        new Promise<any[]>((resolve) => {
          releaseRevoke = () => resolve([]);
        }),
    );
    const { usePollVote } = await import('@/src/hooks/memories/usePollVote');
    const { latest, renderer } = await renderHookValue(() => usePollVote());

    let firstRevoke: Promise<void> | undefined;
    let secondRevoke: Promise<void> | undefined;
    await act(async () => {
      firstRevoke = latest.revoke(VOTE_1_ID);
      secondRevoke = latest.revoke(VOTE_1_ID);
      await Promise.resolve();
    });

    expect(dbMock.transact).toHaveBeenCalledTimes(1);
    releaseRevoke?.();
    await act(async () => {
      await Promise.all([firstRevoke, secondRevoke]);
      await flush();
    });

    act(() => renderer.unmount());
  });

  it('fails closed before revoking another user poll vote', async () => {
    dbMock.queryOnce.mockResolvedValueOnce(pollVoteResult({ user: { id: 'user-2' } }));
    const { usePollVote } = await import('@/src/hooks/memories/usePollVote');
    const { latest, renderer } = await renderHookValue(() => usePollVote());

    await act(async () => {
      await expect(latest.revoke(VOTE_2_ID)).rejects.toThrow('Poll vote not found');
      await flush();
    });

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.deletes).toEqual([]);

    act(() => renderer.unmount());
  });

  it('ignores duplicate switch votes while the first switch is pending', async () => {
    let releaseSwitch: (() => void) | undefined;
    dbMock.transact.mockImplementationOnce(
      () =>
        new Promise<any[]>((resolve) => {
          releaseSwitch = () => resolve([]);
        }),
    );
    const { usePollVote } = await import('@/src/hooks/memories/usePollVote');
    const { latest, renderer } = await renderHookValue(() => usePollVote());

    let firstSwitch: Promise<void> | undefined;
    let secondSwitch: Promise<void> | undefined;
    await act(async () => {
      firstSwitch = latest.switchVote(VOTE_1_ID, OPTION_2_ID);
      secondSwitch = latest.switchVote(VOTE_1_ID, OPTION_2_ID);
      await Promise.resolve();
    });

    expect(dbMock.transact).toHaveBeenCalledTimes(1);
    releaseSwitch?.();
    await act(async () => {
      await Promise.all([firstSwitch, secondSwitch]);
      await flush();
    });

    act(() => renderer.unmount());
  });

  it('fails closed before switching a vote to an option from another poll', async () => {
    dbMock.queryOnce
      .mockResolvedValueOnce(pollVoteResult())
      .mockResolvedValueOnce(pollOptionResult({
        id: OPTION_3_ID,
        poll: {
          id: 'poll-2',
          memory: {
            id: 'memory-2',
            isPrivate: false,
            space: [{ id: 'shared-1' }],
          },
        },
      }));
    const { usePollVote } = await import('@/src/hooks/memories/usePollVote');
    const { latest, renderer } = await renderHookValue(() => usePollVote());

    await act(async () => {
      await expect(latest.switchVote(VOTE_1_ID, OPTION_3_ID)).rejects.toThrow('Poll option not found');
      await flush();
    });

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.deletes).toEqual([]);
    expect(txCalls.links).toEqual([]);

    act(() => renderer.unmount());
  });
});
