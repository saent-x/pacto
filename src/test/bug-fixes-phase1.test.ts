/**
 * Regression tests for Phase 1 audit bug fixes.
 *
 * Covered:
 *   BUG-3  — `now` is NOT in the dependency arrays of the items/buckets useMemos in
 *             useNotifications (verified indirectly: the hook re-renders on data changes
 *             only, not on every render).
 *   BUG-4  — useMemoryActions.togglePin is guarded by runExclusive (double-tap safe)
 *             and the underlying db.transact error does not escape as an unhandled
 *             rejection.
 *   BUG-9  — useNotifications.markAllRead does not reject when db.transact rejects;
 *             the error is logged but swallowed.
 */
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Shared session / db mocks (used by both suites)
// ---------------------------------------------------------------------------

const sessionState = vi.hoisted(() => ({
  current: {
    activeCouple: { couple: { id: 'shared-1' } },
    personalSpaceId: 'solo-1',
    sharedSpaceId: 'shared-1',
    membership: { id: 'shared-membership', lastNotificationsReadAt: 2000 },
    soloMembership: { id: 'solo-membership', lastNotificationsReadAt: 1000 },
    sharedMembership: { id: 'shared-membership', lastNotificationsReadAt: 2000 },
    user: { id: 'user-1', displayName: 'Tor' },
    partner: { id: 'partner-1', displayName: 'Sam' },
  } as any,
}));

const dbMock = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: { checkIns: [], reminders: [], timetableItems: [], memories: [] }, isLoading: false, error: null })),
  transact: vi.fn(async (op: any) => op),
  queryOnce: vi.fn(async () => ({
    data: {
      memories: [
        {
          id: 'memory-pin-1',
          isPrivate: false,
          space: [{ id: 'shared-1' }],
          author: { id: 'user-1', displayName: 'Tor' },
          attachments: [],
        },
      ],
    },
  })),
  tx: {
    memberships: new Proxy({}, {
      get: (_: any, id: string) => ({
        update: vi.fn((payload: any) => ({ table: 'memberships', id, payload })),
      }),
    }),
    memories: new Proxy({}, {
      get: (_: any, id: string) => ({
        update: vi.fn((payload: any) => ({ table: 'memories', id, payload })),
        delete: vi.fn(() => ({ table: 'memories', id, delete: true })),
      }),
    }),
    memoryReactions: new Proxy({}, {
      get: (_: any, id: string) => ({
        update: vi.fn(() => ({ link: vi.fn(() => ({ table: 'memoryReactions', id })) })),
        delete: vi.fn(() => ({ table: 'memoryReactions', id, delete: true })),
      }),
    }),
    $files: new Proxy({}, {
      get: (_: any, id: string) => ({
        delete: vi.fn(() => ({ table: '$files', id, delete: true })),
      }),
    }),
  },
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
  id: vi.fn(() => 'generated-id'),
  lookup: vi.fn((field: string, value: string) => `lookup:${field}:${value}`),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: vi.fn(() => sessionState.current),
}));

vi.mock('@/src/lib/memories/notifications', () => ({
  notifyMemoryReaction: vi.fn(async () => undefined),
  notifyMemoryRepost: vi.fn(async () => undefined),
}));

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));

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

// ---------------------------------------------------------------------------
// BUG-9: markAllRead must not reject when db.transact rejects
// ---------------------------------------------------------------------------

describe('BUG-9: useNotifications.markAllRead swallows db.transact errors', () => {
  beforeEach(() => {
    dbMock.useQuery.mockClear();
    dbMock.transact.mockReset();
  });

  it('does not throw when db.transact rejects', async () => {
    dbMock.transact.mockRejectedValueOnce(new Error('network error'));
    const { useNotifications } = await import('@/src/hooks/useNotifications');
    const { latest, renderer } = await renderHookValue(() => useNotifications());

    // markAllRead must resolve (not reject) even when transact rejects
    await expect(
      act(async () => {
        await latest.markAllRead();
      }),
    ).resolves.toBeUndefined();

    act(() => renderer.unmount());
  });

  it('logs a warning when db.transact rejects', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    dbMock.transact.mockRejectedValueOnce(new Error('offline'));

    const { useNotifications } = await import('@/src/hooks/useNotifications');
    const { latest, renderer } = await renderHookValue(() => useNotifications());

    await act(async () => {
      await latest.markAllRead();
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[useNotifications]'),
      expect.any(Error),
    );
    warnSpy.mockRestore();
    act(() => renderer.unmount());
  });
});

// ---------------------------------------------------------------------------
// BUG-4: togglePin must be guarded by runExclusive (double-tap safe)
// ---------------------------------------------------------------------------

