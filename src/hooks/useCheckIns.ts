import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { makeFunctionReference } from 'convex/server';

import { useEncryption } from './useEncryption';
import { useSession } from './useSession';

export type CheckInRecord = {
  _id: string;
  authorId: string;
  mood: string | null;
  note: string | null;
  isPrivate: boolean;
  checkInDate: string;
  createdAt: number;
};

const getCheckInsQuery = makeFunctionReference<'query', { checkInDate?: string }, CheckInRecord[]>(
  'checkIns:getCheckIns',
);
const submitCheckInMutation = makeFunctionReference<
  'mutation',
  { mood?: string | null; note?: string | null; isPrivate?: boolean; checkInDate?: string },
  CheckInRecord
>('checkIns:submitCheckIn');
const deleteCheckInMutation = makeFunctionReference<'mutation', { checkInId: string }, null>(
  'checkIns:deleteCheckIn',
);

export function getLocalDateKey(date: Date = new Date()) {
  return format(date, 'yyyy-MM-dd');
}

export function useCheckIns() {
  const convex = useConvex();
  const { activeCouple } = useSession();
  const { encrypt, decrypt, hasKey } = useEncryption();
  const today = getLocalDateKey();
  const rawCheckIns = useQuery(getCheckInsQuery, activeCouple ? {} : 'skip');
  const submitCheckIn = useMutation(submitCheckInMutation);
  const deleteCheckIn = useMutation(deleteCheckInMutation);

  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function decryptRecords(
      items: CheckInRecord[] | undefined,
    ) {
      if (!items) return;
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
      setCheckIns(rawCheckIns ?? []);
    }

    return () => {
      cancelled = true;
    };
  }, [decrypt, hasKey, rawCheckIns]);

  const createOrUpdate = useCallback(
    async (data: { mood: string | null; note: string | null; isPrivate: boolean; checkInDate?: string }) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setIsSubmitting(true);
      try {
        await submitCheckIn({
          mood: data.mood,
          note: data.note ? await encrypt(data.note) : data.note,
          isPrivate: data.isPrivate,
          checkInDate: data.checkInDate ?? today,
        });
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [encrypt, submitCheckIn, today],
  );

  const remove = useCallback(
    async (checkInId: string) => {
      await deleteCheckIn({ checkInId });
    },
    [deleteCheckIn],
  );

  const myTodayCheckIn = useMemo(
    () =>
      checkIns.find(
        (record) =>
          record.checkInDate === today &&
          record.authorId === activeCouple?.membership?.userId,
      ) ?? null,
    [activeCouple?.membership?.userId, checkIns, today],
  );
  const partnerTodayCheckIn = useMemo(
    () =>
      checkIns.find(
        (record) =>
          record.checkInDate === today &&
          record.authorId !== activeCouple?.membership?.userId,
      ) ?? null,
    [activeCouple?.membership?.userId, checkIns, today],
  );

  return {
    today,
    checkIns,
    todayCheckIns: checkIns.filter((record) => record.checkInDate === today),
    myTodayCheckIn,
    partnerTodayCheckIn,
    isLoading: !!activeCouple && rawCheckIns === undefined,
    isSubmitting,
    createOrUpdate,
    remove,
    refetch: async () => {
      if (!activeCouple) return;
      await convex.query(getCheckInsQuery, {});
    },
  };
}
