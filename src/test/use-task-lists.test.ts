import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const txCalls = vi.hoisted(() => ({
  updates: [] as Array<{ table: string; id: string; payload: any }>,
  links: [] as Array<{ table: string; id: string; payload: any }>,
  unlinks: [] as Array<{ table: string; id: string; payload: any }>,
}));

const queryState = vi.hoisted(() => ({
  data: { taskLists: [] as any[] },
}));

const rowBuilder = (table: string, rowId: string) => ({
  update: vi.fn((payload: any) => {
    txCalls.updates.push({ table, id: rowId, payload });
    return {
      table,
      id: rowId,
      payload,
      link(linkPayload: any) {
        txCalls.links.push({ table, id: rowId, payload: linkPayload });
        return { table, id: rowId, payload, linkPayload };
      },
    };
  }),
  link: vi.fn((payload: any) => {
    txCalls.links.push({ table, id: rowId, payload });
    return { table, id: rowId, payload };
  }),
  unlink: vi.fn((payload: any) => {
    txCalls.unlinks.push({ table, id: rowId, payload });
    return { table, id: rowId, payload };
  }),
  delete: vi.fn(),
});

vi.mock('@/src/lib/instant', () => ({
  db: {
    useQuery: vi.fn(() => ({ data: queryState.data, isLoading: false })),
    transact: vi.fn(async (op: any) => op),
    tx: new Proxy({}, {
      get: (_target, table: string) =>
        new Proxy({}, {
          get: (_rows, rowId: string) => rowBuilder(table, rowId),
        }),
    }),
  },
  id: vi.fn(() => 'mock-id'),
}));

const sessionState = vi.hoisted(() => ({
  activeCouple: { couple: { id: 'couple-1' } },
  personalSpaceId: 'solo-1',
  sharedSpaceId: 'couple-1',
  user: { id: 'user-1', displayName: 'Tor' },
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: vi.fn(() => sessionState),
}));

import { toListRows, useTaskLists, type RawTaskListNode } from '@/src/hooks/useTaskLists';
import { db } from '@/src/lib/instant';

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

const raw: RawTaskListNode[] = [
  {
    id: 'l1',
    name: 'Venice Trip',
    couple: { id: 'couple-1' },
    colorKey: 'peach',
    category: 'Travel',
    createdAt: 1,
    tasks: [
      { id: 't1', isCompleted: true },
      { id: 't2', isCompleted: false },
      { id: 't3', isCompleted: true },
    ],
  },
  {
    id: 'l2',
    name: 'Apartment',
    couple: { id: 'solo-1' },
    colorKey: null,
    category: null,
    createdAt: 2,
    tasks: [],
  },
];

describe('toListRows', () => {
  it('aggregates done/total counts from nested tasks', () => {
    const rows = toListRows(raw);
    expect(rows[0]).toMatchObject({ id: 'l1', name: 'Venice Trip', done: 2, total: 3, colorKey: 'peach', category: 'Travel' });
  });
  it('falls back to default colorKey when null', () => {
    const rows = toListRows(raw);
    expect(rows[1]).toMatchObject({ id: 'l2', name: 'Apartment', done: 0, total: 0, colorKey: 'peach', category: null });
  });
  it('falls back to default colorKey when persisted color metadata is malformed', () => {
    const rows = toListRows([
      {
        id: 'l1',
        name: 'Imported list',
        couple: { id: 'couple-1' },
        colorKey: 'bogus',
        category: null,
        createdAt: 1,
        tasks: [],
      },
    ]);
    expect(rows[0]).toMatchObject({ id: 'l1', colorKey: 'peach' });
  });
  it('preserves createdAt order as given', () => {
    const rows = toListRows(raw);
    expect(rows.map((r) => r.id)).toEqual(['l1', 'l2']);
  });
  it('classifies list scope from the owning space relation', () => {
    const rows = toListRows(raw, { personalSpaceId: 'solo-1' });
    expect(rows).toEqual([
      expect.objectContaining({ id: 'l1', scope: 'shared' }),
      expect.objectContaining({ id: 'l2', scope: 'personal' }),
    ]);
  });

  it('excludes child tasks whose direct space differs from the owning list space', () => {
    const rows = toListRows([
      {
        id: 'l1',
        name: 'Private list',
        couple: { id: 'solo-1' },
        colorKey: 'peach',
        category: null,
        createdAt: 1,
        tasks: [
          { id: 'private-task', isCompleted: true, couple: { id: 'solo-1' } },
          { id: 'cross-space-task', isCompleted: true, couple: { id: 'shared-1' } },
        ],
      },
    ] as any);

    expect(rows[0]).toMatchObject({ done: 1, total: 1 });
  });

  it('excludes partner-authored child tasks from current user personal list counts', () => {
    const rows = toListRows([
      {
        id: 'l1',
        name: 'Private list',
        couple: { id: 'solo-1' },
        colorKey: 'peach',
        category: null,
        createdAt: 1,
        tasks: [
          {
            id: 'own-private-task',
            isCompleted: true,
            couple: { id: 'solo-1' },
            createdBy: { id: 'user-1' },
          },
          {
            id: 'partner-private-task',
            isCompleted: false,
            couple: { id: 'solo-1' },
            createdBy: { id: 'partner-1' },
          },
        ],
      },
    ] as any, { personalSpaceId: 'solo-1', userId: 'user-1' });

    expect(rows[0]).toMatchObject({ done: 1, total: 1 });
  });
});

