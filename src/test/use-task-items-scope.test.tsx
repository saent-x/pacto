import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryState = vi.hoisted(() => ({
  data: {
    taskLists: [
      {
        id: 'list-1',
        couple: { id: 'solo-1' },
      },
    ],
    tasks: [],
  } as any,
}));

const sessionState = vi.hoisted(() => ({
  activeCouple: { couple: { id: 'shared-1' } } as { couple: { id: string } } | null,
  members: [{ id: 'partner-1', displayName: 'Partner' }] as Array<{ id: string; displayName: string }>,
  personalSpaceId: 'solo-1' as string | null,
  sharedSpaceId: 'shared-1' as string | null,
  user: { id: 'user-1', displayName: 'Tor' } as { id: string; displayName: string } | null,
}));

const txCalls = vi.hoisted(() => ({
  updates: [] as Array<{ table: string; id: string; payload: any }>,
  links: [] as Array<{ table: string; id: string; payload: any }>,
}));

const LIST_ID = '11111111-1111-4111-8111-111111111111';

const dbMock = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: queryState.data, isLoading: false, error: null })),
  transact: vi.fn(async (op: any) => op),
  tx: new Proxy({}, {
    get: (_target, table: string) =>
      new Proxy({}, {
        get: (_rows, rowId: string) => ({
          update: vi.fn((payload: any) => {
            txCalls.updates.push({ table, id: rowId, payload });
            return {
              link: vi.fn((payload: any) => {
                txCalls.links.push({ table, id: rowId, payload });
                return { table, id: rowId, payload };
              }),
            };
          }),
          link: vi.fn((payload: any) => {
            txCalls.links.push({ table, id: rowId, payload });
            return { table, id: rowId, payload };
          }),
          delete: vi.fn(),
        }),
      }),
  }),
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
  id: vi.fn(() => 'task-1'),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: vi.fn(() => sessionState),
}));

