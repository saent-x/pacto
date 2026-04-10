import { useCallback, useMemo } from 'react';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { makeFunctionReference } from 'convex/server';

import { useSession } from './useSession';
import type { Database, TaskList, Task } from '@/src/types/database';

type ListInput = {
  name: string;
  icon?: string;
  color?: string;
};

type TaskUpdateInput = Database['public']['Tables']['tasks']['Update'];
type TaskCreateInput = {
  title: string;
  list_id: string;
  notes?: string | null;
  due_date?: string | null;
  priority?: number;
  assigned_to?: string | null;
};

type TaskFeedFilter = 'all' | 'active' | 'done';

type TaskListSummary = Pick<TaskList, 'id' | 'name' | 'color' | 'icon'>;

type TaskListDoc = {
  _id: string;
  coupleId: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  createdBy: string;
  createdAt: number;
};

type TaskDoc = {
  _id: string;
  listId: string;
  coupleId: string;
  title: string;
  notes: string | null;
  isCompleted: boolean;
  completedAt: number | null;
  completedBy: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  priority: number;
  sortOrder: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
};

type TaskBoard = {
  lists: TaskListDoc[];
  tasks: TaskDoc[];
};

const getTaskBoardQuery = makeFunctionReference<'query', {}, TaskBoard>('tasks:getTaskBoard');
const getTasksForListQuery = makeFunctionReference<'query', { listId: string }, TaskDoc[]>('tasks:getTasksForList');
const createTaskListMutation = makeFunctionReference<
  'mutation',
  { name: string; icon?: string; color?: string },
  TaskListDoc
>('tasks:createTaskList');
const deleteTaskListMutation = makeFunctionReference<'mutation', { listId: string }, null>('tasks:deleteTaskList');
const createTaskMutation = makeFunctionReference<
  'mutation',
  {
    listId: string;
    title: string;
    notes?: string | null;
    dueDate?: string | null;
    priority?: number;
    assignedTo?: string | null;
  },
  TaskDoc
>('tasks:createTask');
const createTaskWithDefaultListMutation = makeFunctionReference<
  'mutation',
  {
    title: string;
    notes?: string | null;
    dueDate?: string | null;
    priority?: number;
    assignedTo?: string | null;
  },
  TaskDoc
>('tasks:createTaskWithDefaultList');
const updateTaskMutation = makeFunctionReference<
  'mutation',
  {
    taskId: string;
    title?: string;
    notes?: string | null;
    dueDate?: string | null;
    priority?: number;
    assignedTo?: string | null;
    listId?: string;
  },
  TaskDoc
>('tasks:updateTask');
const toggleTaskMutation = makeFunctionReference<'mutation', { taskId: string }, TaskDoc>('tasks:toggleTask');
const deleteTaskMutation = makeFunctionReference<'mutation', { taskId: string }, null>('tasks:deleteTask');

export type TaskFeedItem = Task & {
  list: TaskListSummary | null;
};

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

function toTaskListRow(list: TaskListDoc): TaskList {
  return {
    id: list._id,
    couple_id: list.coupleId,
    name: list.name,
    icon: list.icon,
    color: list.color,
    sort_order: list.sortOrder,
    created_by: list.createdBy,
    created_at: toIso(list.createdAt),
  };
}

function toTaskRow(task: TaskDoc): Task {
  return {
    id: task._id,
    list_id: task.listId,
    couple_id: task.coupleId,
    title: task.title,
    notes: task.notes,
    is_completed: task.isCompleted,
    completed_at: task.completedAt === null ? null : toIso(task.completedAt),
    completed_by: task.completedBy,
    assigned_to: task.assignedTo,
    due_date: task.dueDate,
    priority: task.priority,
    sort_order: task.sortOrder,
    created_by: task.createdBy,
    created_at: toIso(task.createdAt),
    updated_at: toIso(task.updatedAt),
  };
}

