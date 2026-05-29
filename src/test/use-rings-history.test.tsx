import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryState = vi.hoisted(() => ({
  data: {
    ringsHistory: [],
  } as any,
}));

const txCalls = vi.hoisted(() => ({
  updates: [] as Array<{ id: string; payload: any }>,
  links: [] as Array<{ id: string; payload: any }>,
}));

const dbMock = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: queryState.data, isLoading: false, error: null })),
  transact: vi.fn(async (op: any) => op),
  tx: {
    ringsHistory: new Proxy({}, {
      get: (_target, rowId: string) => ({
        update: vi.fn((payload: any) => {
          txCalls.updates.push({ id: rowId, payload });
          return {
            link: vi.fn((links: any) => {
              txCalls.links.push({ id: rowId, payload: links });
              return { table: 'ringsHistory', id: rowId, payload, links };
            }),
          };
        }),
      }),
    }),
  },
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
  id: vi.fn(() => 'ring-1'),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: vi.fn(() => ({
    activeCouple: { couple: { id: 'space-1' } },
    membership: { id: 'membership-1' },
  })),
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

describe('useRingsHistory', () => {
  beforeEach(() => {
    queryState.data = { ringsHistory: [] };
    txCalls.updates = [];
    txCalls.links = [];
    dbMock.useQuery.mockClear();
    dbMock.transact.mockClear();
  });

  it('queries rings for the active membership in the active space', async () => {
    const { useRingsHistory } = await import('@/src/hooks/useRingsHistory');
    const { renderer } = await renderHookValue(() => useRingsHistory());
    const query = dbMock.useQuery.mock.calls.at(-1)?.[0] as any;

    expect(query.ringsHistory.$.where).toMatchObject({
      'couple.id': 'space-1',
      'membership.id': 'membership-1',
    });

    act(() => renderer.unmount());
  });

  it('bounds the history query to the displayed previous and current months', async () => {
    const { useRingsHistory } = await import('@/src/hooks/useRingsHistory');
    const { renderer } = await renderHookValue(() =>
      useRingsHistory({ now: new Date('2026-05-25T12:00:00.000Z') } as any),
    );
    const query = dbMock.useQuery.mock.calls.at(-1)?.[0] as any;

    expect(query.ringsHistory.$).toMatchObject({
      where: {
        'couple.id': 'space-1',
        'membership.id': 'membership-1',
        dateKey: { $gte: '2026-04-01', $lte: '2026-05-31' },
      },
      order: { dateKey: 'asc' },
      limit: 61,
    });

    act(() => renderer.unmount());
  });

  it('links upserted ring rows to both space and membership for cleanup', async () => {
    const { useRingsHistory } = await import('@/src/hooks/useRingsHistory');
    const { latest, renderer } = await renderHookValue(() => useRingsHistory());

    await act(async () => {
      await latest.upsert('2026-05-24', { connect: 0.7, shared: 0.4, present: 0.8 });
      await flush();
    });

    expect(txCalls.updates[0]).toMatchObject({
      id: 'ring-1',
      payload: {
        dateKey: '2026-05-24',
        connectValue: 0.7,
        sharedValue: 0.4,
        presentValue: 0.8,
      },
    });
    expect(txCalls.links[0]).toEqual({
      id: 'ring-1',
      payload: { couple: 'space-1', membership: 'membership-1' },
    });

    act(() => renderer.unmount());
  });

  it('omits malformed stored ring dates and invalid progress values from the calendar map', async () => {
    queryState.data = {
      ringsHistory: [
        {
          id: 'bad-date',
          dateKey: '2026-04-31',
          connectValue: 0.7,
          sharedValue: 0.4,
          presentValue: 0.8,
          createdAt: 1,
        },
        {
          id: 'bad-values',
          dateKey: '2026-05-24',
          connectValue: 2,
          sharedValue: Number.NaN,
          presentValue: 0.8,
          createdAt: 2,
        },
      ],
    };

    const { useRingsHistory } = await import('@/src/hooks/useRingsHistory');
    const { latest, renderer } = await renderHookValue(() => useRingsHistory());

    expect(latest.byDateKey.has('2026-04-31')).toBe(false);
    expect(latest.byDateKey.get('2026-05-24')).toEqual({
      connect: undefined,
      shared: undefined,
      present: 0.8,
    });

    act(() => renderer.unmount());
  });

  it('fails closed instead of writing malformed ring dates', async () => {
    const { useRingsHistory } = await import('@/src/hooks/useRingsHistory');
    const { latest, renderer } = await renderHookValue(() => useRingsHistory());

    await expect(
      latest.upsert('2026-04-31', { connect: 0.7, shared: 0.4, present: 0.8 }),
    ).rejects.toThrow('Ring date is invalid');

    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('fails closed instead of writing out-of-range ring values', async () => {
    const { useRingsHistory } = await import('@/src/hooks/useRingsHistory');
    const { latest, renderer } = await renderHookValue(() => useRingsHistory());

    await expect(
      latest.upsert('2026-05-24', { connect: 1.2, shared: 0.4, present: Number.NaN }),
    ).rejects.toThrow('Ring values must be between 0 and 1');

    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });
});
