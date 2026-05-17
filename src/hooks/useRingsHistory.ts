import { useCallback, useMemo } from 'react';
import { db, id } from '@/src/lib/instant';
import { useSession } from './useSession';

export type RingValues = {
  connect?: number;
  shared?: number;
  present?: number;
};

export type RingsHistoryRow = {
  id: string;
  dateKey: string;
  connectValue?: number | null;
  sharedValue?: number | null;
  presentValue?: number | null;
  note?: string | null;
  createdAt: number;
};

export function useRingsHistory() {
  const { activeCouple } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;

  const { data, isLoading: queryLoading, error } = db.useQuery(
    coupleId ? { ringsHistory: { $: { where: { 'couple.id': coupleId } } } } : null,
  );

  const rows = useMemo<RingsHistoryRow[]>(
    () => (data?.ringsHistory ?? []) as RingsHistoryRow[],
    [data?.ringsHistory],
  );

  const byDateKey = useMemo(() => {
    const m = new Map<string, RingValues>();
    for (const r of rows) {
      m.set(r.dateKey, {
        connect: r.connectValue ?? undefined,
        shared: r.sharedValue ?? undefined,
        present: r.presentValue ?? undefined,
      });
    }
    return m;
  }, [rows]);

  const upsert = useCallback(
    async (dateKey: string, v: RingValues) => {
      if (!coupleId) return;
      const existing = rows.find((r) => r.dateKey === dateKey);
      const rowId = existing?.id ?? id();
      await db.transact(
        db.tx.ringsHistory[rowId]
          .update({
            dateKey,
            connectValue: v.connect,
            sharedValue: v.shared,
            presentValue: v.present,
            createdAt: existing ? existing.createdAt : Date.now(),
          })
          .link({ couple: coupleId }),
      );
    },
    [coupleId, rows],
  );

  return {
    byDateKey,
    rows,
    isLoading: !!coupleId && queryLoading,
    error,
    upsert,
  };
}
