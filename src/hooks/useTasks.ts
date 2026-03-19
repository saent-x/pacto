import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { useCoupleStore } from '@/src/stores/coupleStore';
import { useRealtime } from './useRealtime';
import { TaskList, Task } from '@/src/types/database';

// ── Task Lists ──

type ListInput = {
  name: string;
  icon?: string;
  color?: string;
};

export function useTasks() {
  const userId = useAuthStore((s) => s.user?.id);
  const coupleId = useCoupleStore((s) => s.coupleId);

  const [lists, setLists] = useState<TaskList[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!coupleId) return;
    const [listsRes, tasksRes] = await Promise.all([
      supabase
        .from('task_lists')
        .select('*')
        .eq('couple_id', coupleId)
        .order('sort_order'),
      supabase
        .from('tasks')
        .select('*')
        .eq('couple_id', coupleId),
    ]);

    setLists((listsRes.data as TaskList[]) ?? []);
    setAllTasks((tasksRes.data as Task[]) ?? []);
    setIsLoading(false);
  }, [coupleId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useRealtime<TaskList>(
    'task_lists',
    (r) => setLists((prev) => prev.some((l) => l.id === r.id) ? prev : [...prev, r]),
    (r) => setLists((prev) => prev.map((l) => (l.id === r.id ? r : l))),
    (r) => setLists((prev) => prev.filter((l) => l.id !== r.id)),
  );

  useRealtime<Task>(
    'tasks',
    (r) => setAllTasks((prev) => prev.some((t) => t.id === r.id) ? prev : [...prev, r]),
    (r) => setAllTasks((prev) => prev.map((t) => (t.id === r.id ? r : t))),
    (r) => setAllTasks((prev) => prev.filter((t) => t.id !== r.id)),
  );

  const getListCounts = useCallback(
    (listId: string) => {
      const items = allTasks.filter((t) => t.list_id === listId);
      return {
        total: items.length,
        completed: items.filter((t) => t.is_completed).length,
      };
    },
    [allTasks],
  );

  const createList = useCallback(
    async (data: ListInput) => {
      if (!coupleId || !userId) return;
      const tempId = 'temp-' + Date.now();
      const optimistic = {
        id: tempId,
        name: data.name,
        icon: data.icon ?? '📋',
        color: data.color ?? '#7BA08A',
        couple_id: coupleId,
        created_by: userId,
        sort_order: lists.length,
        created_at: new Date().toISOString(),
      } as TaskList;
      setLists((prev) => [...prev, optimistic]);

      const { data: inserted, error } = await supabase.from('task_lists').insert({
        name: data.name,
        icon: data.icon ?? '📋',
        color: data.color ?? '#7BA08A',
        couple_id: coupleId,
        created_by: userId,
        sort_order: lists.length,
      } as any).select().single();

      if (error) {
        console.warn('[Coupl] Create list failed:', error.message);
        setLists((prev) => prev.filter((l) => l.id !== tempId));
      } else if (inserted) {
        setLists((prev) => prev.map((l) => l.id === tempId ? (inserted as TaskList) : l));
      }
    },
    [coupleId, userId, lists.length],
  );

  const deleteList = useCallback(
    async (id: string) => {
      setLists((prev) => prev.filter((l) => l.id !== id));
      const { error } = await supabase.from('task_lists').delete().eq('id', id);
      if (error) {
        console.warn('[Coupl] Delete list failed:', error.message);
        fetchAll();
      }
    },
    [fetchAll],
  );

  return { lists, allTasks, isLoading, getListCounts, createList, deleteList, refetch: fetchAll };
}

// ── Tasks within a list ──

type TaskInput = {
  title: string;
  notes?: string | null;
  due_date?: string | null;
  priority?: number;
  assigned_to?: string | null;
};

export function useTaskItems(listId: string) {
  const userId = useAuthStore((s) => s.user?.id);
  const coupleId = useCoupleStore((s) => s.coupleId);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!listId || !coupleId) return;
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('list_id', listId)
      .order('sort_order');

    setTasks((data as Task[]) ?? []);
    setIsLoading(false);
  }, [listId, coupleId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Realtime: filter by list_id client-side
  useRealtime<Task>(
    'tasks',
    (r) => {
      if (r.list_id === listId) {
        setTasks((prev) => prev.some((t) => t.id === r.id) ? prev : [...prev, r]);
      }
    },
    (r) => {
      if (r.list_id === listId) {
        setTasks((prev) => prev.map((t) => (t.id === r.id ? r : t)));
      }
    },
    (r) => {
      setTasks((prev) => prev.filter((t) => t.id !== r.id));
    },
  );

  const create = useCallback(
    async (data: TaskInput) => {
      if (!coupleId || !userId) return;
      const tempId = 'temp-' + Date.now();
      const optimistic = {
        id: tempId,
        ...data,
        list_id: listId,
        couple_id: coupleId,
        created_by: userId,
        priority: data.priority ?? 0,
        sort_order: tasks.length,
        is_completed: false,
        completed_at: null,
        completed_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Task;
      setTasks((prev) => [...prev, optimistic]);

      const { data: inserted, error } = await supabase.from('tasks').insert({
        ...data,
        list_id: listId,
        couple_id: coupleId,
        created_by: userId,
        priority: data.priority ?? 0,
        sort_order: tasks.length,
      } as any).select().single();

      if (error) {
        console.warn('[Coupl] Create task failed:', error.message);
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
      } else if (inserted) {
        setTasks((prev) => prev.map((t) => t.id === tempId ? (inserted as Task) : t));
      }
    },
    [coupleId, userId, listId, tasks.length],
  );

  const update = useCallback(
    async (id: string, data: Partial<TaskInput>) => {
      const { error } = await supabase
        .from('tasks')
        .update(data as never)
        .eq('id', id);
      if (error) console.warn('[Coupl] Update task failed:', error.message);
    },
    [],
  );

  const remove = useCallback(
    async (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) {
        console.warn('[Coupl] Delete task failed:', error.message);
        fetch();
      }
    },
    [fetch],
  );

  const toggleComplete = useCallback(
    async (task: Task) => {
      if (!userId) return;
      const updates = task.is_completed
        ? { is_completed: false, completed_at: null, completed_by: null }
        : { is_completed: true, completed_at: new Date().toISOString(), completed_by: userId };

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, ...updates } : t)),
      );

      const { error } = await supabase
        .from('tasks')
        .update(updates as never)
        .eq('id', task.id);

      if (error) {
        console.warn('[Coupl] Toggle task failed:', error.message);
        fetch();
      }
    },
    [userId, fetch],
  );

  const counts = {
    total: tasks.length,
    completed: tasks.filter((t) => t.is_completed).length,
  };

  return { tasks, isLoading, counts, create, update, remove, toggleComplete };
}
