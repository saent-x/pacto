import { useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useCoupleStore } from '@/src/stores/coupleStore';

export function useRealtime<T extends { id: string }>(
  table: string,
  onInsert?: (record: T) => void,
  onUpdate?: (record: T) => void,
  onDelete?: (old: T) => void,
) {
  const coupleId = useCoupleStore((s) => s.coupleId);

  useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel(`${table}:${coupleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && onInsert) {
            onInsert(payload.new as T);
          }
          if (payload.eventType === 'UPDATE' && onUpdate) {
            onUpdate(payload.new as T);
          }
          if (payload.eventType === 'DELETE' && onDelete) {
            onDelete(payload.old as T);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, table]);
}
