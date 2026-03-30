import { useCallback, useMemo } from 'react';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { makeFunctionReference } from 'convex/server';

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

type ReminderDoc = {
  _id: string;
  coupleId: string;
  createdBy: string;
  assignedTo: string | null;
  title: string;
  description: string | null;
  dueAt: number;
  recurrence: string | null;
  isCompleted: boolean;
  completedAt: number | null;
  completedBy: string | null;
  priority: number;
  category: string | null;
  createdAt: number;
  updatedAt: number;
};

const getRemindersQuery = makeFunctionReference<'query', {}, ReminderDoc[]>('reminders:getReminders');
const createReminderMutation = makeFunctionReference<
  'mutation',
  {
    title: string;
    description?: string | null;
    dueAt: number;
    recurrence?: string | null;
    priority?: number;
    category?: string | null;
    assignedTo?: string | null;
  },
  ReminderDoc
>('reminders:createReminder');
const updateReminderMutation = makeFunctionReference<
  'mutation',
  {
    reminderId: string;
    title?: string;
    description?: string | null;
    dueAt?: number;
    recurrence?: string | null;
    priority?: number;
    category?: string | null;
    assignedTo?: string | null;
  },
  ReminderDoc
>('reminders:updateReminder');
const toggleReminderMutation = makeFunctionReference<'mutation', { reminderId: string }, ReminderDoc>('reminders:toggleReminder');
const deleteReminderMutation = makeFunctionReference<'mutation', { reminderId: string }, null>('reminders:deleteReminder');

function toReminderRow(reminder: ReminderDoc): Reminder {
  return {
    id: reminder._id,
    couple_id: reminder.coupleId,
    created_by: reminder.createdBy,
    assigned_to: reminder.assignedTo,
    title: reminder.title,
    description: reminder.description,
    due_at: new Date(reminder.dueAt).toISOString(),
    recurrence: reminder.recurrence,
    is_completed: reminder.isCompleted,
    completed_at: reminder.completedAt === null ? null : new Date(reminder.completedAt).toISOString(),
    completed_by: reminder.completedBy,
    priority: reminder.priority,
    category: reminder.category,
    created_at: new Date(reminder.createdAt).toISOString(),
    updated_at: new Date(reminder.updatedAt).toISOString(),
  };
}

export function useReminders() {
  const { activeCouple } = useSession();
  const convex = useConvex();
  const rows = useQuery(getRemindersQuery, activeCouple ? {} : 'skip');
  const createReminder = useMutation(createReminderMutation);
  const updateReminderFn = useMutation(updateReminderMutation);
  const toggleReminder = useMutation(toggleReminderMutation);
  const deleteReminder = useMutation(deleteReminderMutation);

  const reminders = useMemo(() => (rows ?? []).map(toReminderRow), [rows]);

  const create = useCallback(
    async (data: ReminderInput) => {
      await createReminder({
        title: data.title,
        description: data.description ?? null,
        dueAt: new Date(data.due_at).getTime(),
        recurrence: data.recurrence ?? null,
        priority: data.priority ?? 0,
        category: data.category ?? null,
        assignedTo: data.assigned_to ?? null,
      });
    },
    [createReminder],
  );

  const update = useCallback(
    async (id: string, data: Partial<ReminderInput>) => {
      await updateReminderFn({
        reminderId: id,
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.due_at !== undefined ? { dueAt: new Date(data.due_at).getTime() } : {}),
        ...(data.recurrence !== undefined ? { recurrence: data.recurrence ?? null } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.category !== undefined ? { category: data.category ?? null } : {}),
        ...(data.assigned_to !== undefined ? { assignedTo: data.assigned_to ?? null } : {}),
      });
    },
    [updateReminderFn],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteReminder({ reminderId: id });
    },
    [deleteReminder],
  );

  const toggleComplete = useCallback(
    async (reminder: Reminder) => {
      await toggleReminder({ reminderId: reminder.id });
    },
    [toggleReminder],
  );

  const upcoming = reminders.filter((reminder) => !reminder.is_completed);
  const completed = reminders.filter((reminder) => reminder.is_completed);

  return {
    reminders,
    upcoming,
    completed,
    isLoading: !!activeCouple && rows === undefined,
    create,
    update,
    remove,
    toggleComplete,
    refetch: async () => {
      if (!activeCouple) return;
      await convex.query(getRemindersQuery, {});
    },
  };
}