function toTaskListSummary(list: TaskList | undefined): TaskListSummary | null {
  if (!list) return null;
  return {
    id: list.id,
    name: list.name,
    color: list.color,
    icon: list.icon,
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

  const listComparison = (left.list?.name ?? '').localeCompare(right.list?.name ?? '');
  if (listComparison !== 0) {
    return listComparison;
  }

  const titleComparison = left.title.localeCompare(right.title);
  if (titleComparison !== 0) {
    return titleComparison;
  }

  return left.sort_order - right.sort_order || left.id.localeCompare(right.id);
}

function matchesTaskFeedFilter(task: Task, filter: TaskFeedFilter) {
  if (filter === 'active') {
    return !task.is_completed;
  }

  if (filter === 'done') {
    return task.is_completed;
  }

  return true;
}

export function buildTaskFeed(lists: TaskList[], allTasks: Task[], filter: TaskFeedFilter = 'all'): TaskFeedItem[] {
  const listsById = new Map(lists.map((list) => [list.id, list] as const));

  return allTasks
    .filter((task) => matchesTaskFeedFilter(task, filter))
    .map((task) => ({
      ...task,
      list: toTaskListSummary(listsById.get(task.list_id)),
    }))
    .sort(compareTaskFeedItems);
}

export function buildTaskFeedViewState(
  lists: TaskList[],
  allTasks: Task[],
  filter: TaskFeedFilter = 'all',
): TaskFeedViewState {
  const items = buildTaskFeed(lists, allTasks, filter);

  if (items.length > 0) {
    return { items, emptyState: null };
  }

  if (lists.length === 0) {
    return {
      items,
      emptyState: {
        title: 'No tasks yet',
        description: 'Add your first task and Coupl will create a General list automatically.',
        actionLabel: 'Add Task',
      },
    };
  }

  return {
    items,
    emptyState: {
      title: filter === 'done' ? 'No completed tasks' : filter === 'active' ? 'No active tasks' : 'Nothing here yet',
      description:
        filter === 'done'
          ? 'Completed tasks will appear here once you finish them.'
          : filter === 'active'
            ? 'Active tasks will show up here as soon as they are added.'
            : 'Start by creating a task in one of your lists.',
      actionLabel: 'Add Task',
    },
  };
}

export function useTasks() {
  const { activeCouple } = useSession();
  const convex = useConvex();
  const board = useQuery(getTaskBoardQuery, activeCouple ? {} : 'skip');
  const createTaskList = useMutation(createTaskListMutation);
  const deleteTaskList = useMutation(deleteTaskListMutation);
  const createTaskMutationFn = useMutation(createTaskMutation);
  const createTaskWithDefaultListFn = useMutation(createTaskWithDefaultListMutation);
  const updateTaskMutationFn = useMutation(updateTaskMutation);
  const toggleTaskMutationFn = useMutation(toggleTaskMutation);
  const deleteTaskMutationFn = useMutation(deleteTaskMutation);

  const lists = useMemo(() => (board?.lists ?? []).map(toTaskListRow), [board?.lists]);
  const allTasks = useMemo(() => (board?.tasks ?? []).map(toTaskRow), [board?.tasks]);
  const taskFeed = useMemo(() => buildTaskFeed(lists, allTasks, 'all'), [lists, allTasks]);

  const getTaskFeed = useCallback(
    (filter: TaskFeedFilter = 'all') => buildTaskFeed(lists, allTasks, filter),
    [lists, allTasks],
  );

  const getListCounts = useCallback(
    (listId: string) => {
      const items = allTasks.filter((task) => task.list_id === listId);
      return {
        total: items.length,
        completed: items.filter((task) => task.is_completed).length,
      };
    },
    [allTasks],
  );

  const createList = useCallback(
    async (data: ListInput) => {
      const created = await createTaskList({
        name: data.name,
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
      });
      return toTaskListRow(created);
    },
    [createTaskList],
  );

  const deleteList = useCallback(
    async (id: string) => {
      await deleteTaskList({ listId: id });
    },
    [deleteTaskList],
  );

  const createTask = useCallback(
    async (data: TaskCreateInput) => {
      await createTaskMutationFn({
        listId: data.list_id,
        title: data.title,
        ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
        ...(data.due_date !== undefined ? { dueDate: data.due_date ?? null } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.assigned_to !== undefined ? { assignedTo: data.assigned_to ?? null } : {}),
      });
    },
    [createTaskMutationFn],
  );

  const createTaskInDefaultList = useCallback(
    async (data: Omit<TaskCreateInput, 'list_id'>) => {
      await createTaskWithDefaultListFn({
        title: data.title,
        ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
        ...(data.due_date !== undefined ? { dueDate: data.due_date ?? null } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.assigned_to !== undefined ? { assignedTo: data.assigned_to ?? null } : {}),
      });
    },
    [createTaskWithDefaultListFn],
  );

  const updateTask = useCallback(
    async (id: string, data: TaskUpdateInput) => {
      await updateTaskMutationFn({
        taskId: id,
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
        ...(data.due_date !== undefined ? { dueDate: data.due_date ?? null } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.assigned_to !== undefined ? { assignedTo: data.assigned_to ?? null } : {}),
        ...(data.list_id !== undefined ? { listId: data.list_id } : {}),
      });
    },
    [updateTaskMutationFn],
  );

  const toggleTask = useCallback(
    async (task: Pick<Task, 'id'>) => {
      await toggleTaskMutationFn({ taskId: task.id });
    },
    [toggleTaskMutationFn],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      await deleteTaskMutationFn({ taskId: id });
    },
    [deleteTaskMutationFn],
  );

  return {
    lists,
    allTasks,
    taskFeed,
    getTaskFeed,
    isLoading: !!activeCouple && board === undefined,
    getListCounts,
    createList,
    deleteList,
    createTask,
    createTaskInDefaultList,
    updateTask,
    toggleTask,
    deleteTask,
    refetch: async () => {
      if (!activeCouple) return;
      await convex.query(getTaskBoardQuery, {});
    },
  };
}

