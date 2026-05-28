import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sessionState = vi.hoisted(() => ({
  activeCouple: { couple: { id: 'shared-1' } },
  personalSpaceId: 'solo-1',
  sharedSpaceId: 'shared-1',
  user: { id: 'user-1' },
}));

const queryState = vi.hoisted(() => ({
  data: null as any,
}));

const txCalls = vi.hoisted(() => ({
  updates: [] as Array<{ table: string; id: string; payload: any }>,
  links: [] as Array<{ table: string; id: string; payload: any }>,
}));

const dbMock = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: queryState.data, isLoading: false })),
  transact: vi.fn(async (op: any) => op),
  tx: new Proxy({}, {
    get: (_target, table: string) =>
      new Proxy({}, {
        get: (_rows, id: string) => ({
          update: vi.fn((updatePayload: any) => {
            txCalls.updates.push({ table, id, payload: updatePayload });
            return {
              link: vi.fn((payload: any) => {
                txCalls.links.push({ table, id, payload });
                return { table, id, payload };
              }),
            };
          }),
          link: vi.fn((payload: any) => {
            txCalls.links.push({ table, id, payload });
            return { table, id, payload };
          }),
          delete: vi.fn(),
        }),
      }),
  }),
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
  id: vi.fn(() => 'timetable-id'),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => sessionState,
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

