import { useCallback, useMemo } from 'react';
import { db, id } from '@/src/lib/instant';
import {
  cancelReminderNotification,
  scheduleReminderNotification,
} from '@/src/lib/notifications';
import { notifySpaceMutation } from '@/src/lib/push';
import { useSession } from './useSession';
import type { Reminder } from '@/src/types/database';

type ReminderInput = {
  title: string;
  description?: string | null;
  due_at: string;
  recurrence?: string | null;
  priority?: number;
  category?: string | null;
  assigned_to?: string | null;
};

function toReminderRow(reminder: any): Reminder {
  return {
    id: reminder.id,
    couple_id: reminder.couple?.[0]?.id ?? '',
    created_by: reminder.createdBy?.[0]?.id ?? '',
    assigned_to: reminder.assignedTo?.[0]?.id ?? null,
    title: reminder.title,
    description: reminder.description ?? null,
    due_at: new Date(reminder.dueAt).toISOString(),
    recurrence: reminder.recurrence ?? null,
    is_completed: reminder.isCompleted,
    completed_at: reminder.completedAt == null ? null : new Date(reminder.completedAt).toISOString(),
    completed_by: reminder.completedBy?.[0]?.id ?? null,
    priority: reminder.priority,
    category: reminder.category ?? null,
    created_at: new Date(reminder.createdAt).toISOString(),
    updated_at: new Date(reminder.updatedAt).toISOString(),
  };
}

export function useReminders() {
  const { activeCouple, user, space } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const userId = user?.id ?? null;
  const actorName = user?.displayName ?? 'Someone';

  const { data, isLoading: queryLoading, error } = db.useQuery(
    coupleId
      ? {
          reminders: {
            $: { where: { 'couple.id': coupleId }, order: { dueAt: 'asc' } },
            couple: {},
            createdBy: {},
            assignedTo: {},
            completedBy: {},
          },
        }
      : null,
  );

  const reminders = useMemo(
    () => (data?.reminders ?? []).map(toReminderRow),
    [data?.reminders],
  );

  const create = useCallback(
    async (input: ReminderInput) => {
      if (!coupleId || !userId) return;
      const reminderId = id();
      const now = Date.now();
      const txn = db.tx.reminders[reminderId]
        .update({
          title: input.title,
          description: input.description ?? undefined,
          dueAt: new Date(input.due_at).getTime(),
          recurrence: input.recurrence ?? undefined,
          isCompleted: false,
          priority: input.priority ?? 0,
          category: input.category ?? undefined,
          createdAt: now,
          updatedAt: now,
        })
        .link({ couple: coupleId, createdBy: userId });
      const txns: any[] = [txn];
      if (input.assigned_to) {
        txns.push(db.tx.reminders[reminderId].link({ assignedTo: input.assigned_to }));
      }
      await db.transact(txns);
      await scheduleReminderNotification(reminderId, input.title, input.due_at);
      await notifySpaceMutation({
        spaceId: coupleId,
        spaceKind: space?.kind ?? null,
        excludeUserId: userId,
        title: actorName,
        body: `added a reminder: ${input.title}`,
        route: '/(tabs)/us/reminders',
      });
    },
    [coupleId, userId, space?.kind, actorName],
  );

  const update = useCallback(
    async (reminderId: string, input: Partial<ReminderInput>) => {
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description ?? null;
      if (input.due_at !== undefined) updates.dueAt = new Date(input.due_at).getTime();
      if (input.recurrence !== undefined) updates.recurrence = input.recurrence ?? null;
      if (input.priority !== undefined) updates.priority = input.priority;
      if (input.category !== undefined) updates.category = input.category ?? null;
      const txns: any[] = [db.tx.reminders[reminderId].update(updates)];
      if (input.assigned_to !== undefined) {
        if (input.assigned_to === null) {
          const current = reminders.find((r) => r.id === reminderId);
          if (current?.assigned_to) {
            txns.push(db.tx.reminders[reminderId].unlink({ assignedTo: current.assigned_to }));
          }
        } else {
          txns.push(db.tx.reminders[reminderId].link({ assignedTo: input.assigned_to }));
        }
      }
      await db.transact(txns);
    },
    [reminders],
  );

  const remove = useCallback(async (reminderId: string) => {
    await cancelReminderNotification(reminderId);
    await db.transact(db.tx.reminders[reminderId].delete());
  }, []);

  const toggleComplete = useCallback(
    async (reminder: Reminder) => {
      const isNowCompleted = !reminder.is_completed;
      const txns: any[] = [
        db.tx.reminders[reminder.id].update({
          isCompleted: isNowCompleted,
          completedAt: isNowCompleted ? Date.now() : null,
          updatedAt: Date.now(),
        }),
      ];
      if (isNowCompleted && userId) {
        txns.push(db.tx.reminders[reminder.id].link({ completedBy: userId }));
      } else if (reminder.completed_by) {
        txns.push(db.tx.reminders[reminder.id].unlink({ completedBy: reminder.completed_by }));
      }
      await db.transact(txns);
      if (isNowCompleted) {
        await cancelReminderNotification(reminder.id);
      } else {
        await scheduleReminderNotification(reminder.id, reminder.title, reminder.due_at);
      }
    },
    [userId],
  );

  const snooze = useCallback(
    async (reminder: Reminder, minutes: number = 60) => {
      const baseMs = Math.max(Date.now(), new Date(reminder.due_at).getTime());
      const nextMs = baseMs + minutes * 60000;
      const nextIso = new Date(nextMs).toISOString();
      await db.transact(
        db.tx.reminders[reminder.id].update({ dueAt: nextMs, updatedAt: Date.now() }),
      );
      await cancelReminderNotification(reminder.id);
      await scheduleReminderNotification(reminder.id, reminder.title, nextIso);
    },
    [],
  );

  const upcoming = reminders.filter((r) => !r.is_completed);
  const completed = reminders.filter((r) => r.is_completed);

  return {
    reminders,
    upcoming,
    completed,
    isLoading: !!coupleId && queryLoading,
    error: error ?? null,
    create,
    update,
    remove,
    toggleComplete,
    snooze,
    refetch: async () => {},
  };
}
