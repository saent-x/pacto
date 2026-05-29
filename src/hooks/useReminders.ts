import { useCallback, useMemo, useRef } from 'react';
import { db, id } from '@/src/lib/instant';
import {
  cancelReminderNotification,
  scheduleReminderNotification,
} from '@/src/lib/notifications';
import { notifySpaceMutation } from '@/src/lib/push';
import { assertValidPriority, normalizePriority } from '@/src/lib/priority';
import { useSession } from './useSession';
import { personalOrSharedSpaceId, relationWhere, uniqueSpaceIds } from '@/src/lib/space-scope';
import type { Reminder } from '@/src/types/database';

type ReminderScope = 'personal' | 'shared';
type ReminderRecurrence = 'daily' | 'weekly' | 'monthly' | 'yearly';

type ReminderInput = {
  title: string;
  description?: string | null;
  due_at: string;
  recurrence?: ReminderRecurrence | null;
  priority?: number;
  category?: string | null;
  assigned_to?: string | null;
  scope?: ReminderScope;
};

type UseRemindersOptions = {
  enabled?: boolean;
};

function toReminderRow(
  reminder: any,
  options: { personalSpaceId?: string | null } = {},
): Reminder {
  const couple = firstRel(reminder.couple);
  const createdBy = firstRel(reminder.createdBy);
  const assignedTo = firstRel(reminder.assignedTo);
  const completedBy = firstRel(reminder.completedBy);
  const owningSpaceId = couple?.id ?? '';
  const scope: ReminderScope =
    options.personalSpaceId && owningSpaceId === options.personalSpaceId ? 'personal' : 'shared';
  return {
    id: reminder.id,
    couple_id: owningSpaceId,
    created_by: createdBy?.id ?? '',
    assigned_to: assignedTo?.id ?? null,
    title: reminder.title,
    description: reminder.description ?? null,
    due_at: toIsoString(reminder.dueAt),
    recurrence: reminder.recurrence ?? null,
    is_completed: reminder.isCompleted,
    completed_at: toNullableIsoString(reminder.completedAt),
    completed_by: completedBy?.id ?? null,
    priority: normalizePriority(reminder.priority),
    category: reminder.category ?? null,
    scope,
    created_at: toIsoString(reminder.createdAt),
    updated_at: toIsoString(reminder.updatedAt),
  };
}

