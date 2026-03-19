import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { useCoupleStore } from '@/src/stores/coupleStore';
import { useRealtime } from './useRealtime';
import { JournalEntry } from '@/src/types/database';

type EntryInput = {
  title?: string | null;
  body: string;
  mood?: string | null;
  is_private?: boolean;
  entry_date: string;
};

export type JournalFilter = 'all' | 'shared' | 'private';

export function useJournal() {
  const userId = useAuthStore((s) => s.user?.id);
  const coupleId = useCoupleStore((s) => s.coupleId);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<JournalFilter>('all');

  const fetchEntries = useCallback(async () => {
    if (!coupleId || !userId) return;

    // RLS handles privacy — partner's private entries are automatically excluded
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('couple_id', coupleId)
      .order('entry_date', { ascending: false });

    setEntries((data as JournalEntry[]) ?? []);
    setIsLoading(false);
  }, [coupleId, userId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useRealtime<JournalEntry>(
    'journal_entries',
    (record) => {
      // Only add if not partner's private entry
      if (record.author_id !== userId && record.is_private) return;
      setEntries((prev) =>
        prev.some((e) => e.id === record.id) ? prev : [record, ...prev],
      );
    },
    (record) => {
      if (record.author_id !== userId && record.is_private) {
        // Partner made it private — remove from our view
        setEntries((prev) => prev.filter((e) => e.id !== record.id));
        return;
      }
      setEntries((prev) =>
        prev.map((e) => (e.id === record.id ? record : e)),
      );
    },
    (record) => {
      setEntries((prev) => prev.filter((e) => e.id !== record.id));
    },
  );

  const create = useCallback(
    async (data: EntryInput) => {
      if (!coupleId || !userId) return;
      const tempId = 'temp-' + Date.now();
      const optimistic = {
        id: tempId,
        ...data,
        couple_id: coupleId,
        author_id: userId,
        is_private: data.is_private ?? false,
        media_urls: [],
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as JournalEntry;
      setEntries((prev) => [optimistic, ...prev]);

      const { data: inserted, error } = await supabase.from('journal_entries').insert({
        ...data,
        couple_id: coupleId,
        author_id: userId,
        is_private: data.is_private ?? false,
      } as any).select().single();

      if (error) {
        console.warn('[Coupl] Create entry failed:', error.message);
        setEntries((prev) => prev.filter((e) => e.id !== tempId));
      } else if (inserted) {
        setEntries((prev) => prev.map((e) => e.id === tempId ? (inserted as JournalEntry) : e));
      }
    },
    [coupleId, userId],
  );

  const update = useCallback(
    async (id: string, data: Partial<EntryInput>) => {
      const { error } = await supabase
        .from('journal_entries')
        .update(data as never)
        .eq('id', id);
      if (error) console.warn('[Coupl] Update entry failed:', error.message);
    },
    [],
  );

  const remove = useCallback(
    async (id: string) => {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      const { error } = await supabase.from('journal_entries').delete().eq('id', id);
      if (error) {
        console.warn('[Coupl] Delete entry failed:', error.message);
        fetchEntries();
      }
    },
    [fetchEntries],
  );

  // Apply filter
  const filtered = entries.filter((e) => {
    if (filter === 'shared') return !e.is_private;
    if (filter === 'private') return e.author_id === userId && e.is_private;
    return true;
  });

  return { entries: filtered, allEntries: entries, isLoading, filter, setFilter, create, update, remove };
}
