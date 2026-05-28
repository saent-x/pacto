import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryState = vi.hoisted(() => ({
  data: null as any,
}));

const txCalls = vi.hoisted(() => ({
  updates: [] as Array<{ table: string; id: string; payload: any }>,
  links: [] as Array<{ table: string; id: string; payload: any }>,
  unlinks: [] as Array<{ table: string; id: string; payload: any }>,
  deletes: [] as Array<{ table: string; id: string }>,
}));

const sessionState = vi.hoisted(() => ({
  activeCouple: { couple: { id: 'shared-1' } },
  personalSpaceId: 'solo-1',
  sharedSpaceId: 'shared-1',
  user: { id: 'user-1', displayName: 'Tor' },
  members: [{ id: 'partner-1', displayName: 'Partner' }],
  space: { kind: 'pair' },
}));

function makeTxRow(table: string, rowId: string) {
  return {
    table,
    id: rowId,
    update(payload: any) {
      txCalls.updates.push({ table, id: rowId, payload });
      return this;
    },
    link(payload: any) {
      txCalls.links.push({ table, id: rowId, payload });
      return this;
    },
    unlink(payload: any) {
      txCalls.unlinks.push({ table, id: rowId, payload });
      return this;
    },
    delete() {
      txCalls.deletes.push({ table, id: rowId });
      return this;
    },
  };
}

const dbMock = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: queryState.data, isLoading: false, error: null })),
  transact: vi.fn(async (op: any) => op),
  tx: new Proxy({}, {
    get: (_target, table: string) =>
      new Proxy({}, {
        get: (_rows, id: string) => makeTxRow(table, id),
      }),
  }),
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
  id: vi.fn(() => 'reminder-id'),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: vi.fn(() => sessionState),
}));