function timestampMs(value: unknown): number | null {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return Number.isFinite(new Date(value).getTime()) ? value : null;
  }
  if (typeof value === 'string' && value.trim()) {
    if (!hasValidDatePrefix(value)) return null;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function hasValidDatePrefix(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return true;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function toIsoString(value: unknown): string {
  const timestamp = timestampMs(value);
  return timestamp == null ? '' : new Date(timestamp).toISOString();
}

function toNullableIsoString(value: unknown): string | null {
  const timestamp = timestampMs(value);
  return timestamp == null ? null : new Date(timestamp).toISOString();
}

function requireDueAtMs(value: unknown): number {
  const timestamp = timestampMs(value);
  if (timestamp == null) throw new Error('Invalid reminder due date');
  return timestamp;
}

function assertValidReminderScope(value: unknown): asserts value is ReminderScope | undefined {
  if (value !== undefined && value !== 'personal' && value !== 'shared') {
    throw new Error('Invalid reminder scope');
  }
}

function assertValidReminderRecurrence(
  value: unknown,
): asserts value is ReminderRecurrence | null | undefined {
  if (
    value !== undefined &&
    value !== null &&
    value !== 'daily' &&
    value !== 'weekly' &&
    value !== 'monthly' &&
    value !== 'yearly'
  ) {
    throw new Error('Invalid reminder recurrence');
  }
}

function shareForReminderScope(scope: ReminderScope | undefined) {
  return scope === 'personal' ? 'solo' : 'shared';
}

function firstRel(value: any): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function personalSpaceAssignee(
  assignedTo: string | null | undefined,
  targetSpaceId: string | null | undefined,
  personalSpaceId: string | null | undefined,
  userId: string | null | undefined,
  assignableUserIds: Set<string>,
) {
  if (!assignedTo) return null;
  if (targetSpaceId && personalSpaceId && targetSpaceId === personalSpaceId && assignedTo !== userId) {
    return null;
  }
  if (!assignableUserIds.has(assignedTo)) {
    throw new Error('Invalid reminder assignee');
  }
  return assignedTo;
}

function assignableMemberIds(
  userId: string | null | undefined,
  members: unknown,
): Set<string> {
  const ids = new Set<string>();
  if (userId) ids.add(userId);
  if (Array.isArray(members)) {
    for (const member of members) {
      const memberId = (member as { id?: unknown } | null)?.id;
      if (typeof memberId === 'string' && memberId) ids.add(memberId);
    }
  }
  return ids;
}

async function bestEffortScheduleReminderNotification(
  reminderId: string,
  title: string,
  dueAtIso: string,
) {
  try {
    await scheduleReminderNotification(reminderId, title, dueAtIso);
  } catch (err) {
    console.warn('[reminders] local notification schedule failed', err);
  }
}

async function bestEffortCancelReminderNotification(reminderId: string) {
  try {
    await cancelReminderNotification(reminderId);
  } catch (err) {
    console.warn('[reminders] local notification cancel failed', err);
  }
}

export function useReminders(options: UseRemindersOptions = {}) {
  const enabled = options.enabled ?? true;
  const { activeCouple, user, members, space, personalSpaceId, sharedSpaceId } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const readableSpaceIds = uniqueSpaceIds([personalSpaceId ?? coupleId, sharedSpaceId ?? coupleId]);
  const userId = user?.id ?? null;
  const actorName = user?.displayName ?? 'Someone';
  const assignableUserIds = useMemo(() => assignableMemberIds(userId, members), [userId, members]);
  const pendingToggleRef = useRef(new Set<string>());

  const { data, isLoading: queryLoading, error } = db.useQuery(
    enabled && readableSpaceIds.length > 0
      ? {
          reminders: {
            $: { where: relationWhere('couple', readableSpaceIds), order: { dueAt: 'asc' } },
            couple: {},
            createdBy: {},
            assignedTo: {},
            completedBy: {},
          },
        }
      : null,
  );

  const reminders = useMemo(
    () =>
      (data?.reminders ?? []).flatMap((reminder: any) => {
        const couple = firstRel(reminder.couple);
        const createdBy = firstRel(reminder.createdBy);
        const isPersonalSpaceRow = Boolean(personalSpaceId && couple?.id === personalSpaceId);
        if (isPersonalSpaceRow && createdBy?.id !== userId) return [];
        return [toReminderRow(reminder, { personalSpaceId })];
      }),
    [data?.reminders, personalSpaceId, userId],
  );
  const reminderById = useMemo(() => new Map(reminders.map((reminder) => [reminder.id, reminder])), [reminders]);

  const create = useCallback(
    async (input: ReminderInput) => {
      assertValidReminderScope(input.scope);
      assertValidReminderRecurrence(input.recurrence);
      assertValidPriority(input.priority);
      const targetSpaceId = personalOrSharedSpaceId({
        share: shareForReminderScope(input.scope),
        personalSpaceId,
        sharedSpaceId,
        fallbackSpaceId: coupleId,
      });
      if (!targetSpaceId) throw new Error('No active space');
      if (!userId) throw new Error('No current user');
      const dueAt = requireDueAtMs(input.due_at);
      const scope: ReminderScope = targetSpaceId === personalSpaceId ? 'personal' : 'shared';
      const assignedTo = personalSpaceAssignee(
        input.assigned_to,
        targetSpaceId,
        personalSpaceId,
        userId,
        assignableUserIds,
      );
      const reminderId = id();
      const now = Date.now();
      const txn = db.tx.reminders[reminderId]
        .update({
          title: input.title,
          description: input.description ?? undefined,
          dueAt,
          recurrence: input.recurrence ?? undefined,
          isCompleted: false,
          priority: input.priority ?? 0,
          category: input.category ?? undefined,
          createdAt: now,
          updatedAt: now,
        })
        .link({ couple: targetSpaceId, createdBy: userId });
      const txns: any[] = [txn];
      if (assignedTo) {
        txns.push(db.tx.reminders[reminderId].link({ assignedTo }));
      }
      await db.transact(txns);
      await bestEffortScheduleReminderNotification(reminderId, input.title, input.due_at);
      if (scope === 'shared') {
        await notifySpaceMutation({
          spaceId: targetSpaceId,
          spaceKind: space?.kind ?? null,
          excludeUserId: userId,
          title: actorName,
          body: `added a reminder: ${input.title}`,
          eventKind: 'reminderCreated',
          entityId: reminderId,
          entityTitle: input.title,
          route: '/(tabs)/us/reminders',
        });
      }
    },
    [actorName, assignableUserIds, coupleId, personalSpaceId, sharedSpaceId, space?.kind, userId],
  );

  const update = useCallback(
    async (reminderId: string, input: Partial<ReminderInput>) => {
      const current = reminderById.get(reminderId);
      if (!current) throw new Error('Reminder not found');
      assertValidReminderScope(input.scope);
      assertValidReminderRecurrence(input.recurrence);
      assertValidPriority(input.priority);
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      let assignmentSpaceId = current.couple_id ?? null;
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description ?? null;
      if (input.due_at !== undefined) updates.dueAt = requireDueAtMs(input.due_at);
      if (input.recurrence !== undefined) updates.recurrence = input.recurrence ?? null;
      if (input.priority !== undefined) updates.priority = input.priority;
      if (input.category !== undefined) updates.category = input.category ?? null;
      let relinkSpaceId: string | null = null;
      if (input.scope !== undefined) {
        const targetSpaceId = personalOrSharedSpaceId({
          share: shareForReminderScope(input.scope),
          personalSpaceId,
          sharedSpaceId,
          fallbackSpaceId: coupleId,
        });
        if (!targetSpaceId) throw new Error('No active space');
        if (personalSpaceId && targetSpaceId === personalSpaceId && current.created_by !== userId) {
          throw new Error('Cannot move another member reminder into personal space');
        }
        assignmentSpaceId = targetSpaceId;
        relinkSpaceId = targetSpaceId;
      }
      const nextAssignedTo = input.assigned_to !== undefined
        ? personalSpaceAssignee(
            input.assigned_to,
            assignmentSpaceId,
            personalSpaceId,
            userId,
            assignableUserIds,
          )
        : undefined;
      const txns: any[] = [db.tx.reminders[reminderId].update(updates)];
      if (input.scope !== undefined) {
        if (relinkSpaceId) {
          txns.push(db.tx.reminders[reminderId].link({ couple: relinkSpaceId }));
        }
        if (input.scope === 'personal') {
          if (input.assigned_to === undefined && current?.assigned_to && current.assigned_to !== userId) {
            txns.push(db.tx.reminders[reminderId].unlink({ assignedTo: current.assigned_to }));
          }
          if (current?.completed_by && current.completed_by !== userId) {
            txns.push(db.tx.reminders[reminderId].unlink({ completedBy: current.completed_by }));
          }
        }
      }
      if (input.assigned_to !== undefined) {
        if (nextAssignedTo === null) {
          if (current?.assigned_to) {
            txns.push(db.tx.reminders[reminderId].unlink({ assignedTo: current.assigned_to }));
          }
        } else {
          txns.push(db.tx.reminders[reminderId].link({ assignedTo: nextAssignedTo }));
        }
      }
      await db.transact(txns);
      if (input.title !== undefined || input.due_at !== undefined) {
        const title = input.title ?? current.title;
        const dueAt = input.due_at ?? current.due_at;
        if (title && dueAt) {
          await bestEffortCancelReminderNotification(reminderId);
          await bestEffortScheduleReminderNotification(reminderId, title, dueAt);
        }
      }
    },
    [assignableUserIds, coupleId, personalSpaceId, reminderById, sharedSpaceId, userId],
  );

  const remove = useCallback(async (reminderId: string) => {
    if (!reminderById.has(reminderId)) throw new Error('Reminder not found');
    await bestEffortCancelReminderNotification(reminderId);
    await db.transact(db.tx.reminders[reminderId].delete());
  }, [reminderById]);

  const toggleComplete = useCallback(
    async (reminder: Reminder) => {
      const current = reminderById.get(reminder.id);
      if (!current) throw new Error('Reminder not found');
      const key = reminder.id;
      if (pendingToggleRef.current.has(key)) return;
      pendingToggleRef.current.add(key);
      const isNowCompleted = !current.is_completed;
      try {
        const txns: any[] = [
          db.tx.reminders[reminder.id].update({
            isCompleted: isNowCompleted,
            completedAt: isNowCompleted ? Date.now() : null,
            updatedAt: Date.now(),
          }),
        ];
        if (isNowCompleted && userId) {
          txns.push(db.tx.reminders[reminder.id].link({ completedBy: userId }));
        } else if (current.completed_by) {
          txns.push(db.tx.reminders[reminder.id].unlink({ completedBy: current.completed_by }));
        }
        await db.transact(txns);
        if (isNowCompleted) {
          await bestEffortCancelReminderNotification(reminder.id);
        } else {
          await bestEffortScheduleReminderNotification(reminder.id, current.title, current.due_at);
        }
      } finally {
        pendingToggleRef.current.delete(key);
      }
    },
    [reminderById, userId],
  );

  const snooze = useCallback(
    async (reminder: Reminder, minutes: number = 60) => {
      const current = reminderById.get(reminder.id);
      if (!current) throw new Error('Reminder not found');
      const now = Date.now();
      const currentDueAt = timestampMs(current.due_at);
      const baseMs = Math.max(now, currentDueAt ?? now);
      const nextMs = baseMs + minutes * 60000;
      const nextIso = new Date(nextMs).toISOString();
      await db.transact(
        db.tx.reminders[reminder.id].update({ dueAt: nextMs, updatedAt: now }),
      );
      await bestEffortCancelReminderNotification(reminder.id);
      await bestEffortScheduleReminderNotification(reminder.id, current.title, nextIso);
    },
    [reminderById],
  );

  const upcoming = reminders.filter((r) => !r.is_completed);
  const completed = reminders.filter((r) => r.is_completed);

  return {
    reminders,
    upcoming,
    completed,
    isLoading: enabled && readableSpaceIds.length > 0 && queryLoading,
    error: error ?? null,
    create,
    update,
    remove,
    toggleComplete,
    snooze,
    refetch: async () => {},
  };
}
