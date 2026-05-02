import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { db, id } from '@/src/lib/instant';
import { notifySpaceMutation } from '@/src/lib/push';
import { useEncryption } from './useEncryption';
import { useSession } from './useSession';

export type CheckInRecord = {
  id: string;
  authorId: string;
  mood: string | null;
  note: string | null;
  energy: number | null;
  isPrivate: boolean;
  checkInDate: string;
  createdAt: number;
};

function toEnergy(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function getLocalDateKey(date: Date = new Date()) {
  return format(date, 'yyyy-MM-dd');
}

export function useCheckIns(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const { activeCouple, user, space } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const userId = user?.id ?? null;
  const { encrypt, decrypt, hasKey } = useEncryption();
  const today = getLocalDateKey();

  const { data, isLoading: queryLoading } = (db as any).useQuery(
    coupleId && enabled
      ? {
          checkIns: {
            $: { where: { 'couple.id': coupleId } },
            author: {},
          },
        }
      : null,
  );

  const rawCheckIns = useMemo<CheckInRecord[]>(() => {
    return (data?.checkIns ?? []).map((c: any) => ({
      id: c.id,
      authorId: (c.author as any)?.[0]?.id ?? (c.author as any)?.id ?? '',
      mood: c.mood ?? null,
      note: c.note ?? null,
      energy: toEnergy(c.energy),
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
      energy?: number | null;
      isPrivate: boolean;
      checkInDate?: string;
    }) => {
      if (!enabled || !coupleId || !userId || submittingRef.current) return;
      submittingRef.current = true;
      setIsSubmitting(true);
      try {
        const dateKey = input.checkInDate ?? today;
        // Find existing check-in for this user+date to upsert
        const existing = checkIns.find(
          (c) => c.authorId === userId && c.checkInDate === dateKey,
        );
        const now = Date.now();
        const hasEnergy = Object.prototype.hasOwnProperty.call(input, 'energy');
        if (existing) {
          const updatePayload = {
            mood: input.mood ?? null,
            note: input.note ? await encrypt(input.note) : null,
            ...(hasEnergy ? { energy: toEnergy(input.energy) } : {}),
            isPrivate: input.isPrivate,
            updatedAt: now,
          };
          await db.transact(
            (db.tx as any).checkIns[existing.id].update(updatePayload),
          );
        } else {
          const checkInId = id();
          const createPayload = {
            mood: input.mood ?? undefined,
            note: input.note ? await encrypt(input.note) : undefined,
            ...(hasEnergy ? { energy: toEnergy(input.energy) ?? undefined } : {}),
            checkInDate: dateKey,
            isPrivate: input.isPrivate,
            createdAt: now,
            updatedAt: now,
          };
          await db.transact(
            (db.tx as any).checkIns[checkInId]
              .update(createPayload)
              .link({ couple: coupleId, author: userId }),
          );
          if (!input.isPrivate) {
            await notifySpaceMutation({
              spaceId: coupleId,
              spaceKind: space?.kind ?? null,
              excludeUserId: userId,
              title: user?.displayName ?? 'Someone',
              body: input.mood ? `checked in: ${input.mood}` : 'checked in today',
              route: '/(tabs)/us/checkins',
            });
          }
        }
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [enabled, coupleId, userId, encrypt, today, checkIns, space?.kind, user?.displayName],
  );

  const remove = useCallback(async (checkInId: string) => {
    if (!enabled) return;
    await db.transact((db.tx as any).checkIns[checkInId].delete());
  }, [enabled]);

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
    isLoading: enabled && !!coupleId && queryLoading,
    isSubmitting,
    createOrUpdate,
    remove,
    refetch: async () => {},
  };
}
