import { useCallback, useMemo, useRef } from 'react';
import { db, id } from '@/src/lib/instant';
import { useSession } from './useSession';
import { childRowMatchesParentSpace, relationWhere, uniqueSpaceIds } from '@/src/lib/space-scope';
import { safeInstantId } from '@/src/lib/instant-id';
import { assertValidPriority, normalizePriority } from '@/src/lib/priority';
import type { Database, Task } from '@/src/types/database';

type TaskUpdateInput = Database['public']['Tables']['tasks']['Update'];
type TaskCreateInput = {
  title: string;
  notes?: string | null;
  category?: string | null;
  due_date?: string | null;
  priority?: number;
  assigned_to?: string | null;
};

type TaskFeedFilter = 'all' | 'active' | 'done';

export type TaskFeedItem = Task;

export type TaskFeedViewState = {
  items: TaskFeedItem[];
  emptyState: {
    title: string;
    description: string;
    actionLabel: string;
  } | null;
};

function timestampMs(value: unknown): number | null {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) && Number.isFinite(new Date(value).getTime()) ? value : null;
  }
  if (typeof value === 'string' && value.trim()) {
    if (!hasValidDatePrefix(value)) return null;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
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

function toTaskRow(task: any): Task {
  const couple = firstRel(task.couple);
  const list = firstRel(task.list);
  const listCouple = firstRel((list as any)?.couple);
  const completedBy = firstRel(task.completedBy);
  const assignedTo = firstRel(task.assignedTo);
  const createdBy = firstRel(task.createdBy);
  return {
    id: task.id,
    couple_id: couple?.id ?? listCouple?.id ?? '',
    list_id: list?.id ?? null,
    title: task.title,
    notes: task.notes ?? null,
    category: task.category ?? null,
    is_completed: task.isCompleted,
    completed_at: toNullableIsoString(task.completedAt),
    completed_by: completedBy?.id ?? null,
    assigned_to: assignedTo?.id ?? null,
    due_date: task.dueDate ?? null,
    priority: normalizePriority(task.priority),
    sort_order: task.sortOrder,
    created_by: createdBy?.id ?? '',
    created_at: toIsoString(task.createdAt),
    updated_at: toIsoString(task.updatedAt),
  };
}

function taskBelongsToListSpace(task: any) {
  return childRowMatchesParentSpace(task, 'list');
}

function parseDueDate(value: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function isValidDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
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

function validateTaskDueDate(value: string | null | undefined): string | null | undefined {
  if (value == null) return value;
  if (!isValidDateKey(value)) throw new Error('Invalid task due date');
  return value;
}

function compareTaskFeedItems(left: TaskFeedItem, right: TaskFeedItem) {
  if (left.is_completed !== right.is_completed) {
    return left.is_completed ? 1 : -1;
  }
  const leftDueDate = parseDueDate(left.due_date);
  const rightDueDate = parseDueDate(right.due_date);
  if (leftDueDate !== rightDueDate) {
    return leftDueDate - rightDueDate;
  }
  const priorityComparison = (right.priority ?? 0) - (left.priority ?? 0);
  if (priorityComparison !== 0) {
    return priorityComparison;
  }
  const titleComparison = left.title.localeCompare(right.title);
  if (titleComparison !== 0) {
    return titleComparison;
  }
  return left.sort_order - right.sort_order || left.id.localeCompare(right.id);
}

function matchesTaskFeedFilter(task: Task, filter: TaskFeedFilter) {
  if (filter === 'active') return !task.is_completed;
  if (filter === 'done') return task.is_completed;
  return true;
}

function assigneeForTaskSpace(
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
    throw new Error('Invalid task assignee');
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

export function buildTaskFeed(allTasks: Task[], filter: TaskFeedFilter = 'all'): TaskFeedItem[] {
  return allTasks
    .filter((task) => matchesTaskFeedFilter(task, filter))
    .sort(compareTaskFeedItems);
}

export function buildTaskFeedViewState(
  allTasks: Task[],
  filter: TaskFeedFilter = 'all',
): TaskFeedViewState {
  const items = buildTaskFeed(allTasks, filter);
  if (items.length > 0) {
    return { items, emptyState: null };
  }
  return {
    items,
    emptyState: {
      title: filter === 'done' ? 'No completed tasks' : filter === 'active' ? 'No active tasks' : 'No tasks yet',
      description:
        filter === 'done'
          ? 'Completed tasks will appear here once you finish them.'
          : filter === 'active'
            ? 'Active tasks will show up here as soon as they are added.'
            : 'Add your first task to get started.',
      actionLabel: 'Add Task',
    },
  };
}

type UseTasksOptions = {
  enabled?: boolean;
};

export function useTasks(options: UseTasksOptions = {}) {
  const enabled = options.enabled ?? true;
  const { activeCouple, user, members, personalSpaceId, sharedSpaceId } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const readableSpaceIds = uniqueSpaceIds([personalSpaceId ?? coupleId, sharedSpaceId ?? coupleId]);
  const userId = user?.id ?? null;
  const assignableUserIds = useMemo(() => assignableMemberIds(userId, members), [userId, members]);
  const pendingToggleRef = useRef(new Set<string>());

  const { data, isLoading: queryLoading } = db.useQuery(
    enabled && readableSpaceIds.length > 0
      ? {
          tasks: {
            $: { where: relationWhere('couple', readableSpaceIds) },
            couple: {},
            list: { couple: {} },
            createdBy: {},
            assignedTo: {},
            completedBy: {},
          },
        }
      : null,
  );

  const allTasks = useMemo(
    () =>
      (data?.tasks ?? [])
        .filter(taskBelongsToListSpace)
        .filter((task: any) => taskVisibleForPersonalSpace(task, personalSpaceId, userId))
        .map(toTaskRow),
    [data?.tasks, personalSpaceId, userId],
  );
  const taskById = useMemo(() => new Map(allTasks.map((task) => [task.id, task])), [allTasks]);
  const taskFeed = useMemo(() => buildTaskFeed(allTasks, 'all'), [allTasks]);

  const getTaskFeed = useCallback(
    (filter: TaskFeedFilter = 'all') => buildTaskFeed(allTasks, filter),
    [allTasks],
  );

  const createTask = useCallback(
    async (_input: TaskCreateInput) => {
      // Tasks are list-owned; useTaskItems(listId).create is the write path.
      return undefined;
    },
    [],
  );

  const updateTask = useCallback(
    async (taskId: string, input: TaskUpdateInput) => {
      const current = taskById.get(taskId);
      if (!current) throw new Error('Task not found');
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.notes !== undefined) updates.notes = input.notes ?? null;
      if (input.category !== undefined) updates.category = input.category ?? null;
      if (input.due_date !== undefined) updates.dueDate = validateTaskDueDate(input.due_date) ?? null;
      if (input.priority !== undefined) {
        assertValidPriority(input.priority);
        updates.priority = input.priority;
      }
      const nextAssignedTo = input.assigned_to !== undefined
        ? assigneeForTaskSpace(
            input.assigned_to,
            current?.couple_id ?? null,
            personalSpaceId,
            userId,
            assignableUserIds,
          )
        : undefined;
      const txns: any[] = [db.tx.tasks[taskId].update(updates)];
      if (input.assigned_to !== undefined) {
        if (nextAssignedTo === null) {
          if (current?.assigned_to) {
            txns.push(db.tx.tasks[taskId].unlink({ assignedTo: current.assigned_to }));
          }
        } else {
          txns.push(db.tx.tasks[taskId].link({ assignedTo: nextAssignedTo }));
        }
      }
      await db.transact(txns);
    },
    [assignableUserIds, personalSpaceId, taskById, userId],
  );

  const toggleTask = useCallback(
    async (task: Pick<Task, 'id' | 'is_completed'>) => {
      if (pendingToggleRef.current.has(task.id)) return;
      const current = taskById.get(task.id);
      if (!current) throw new Error('Task not found');
      pendingToggleRef.current.add(task.id);
      try {
        const isNowCompleted = !current.is_completed;
        const txns: any[] = [
          db.tx.tasks[task.id].update({
            isCompleted: isNowCompleted,
            completedAt: isNowCompleted ? Date.now() : null,
            updatedAt: Date.now(),
          }),
        ];
        if (isNowCompleted && userId) {
          txns.push(db.tx.tasks[task.id].link({ completedBy: userId }));
        } else {
          if (current?.completed_by) {
            txns.push(db.tx.tasks[task.id].unlink({ completedBy: current.completed_by }));
          }
        }
        await db.transact(txns);
      } finally {
        pendingToggleRef.current.delete(task.id);
      }
    },
    [userId, taskById],
  );

  const deleteTask = useCallback(async (taskId: string) => {
    if (!taskById.has(taskId)) throw new Error('Task not found');
    await db.transact(db.tx.tasks[taskId].delete());
  }, [taskById]);

  return {
    allTasks,
    taskFeed,
    getTaskFeed,
    lists: [] as { id: string; name: string; icon?: string | null; color: string }[],
    isLoading: enabled && readableSpaceIds.length > 0 && queryLoading,
    createTask,
    createTaskInDefaultList: createTask,
    updateTask,
    toggleTask,
    deleteTask,
    refetch: async () => {},
  };
}

export function useTaskItems(listId: string | null) {
  const { activeCouple, user, members, personalSpaceId, sharedSpaceId } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const readableSpaceIds = uniqueSpaceIds([personalSpaceId ?? coupleId, sharedSpaceId ?? coupleId]);
  const userId = user?.id ?? null;
  const assignableUserIds = useMemo(() => assignableMemberIds(userId, members), [userId, members]);
  const safeListId = safeInstantId(listId);
  const pendingToggleRef = useRef(new Set<string>());

  const { data, isLoading: queryLoading, error } = db.useQuery(
    readableSpaceIds.length > 0 && safeListId
      ? {
          taskLists: {
            $: {
              where: {
                id: safeListId,
                ...(relationWhere('couple', readableSpaceIds) ?? {}),
              },
            },
            couple: {},
          },
          tasks: {
            $: {
              where: {
                'list.id': safeListId,
                ...(relationWhere('couple', readableSpaceIds) ?? {}),
              },
            },
            list: {},
            couple: {},
            createdBy: {},
            assignedTo: {},
            completedBy: {},
          },
        }
      : null,
  );

  const listSpaceId = firstRel((data?.taskLists ?? [])[0]?.couple)?.id ?? null;

  // sortOrder is not indexed in the schema so the server can't order by it.
  // Sort client-side by sortOrder ascending, falling back to createdAt.
  const tasks = useMemo(
    () =>
      listSpaceId
        ? (data?.tasks ?? [])
            .filter((task: any) => taskVisibleForPersonalSpace(task, personalSpaceId, userId, listSpaceId))
            .map(toTaskRow)
            .filter((task) => task.couple_id === listSpaceId)
            .sort((a, b) => {
              const ao = a.sort_order ?? 0;
              const bo = b.sort_order ?? 0;
              if (ao !== bo) return ao - bo;
              return a.created_at.localeCompare(b.created_at);
            })
        : [],
    [data?.tasks, listSpaceId, personalSpaceId, userId],
  );

  const counts = useMemo(() => {
    const completed = tasks.filter((t) => t.is_completed).length;
    return { total: tasks.length, completed };
  }, [tasks]);

  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  const create = useCallback(
    async (input: {
      title: string;
      notes?: string | null;
      due_date?: string | null;
      priority?: number;
      assigned_to?: string | null;
    }) => {
      if (readableSpaceIds.length === 0) throw new Error('No active space');
      if (!safeListId) throw new Error('Task list not found');
      if (!listSpaceId) throw new Error('Task list not found');
      if (!userId) throw new Error('No current user');
      const dueDate = validateTaskDueDate(input.due_date);
      assertValidPriority(input.priority);
      const targetSpaceId = listSpaceId;
      const assignedTo = assigneeForTaskSpace(
        input.assigned_to,
        targetSpaceId,
        personalSpaceId,
        userId,
        assignableUserIds,
      );
      const taskId = id();
      const now = Date.now();
      const txn = db.tx.tasks[taskId]
        .update({
          title: input.title,
          notes: input.notes ?? undefined,
          isCompleted: false,
          priority: input.priority ?? 0,
          sortOrder: tasks.length,
          dueDate: dueDate ?? undefined,
          createdAt: now,
          updatedAt: now,
        })
        .link({ couple: targetSpaceId, createdBy: userId, list: safeListId });
      const txns: any[] = [txn];
      if (assignedTo) {
        txns.push(db.tx.tasks[taskId].link({ assignedTo }));
      }
      await db.transact(txns);
      return taskId;
    },
    [assignableUserIds, listSpaceId, readableSpaceIds, userId, safeListId, tasks.length, personalSpaceId],
  );

  const update = useCallback(
    async (
      taskId: string,
      input: Partial<{
        title: string;
        notes: string | null;
        due_date: string | null;
        priority: number;
        assigned_to: string | null;
      }>,
    ) => {
      const current = taskById.get(taskId);
      if (!current) throw new Error('Task not found');
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.notes !== undefined) updates.notes = input.notes ?? null;
      if (input.due_date !== undefined) updates.dueDate = validateTaskDueDate(input.due_date) ?? null;
      if (input.priority !== undefined) {
        assertValidPriority(input.priority);
        updates.priority = input.priority;
      }
      const nextAssignedTo = input.assigned_to !== undefined
        ? assigneeForTaskSpace(
            input.assigned_to,
            current.couple_id ?? listSpaceId,
            personalSpaceId,
            userId,
            assignableUserIds,
          )
        : undefined;
      const txns: any[] = [db.tx.tasks[taskId].update(updates)];
      if (input.assigned_to !== undefined) {
        if (nextAssignedTo === null) {
          if (current.assigned_to) {
            txns.push(
              db.tx.tasks[taskId].unlink({ assignedTo: current.assigned_to }),
            );
          }
        } else {
          txns.push(db.tx.tasks[taskId].link({ assignedTo: nextAssignedTo }));
        }
      }
      await db.transact(txns);
    },
    [assignableUserIds, listSpaceId, personalSpaceId, taskById, userId],
  );

  const toggleComplete = useCallback(
    async (task: Pick<Task, 'id' | 'is_completed'>) => {
      const current = taskById.get(task.id);
      if (!current) throw new Error('Task not found');
      const key = task.id;
      if (pendingToggleRef.current.has(key)) return;
      pendingToggleRef.current.add(key);
      const isNowCompleted = !current.is_completed;
      try {
        const txns: any[] = [
          db.tx.tasks[task.id].update({
            isCompleted: isNowCompleted,
            completedAt: isNowCompleted ? Date.now() : null,
            updatedAt: Date.now(),
          }),
        ];
        if (isNowCompleted && userId) {
          txns.push(db.tx.tasks[task.id].link({ completedBy: userId }));
        } else {
          if (current.completed_by) {
            txns.push(
              db.tx.tasks[task.id].unlink({ completedBy: current.completed_by }),
            );
          }
        }
        await db.transact(txns);
      } finally {
        pendingToggleRef.current.delete(key);
      }
    },
    [userId, taskById],
  );

  const remove = useCallback(async (taskId: string) => {
    if (!taskById.has(taskId)) throw new Error('Task not found');
    await db.transact(db.tx.tasks[taskId].delete());
  }, [taskById]);

  const reorder = useCallback(async (idsInOrder: string[]) => {
    if (idsInOrder.length === 0) return;
    if (idsInOrder.some((taskId) => !taskById.has(taskId))) {
      throw new Error('Task not found');
    }
    const now = Date.now();
    const txns = idsInOrder.map((taskId, index) =>
      db.tx.tasks[taskId].update({ sortOrder: index, updatedAt: now }),
    );
    await db.transact(txns);
  }, [taskById]);

  return {
    tasks,
    counts,
    isLoading: readableSpaceIds.length > 0 && !!safeListId && queryLoading,
    error,
    create,
    update,
    toggleComplete,
    remove,
    reorder,
  };
}

function firstRel<T extends { id?: string }>(rel: Array<T> | T | undefined | null): T | undefined {
  if (!rel) return undefined;
  return Array.isArray(rel) ? rel[0] : rel;
}

function taskVisibleForPersonalSpace(
  task: any,
  personalSpaceId: string | null | undefined,
  userId: string | null | undefined,
  fallbackSpaceId: string | null | undefined = null,
) {
  const directSpaceId = firstRel(task.couple)?.id ?? null;
  const parentList = firstRel(task.list);
  const parentSpaceId = firstRel((parentList as any)?.couple)?.id ?? null;
  const owningSpaceId = directSpaceId ?? parentSpaceId ?? fallbackSpaceId ?? null;
  const creatorId = firstRel(task.createdBy)?.id ?? null;
  return !(personalSpaceId && owningSpaceId === personalSpaceId && creatorId && creatorId !== userId);
}