vi.mock('@/src/lib/push', () => ({
  notifySpaceMutation: vi.fn(async () => undefined),
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

describe('useTaskItems space scope', () => {
  beforeEach(() => {
    queryState.data = {
      taskLists: [{ id: LIST_ID, couple: { id: 'solo-1' } }],
      tasks: [],
    };
    sessionState.activeCouple = { couple: { id: 'shared-1' } };
    sessionState.members = [{ id: 'partner-1', displayName: 'Partner' }];
    sessionState.personalSpaceId = 'solo-1';
    sessionState.sharedSpaceId = 'shared-1';
    sessionState.user = { id: 'user-1', displayName: 'Tor' };
    txCalls.updates = [];
    txCalls.links = [];
    dbMock.useQuery.mockClear();
    dbMock.transact.mockClear();
  });

  it('queries task detail rows across personal and shared spaces', async () => {
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { renderer } = await renderHookValue(() => useTaskItems(LIST_ID));
    const query = dbMock.useQuery.mock.calls.at(-1)?.[0] as any;

    expect(query.taskLists.$.where).toEqual({
      id: LIST_ID,
      or: [{ 'couple.id': 'solo-1' }, { 'couple.id': 'shared-1' }],
    });
    expect(query.tasks.$.where).toEqual({
      'list.id': LIST_ID,
      or: [{ 'couple.id': 'solo-1' }, { 'couple.id': 'shared-1' }],
    });

    act(() => renderer.unmount());
  });

  it('does not pass malformed route list ids into Instant queries', async () => {
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { renderer } = await renderHookValue(() => useTaskItems('not-a-uuid'));

    expect(dbMock.useQuery).toHaveBeenCalledWith(null);

    act(() => renderer.unmount());
  });

  it('fails closed instead of pretending to create a task for a malformed route list id', async () => {
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems('not-a-uuid'));

    await expect(latest.create({ title: 'Invisible task' })).rejects.toThrow('Task list not found');

    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('fails closed instead of silently succeeding when create has no target space', async () => {
    sessionState.activeCouple = null;
    sessionState.personalSpaceId = null;
    sessionState.sharedSpaceId = null;
    queryState.data = { taskLists: [], tasks: [] };
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    await expect(latest.create({ title: 'Ghost task' })).rejects.toThrow('No active space');

    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('fails closed instead of creating a task when the parent list is not resolved', async () => {
    sessionState.activeCouple = { couple: { id: 'solo-1' } };
    sessionState.personalSpaceId = 'solo-1';
    sessionState.sharedSpaceId = null;
    queryState.data = { taskLists: [], tasks: [] };
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    await expect(latest.create({ title: 'Orphan task' })).rejects.toThrow('Task list not found');

    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('fails closed instead of exposing task rows when the parent list is not resolved', async () => {
    queryState.data = {
      taskLists: [],
      tasks: [
        rawTask({
          id: 'orphaned-route-task',
          couple: { id: 'solo-1' },
          list: { id: LIST_ID },
        }),
      ],
    };
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    expect(latest.tasks).toEqual([]);
    await expect(latest.update('orphaned-route-task', { title: 'Wrong list' })).rejects.toThrow('Task not found');
    await expect(latest.toggleComplete({ id: 'orphaned-route-task', is_completed: false })).rejects.toThrow('Task not found');
    await expect(latest.remove('orphaned-route-task')).rejects.toThrow('Task not found');

    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('creates new tasks in the owning list space, not blindly in the active shared space', async () => {
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    await act(async () => {
      await latest.create({ title: 'Solo errand' });
      await flush();
    });

    expect(txCalls.links[0]).toEqual({
      table: 'tasks',
      id: 'task-1',
      payload: { couple: 'solo-1', createdBy: 'user-1', list: LIST_ID },
    });

    act(() => renderer.unmount());
  });

  it('does not link another member when creating a task in a personal list', async () => {
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    await act(async () => {
      await latest.create({ title: 'Solo errand', assigned_to: 'partner-1' });
      await flush();
    });

    expect(txCalls.links).toContainEqual({
      table: 'tasks',
      id: 'task-1',
      payload: { couple: 'solo-1', createdBy: 'user-1', list: LIST_ID },
    });
    expect(txCalls.links).not.toContainEqual({
      table: 'tasks',
      id: 'task-1',
      payload: { assignedTo: 'partner-1' },
    });

    act(() => renderer.unmount());
  });

  it('does not link another member when editing a task in a personal list', async () => {
    queryState.data = {
      taskLists: [{ id: LIST_ID, couple: { id: 'solo-1' } }],
      tasks: [
        rawTask({
          id: 'task-1',
          couple: { id: 'solo-1' },
          list: { id: LIST_ID },
          assignedTo: null,
        }),
      ],
    };
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    await act(async () => {
      await latest.update('task-1', { assigned_to: 'partner-1' });
      await flush();
    });

    expect(txCalls.links).not.toContainEqual({
      table: 'tasks',
      id: 'task-1',
      payload: { assignedTo: 'partner-1' },
    });

    act(() => renderer.unmount());
  });

  it('fails closed instead of assigning a shared task to a non-member', async () => {
    queryState.data = {
      taskLists: [{ id: LIST_ID, couple: { id: 'shared-1' } }],
      tasks: [],
    };
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    await expect(
      latest.create({ title: 'Shared bad assignee', assigned_to: 'stranger-1' }),
    ).rejects.toThrow('Invalid task assignee');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('fails closed instead of creating malformed task due dates', async () => {
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    await expect(
      latest.create({ title: 'Bad due date', due_date: '2030-02-31' }),
    ).rejects.toThrow('Invalid task due date');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('fails closed instead of creating tasks with malformed priority metadata', async () => {
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    await expect(
      latest.create({ title: 'Bad priority task', priority: 9 }),
    ).rejects.toThrow('Invalid priority');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('fails closed instead of updating malformed task due dates', async () => {
    queryState.data = {
      taskLists: [{ id: LIST_ID, couple: { id: 'solo-1' } }],
      tasks: [
        rawTask({
          id: 'task-1',
          couple: { id: 'solo-1' },
          list: { id: LIST_ID },
          dueDate: '2030-04-15',
        }),
      ],
    };
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    await expect(
      latest.update('task-1', { due_date: 'not-a-date' }),
    ).rejects.toThrow('Invalid task due date');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('fails closed instead of updating a shared task assignment to a non-member', async () => {
    queryState.data = {
      taskLists: [{ id: LIST_ID, couple: { id: 'shared-1' } }],
      tasks: [
        rawTask({
          id: 'task-1',
          couple: { id: 'shared-1' },
          list: { id: LIST_ID },
          assignedTo: null,
        }),
      ],
    };
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    await expect(
      latest.update('task-1', { assigned_to: 'stranger-1' }),
    ).rejects.toThrow('Invalid task assignee');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('fails closed instead of updating tasks with malformed priority metadata', async () => {
    queryState.data = {
      taskLists: [{ id: LIST_ID, couple: { id: 'solo-1' } }],
      tasks: [
        rawTask({
          id: 'task-1',
          couple: { id: 'solo-1' },
          list: { id: LIST_ID },
          priority: 2,
        }),
      ],
    };
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    await expect(
      latest.update('task-1', { priority: -1 }),
    ).rejects.toThrow('Invalid priority');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('fails closed instead of top-level updating malformed task due dates', async () => {
    queryState.data = {
      taskLists: [],
      tasks: [
        rawTask({
          id: 'task-1',
          couple: { id: 'solo-1' },
          list: { id: LIST_ID, couple: { id: 'solo-1' } },
          dueDate: '2030-04-15',
        }),
      ],
    };
    const { useTasks } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTasks());

    await expect(
      latest.updateTask('task-1', { due_date: 'not-a-date' }),
    ).rejects.toThrow('Invalid task due date');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('fails closed instead of top-level assigning a shared task to a non-member', async () => {
    queryState.data = {
      taskLists: [],
      tasks: [
        rawTask({
          id: 'task-1',
          couple: { id: 'shared-1' },
          list: { id: LIST_ID, couple: { id: 'shared-1' } },
          assignedTo: null,
        }),
      ],
    };
    const { useTasks } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTasks());

    await expect(
      latest.updateTask('task-1', { assigned_to: 'stranger-1' }),
    ).rejects.toThrow('Invalid task assignee');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('ignores malformed child tasks whose direct space does not match the parent list space', async () => {
    queryState.data = {
      taskLists: [{ id: LIST_ID, couple: { id: 'solo-1' } }],
      tasks: [
        rawTask({
          id: 'cross-space-task',
          couple: { id: 'shared-1' },
          list: { id: LIST_ID },
        }),
      ],
    };
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    expect(latest.tasks).toEqual([]);
    await expect(latest.update('cross-space-task', { title: 'Wrong space' })).rejects.toThrow('Task not found');

    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('excludes partner-authored task rows from a personal list', async () => {
    queryState.data = {
      taskLists: [{ id: LIST_ID, couple: { id: 'solo-1' } }],
      tasks: [
        rawTask({
          id: 'personal-partner-task',
          couple: { id: 'solo-1' },
          list: { id: LIST_ID },
          createdBy: { id: 'partner-1' },
        }),
        rawTask({
          id: 'personal-self-task',
          couple: { id: 'solo-1' },
          list: { id: LIST_ID },
          createdBy: { id: 'user-1' },
        }),
      ],
    };
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    expect(latest.tasks.map((task) => task.id)).toEqual(['personal-self-task']);
    await expect(latest.update('personal-partner-task', { title: 'Wrong task' })).rejects.toThrow('Task not found');

    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('keeps malformed legacy task timestamps from crashing task detail normalization', async () => {
    queryState.data = {
      taskLists: [{ id: LIST_ID, couple: { id: 'solo-1' } }],
      tasks: [
        rawTask({
          id: 'legacy-malformed-task',
          couple: { id: 'solo-1' },
          list: { id: LIST_ID },
          isCompleted: true,
          completedAt: 'bad-completed-at',
          createdAt: 'bad-created-at',
          updatedAt: 'bad-updated-at',
        }),
      ],
    };
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    expect(latest.tasks).toEqual([
      expect.objectContaining({
        id: 'legacy-malformed-task',
        completed_at: null,
        created_at: '',
        updated_at: '',
      }),
    ]);

    act(() => renderer.unmount());
  });

  it('keeps impossible ISO-like legacy task timestamps from becoming real dates', async () => {
    queryState.data = {
      taskLists: [{ id: LIST_ID, couple: { id: 'solo-1' } }],
      tasks: [
        rawTask({
          id: 'legacy-impossible-task',
          couple: { id: 'solo-1' },
          list: { id: LIST_ID },
          isCompleted: true,
          completedAt: '2026-04-31T09:00:00.000Z',
          createdAt: '2026-02-29T09:00:00.000Z',
          updatedAt: '2026-06-31T09:00:00.000Z',
        }),
      ],
    };
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    expect(latest.tasks).toEqual([
      expect.objectContaining({
        id: 'legacy-impossible-task',
        completed_at: null,
        created_at: '',
        updated_at: '',
      }),
    ]);

    act(() => renderer.unmount());
  });

  it('keeps oversized numeric legacy task timestamps from crashing task detail normalization', async () => {
    queryState.data = {
      taskLists: [{ id: LIST_ID, couple: { id: 'solo-1' } }],
      tasks: [
        rawTask({
          id: 'legacy-oversized-task',
          couple: { id: 'solo-1' },
          list: { id: LIST_ID },
          isCompleted: true,
          completedAt: Number.MAX_VALUE,
          createdAt: Number.MAX_VALUE,
          updatedAt: Number.MAX_VALUE,
        }),
      ],
    };
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    expect(latest.tasks).toEqual([
      expect.objectContaining({
        id: 'legacy-oversized-task',
        completed_at: null,
        created_at: '',
        updated_at: '',
      }),
    ]);

    act(() => renderer.unmount());
  });

  it('normalizes malformed legacy task priorities before exposing scoped rows', async () => {
    queryState.data = {
      taskLists: [{ id: LIST_ID, couple: { id: 'solo-1' } }],
      tasks: [
        rawTask({
          id: 'legacy-malformed-priority-task',
          couple: { id: 'solo-1' },
          list: { id: LIST_ID },
          priority: Number.MAX_VALUE,
        }),
      ],
    };
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    expect(latest.tasks).toEqual([
      expect.objectContaining({
        id: 'legacy-malformed-priority-task',
        priority: 0,
      }),
    ]);

    act(() => renderer.unmount());
  });

  it('fails closed instead of updating a task that is not in the resolved list', async () => {
    queryState.data = {
      taskLists: [{ id: LIST_ID, couple: { id: 'solo-1' } }],
      tasks: [],
    };
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    await expect(latest.update('missing-task', { title: 'Wrong task' })).rejects.toThrow('Task not found');

    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('fails closed instead of toggling a task that is not in the resolved list', async () => {
    queryState.data = {
      taskLists: [{ id: LIST_ID, couple: { id: 'solo-1' } }],
      tasks: [],
    };
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    await expect(latest.toggleComplete({ id: 'missing-task', is_completed: false })).rejects.toThrow('Task not found');

    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('fails closed instead of deleting a task that is not in the resolved list', async () => {
    queryState.data = {
      taskLists: [{ id: LIST_ID, couple: { id: 'solo-1' } }],
      tasks: [],
    };
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    await expect(latest.remove('missing-task')).rejects.toThrow('Task not found');

    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('fails closed instead of reordering task ids outside the resolved list', async () => {
    queryState.data = {
      taskLists: [{ id: LIST_ID, couple: { id: 'solo-1' } }],
      tasks: [
        rawTask({
          id: 'task-1',
          couple: { id: 'solo-1' },
          list: { id: LIST_ID },
        }),
      ],
    };
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    await expect(latest.reorder(['task-1', 'missing-task'])).rejects.toThrow('Task not found');

    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('does not create orphan tasks from the top-level task hook without a list', async () => {
    const { useTasks } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTasks());

    await act(async () => {
      await latest.createTask({ title: 'Invisible orphan task' });
      await flush();
    });

    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('filters top-level tasks whose direct space differs from their parent list space', async () => {
    queryState.data = {
      taskLists: [],
      tasks: [
        rawTask({
          id: 'valid-task',
          couple: { id: 'solo-1' },
          list: { id: LIST_ID, couple: { id: 'solo-1' } },
        }),
        rawTask({
          id: 'cross-space-task',
          couple: { id: 'shared-1' },
          list: { id: LIST_ID, couple: { id: 'solo-1' } },
        }),
      ],
    };
    const { useTasks } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTasks());

    expect(dbMock.useQuery.mock.calls.at(-1)?.[0]?.tasks?.list).toEqual({ couple: {} });
    expect(latest.allTasks.map((task) => task.id)).toEqual(['valid-task']);
    await expect(latest.updateTask('cross-space-task', { title: 'Wrong space' })).rejects.toThrow('Task not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('filters top-level tasks whose parent list space is unresolved', async () => {
    queryState.data = {
      taskLists: [],
      tasks: [
        rawTask({
          id: 'orphaned-parent-task',
          couple: { id: 'solo-1' },
          list: { id: LIST_ID },
        }),
      ],
    };
    const { useTasks } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTasks());

    expect(latest.allTasks).toEqual([]);
    await expect(latest.updateTask('orphaned-parent-task', { title: 'Wrong list' })).rejects.toThrow('Task not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed before top-level task updates outside the scoped feed', async () => {
    queryState.data = { taskLists: [], tasks: [] };
    const { useTasks } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTasks());

    await expect(latest.updateTask('missing-task', { title: 'Nope' })).rejects.toThrow('Task not found');

    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('fails closed before top-level task completion writes outside the scoped feed', async () => {
    queryState.data = { taskLists: [], tasks: [] };
    const { useTasks } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTasks());

    await expect(latest.toggleTask({ id: 'missing-task', is_completed: false })).rejects.toThrow('Task not found');

    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('fails closed before top-level task deletes outside the scoped feed', async () => {
    queryState.data = { taskLists: [], tasks: [] };
    const { useTasks } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTasks());

    await expect(latest.deleteTask('missing-task')).rejects.toThrow('Task not found');

    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('excludes partner-authored task rows from the top-level personal task feed', async () => {
    queryState.data = {
      taskLists: [],
      tasks: [
        rawTask({
          id: 'personal-partner-task',
          couple: { id: 'solo-1' },
          list: { id: LIST_ID, couple: { id: 'solo-1' } },
          createdBy: { id: 'partner-1' },
        }),
        rawTask({
          id: 'personal-self-task',
          couple: { id: 'solo-1' },
          list: { id: LIST_ID, couple: { id: 'solo-1' } },
          createdBy: { id: 'user-1' },
        }),
        rawTask({
          id: 'shared-partner-task',
          couple: { id: 'shared-1' },
          list: { id: LIST_ID, couple: { id: 'shared-1' } },
          createdBy: { id: 'partner-1' },
        }),
      ],
    };
    const { useTasks } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTasks());

    expect(latest.allTasks.map((task) => task.id)).toEqual([
      'personal-self-task',
      'shared-partner-task',
    ]);
    await expect(latest.updateTask('personal-partner-task', { title: 'Wrong task' })).rejects.toThrow('Task not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('uses the parent list space for legacy top-level personal task assignment guards', async () => {
    queryState.data = {
      taskLists: [],
      tasks: [
        rawTask({
          id: 'legacy-personal-task',
          couple: undefined,
          list: { id: LIST_ID, couple: { id: 'solo-1' } },
          createdBy: { id: 'user-1' },
        }),
      ],
    };
    const { useTasks } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTasks());

    expect(latest.allTasks).toEqual([
      expect.objectContaining({ id: 'legacy-personal-task', couple_id: 'solo-1' }),
    ]);

    await act(async () => {
      await latest.updateTask('legacy-personal-task', { assigned_to: 'partner-1' });
      await flush();
    });

    expect(txCalls.links).not.toContainEqual({
      table: 'tasks',
      id: 'legacy-personal-task',
      payload: { assignedTo: 'partner-1' },
    });

    act(() => renderer.unmount());
  });

  it('submits one top-level completion transaction for one toggle tap', async () => {
    queryState.data = {
      taskLists: [],
      tasks: [
        rawTask({
          id: 'task-1',
          couple: { id: 'solo-1' },
          list: { id: LIST_ID, couple: { id: 'solo-1' } },
          isCompleted: false,
        }),
      ],
    };
    const { useTasks } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTasks());

    await act(async () => {
      await latest.toggleTask(latest.allTasks[0]);
    });

    expect(dbMock.transact).toHaveBeenCalledTimes(1);

    act(() => renderer.unmount());
  });

  it('ignores duplicate top-level completion toggles while the first toggle is pending', async () => {
    queryState.data = {
      taskLists: [],
      tasks: [
        rawTask({
          id: 'task-1',
          couple: { id: 'solo-1' },
          list: { id: LIST_ID, couple: { id: 'solo-1' } },
          isCompleted: false,
        }),
      ],
    };
    const pendingTransactions: Array<() => void> = [];
    dbMock.transact.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          pendingTransactions.push(resolve);
        }),
    );
    const { useTasks } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTasks());

    await act(async () => {
      latest.toggleTask(latest.allTasks[0]);
      latest.toggleTask(latest.allTasks[0]);
      await flush();
    });

    expect(dbMock.transact).toHaveBeenCalledTimes(1);

    pendingTransactions.forEach((resolve) => resolve());
    await act(async () => {
      await flush();
    });

    act(() => renderer.unmount());
  });

  it('ignores duplicate completion toggles while the first toggle is pending', async () => {
    queryState.data = {
      taskLists: [{ id: LIST_ID, couple: { id: 'solo-1' } }],
      tasks: [
        rawTask({
          id: 'task-1',
          couple: { id: 'solo-1' },
          list: { id: LIST_ID },
          isCompleted: false,
        }),
      ],
    };
    const pendingTransactions: Array<() => void> = [];
    dbMock.transact.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          pendingTransactions.push(resolve);
        }),
    );
    const { useTaskItems } = await import('@/src/hooks/useTasks');
    const { latest, renderer } = await renderHookValue(() => useTaskItems(LIST_ID));

    await act(async () => {
      latest.toggleComplete(latest.tasks[0]);
      latest.toggleComplete(latest.tasks[0]);
      await flush();
    });

    expect(dbMock.transact).toHaveBeenCalledTimes(1);

    pendingTransactions.forEach((resolve) => resolve());
    await act(async () => {
      await flush();
    });

    act(() => renderer.unmount());
  });
});

function rawTask(overrides: Record<string, any> = {}) {
  return {
    id: 'task-1',
    couple: { id: 'shared-1' },
    list: { id: LIST_ID },
    createdBy: { id: 'user-1' },
    assignedTo: null,
    completedBy: null,
    title: 'Pack bags',
    notes: null,
    category: null,
    isCompleted: false,
    completedAt: null,
    dueDate: null,
    priority: 2,
    sortOrder: 0,
    createdAt: Date.parse('2026-05-24T09:00:00Z'),
    updatedAt: Date.parse('2026-05-24T09:00:00Z'),
    ...overrides,
  };
}
