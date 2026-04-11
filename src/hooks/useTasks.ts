import { useCallback, useMemo } from 'react';
import { db, id } from '@/src/lib/instant';
import { useSession } from './useSession';
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

function toIso(timestamp: number) {
  return new Date(timestamp).toISOString();
}

function toTaskRow(task: any): Task {
  return {
    id: task.id,
    couple_id: task.couple?.[0]?.id ?? '',
    title: task.title,
    notes: task.notes ?? null,
    category: task.category ?? null,
    is_completed: task.isCompleted,
    completed_at: task.completedAt == null ? null : toIso(task.completedAt),
    completed_by: task.completedBy?.[0]?.id ?? null,
    assigned_to: task.assignedTo?.[0]?.id ?? null,
    due_date: task.dueDate ?? null,
    priority: task.priority,
    sort_order: task.sortOrder,
    created_by: task.createdBy?.[0]?.id ?? '',
    created_at: toIso(task.createdAt),
    updated_at: toIso(task.updatedAt),
  };
}

function parseDueDate(value: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
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

export function useTasks() {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const userId = user?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? {
          tasks: {
            $: { where: { 'couple.id': coupleId } },
            couple: {},
            createdBy: {},
            assignedTo: {},
            completedBy: {},
          },
        }
      : null,
  );

  const allTasks = useMemo(
    () => (data?.tasks ?? []).map(toTaskRow),
    [data?.tasks],
  );
  const taskFeed = useMemo(() => buildTaskFeed(allTasks, 'all'), [allTasks]);

  const getTaskFeed = useCallback(
    (filter: TaskFeedFilter = 'all') => buildTaskFeed(allTasks, filter),
    [allTasks],
  );

  const createTask = useCallback(
    async (input: TaskCreateInput) => {
      if (!coupleId || !userId) return;
      const taskId = id();
      const now = Date.now();
      const txn = db.tx.tasks[taskId]
        .update({
          title: input.title,
          notes: input.notes ?? undefined,
          category: input.category ?? undefined,
          isCompleted: false,
          priority: input.priority ?? 0,
          sortOrder: allTasks.length,
          dueDate: input.due_date ?? undefined,
          createdAt: now,
          updatedAt: now,
        })
        .link({ couple: coupleId, createdBy: userId });
      const txns: any[] = [txn];
      if (input.assigned_to) {
        txns.push(db.tx.tasks[taskId].link({ assignedTo: input.assigned_to }));
      }
      await db.transact(txns);
    },
    [coupleId, userId, allTasks.length],
  );

  const updateTask = useCallback(
    async (taskId: string, input: TaskUpdateInput) => {
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.notes !== undefined) updates.notes = input.notes ?? null;
      if (input.category !== undefined) updates.category = input.category ?? null;
      if (input.due_date !== undefined) updates.dueDate = input.due_date ?? null;
      if (input.priority !== undefined) updates.priority = input.priority;
      const txns: any[] = [db.tx.tasks[taskId].update(updates)];
      if (input.assigned_to !== undefined) {
        if (input.assigned_to === null) {
          const current = allTasks.find((t) => t.id === taskId);
          if (current?.assigned_to) {
            txns.push(db.tx.tasks[taskId].unlink({ assignedTo: current.assigned_to }));
          }
        } else {
          txns.push(db.tx.tasks[taskId].link({ assignedTo: input.assigned_to }));
        }
      }
      await db.transact(txns);
    },
    [allTasks],
  );

  const toggleTask = useCallback(
    async (task: Pick<Task, 'id' | 'is_completed'>) => {
      const isNowCompleted = !task.is_completed;
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
        const current = allTasks.find((t) => t.id === task.id);
        if (current?.completed_by) {
          txns.push(db.tx.tasks[task.id].unlink({ completedBy: current.completed_by }));
        }
      }
      await db.transact(txns);
    },
    [userId, allTasks],
  );

  const deleteTask = useCallback(async (taskId: string) => {
    await db.transact(db.tx.tasks[taskId].delete());
  }, []);

  return {
    allTasks,
    taskFeed,
    getTaskFeed,
    lists: [] as { id: string; name: string; icon?: string | null; color: string }[],
    isLoading: !!coupleId && queryLoading,
    createTask,
    createTaskInDefaultList: createTask,
    updateTask,
    toggleTask,
    deleteTask,
    refetch: async () => {},
  };
}

/**
 * Returns tasks for a specific category (formerly "list").
 */
export function useTaskItems(categoryId: string | null) {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const userId = user?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId && categoryId
      ? {
          tasks: {
            $: { where: { 'couple.id': coupleId, category: categoryId } },
            couple: {},
            createdBy: {},
            assignedTo: {},
            completedBy: {},
          },
        }
      : null,
  );

  const tasks = useMemo(
    () => (data?.tasks ?? []).map(toTaskRow),
    [data?.tasks],
  );

  const counts = useMemo(() => {
    const completed = tasks.filter((t) => t.is_completed).length;
    return { total: tasks.length, completed };
  }, [tasks]);

  const create = useCallback(
    async (input: { title: string; notes?: string | null; due_date?: string | null; priority?: number; assigned_to?: string | null }) => {
      if (!coupleId || !userId || !categoryId) return;
      const taskId = id();
      const now = Date.now();
      const txn = db.tx.tasks[taskId]
        .update({
          title: input.title,
          notes: input.notes ?? undefined,
          category: categoryId,
          isCompleted: false,
          priority: input.priority ?? 0,
          sortOrder: tasks.length,
          dueDate: input.due_date ?? undefined,
          createdAt: now,
          updatedAt: now,
        })
        .link({ couple: coupleId, createdBy: userId });
      const txns: any[] = [txn];
      if (input.assigned_to) {
        txns.push(db.tx.tasks[taskId].link({ assignedTo: input.assigned_to }));
      }
      await db.transact(txns);
    },
    [coupleId, userId, categoryId, tasks.length],
  );

  const update = useCallback(
    async (taskId: string, input: Partial<{ title: string; notes: string | null; due_date: string | null; priority: number; assigned_to: string | null; category: string }>) => {
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.notes !== undefined) updates.notes = input.notes ?? null;
      if (input.category !== undefined) updates.category = input.category ?? null;
      if (input.due_date !== undefined) updates.dueDate = input.due_date ?? null;
      if (input.priority !== undefined) updates.priority = input.priority;
      const txns: any[] = [db.tx.tasks[taskId].update(updates)];
      if (input.assigned_to !== undefined) {
        if (input.assigned_to === null) {
          const current = tasks.find((t) => t.id === taskId);
          if (current?.assigned_to) {
            txns.push(db.tx.tasks[taskId].unlink({ assignedTo: current.assigned_to }));
          }
        } else {
          txns.push(db.tx.tasks[taskId].link({ assignedTo: input.assigned_to }));
        }
      }
      await db.transact(txns);
    },
    [tasks],
  );

  const toggleComplete = useCallback(
    async (task: Pick<Task, 'id' | 'is_completed'>) => {
      const isNowCompleted = !task.is_completed;
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
        const current = tasks.find((t) => t.id === task.id);
        if (current?.completed_by) {
          txns.push(db.tx.tasks[task.id].unlink({ completedBy: current.completed_by }));
        }
      }
      await db.transact(txns);
    },
    [userId, tasks],
  );

  return {
    tasks,
    counts,
    isLoading: !!coupleId && !!categoryId && queryLoading,
    create,
    update,
    toggleComplete,
  };
}