vi.mock('@/src/lib/notifications', () => ({
  cancelReminderNotification: vi.fn(async () => undefined),
  scheduleReminderNotification: vi.fn(async () => undefined),
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

describe('useReminders space scope', () => {
  beforeEach(() => {
    sessionState.activeCouple = { couple: { id: 'shared-1' } };
    sessionState.personalSpaceId = 'solo-1';
    sessionState.sharedSpaceId = 'shared-1';
    sessionState.user = { id: 'user-1', displayName: 'Tor' };
    sessionState.members = [{ id: 'partner-1', displayName: 'Partner' }];
    sessionState.space = { kind: 'pair' };
    queryState.data = null;
    dbMock.useQuery.mockClear();
    dbMock.transact.mockClear();
    txCalls.updates = [];
    txCalls.links = [];
    txCalls.unlinks = [];
    txCalls.deletes = [];
  });

  it('queries reminders across personal and shared spaces', async () => {
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { renderer } = await renderHookValue(() => useReminders());

    expect(dbMock.useQuery).toHaveBeenCalledWith({
      reminders: {
        $: {
          where: {
            or: [{ 'couple.id': 'solo-1' }, { 'couple.id': 'shared-1' }],
          },
          order: { dueAt: 'asc' },
        },
        couple: {},
        createdBy: {},
        assignedTo: {},
        completedBy: {},
      },
    });

    act(() => renderer.unmount());
  });

  it('preserves has-one relation ids when Instant returns relation objects', async () => {
    queryState.data = {
      reminders: [
        {
          id: 'reminder-1',
          couple: { id: 'shared-1' },
          createdBy: { id: 'user-1' },
          assignedTo: { id: 'partner-1' },
          completedBy: { id: 'user-1' },
          title: 'Book dinner',
          dueAt: Date.parse('2026-05-24T18:30:00Z'),
          recurrence: null,
          isCompleted: true,
          completedAt: Date.parse('2026-05-24T18:35:00Z'),
          priority: 2,
          category: null,
          createdAt: Date.parse('2026-05-23T10:00:00Z'),
          updatedAt: Date.parse('2026-05-24T18:35:00Z'),
        },
      ],
    };

    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    expect(latest.reminders[0]).toMatchObject({
      couple_id: 'shared-1',
      created_by: 'user-1',
      assigned_to: 'partner-1',
      completed_by: 'user-1',
    });

    act(() => renderer.unmount());
  });

  it('classifies permanent solo-space reminders as personal', async () => {
    queryState.data = {
      reminders: [
        rawReminder({ id: 'personal-reminder', couple: { id: 'solo-1' }, title: 'Pay tax' }),
        rawReminder({ id: 'shared-reminder', couple: { id: 'shared-1' }, title: 'Buy milk' }),
      ],
    };

    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    expect(latest.reminders).toEqual([
      expect.objectContaining({ id: 'personal-reminder', scope: 'personal' }),
      expect.objectContaining({ id: 'shared-reminder', scope: 'shared' }),
    ]);

    act(() => renderer.unmount());
  });

  it('excludes partner-authored rows from the current user personal space', async () => {
    queryState.data = {
      reminders: [
        rawReminder({
          id: 'personal-partner-reminder',
          couple: { id: 'solo-1' },
          createdBy: { id: 'partner-1' },
          title: 'Partner private reminder',
        }),
        rawReminder({
          id: 'personal-self-reminder',
          couple: { id: 'solo-1' },
          createdBy: { id: 'user-1' },
          title: 'My private reminder',
        }),
        rawReminder({
          id: 'shared-partner-reminder',
          couple: { id: 'shared-1' },
          createdBy: { id: 'partner-1' },
          title: 'Shared reminder',
        }),
      ],
    };

    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    expect(latest.reminders.map((reminder) => reminder.id)).toEqual([
      'personal-self-reminder',
      'shared-partner-reminder',
    ]);
    expect(latest.reminders[0]).toMatchObject({ id: 'personal-self-reminder', scope: 'personal' });
    expect(latest.upcoming.map((reminder) => reminder.id)).not.toContain('personal-partner-reminder');

    act(() => renderer.unmount());
  });

  it('keeps malformed legacy reminder timestamps from crashing the scoped hook', async () => {
    queryState.data = {
      reminders: [
        rawReminder({
          id: 'legacy-malformed-reminder',
          dueAt: 'not-a-date',
          completedAt: 'also-bad',
          createdAt: 'bad-created-at',
          updatedAt: 'bad-updated-at',
        }),
      ],
    };

    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    expect(latest.reminders).toEqual([
      expect.objectContaining({
        id: 'legacy-malformed-reminder',
        due_at: '',
        completed_at: null,
        created_at: '',
        updated_at: '',
      }),
    ]);

    act(() => renderer.unmount());
  });

  it('keeps impossible ISO-like legacy reminder timestamps from becoming real dates', async () => {
    queryState.data = {
      reminders: [
        rawReminder({
          id: 'legacy-impossible-reminder',
          dueAt: '2026-04-31T09:00:00.000Z',
          completedAt: '2026-02-29T10:00:00.000Z',
          createdAt: '2026-06-31T08:00:00.000Z',
          updatedAt: '2026-11-31T11:00:00.000Z',
        }),
      ],
    };

    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    expect(latest.reminders).toEqual([
      expect.objectContaining({
        id: 'legacy-impossible-reminder',
        due_at: '',
        completed_at: null,
        created_at: '',
        updated_at: '',
      }),
    ]);

    act(() => renderer.unmount());
  });

  it('normalizes malformed legacy reminder priorities before exposing scoped rows', async () => {
    queryState.data = {
      reminders: [
        rawReminder({
          id: 'legacy-malformed-priority-reminder',
          priority: Number.MAX_VALUE,
        }),
      ],
    };

    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    expect(latest.reminders).toEqual([
      expect.objectContaining({
        id: 'legacy-malformed-priority-reminder',
        priority: 0,
      }),
    ]);

    act(() => renderer.unmount());
  });

  it('writes personal reminders to the permanent solo space without shared push', async () => {
    const { notifySpaceMutation } = await import('@/src/lib/push');
    const { scheduleReminderNotification } = await import('@/src/lib/notifications');
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await act(async () => {
      await latest.create({
        title: 'Pay tax',
        due_at: '2030-05-24T09:00:00.000Z',
        scope: 'personal',
      } as any);
      await flush();
    });

    expect(txCalls.links).toContainEqual({
      table: 'reminders',
      id: 'reminder-id',
      payload: { couple: 'solo-1', createdBy: 'user-1' },
    });
    expect(scheduleReminderNotification).toHaveBeenCalledWith(
      'reminder-id',
      'Pay tax',
      '2030-05-24T09:00:00.000Z',
    );
    expect(notifySpaceMutation).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('does not fail reminder creation when local notification scheduling fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const scheduleError = new Error('notification bridge offline');
    const { scheduleReminderNotification } = await import('@/src/lib/notifications');
    (scheduleReminderNotification as any).mockRejectedValueOnce(scheduleError);
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    try {
      await expect(latest.create({
        title: 'Pay tax',
        due_at: '2030-05-24T09:00:00.000Z',
        scope: 'personal',
      } as any)).resolves.toBeUndefined();

      expect(dbMock.transact).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        '[reminders] local notification schedule failed',
        scheduleError,
      );
    } finally {
      warnSpy.mockRestore();
      act(() => renderer.unmount());
    }
  });

  it('does not link another member when creating a personal reminder', async () => {
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await act(async () => {
      await latest.create({
        title: 'Private paperwork',
        due_at: '2030-05-24T09:00:00.000Z',
        scope: 'personal',
        assigned_to: 'partner-1',
      } as any);
      await flush();
    });

    expect(txCalls.links).toContainEqual({
      table: 'reminders',
      id: 'reminder-id',
      payload: { couple: 'solo-1', createdBy: 'user-1' },
    });
    expect(txCalls.links).not.toContainEqual({
      table: 'reminders',
      id: 'reminder-id',
      payload: { assignedTo: 'partner-1' },
    });

    act(() => renderer.unmount());
  });

  it('fails closed instead of assigning a shared reminder to a non-member', async () => {
    const { notifySpaceMutation } = await import('@/src/lib/push');
    const { scheduleReminderNotification } = await import('@/src/lib/notifications');
    (notifySpaceMutation as any).mockClear();
    (scheduleReminderNotification as any).mockClear();
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await expect(latest.create({
      title: 'Shared errand',
      due_at: '2030-05-24T09:00:00.000Z',
      scope: 'shared',
      assigned_to: 'stranger-1',
    } as any)).rejects.toThrow('Invalid reminder assignee');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(scheduleReminderNotification).not.toHaveBeenCalled();
    expect(notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of silently succeeding when create has no target space', async () => {
    sessionState.activeCouple = null as any;
    sessionState.personalSpaceId = null as any;
    sessionState.sharedSpaceId = null as any;
    const { notifySpaceMutation } = await import('@/src/lib/push');
    const { scheduleReminderNotification } = await import('@/src/lib/notifications');
    (notifySpaceMutation as any).mockClear();
    (scheduleReminderNotification as any).mockClear();
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await expect(latest.create({
      title: 'Ghost reminder',
      due_at: '2030-05-24T09:00:00.000Z',
    } as any)).rejects.toThrow('No active space');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(scheduleReminderNotification).not.toHaveBeenCalled();
    expect(notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of writing malformed reminder due dates', async () => {
    const { notifySpaceMutation } = await import('@/src/lib/push');
    const { scheduleReminderNotification } = await import('@/src/lib/notifications');
    (notifySpaceMutation as any).mockClear();
    (scheduleReminderNotification as any).mockClear();
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await expect(latest.create({
      title: 'Malformed reminder',
      due_at: 'not-a-date',
      scope: 'personal',
    } as any)).rejects.toThrow('Invalid reminder due date');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(scheduleReminderNotification).not.toHaveBeenCalled();
    expect(notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of creating reminders with malformed scope metadata', async () => {
    const { notifySpaceMutation } = await import('@/src/lib/push');
    const { scheduleReminderNotification } = await import('@/src/lib/notifications');
    (notifySpaceMutation as any).mockClear();
    (scheduleReminderNotification as any).mockClear();
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await expect(latest.create({
      title: 'Ambiguous reminder',
      due_at: '2030-05-24T09:00:00.000Z',
      scope: 'solo',
    } as any)).rejects.toThrow('Invalid reminder scope');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(scheduleReminderNotification).not.toHaveBeenCalled();
    expect(notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of creating reminders with malformed recurrence metadata', async () => {
    const { notifySpaceMutation } = await import('@/src/lib/push');
    const { scheduleReminderNotification } = await import('@/src/lib/notifications');
    (notifySpaceMutation as any).mockClear();
    (scheduleReminderNotification as any).mockClear();
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await expect(latest.create({
      title: 'Ambiguous repeat',
      due_at: '2030-05-24T09:00:00.000Z',
      recurrence: 'weekdays',
      scope: 'shared',
    } as any)).rejects.toThrow('Invalid reminder recurrence');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(scheduleReminderNotification).not.toHaveBeenCalled();
    expect(notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of creating reminders with malformed priority metadata', async () => {
    const { notifySpaceMutation } = await import('@/src/lib/push');
    const { scheduleReminderNotification } = await import('@/src/lib/notifications');
    (notifySpaceMutation as any).mockClear();
    (scheduleReminderNotification as any).mockClear();
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await expect(latest.create({
      title: 'Ambiguous priority',
      due_at: '2030-05-24T09:00:00.000Z',
      priority: 9,
      scope: 'shared',
    } as any)).rejects.toThrow('Invalid priority');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(scheduleReminderNotification).not.toHaveBeenCalled();
    expect(notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('relinks reminders when visibility changes during edit', async () => {
    queryState.data = {
      reminders: [rawReminder({ id: 'reminder-1', couple: { id: 'shared-1' } })],
    };
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await act(async () => {
      await latest.update('reminder-1', { scope: 'personal' } as any);
      await flush();
    });

    expect(txCalls.links).toContainEqual({
      table: 'reminders',
      id: 'reminder-1',
      payload: { couple: 'solo-1' },
    });

    act(() => renderer.unmount());
  });

  it('fails closed instead of moving another member reminder into the personal space', async () => {
    queryState.data = {
      reminders: [
        rawReminder({
          id: 'partner-reminder',
          couple: { id: 'shared-1' },
          createdBy: { id: 'partner-1' },
        }),
      ],
    };
    const { cancelReminderNotification, scheduleReminderNotification } = await import('@/src/lib/notifications');
    (cancelReminderNotification as any).mockClear();
    (scheduleReminderNotification as any).mockClear();
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await expect(latest.update('partner-reminder', { scope: 'personal' } as any))
      .rejects.toThrow('Cannot move another member reminder into personal space');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(txCalls.unlinks).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(cancelReminderNotification).not.toHaveBeenCalled();
    expect(scheduleReminderNotification).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating reminders with malformed scope metadata', async () => {
    queryState.data = {
      reminders: [rawReminder({ id: 'reminder-1', couple: { id: 'shared-1' } })],
    };
    const { cancelReminderNotification, scheduleReminderNotification } = await import('@/src/lib/notifications');
    (cancelReminderNotification as any).mockClear();
    (scheduleReminderNotification as any).mockClear();
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await expect(latest.update('reminder-1', { scope: 'solo' } as any))
      .rejects.toThrow('Invalid reminder scope');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(txCalls.unlinks).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(cancelReminderNotification).not.toHaveBeenCalled();
    expect(scheduleReminderNotification).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating reminders with malformed recurrence metadata', async () => {
    queryState.data = {
      reminders: [rawReminder({ id: 'reminder-1', couple: { id: 'shared-1' } })],
    };
    const { cancelReminderNotification, scheduleReminderNotification } = await import('@/src/lib/notifications');
    (cancelReminderNotification as any).mockClear();
    (scheduleReminderNotification as any).mockClear();
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await expect(latest.update('reminder-1', { recurrence: 'weekdays' } as any))
      .rejects.toThrow('Invalid reminder recurrence');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(txCalls.unlinks).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(cancelReminderNotification).not.toHaveBeenCalled();
    expect(scheduleReminderNotification).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating reminders with malformed priority metadata', async () => {
    queryState.data = {
      reminders: [rawReminder({ id: 'reminder-1', couple: { id: 'shared-1' } })],
    };
    const { cancelReminderNotification, scheduleReminderNotification } = await import('@/src/lib/notifications');
    (cancelReminderNotification as any).mockClear();
    (scheduleReminderNotification as any).mockClear();
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await expect(latest.update('reminder-1', { priority: -1 } as any))
      .rejects.toThrow('Invalid priority');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(txCalls.unlinks).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(cancelReminderNotification).not.toHaveBeenCalled();
    expect(scheduleReminderNotification).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating a reminder outside the scoped result set', async () => {
    queryState.data = { reminders: [] };
    const { cancelReminderNotification, scheduleReminderNotification } = await import('@/src/lib/notifications');
    (cancelReminderNotification as any).mockClear();
    (scheduleReminderNotification as any).mockClear();
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await expect(latest.update('missing-reminder', { title: 'Wrong reminder' })).rejects.toThrow('Reminder not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(cancelReminderNotification).not.toHaveBeenCalled();
    expect(scheduleReminderNotification).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating malformed reminder due dates', async () => {
    queryState.data = {
      reminders: [rawReminder({ id: 'reminder-1' })],
    };
    const { cancelReminderNotification, scheduleReminderNotification } = await import('@/src/lib/notifications');
    (cancelReminderNotification as any).mockClear();
    (scheduleReminderNotification as any).mockClear();
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await expect(latest.update('reminder-1', { due_at: 'not-a-date' })).rejects.toThrow(
      'Invalid reminder due date',
    );

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(cancelReminderNotification).not.toHaveBeenCalled();
    expect(scheduleReminderNotification).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of deleting a reminder outside the scoped result set', async () => {
    queryState.data = { reminders: [] };
    const { cancelReminderNotification } = await import('@/src/lib/notifications');
    (cancelReminderNotification as any).mockClear();
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await expect(latest.remove('missing-reminder')).rejects.toThrow('Reminder not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(cancelReminderNotification).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('still deletes a scoped reminder when local notification cancellation fails', async () => {
    queryState.data = {
      reminders: [rawReminder({ id: 'reminder-1' })],
    };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const cancelError = new Error('cancel unavailable');
    const { cancelReminderNotification } = await import('@/src/lib/notifications');
    (cancelReminderNotification as any).mockRejectedValueOnce(cancelError);
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    try {
      await expect(latest.remove('reminder-1')).resolves.toBeUndefined();

      expect(txCalls.deletes).toContainEqual({ table: 'reminders', id: 'reminder-1' });
      expect(warnSpy).toHaveBeenCalledWith(
        '[reminders] local notification cancel failed',
        cancelError,
      );
    } finally {
      warnSpy.mockRestore();
      act(() => renderer.unmount());
    }
  });

  it('fails closed instead of toggling a reminder outside the scoped result set', async () => {
    queryState.data = { reminders: [] };
    const { cancelReminderNotification, scheduleReminderNotification } = await import('@/src/lib/notifications');
    (cancelReminderNotification as any).mockClear();
    (scheduleReminderNotification as any).mockClear();
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await expect(latest.toggleComplete({
      id: 'missing-reminder',
      title: 'Wrong reminder',
      due_at: '2030-05-24T09:00:00.000Z',
      is_completed: false,
    } as any)).rejects.toThrow('Reminder not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(cancelReminderNotification).not.toHaveBeenCalled();
    expect(scheduleReminderNotification).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of snoozing a reminder outside the scoped result set', async () => {
    queryState.data = { reminders: [] };
    const { cancelReminderNotification, scheduleReminderNotification } = await import('@/src/lib/notifications');
    (cancelReminderNotification as any).mockClear();
    (scheduleReminderNotification as any).mockClear();
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await expect(latest.snooze({
      id: 'missing-reminder',
      title: 'Wrong reminder',
      due_at: '2030-05-24T09:00:00.000Z',
    } as any)).rejects.toThrow('Reminder not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(cancelReminderNotification).not.toHaveBeenCalled();
    expect(scheduleReminderNotification).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('snoozes malformed legacy reminder dates from now instead of crashing', async () => {
    vi.useFakeTimers({
      now: new Date('2026-05-25T12:00:00.000Z'),
      toFake: ['Date'],
    });
    queryState.data = {
      reminders: [rawReminder({ id: 'legacy-malformed-reminder', dueAt: 'not-a-date' })],
    };
    const { cancelReminderNotification, scheduleReminderNotification } = await import('@/src/lib/notifications');
    (cancelReminderNotification as any).mockClear();
    (scheduleReminderNotification as any).mockClear();
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    try {
      await act(async () => {
        await latest.snooze(latest.reminders[0], 15);
        await flush();
      });

      expect(txCalls.updates).toContainEqual({
        table: 'reminders',
        id: 'legacy-malformed-reminder',
        payload: {
          dueAt: Date.parse('2026-05-25T12:15:00.000Z'),
          updatedAt: Date.parse('2026-05-25T12:00:00.000Z'),
        },
      });
      expect(cancelReminderNotification).toHaveBeenCalledWith('legacy-malformed-reminder');
      expect(scheduleReminderNotification).toHaveBeenCalledWith(
        'legacy-malformed-reminder',
        'Book dinner',
        '2026-05-25T12:15:00.000Z',
      );
    } finally {
      vi.useRealTimers();
      act(() => renderer.unmount());
    }
  });

  it('keeps oversized numeric legacy reminder timestamps from crashing normalization', async () => {
    queryState.data = {
      reminders: [
        rawReminder({
          id: 'legacy-oversized-reminder',
          dueAt: Number.MAX_VALUE,
          completedAt: Number.MAX_VALUE,
          createdAt: Number.MAX_VALUE,
          updatedAt: Number.MAX_VALUE,
        }),
      ],
    };

    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    expect(latest.reminders).toEqual([
      expect.objectContaining({
        id: 'legacy-oversized-reminder',
        due_at: '',
        completed_at: null,
        created_at: '',
        updated_at: '',
      }),
    ]);

    act(() => renderer.unmount());
  });

  it('removes shared-member assignment links when moving a reminder to personal scope', async () => {
    queryState.data = {
      reminders: [
        rawReminder({
          id: 'reminder-1',
          couple: { id: 'shared-1' },
          assignedTo: { id: 'partner-1' },
          completedBy: { id: 'partner-1' },
          isCompleted: true,
        }),
      ],
    };
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await act(async () => {
      await latest.update('reminder-1', { scope: 'personal' } as any);
      await flush();
    });

    expect(txCalls.links).toContainEqual({
      table: 'reminders',
      id: 'reminder-1',
      payload: { couple: 'solo-1' },
    });
    expect(txCalls.unlinks).toEqual(
      expect.arrayContaining([
        { table: 'reminders', id: 'reminder-1', payload: { assignedTo: 'partner-1' } },
        { table: 'reminders', id: 'reminder-1', payload: { completedBy: 'partner-1' } },
      ]),
    );

    act(() => renderer.unmount());
  });

  it('does not link another member when editing an existing personal reminder', async () => {
    queryState.data = {
      reminders: [
        rawReminder({
          id: 'reminder-1',
          couple: { id: 'solo-1' },
          assignedTo: null,
        }),
      ],
    };
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await act(async () => {
      await latest.update('reminder-1', { assigned_to: 'partner-1' } as any);
      await flush();
    });

    expect(txCalls.links).not.toContainEqual({
      table: 'reminders',
      id: 'reminder-1',
      payload: { assignedTo: 'partner-1' },
    });

    act(() => renderer.unmount());
  });

  it('fails closed instead of updating a shared reminder assignment to a non-member', async () => {
    queryState.data = {
      reminders: [rawReminder({ id: 'reminder-1', couple: { id: 'shared-1' } })],
    };
    const { cancelReminderNotification, scheduleReminderNotification } = await import('@/src/lib/notifications');
    (cancelReminderNotification as any).mockClear();
    (scheduleReminderNotification as any).mockClear();
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await expect(latest.update('reminder-1', { assigned_to: 'stranger-1' } as any))
      .rejects.toThrow('Invalid reminder assignee');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(txCalls.unlinks).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(cancelReminderNotification).not.toHaveBeenCalled();
    expect(scheduleReminderNotification).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('reschedules local notifications when edited reminder timing changes', async () => {
    queryState.data = {
      reminders: [rawReminder({ id: 'reminder-1', title: 'Old title' })],
    };
    const { cancelReminderNotification, scheduleReminderNotification } = await import('@/src/lib/notifications');
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await act(async () => {
      await latest.update('reminder-1', {
        title: 'Updated title',
        due_at: '2030-05-24T12:30:00.000Z',
      });
      await flush();
    });

    expect(cancelReminderNotification).toHaveBeenCalledWith('reminder-1');
    expect(scheduleReminderNotification).toHaveBeenCalledWith(
      'reminder-1',
      'Updated title',
      '2030-05-24T12:30:00.000Z',
    );

    act(() => renderer.unmount());
  });

  it('ignores duplicate completion toggles while the first toggle is pending', async () => {
    queryState.data = {
      reminders: [rawReminder({ id: 'reminder-1', isCompleted: false })],
    };
    const pendingTransactions: Array<() => void> = [];
    dbMock.transact.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          pendingTransactions.push(resolve);
        }),
    );
    const { cancelReminderNotification } = await import('@/src/lib/notifications');
    (cancelReminderNotification as any).mockClear();
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { latest, renderer } = await renderHookValue(() => useReminders());

    await act(async () => {
      latest.toggleComplete(latest.reminders[0]);
      latest.toggleComplete(latest.reminders[0]);
      await flush();
    });

    expect(dbMock.transact).toHaveBeenCalledTimes(1);

    pendingTransactions.forEach((resolve) => resolve());
    await act(async () => {
      await flush();
    });

    expect(cancelReminderNotification).toHaveBeenCalledTimes(1);

    act(() => renderer.unmount());
  });
});

function rawReminder(overrides: Record<string, any> = {}) {
  return {
    id: 'reminder-1',
    couple: { id: 'shared-1' },
    createdBy: { id: 'user-1' },
    assignedTo: null,
    completedBy: null,
    title: 'Book dinner',
    dueAt: Date.parse('2026-05-24T18:30:00Z'),
    recurrence: null,
    isCompleted: false,
    completedAt: null,
    priority: 2,
    category: null,
    createdAt: Date.parse('2026-05-23T10:00:00Z'),
    updatedAt: Date.parse('2026-05-24T18:35:00Z'),
    ...overrides,
  };
}