type TaskInput = {
  title: string;
  notes?: string | null;
  due_date?: string | null;
  priority?: number;
  assigned_to?: string | null;
  list_id?: string;
};

export function useTaskItems(listId: string) {
  const { activeCouple } = useSession();
  const taskRows = useQuery(getTasksForListQuery, activeCouple && listId ? { listId } : 'skip');
  const createTaskMutationFn = useMutation(createTaskMutation);
  const updateTaskMutationFn = useMutation(updateTaskMutation);
  const deleteTaskMutationFn = useMutation(deleteTaskMutation);
  const toggleTaskMutationFn = useMutation(toggleTaskMutation);

  const tasks = useMemo(() => (taskRows ?? []).map(toTaskRow), [taskRows]);

  const create = useCallback(
    async (data: TaskInput) => {
      await createTaskMutationFn({
        listId: data.list_id ?? listId,
        title: data.title,
        ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
        ...(data.due_date !== undefined ? { dueDate: data.due_date ?? null } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.assigned_to !== undefined ? { assignedTo: data.assigned_to ?? null } : {}),
      });
    },
    [createTaskMutationFn, listId],
  );

  const update = useCallback(
    async (id: string, data: Partial<TaskUpdateInput>) => {
      await updateTaskMutationFn({
        taskId: id,
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
        ...(data.due_date !== undefined ? { dueDate: data.due_date ?? null } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.assigned_to !== undefined ? { assignedTo: data.assigned_to ?? null } : {}),
        ...(data.list_id !== undefined ? { listId: data.list_id } : {}),
      });
    },
    [updateTaskMutationFn],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteTaskMutationFn({ taskId: id });
    },
    [deleteTaskMutationFn],
  );

  const toggleComplete = useCallback(
    async (task: Task) => {
      await toggleTaskMutationFn({ taskId: task.id });
    },
    [toggleTaskMutationFn],
  );

  const counts = {
    total: tasks.length,
    completed: tasks.filter((task) => task.is_completed).length,
  };

  return {
    tasks,
    isLoading: !!activeCouple && taskRows === undefined,
    counts,
    create,
    update,
    remove,
    toggleComplete,
  };
}
