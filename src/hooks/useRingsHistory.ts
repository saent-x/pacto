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

const RING_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

type UseRingsHistoryOptions = {
  now?: Date | number;
};

export function useRingsHistory(options: UseRingsHistoryOptions = {}) {
  const { activeCouple, membership } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const membershipId = membership?.id ?? null;
  const historyWindow = useMemo(
    () => previousAndCurrentMonthWindow(options.now),
    [options.now],
  );

  const { data, isLoading: queryLoading, error } = db.useQuery(
    coupleId && membershipId
      ? {
          ringsHistory: {
            $: {
              where: {
                'couple.id': coupleId,
                'membership.id': membershipId,
                dateKey: { $gte: historyWindow.startKey, $lte: historyWindow.endKey },
              },
              order: { dateKey: 'asc' },
              limit: historyWindow.limit,
            },
          },
        }
      : null,
  );

  const rows = useMemo<RingsHistoryRow[]>(
    () => (data?.ringsHistory ?? []) as RingsHistoryRow[],
    [data?.ringsHistory],
  );

  const byDateKey = useMemo(() => {
    const m = new Map<string, RingValues>();
    for (const r of rows) {
      if (!isValidRingDateKey(r.dateKey)) continue;
      m.set(r.dateKey, {
        connect: normalizeRingValue(r.connectValue),
        shared: normalizeRingValue(r.sharedValue),
        present: normalizeRingValue(r.presentValue),
      });
    }
    return m;
  }, [rows]);

  const upsert = useCallback(
    async (dateKey: string, v: RingValues) => {
      if (!coupleId || !membershipId) return;
      if (!isValidRingDateKey(dateKey)) {
        throw new Error('Ring date is invalid');
      }
      if (!areValidRingValues(v)) {
        throw new Error('Ring values must be between 0 and 1');
      }
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
          .link({ couple: coupleId, membership: membershipId }),
      );
    },
    [coupleId, membershipId, rows],
  );

  return {
    byDateKey,
    rows,
    isLoading: !!coupleId && !!membershipId && queryLoading,
    error,
    upsert,
  };
}

function isValidRingDateKey(value: string): boolean {
  const match = RING_DATE_RE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function areValidRingValues(values: RingValues): boolean {
  return [values.connect, values.shared, values.present].every((value) =>
    value === undefined || (Number.isFinite(value) && value >= 0 && value <= 1),
  );
}

function normalizeRingValue(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : undefined;
}

function previousAndCurrentMonthWindow(nowInput?: Date | number) {
  const now = validDate(nowInput) ?? new Date();
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startKey: formatDateKey(previousMonthStart),
    endKey: formatDateKey(currentMonthEnd),
    limit: daysInclusive(previousMonthStart, currentMonthEnd),
  };
}

function validDate(value: Date | number | undefined): Date | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  return null;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysInclusive(start: Date, end: Date) {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(1, Math.floor((endUtc - startUtc) / (24 * 60 * 60 * 1000)) + 1);
}