describe('useTaskLists', () => {
  beforeEach(() => {
    txCalls.updates = [];
    txCalls.links = [];
    txCalls.unlinks = [];
    queryState.data = { taskLists: [] };
    sessionState.activeCouple = { couple: { id: 'couple-1' } };
    sessionState.personalSpaceId = 'solo-1';
    sessionState.sharedSpaceId = 'couple-1';
    sessionState.user = { id: 'user-1', displayName: 'Tor' };
    (db.transact as any).mockClear();
  });

  it('queries child task space relations so summary counts can enforce the list space', async () => {
    const { renderer } = await renderHookValue(() => useTaskLists());

    expect((db.useQuery as any).mock.calls.at(-1)?.[0]).toEqual({
      taskLists: {
        $: {
          where: {
            or: [{ 'couple.id': 'solo-1' }, { 'couple.id': 'couple-1' }],
          },
          order: { createdAt: 'asc' },
        },
        couple: {},
        createdBy: {},
        tasks: { couple: {}, createdBy: {}, assignedTo: {}, completedBy: {} },
      },
    });

    act(() => renderer.unmount());
  });

  it('excludes partner-authored lists from the current user personal space', async () => {
    queryState.data = {
      taskLists: [
        {
          id: 'personal-partner-list',
          name: 'Partner private list',
          couple: { id: 'solo-1' },
          createdBy: { id: 'partner-1' },
          colorKey: 'peach',
          category: null,
          createdAt: 1,
          tasks: [],
        },
        {
          id: 'personal-self-list',
          name: 'My private list',
          couple: { id: 'solo-1' },
          createdBy: { id: 'user-1' },
          colorKey: 'mint',
          category: null,
          createdAt: 2,
          tasks: [],
        },
        {
          id: 'shared-partner-list',
          name: 'Shared list',
          couple: { id: 'couple-1' },
          createdBy: { id: 'partner-1' },
          colorKey: 'sky',
          category: null,
          createdAt: 3,
          tasks: [],
        },
      ],
    };

    const { latest, renderer } = await renderHookValue(() => useTaskLists());

    expect(latest.lists.map((list) => list.id)).toEqual([
      'personal-self-list',
      'shared-partner-list',
    ]);
    expect(latest.lists[0]).toMatchObject({ id: 'personal-self-list', scope: 'personal' });

    act(() => renderer.unmount());
  });

  it('writes personal lists to the permanent solo space', async () => {
    const { latest, renderer } = await renderHookValue(() => useTaskLists());

    await act(async () => {
      await latest.create({ name: 'Solo errands', scope: 'personal' } as any);
      await flush();
    });

    expect(txCalls.links[0]).toEqual({
      table: 'taskLists',
      id: 'mock-id',
      payload: { couple: 'solo-1', createdBy: 'user-1' },
    });
    act(() => renderer.unmount());
  });

  it('writes shared lists to the shared space by default', async () => {
    const { latest, renderer } = await renderHookValue(() => useTaskLists());

    await act(async () => {
      await latest.create({ name: 'House list' });
      await flush();
    });

    expect(txCalls.links[0]).toEqual({
      table: 'taskLists',
      id: 'mock-id',
      payload: { couple: 'couple-1', createdBy: 'user-1' },
    });
    act(() => renderer.unmount());
  });

  it('fails closed instead of creating a task list with a malformed scope', async () => {
    const { latest, renderer } = await renderHookValue(() => useTaskLists());

    await expect(latest.create({ name: 'Bad list', scope: 'bogus' as any })).rejects.toThrow('Invalid task list scope');

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of creating a task list with a malformed color key', async () => {
    const { latest, renderer } = await renderHookValue(() => useTaskLists());

    await expect(latest.create({ name: 'Bad list', colorKey: 'bogus' as any })).rejects.toThrow('Invalid task list color');

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of silently succeeding when create has no target space', async () => {
    sessionState.activeCouple = null as any;
    sessionState.personalSpaceId = null as any;
    sessionState.sharedSpaceId = null as any;
    const { latest, renderer } = await renderHookValue(() => useTaskLists());

    await expect(latest.create({ name: 'Ghost list' })).rejects.toThrow('No active space');

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating a task list outside the scoped result set', async () => {
    queryState.data = { taskLists: [] };
    const { latest, renderer } = await renderHookValue(() => useTaskLists());

    await expect(latest.update('missing-list', { name: 'Wrong list' })).rejects.toThrow('Task list not found');

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating a task list with a malformed color key', async () => {
    queryState.data = {
      taskLists: [
        {
          id: 'list-1',
          name: 'House list',
          couple: { id: 'couple-1' },
          createdBy: { id: 'user-1' },
          colorKey: 'peach',
          category: null,
          createdAt: 1,
          tasks: [],
        },
      ],
    };
    const { latest, renderer } = await renderHookValue(() => useTaskLists());

    await expect(latest.update('list-1', { colorKey: 'bogus' as any })).rejects.toThrow('Invalid task list color');

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('relinks a list and its child tasks when the list scope changes to personal', async () => {
    queryState.data = {
      taskLists: [
        {
          id: 'list-1',
          name: 'House list',
          couple: { id: 'couple-1' },
          createdBy: { id: 'user-1' },
          colorKey: 'peach',
          category: null,
          createdAt: 1,
          tasks: [
            {
              id: 'task-1',
              isCompleted: true,
              couple: { id: 'couple-1' },
              createdBy: { id: 'user-1' },
              assignedTo: { id: 'partner-1' },
              completedBy: { id: 'partner-1' },
            },
            {
              id: 'cross-space-task',
              isCompleted: false,
              couple: { id: 'other-space' },
              createdBy: { id: 'user-1' },
            },
          ],
        },
      ],
    };
    const { latest, renderer } = await renderHookValue(() => useTaskLists());

    await act(async () => {
      await latest.update('list-1', { scope: 'personal' });
      await flush();
    });

    expect(txCalls.links).toContainEqual({
      table: 'taskLists',
      id: 'list-1',
      payload: { couple: 'solo-1' },
    });
    expect(txCalls.links).toContainEqual({
      table: 'tasks',
      id: 'task-1',
      payload: { couple: 'solo-1' },
    });
    expect(txCalls.links).not.toContainEqual({
      table: 'tasks',
      id: 'cross-space-task',
      payload: { couple: 'solo-1' },
    });
    expect(txCalls.unlinks).toEqual([
      { table: 'tasks', id: 'task-1', payload: { assignedTo: 'partner-1' } },
      { table: 'tasks', id: 'task-1', payload: { completedBy: 'partner-1' } },
    ]);
    expect(db.transact).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating a task list with a malformed scope', async () => {
    queryState.data = {
      taskLists: [
        {
          id: 'list-1',
          name: 'House list',
          couple: { id: 'couple-1' },
          createdBy: { id: 'user-1' },
          colorKey: 'peach',
          category: null,
          createdAt: 1,
          tasks: [],
        },
      ],
    };
    const { latest, renderer } = await renderHookValue(() => useTaskLists());

    await expect(latest.update('list-1', { scope: 'bogus' as any })).rejects.toThrow('Invalid task list scope');

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of moving another member task list into the personal space', async () => {
    queryState.data = {
      taskLists: [
        {
          id: 'partner-list',
          name: 'Partner list',
          couple: { id: 'couple-1' },
          createdBy: { id: 'partner-1' },
          colorKey: 'peach',
          category: null,
          createdAt: 1,
          tasks: [],
        },
      ],
    };
    const { latest, renderer } = await renderHookValue(() => useTaskLists());

    await expect(latest.update('partner-list', { scope: 'personal' })).rejects.toThrow(
      'Cannot move another member task list to personal',
    );

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of moving another member child task into the personal space', async () => {
    queryState.data = {
      taskLists: [
        {
          id: 'list-1',
          name: 'House list',
          couple: { id: 'couple-1' },
          createdBy: { id: 'user-1' },
          colorKey: 'peach',
          category: null,
          createdAt: 1,
          tasks: [
            {
              id: 'partner-task',
              isCompleted: false,
              couple: { id: 'couple-1' },
              createdBy: { id: 'partner-1' },
            },
          ],
        },
      ],
    };
    const { latest, renderer } = await renderHookValue(() => useTaskLists());

    await expect(latest.update('list-1', { scope: 'personal' })).rejects.toThrow(
      'Cannot move another member task to personal',
    );

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of deleting a task list outside the scoped result set', async () => {
    queryState.data = { taskLists: [] };
    const { latest, renderer } = await renderHookValue(() => useTaskLists());

    await expect(latest.remove('missing-list')).rejects.toThrow('Task list not found');

    expect(db.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });
});