describe('BUG-4: useMemoryActions.togglePin runExclusive guard', () => {
  beforeEach(() => {
    dbMock.transact.mockReset();
    dbMock.queryOnce.mockReset();
    // Default: memory exists and is owned by user-1
    dbMock.queryOnce.mockResolvedValue({
      data: {
        memories: [
          {
            id: 'memory-pin-1',
            isPrivate: false,
            space: [{ id: 'shared-1' }],
            author: { id: 'user-1', displayName: 'Tor' },
            attachments: [],
          },
        ],
      },
    });
    dbMock.transact.mockResolvedValue(undefined);
    sessionState.current = {
      activeCouple: { couple: { id: 'shared-1' } },
      sharedSpaceId: 'shared-1',
      sharedSpace: { id: 'shared-1', kind: 'pair' },
      space: { id: 'shared-1', kind: 'pair' },
      mode: 'pair',
      personalSpaceId: 'solo-1',
      user: { id: 'user-1', displayName: 'Tor' },
    };
  });

  it('does not run a second togglePin while the first is in-flight', async () => {
    // Make the first transact stall
    let releaseFirst: (() => void) | undefined;
    dbMock.transact.mockImplementationOnce(
      () => new Promise<void>((resolve) => { releaseFirst = resolve; }),
    );

    const { useMemoryActions } = await import('@/src/hooks/memories/useMemoryActions');
    const { latest, renderer } = await renderHookValue(() => useMemoryActions());

    let first: Promise<void> | undefined;
    let second: Promise<void> | undefined;
    await act(async () => {
      first = latest.togglePin('memory-pin-1', false);
      second = latest.togglePin('memory-pin-1', false);
      await Promise.resolve();
    });

    // Release the stalled transact
    releaseFirst?.();
    await act(async () => {
      await Promise.all([first, second]);
    });

    // db.transact should have been called only once — the second call was dropped
    expect(dbMock.transact).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('allows a second togglePin after the first completes', async () => {
    dbMock.transact.mockResolvedValue(undefined);

    const { useMemoryActions } = await import('@/src/hooks/memories/useMemoryActions');
    const { latest, renderer } = await renderHookValue(() => useMemoryActions());

    await act(async () => {
      await latest.togglePin('memory-pin-1', false);
    });
    await act(async () => {
      await latest.togglePin('memory-pin-1', true);
    });

    expect(dbMock.transact).toHaveBeenCalledTimes(2);
    act(() => renderer.unmount());
  });

  it('propagates db.transact rejection to the caller as a rejected promise', async () => {
    dbMock.transact.mockRejectedValueOnce(new Error('transact failure'));

    const { useMemoryActions } = await import('@/src/hooks/memories/useMemoryActions');
    const { latest, renderer } = await renderHookValue(() => useMemoryActions());

    // runExclusive uses try/finally (not try/catch), so the error reaches the
    // caller as a rejected promise — catchable at the call site rather than
    // escaping as an unhandled global rejection.
    await act(async () => {
      await expect(latest.togglePin('memory-pin-1', false)).rejects.toThrow('transact failure');
    });

    act(() => renderer.unmount());
  });
});

// ---------------------------------------------------------------------------
// BUG-3: `now` is not in the items/buckets useMemo dep arrays
// Strategy: give useQuery a *stable* data reference so that items/buckets
// memos have no real deps changing between renders. Then force an extra render
// and confirm the buckets reference is identical (referential stability).
// If `now = Date.now()` were still in the dep array it would be a new value
// every render, causing items to recompute and return a new array, which
// would then cause buckets to recompute and return a new array.
// ---------------------------------------------------------------------------

describe('BUG-3: useNotifications memos do not recompute on every render', () => {
  beforeEach(() => {
    dbMock.useQuery.mockClear();
    dbMock.transact.mockReset();
  });

  it('returns the same buckets array reference across re-renders with stable data', async () => {
    // Use a fixed, stable data object so useQuery always returns the same ref
    const stableData = {
      checkIns: [],
      reminders: [],
      timetableItems: [],
      memories: [
        {
          id: 'stable-memory',
          body: 'hello',
          kind: 'post',
          createdAt: 1_000_000,
          notifyMembers: true,
          space: { id: 'shared-1' },
          author: { id: 'partner-1', displayName: 'Sam' },
        },
      ],
    };
    const stableQueryResult = { data: stableData, isLoading: false, error: null };
    dbMock.useQuery.mockReturnValue(stableQueryResult);

    const { useNotifications } = await import('@/src/hooks/useNotifications');
    const renders: any[] = [];
    let forceRerender: (() => void) | undefined;

    function Probe() {
      const [, setState] = React.useState(0);
      forceRerender = () => setState((n) => n + 1);
      const result = useNotifications();
      renders.push(result);
      return null;
    }

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(Probe));
      await flush();
    });

    // Trigger an extra render without changing data
    await act(async () => {
      forceRerender?.();
      await flush();
    });

    // With `now` removed from dep arrays:
    //   - items memo sees same `data` ref → same items ref
    //   - buckets memo sees same `items` ref → same buckets ref
    expect(renders.length).toBeGreaterThanOrEqual(2);
    expect(renders[renders.length - 1].buckets).toBe(renders[renders.length - 2].buckets);

    act(() => renderer.unmount());
  });
});
