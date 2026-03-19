import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { useCoupleStore } from '@/src/stores/coupleStore';
import { useRealtime } from './useRealtime';
import { Reminder } from '@/src/types/database';

type ReminderInput = {
  title: string;
  description?: string | null;
  due_at: string;
  recurrence?: string | null;
  priority?: number;
  category?: string | null;
  assigned_to?: string | null;
};

export function useReminders() {
  const userId = useAuthStore((s) => s.user?.id);
  const coupleId = useCoupleStore((s) => s.coupleId);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!coupleId) return;
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('couple_id', coupleId)
      .order('due_at', { ascending: true });

    setReminders((data as Reminder[]) ?? []);
    setIsLoading(false);
  }, [coupleId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useRealtime<Reminder>(
    'reminders',
    (record) => {
      setReminders((prev) =>
        prev.some((r) => r.id === record.id) ? prev : [...prev, record],
      );
    },
    (record) => {
      setReminders((prev) =>
        prev.map((r) => (r.id === record.id ? record : r)),
      );
    },
    (record) => {
      setReminders((prev) => prev.filter((r) => r.id !== record.id));
    },
  );

  const create = useCallback(
    async (data: ReminderInput) => {
      if (!coupleId || !userId) return;
      // Optimistic: add temp item immediately
      const tempId = 'temp-' + Date.now();
      const optimistic = {
        id: tempId,
        ...data,
        couple_id: coupleId,
        created_by: userId,
        priority: data.priority ?? 0,
        is_completed: false,
        completed_at: null,
        completed_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Reminder;
      setReminders((prev) => [...prev, optimistic]);

      const { data: inserted, error } = await supabase.from('reminders').insert({
        ...data,
        couple_id: coupleId,
        created_by: userId,
        priority: data.priority ?? 0,
      } as any).select().single();

      if (error) {
        console.warn('[Coupl] Create reminder failed:', error.message);
        setReminders((prev) => prev.filter((r) => r.id !== tempId));
      } else if (inserted) {
        // Replace temp with real
        setReminders((prev) => prev.map((r) => r.id === tempId ? (inserted as Reminder) : r));
      }
    },
    [coupleId, userId],
  );

  const update = useCallback(
    async (id: string, data: Partial<ReminderInput>) => {
      const { error } = await supabase
        .from('reminders')
        .update(data as never)
        .eq('id', id);
      if (error) console.warn('[Coupl] Update reminder failed:', error.message);
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (error) {
      console.warn('[Coupl] Delete reminder failed:', error.message);
      fetch();
    }
  }, [fetch]);

  const toggleComplete = useCallback(
    async (reminder: Reminder) => {
      if (!userId) return;
      const now = new Date().toISOString();
      const updates = reminder.is_completed
        ? { is_completed: false, completed_at: null, completed_by: null }
        : { is_completed: true, completed_at: now, completed_by: userId };

      // Optimistic
      setReminders((prev) =>
        prev.map((r) => (r.id === reminder.id ? { ...r, ...updates } : r)),
      );

      const { error } = await supabase
        .from('reminders')
        .update(updates as never)
        .eq('id', reminder.id);

      if (error) {
        console.warn('[Coupl] Toggle reminder failed:', error.message);
        fetch();
      }
    },
    [userId, fetch],
  );

  const upcoming = reminders.filter((r) => !r.is_completed);
  const completed = reminders.filter((r) => r.is_completed);

  return { reminders, upcoming, completed, isLoading, create, update, remove, toggleComplete };
}
