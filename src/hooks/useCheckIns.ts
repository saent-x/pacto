import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { db, id } from '@/src/lib/instant';
import { useEncryption } from './useEncryption';
import { useSession } from './useSession';

export type CheckInRecord = {
  id: string;
  authorId: string;
  mood: string | null;
  note: string | null;
  isPrivate: boolean;
  checkInDate: string;
  createdAt: number;
};

export function getLocalDateKey(date: Date = new Date()) {
  return format(date, 'yyyy-MM-dd');
}

export function useCheckIns() {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const userId = user?.id ?? null;
  const { encrypt, decrypt, hasKey } = useEncryption();
  const today = getLocalDateKey();

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? {
          checkIns: {
            $: { where: { 'couple.id': coupleId } },
            author: {},
          },
        }
      : null,
  );

  const rawCheckIns = useMemo<CheckInRecord[]>(() => {
    return (data?.checkIns ?? []).map((c) => ({
      id: c.id,
      authorId: (c.author as any)?.[0]?.id ?? (c.author as any)?.id ?? '',
      mood: c.mood ?? null,
      note: c.note ?? null,
      isPrivate: c.isPrivate,
      checkInDate: c.checkInDate,
      createdAt: c.createdAt,
    }));
  }, [data?.checkIns]);

  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function decryptRecords(items: CheckInRecord[]) {
      const decrypted = await Promise.all(
        items.map(async (item) => ({
          ...item,
          note: item.note ? await decrypt(item.note) : item.note,
        })),
      );
      if (!cancelled) setCheckIns(decrypted);
    }
    if (hasKey) {
      void decryptRecords(rawCheckIns);
    } else {
      setCheckIns(rawCheckIns);
    }
    return () => {
      cancelled = true;
    };
  }, [decrypt, hasKey, rawCheckIns]);

  const createOrUpdate = useCallback(
    async (input: {
      mood: string | null;
      note: string | null;
      isPrivate: boolean;
      checkInDate?: string;
    }) => {
      if (!coupleId || !userId || submittingRef.current) return;
      submittingRef.current = true;
      setIsSubmitting(true);
      try {
        const dateKey = input.checkInDate ?? today;
        // Find existing check-in for this user+date to upsert
        const existing = checkIns.find(
          (c) => c.authorId === userId && c.checkInDate === dateKey,
        );
        const now = Date.now();
        if (existing) {
          await db.transact(
            db.tx.checkIns[existing.id].update({
              mood: input.mood ?? null,
              note: input.note ? await encrypt(input.note) : null,
              isPrivate: input.isPrivate,
              updatedAt: now,
            }),
          );
        } else {
          const checkInId = id();
          await db.transact(
            db.tx.checkIns[checkInId]
              .update({
                mood: input.mood ?? undefined,
                note: input.note ? await encrypt(input.note) : undefined,
                checkInDate: dateKey,
                isPrivate: input.isPrivate,
                createdAt: now,
                updatedAt: now,
              })
              .link({ couple: coupleId, author: userId }),
          );
        }
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [coupleId, userId, encrypt, today, checkIns],
  );

  const remove = useCallback(async (checkInId: string) => {
    await db.transact(db.tx.checkIns[checkInId].delete());
  }, []);

  const myTodayCheckIn = useMemo(
    () =>
      checkIns.find(
        (record) =>
          record.checkInDate === today && record.authorId === userId,
      ) ?? null,
    [userId, checkIns, today],
  );
  const partnerTodayCheckIn = useMemo(
    () =>
      checkIns.find(
        (record) =>
          record.checkInDate === today && record.authorId !== userId,
      ) ?? null,
    [userId, checkIns, today],
  );

  return {
    today,
    checkIns,
    todayCheckIns: checkIns.filter((record) => record.checkInDate === today),
    myTodayCheckIn,
    partnerTodayCheckIn,
    isLoading: !!coupleId && queryLoading,
    isSubmitting,
    createOrUpdate,
    remove,
    refetch: async () => {},
  };
}