describe('useTimetables permanent solo routing', () => {
  beforeEach(() => {
    sessionState.activeCouple = { couple: { id: 'shared-1' } };
    sessionState.personalSpaceId = 'solo-1';
    sessionState.sharedSpaceId = 'shared-1';
    sessionState.user = { id: 'user-1' };
    txCalls.updates = [];
    queryState.data = null;
    txCalls.links = [];
    dbMock.useQuery.mockClear();
    dbMock.transact.mockClear();
  });

  it('queries personal solo and active shared timetables together', async () => {
    const { useTimetables } = await import('@/src/hooks/useTimetables');
    const { renderer } = await renderHookValue(() => useTimetables());

    expect(dbMock.useQuery).toHaveBeenCalledWith({
      timetables: {
        $: {
          where: {
            or: [{ 'couple.id': 'solo-1' }, { 'couple.id': 'shared-1' }],
          },
        },
        items: { couple: {} },
        couple: {},
        createdBy: {},
      },
    });

    act(() => renderer.unmount());
  });

  it('writes solo-share timetables to the permanent solo space', async () => {
    const { useTimetables } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetables());

    await act(async () => {
      await latest.create({ title: 'Morning', share: 'solo' });
      await flush();
    });

    expect(txCalls.links[0]).toEqual({
      table: 'timetables',
      id: 'timetable-id',
      payload: { couple: 'solo-1', createdBy: 'user-1' },
    });

    act(() => renderer.unmount());
  });

  it('stores fallback solo timetable creates with solo share metadata', async () => {
    sessionState.activeCouple = { couple: { id: 'solo-1' } };
    sessionState.sharedSpaceId = null as any;
    const { useTimetables } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetables());

    await act(async () => {
      await latest.create({ title: 'Solo routine', share: 'shared' as any });
      await flush();
    });

    expect(txCalls.updates[0]).toEqual(
      expect.objectContaining({
        table: 'timetables',
        id: 'timetable-id',
        payload: expect.objectContaining({ share: 'solo' }),
      }),
    );
    expect(txCalls.links[0]).toEqual({
      table: 'timetables',
      id: 'timetable-id',
      payload: { couple: 'solo-1', createdBy: 'user-1' },
    });

    act(() => renderer.unmount());
  });

  it('derives timetable share classification from the owning space when legacy flags disagree', async () => {
    queryState.data = {
      timetables: [
        {
          id: 'solo-legacy',
          title: 'Personal routine',
          share: 'shared',
          updatedAt: 2,
          couple: { id: 'solo-1' },
          items: [],
        },
        {
          id: 'shared-legacy',
          title: 'Shared routine',
          share: 'solo',
          updatedAt: 1,
          couple: { id: 'shared-1' },
          items: [],
        },
      ],
    };

    const { useTimetables } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetables());

    expect(latest.timetables.map((t) => ({ id: t.id, share: t.share }))).toEqual([
      { id: 'solo-legacy', share: 'solo' },
      { id: 'shared-legacy', share: 'shared' },
    ]);

    act(() => renderer.unmount());
  });

  it('normalizes malformed legacy timetable share flags from the owning space', async () => {
    queryState.data = {
      timetables: [
        {
          id: 'solo-malformed-share',
          title: 'Personal routine',
          share: 'bogus',
          updatedAt: 2,
          couple: { id: 'solo-1' },
          createdBy: { id: 'user-1' },
          items: [],
        },
        {
          id: 'shared-malformed-share',
          title: 'Shared routine',
          share: 'bogus',
          updatedAt: 1,
          couple: { id: 'shared-1' },
          items: [],
        },
      ],
    };

    const { useTimetables } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetables());

    expect(latest.timetables.map((t) => ({ id: t.id, share: t.share }))).toEqual([
      { id: 'solo-malformed-share', share: 'solo' },
      { id: 'shared-malformed-share', share: 'shared' },
    ]);

    act(() => renderer.unmount());
  });

  it('excludes partner-authored timetables from the current user personal space', async () => {
    queryState.data = {
      timetables: [
        {
          id: 'personal-partner-timetable',
          title: 'Partner private routine',
          share: 'solo',
          updatedAt: 3,
          couple: { id: 'solo-1' },
          createdBy: { id: 'partner-1' },
          items: [],
        },
        {
          id: 'personal-self-timetable',
          title: 'My private routine',
          share: 'shared',
          updatedAt: 2,
          couple: { id: 'solo-1' },
          createdBy: { id: 'user-1' },
          items: [],
        },
        {
          id: 'shared-partner-timetable',
          title: 'Shared routine',
          share: 'shared',
          updatedAt: 1,
          couple: { id: 'shared-1' },
          createdBy: { id: 'partner-1' },
          items: [],
        },
      ],
    };

    const { useTimetables } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetables());

    expect(latest.timetables.map((timetable) => timetable.id)).toEqual([
      'personal-self-timetable',
      'shared-partner-timetable',
    ]);
    expect(latest.timetables[0]).toMatchObject({ id: 'personal-self-timetable', share: 'solo' });
    await expect(latest.update('personal-partner-timetable', { title: 'Wrong routine' })).rejects.toThrow('Timetable not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('keeps malformed legacy timetable timestamps from producing NaN metadata', async () => {
    queryState.data = {
      timetables: [
        {
          id: 'legacy-malformed-timetable',
          title: 'Imported routine',
          share: 'solo',
          updatedAt: 'bad-updated-at',
          createdAt: 'bad-created-at',
          couple: { id: 'solo-1' },
          createdBy: { id: 'user-1' },
          items: [],
        },
      ],
    };

    const { useTimetables } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetables());

    expect(latest.timetables).toEqual([
      expect.objectContaining({
        id: 'legacy-malformed-timetable',
        updatedAt: 0,
      }),
    ]);
    expect(Number.isNaN(latest.timetables[0]?.updatedAt)).toBe(false);

    act(() => renderer.unmount());
  });

  it('keeps impossible ISO-like legacy timetable timestamps from becoming real metadata', async () => {
    queryState.data = {
      timetables: [
        {
          id: 'legacy-impossible-timetable',
          title: 'Imported routine',
          share: 'solo',
          updatedAt: '2026-04-31T09:00:00.000Z',
          createdAt: '2026-02-29T09:00:00.000Z',
          couple: { id: 'solo-1' },
          createdBy: { id: 'user-1' },
          items: [],
        },
      ],
    };

    const { useTimetables } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetables());

    expect(latest.timetables).toEqual([
      expect.objectContaining({
        id: 'legacy-impossible-timetable',
        updatedAt: 0,
      }),
    ]);

    act(() => renderer.unmount());
  });

  it('keeps oversized numeric legacy timetable timestamps from becoming formatter-unsafe metadata', async () => {
    queryState.data = {
      timetables: [
        {
          id: 'legacy-oversized-timetable',
          title: 'Imported routine',
          share: 'solo',
          updatedAt: Number.MAX_VALUE,
          createdAt: Number.MAX_VALUE,
          couple: { id: 'solo-1' },
          createdBy: { id: 'user-1' },
          items: [],
        },
      ],
    };

    const { useTimetables } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetables());

    expect(latest.timetables).toEqual([
      expect.objectContaining({
        id: 'legacy-oversized-timetable',
        updatedAt: 0,
      }),
    ]);

    act(() => renderer.unmount());
  });

  it('fails closed instead of silently succeeding when create has no target space', async () => {
    sessionState.activeCouple = null as any;
    sessionState.personalSpaceId = null as any;
    sessionState.sharedSpaceId = null as any;
    const { useTimetables } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetables());

    await expect(latest.create({ title: 'Ghost routine', share: 'shared' })).rejects.toThrow('No active space');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating a timetable outside the scoped result set', async () => {
    queryState.data = { timetables: [] };
    const { useTimetables } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetables());

    await expect(latest.update('missing-timetable', { title: 'Wrong routine' })).rejects.toThrow('Timetable not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of creating a timetable with a malformed share flag', async () => {
    const { useTimetables } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetables());

    await expect(latest.create({ title: 'Bad routine', share: 'bogus' as any })).rejects.toThrow('Invalid timetable share');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of creating a timetable with malformed template metadata', async () => {
    const { useTimetables } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetables());

    await expect(latest.create({ title: 'Bad template', template: 'fitness-v2' as any })).rejects.toThrow('Invalid timetable template');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating a timetable with a malformed share flag', async () => {
    queryState.data = {
      timetables: [
        {
          id: 'timetable-1',
          title: 'Shared routine',
          share: 'shared',
          updatedAt: 1,
          couple: { id: 'shared-1' },
          items: [],
        },
      ],
    };
    const { useTimetables } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetables());

    await expect(latest.update('timetable-1', { share: 'bogus' as any })).rejects.toThrow('Invalid timetable share');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating a timetable with malformed template metadata', async () => {
    queryState.data = {
      timetables: [
        {
          id: 'timetable-1',
          title: 'Shared routine',
          template: 'routine',
          share: 'shared',
          updatedAt: 1,
          couple: { id: 'shared-1' },
          items: [],
        },
      ],
    };
    const { useTimetables } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetables());

    await expect(latest.update('timetable-1', { template: 'fitness-v2' as any })).rejects.toThrow('Invalid timetable template');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of deleting a timetable outside the scoped result set', async () => {
    queryState.data = { timetables: [] };
    const { useTimetables } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetables());

    await expect(latest.remove('missing-timetable')).rejects.toThrow('Timetable not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('does not pass malformed timetable route ids into Instant queries', async () => {
    const { useTimetable } = await import('@/src/hooks/useTimetables');
    const { renderer } = await renderHookValue(() => useTimetable('not-a-uuid'));

    expect(dbMock.useQuery).toHaveBeenCalledWith(null);

    act(() => renderer.unmount());
  });

  it('fails closed instead of pretending to add an item for a malformed timetable route id', async () => {
    const { useTimetable } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetable('not-a-uuid'));

    await expect(latest.add({
      title: 'Invisible block',
      day: 1,
      startHour: 9,
      duration: 45,
    })).rejects.toThrow('Timetable not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('derives detail timetable share from the owning space when legacy flags disagree', async () => {
    queryState.data = {
      timetables: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Personal routine',
          share: 'shared',
          updatedAt: 1,
          couple: { id: 'solo-1' },
          items: [],
        },
      ],
    };
    const { useTimetable } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetable('11111111-1111-4111-8111-111111111111'));

    expect(latest.timetable).toEqual(expect.objectContaining({ share: 'solo' }));

    act(() => renderer.unmount());
  });

  it('normalizes malformed legacy timetable detail share flags from the owning space', async () => {
    queryState.data = {
      timetables: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Shared routine',
          share: 'bogus',
          updatedAt: 1,
          couple: { id: 'shared-1' },
          items: [],
        },
      ],
    };
    const { useTimetable } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetable('11111111-1111-4111-8111-111111111111'));

    expect(latest.timetable).toEqual(expect.objectContaining({ share: 'shared' }));

    act(() => renderer.unmount());
  });

  it('keeps malformed legacy timetable detail timestamps from producing NaN metadata', async () => {
    queryState.data = {
      timetables: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Imported routine',
          share: 'solo',
          updatedAt: 'bad-updated-at',
          createdAt: 'bad-created-at',
          couple: { id: 'solo-1' },
          createdBy: { id: 'user-1' },
          items: [],
        },
      ],
    };
    const { useTimetable } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetable('11111111-1111-4111-8111-111111111111'));

    expect(latest.timetable).toEqual(expect.objectContaining({ updatedAt: 0 }));
    expect(Number.isNaN(latest.timetable?.updatedAt)).toBe(false);

    act(() => renderer.unmount());
  });

  it('keeps impossible ISO-like legacy timetable detail timestamps from becoming real metadata', async () => {
    queryState.data = {
      timetables: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Imported routine',
          share: 'solo',
          updatedAt: '2026-04-31T09:00:00.000Z',
          createdAt: '2026-02-29T09:00:00.000Z',
          couple: { id: 'solo-1' },
          createdBy: { id: 'user-1' },
          items: [],
        },
      ],
    };
    const { useTimetable } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetable('11111111-1111-4111-8111-111111111111'));

    expect(latest.timetable).toEqual(expect.objectContaining({ updatedAt: 0 }));

    act(() => renderer.unmount());
  });

  it('keeps oversized numeric legacy timetable detail timestamps from becoming formatter-unsafe metadata', async () => {
    queryState.data = {
      timetables: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Imported routine',
          share: 'solo',
          updatedAt: Number.MAX_VALUE,
          createdAt: Number.MAX_VALUE,
          couple: { id: 'solo-1' },
          createdBy: { id: 'user-1' },
          items: [],
        },
      ],
    };
    const { useTimetable } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetable('11111111-1111-4111-8111-111111111111'));

    expect(latest.timetable).toEqual(expect.objectContaining({ updatedAt: 0 }));

    act(() => renderer.unmount());
  });

  it('bounds malformed legacy timetable item schedule fields before exposing detail state', async () => {
    queryState.data = {
      timetables: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Imported routine',
          share: 'solo',
          updatedAt: 1,
          couple: { id: 'solo-1' },
          createdBy: { id: 'user-1' },
          items: [
            {
              id: 'legacy-bad-item',
              title: 'Legacy block',
              day: 99,
              startHour: Number.NaN,
              duration: Number.MAX_VALUE,
              couple: { id: 'solo-1' },
            },
          ],
        },
      ],
    };
    const { useTimetable } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetable('11111111-1111-4111-8111-111111111111'));

    expect(latest.items).toEqual([
      expect.objectContaining({
        id: 'legacy-bad-item',
        day: 0,
        start: 0,
        dur: 1,
      }),
    ]);
    expect(Number.isFinite(latest.items[0]?.day)).toBe(true);
    expect(Number.isFinite(latest.items[0]?.start)).toBe(true);
    expect(Number.isFinite(latest.items[0]?.dur)).toBe(true);

    act(() => renderer.unmount());
  });

  it('normalizes malformed legacy timetable item star metadata before exposing detail state', async () => {
    queryState.data = {
      timetables: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Imported routine',
          share: 'shared',
          updatedAt: 1,
          couple: { id: 'shared-1' },
          items: [
            {
              id: 'legacy-string-star',
              title: 'Imported block',
              day: 1,
              startHour: 9,
              duration: 45,
              star: 'false',
              couple: { id: 'shared-1' },
            },
            {
              id: 'legacy-true-star',
              title: 'Pinned block',
              day: 2,
              startHour: 10,
              duration: 30,
              star: true,
              couple: { id: 'shared-1' },
            },
          ],
        },
      ],
    };
    const { useTimetable } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetable('11111111-1111-4111-8111-111111111111'));

    expect(latest.items.map((item) => ({ id: item.id, star: item.star }))).toEqual([
      { id: 'legacy-string-star', star: false },
      { id: 'legacy-true-star', star: true },
    ]);

    act(() => renderer.unmount());
  });

  it('does not resolve partner-authored personal timetable detail rows', async () => {
    queryState.data = {
      timetables: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Partner private routine',
          share: 'solo',
          updatedAt: 1,
          couple: { id: 'solo-1' },
          createdBy: { id: 'partner-1' },
          items: [
            {
              id: 'partner-private-item',
              title: 'Partner block',
              day: 1,
              startHour: 9,
              duration: 45,
              couple: { id: 'solo-1' },
            },
          ],
        },
      ],
    };
    const { useTimetable } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetable('11111111-1111-4111-8111-111111111111'));

    expect(latest.timetable).toBeNull();
    expect(latest.items).toEqual([]);
    await expect(latest.add({
      title: 'Wrong block',
      day: 1,
      startHour: 9,
      duration: 45,
    })).rejects.toThrow('Timetable not found');
    await expect(latest.update('partner-private-item', { title: 'Wrong block' })).rejects.toThrow('Timetable item not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of silently succeeding when adding an item has no target space', async () => {
    sessionState.activeCouple = null as any;
    sessionState.personalSpaceId = null as any;
    sessionState.sharedSpaceId = null as any;
    queryState.data = { timetables: [] };
    const { useTimetable } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetable('11111111-1111-4111-8111-111111111111'));

    await expect(latest.add({
      title: 'Ghost block',
      day: 1,
      startHour: 9,
      duration: 45,
    })).rejects.toThrow('No active space');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of creating an item when the parent timetable is not resolved', async () => {
    sessionState.activeCouple = { couple: { id: 'solo-1' } };
    sessionState.personalSpaceId = 'solo-1';
    sessionState.sharedSpaceId = null as any;
    queryState.data = { timetables: [] };
    const { useTimetable } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetable('11111111-1111-4111-8111-111111111111'));

    await expect(latest.add({
      title: 'Orphan block',
      day: 1,
      startHour: 9,
      duration: 45,
    })).rejects.toThrow('Timetable not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of adding an item with malformed schedule fields', async () => {
    queryState.data = {
      timetables: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Shared routine',
          share: 'shared',
          updatedAt: 1,
          couple: { id: 'shared-1' },
          items: [],
        },
      ],
    };
    const { useTimetable } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetable('11111111-1111-4111-8111-111111111111'));

    await expect(latest.add({
      title: 'Bad block',
      day: 99,
      startHour: Number.NaN,
      duration: Number.MAX_VALUE,
    })).rejects.toThrow('Invalid timetable item schedule');

    expect(dbMock.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of adding an item with malformed star metadata', async () => {
    queryState.data = {
      timetables: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Shared routine',
          share: 'shared',
          updatedAt: 1,
          couple: { id: 'shared-1' },
          items: [],
        },
      ],
    };
    const { useTimetable } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetable('11111111-1111-4111-8111-111111111111'));

    await expect(latest.add({
      title: 'Bad block',
      day: 1,
      startHour: 9,
      duration: 45,
      star: 'false' as any,
    })).rejects.toThrow('Invalid timetable item star');

    expect(dbMock.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating an item with malformed schedule fields', async () => {
    queryState.data = {
      timetables: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Shared routine',
          share: 'shared',
          updatedAt: 1,
          couple: { id: 'shared-1' },
          items: [
            {
              id: 'item-1',
              title: 'Good block',
              day: 1,
              startHour: 9,
              duration: 45,
              couple: { id: 'shared-1' },
            },
          ],
        },
      ],
    };
    const { useTimetable } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetable('11111111-1111-4111-8111-111111111111'));

    await expect(latest.update('item-1', { duration: Number.MAX_VALUE })).rejects.toThrow('Invalid timetable item schedule');

    expect(dbMock.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating an item with malformed star metadata', async () => {
    queryState.data = {
      timetables: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Shared routine',
          share: 'shared',
          updatedAt: 1,
          couple: { id: 'shared-1' },
          items: [
            {
              id: 'item-1',
              title: 'Good block',
              day: 1,
              startHour: 9,
              duration: 45,
              couple: { id: 'shared-1' },
            },
          ],
        },
      ],
    };
    const { useTimetable } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetable('11111111-1111-4111-8111-111111111111'));

    await expect(latest.update('item-1', { star: 'false' as any })).rejects.toThrow('Invalid timetable item star');

    expect(dbMock.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating an item outside the scoped timetable result set', async () => {
    queryState.data = {
      timetables: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Shared routine',
          share: 'shared',
          updatedAt: 1,
          couple: { id: 'shared-1' },
          items: [],
        },
      ],
    };
    const { useTimetable } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetable('11111111-1111-4111-8111-111111111111'));

    await expect(latest.update('missing-item', { title: 'Wrong block' })).rejects.toThrow('Timetable item not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of deleting an item outside the scoped timetable result set', async () => {
    queryState.data = {
      timetables: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Shared routine',
          share: 'shared',
          updatedAt: 1,
          couple: { id: 'shared-1' },
          items: [],
        },
      ],
    };
    const { useTimetable } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetable('11111111-1111-4111-8111-111111111111'));

    await expect(latest.remove('missing-item')).rejects.toThrow('Timetable item not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('ignores malformed child items whose direct space does not match the parent timetable space', async () => {
    queryState.data = {
      timetables: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Personal routine',
          share: 'solo',
          updatedAt: 1,
          couple: { id: 'solo-1' },
          items: [
            {
              id: 'cross-space-item',
              title: 'Shared block on personal timetable',
              day: 1,
              startHour: 9,
              duration: 45,
              couple: { id: 'shared-1' },
            },
          ],
        },
      ],
    };
    const { useTimetable } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetable('11111111-1111-4111-8111-111111111111'));

    expect(latest.items).toEqual([]);
    await expect(latest.update('cross-space-item', { title: 'Wrong block' })).rejects.toThrow('Timetable item not found');
    await expect(latest.remove('cross-space-item')).rejects.toThrow('Timetable item not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('relinks timetable rows and their items when share changes', async () => {
    queryState.data = {
      timetables: [
        {
          id: 'timetable-1',
          title: 'Shared routine',
          share: 'shared',
          updatedAt: 1,
          createdBy: { id: 'user-1' },
          items: [{ id: 'item-1' }, { id: 'item-2' }],
        },
      ],
    };
    const { useTimetables } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetables());

    await act(async () => {
      await latest.update('timetable-1', { share: 'solo' });
      await flush();
    });

    expect(txCalls.links).toEqual([
      { table: 'timetables', id: 'timetable-1', payload: { couple: 'solo-1' } },
      { table: 'timetableItems', id: 'item-1', payload: { couple: 'solo-1' } },
      { table: 'timetableItems', id: 'item-2', payload: { couple: 'solo-1' } },
    ]);

    act(() => renderer.unmount());
  });

  it('fails closed instead of moving another member timetable into the personal space', async () => {
    queryState.data = {
      timetables: [
        {
          id: 'partner-timetable',
          title: 'Partner shared routine',
          share: 'shared',
          updatedAt: 1,
          couple: { id: 'shared-1' },
          createdBy: { id: 'partner-1' },
          items: [{ id: 'partner-item', couple: { id: 'shared-1' } }],
        },
      ],
    };
    const { useTimetables } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetables());

    await expect(latest.update('partner-timetable', { share: 'solo' }))
      .rejects.toThrow('Cannot move another member timetable into personal space');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('does not relink malformed child items whose direct space differs from the parent timetable space', async () => {
    queryState.data = {
      timetables: [
        {
          id: 'timetable-1',
          title: 'Shared routine',
          share: 'shared',
          updatedAt: 1,
          couple: { id: 'shared-1' },
          createdBy: { id: 'user-1' },
          items: [
            { id: 'valid-item', couple: { id: 'shared-1' } },
            { id: 'cross-space-item', couple: { id: 'solo-1' } },
          ],
        },
      ],
    };
    const { useTimetables } = await import('@/src/hooks/useTimetables');
    const { latest, renderer } = await renderHookValue(() => useTimetables());

    await act(async () => {
      await latest.update('timetable-1', { share: 'solo' });
      await flush();
    });

    expect(txCalls.links).toEqual([
      { table: 'timetables', id: 'timetable-1', payload: { couple: 'solo-1' } },
      { table: 'timetableItems', id: 'valid-item', payload: { couple: 'solo-1' } },
    ]);

    act(() => renderer.unmount());
  });
});
