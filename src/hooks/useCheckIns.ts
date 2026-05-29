import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { db, id } from '@/src/lib/instant';
import { notifySpaceMutation } from '@/src/lib/push';
import { useEncryption } from './useEncryption';
import { useSession } from './useSession';
import { personalOrSharedSpaceId, relationWhere, uniqueSpaceIds } from '@/src/lib/space-scope';

export type CheckInRecord = {
  id: string;
  spaceId: string;
  authorId: string;
  mood: string | null;
  note: string | null;
  isPrivate: boolean;
  checkInDate: string;
  createdAt: number;
};

type CheckInMutationInput = {
  mood: string | null;
  note: string | null;
  isPrivate: boolean;
  checkInDate?: string;
};

export function getLocalDateKey(date: Date = new Date()) {
  return format(date, 'yyyy-MM-dd');
}

function isPersonalTarget(
  targetSpaceId: string | null | undefined,
  personalSpaceId: string | null | undefined,
) {
  return Boolean(targetSpaceId && personalSpaceId && targetSpaceId === personalSpaceId);
}

function isValidDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateCheckInDate(value: string): string {
  if (!isValidDateKey(value)) throw new Error('Invalid check-in date');
  return value;
}

function privacyFromOwningSpace(value: unknown, isPersonalSpaceRow: boolean): boolean {
  return value === true || isPersonalSpaceRow;
}

function assertValidCheckInPrivacy(value: unknown): asserts value is boolean {
  if (typeof value !== 'boolean') throw new Error('Invalid check-in privacy');
}

export function useCheckIns(options?: {
  enabled?: boolean;
  checkInDate?: string | null;
  /**
   * Lower bound (inclusive) for `checkInDate`. Lets lightweight callers (e.g.
   * the home summary) skip ancient history. Accepts a `Date` or a `yyyy-MM-dd`
   * string. Omit for the full, unbounded history (default).
   */
  since?: Date | string | null;
  /**
   * When `false`, encrypted notes are passed through verbatim instead of being
   * decrypted. Callers that only read `mood`/streaks (home) can skip the crypto
   * work. Defaults to `true` so existing callers keep full notes.
   */
  decryptNotes?: boolean;
}) {
  const enabled = options?.enabled ?? true;
  const decryptNotes = options?.decryptNotes ?? true;
  const { activeCouple, user, space, personalSpaceId, sharedSpaceId } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const readableSpaceIds = uniqueSpaceIds([personalSpaceId ?? coupleId, sharedSpaceId ?? coupleId]);
  const userId = user?.id ?? null;
  const { encrypt, decrypt, hasKey } = useEncryption();
  const today = getLocalDateKey();
  const sinceKey = options?.since != null ? toDateKey(options.since) : null;
  const dateWhere = options?.checkInDate
    ? { checkInDate: options.checkInDate }
    : sinceKey
      ? { checkInDate: { $gte: sinceKey } }
      : {};

  const { data, isLoading: queryLoading } = (db as any).useQuery(
    readableSpaceIds.length > 0 && enabled
      ? {
          checkIns: {
            $: {
              where: {
                ...dateWhere,
                ...(relationWhere('couple', readableSpaceIds) ?? {}),
              },
            },
            author: {},
            couple: {},
          },
        }
      : null,
  );

  const rawCheckIns = useMemo<CheckInRecord[]>(() => {
    return (data?.checkIns ?? []).flatMap((c: any) => {
      const authorId = firstRel(c.author)?.id ?? '';
      const spaceId = firstRel(c.couple)?.id ?? '';
      const isPersonalSpaceRow = Boolean(personalSpaceId && spaceId === personalSpaceId);
      if (isPersonalSpaceRow && authorId !== userId) return [];
      return [{
        id: c.id,
        spaceId,
        authorId,
        mood: c.mood ?? null,
        note: c.note ?? null,
        isPrivate: privacyFromOwningSpace(c.isPrivate, isPersonalSpaceRow),
        checkInDate: c.checkInDate,
        createdAt: c.createdAt,
      }];
    });
  }, [data?.checkIns, personalSpaceId, userId]);
  const checkInById = useMemo(
    () => new Map(rawCheckIns.map((checkIn) => [checkIn.id, checkIn])),
    [rawCheckIns],
  );

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
    if (hasKey && decryptNotes) {
      void decryptRecords(rawCheckIns);
    } else {
      setCheckIns(rawCheckIns);
    }
    return () => {
      cancelled = true;
    };
  }, [decrypt, hasKey, decryptNotes, rawCheckIns]);

  const createOrUpdate = useCallback(
    async (input: CheckInMutationInput) => {
      if (!enabled || submittingRef.current) return;
      assertValidCheckInPrivacy(input.isPrivate);
      const targetSpaceId = personalOrSharedSpaceId({
        isPrivate: input.isPrivate,
        personalSpaceId,
        sharedSpaceId,
        fallbackSpaceId: coupleId,
      });
      if (!targetSpaceId) throw new Error('No active space');
      if (!userId) throw new Error('No current user');
      const isPrivate = Boolean(input.isPrivate || isPersonalTarget(targetSpaceId, personalSpaceId));
      const dateKey = validateCheckInDate(input.checkInDate ?? today);
      submittingRef.current = true;
      setIsSubmitting(true);
      try {
        // Upsert only within the same privacy scope so a shared check-in cannot
        // overwrite a private same-day row in the personal space.
        const existing = checkIns.find(
          (c) =>
            c.authorId === userId &&
            c.checkInDate === dateKey &&
            c.isPrivate === isPrivate,
        );
        const now = Date.now();
        if (existing) {
          const updatePayload = {
            mood: input.mood ?? null,
            note: input.note ? await encrypt(input.note) : null,
            isPrivate,
            updatedAt: now,
          };
          await db.transact(
            (db.tx as any).checkIns[existing.id]
              .update(updatePayload)
              .link({ couple: targetSpaceId }),
          );
        } else {
          const checkInId = id();
          const createPayload = {
            mood: input.mood ?? undefined,
            note: input.note ? await encrypt(input.note) : undefined,
            checkInDate: dateKey,
            isPrivate,
            createdAt: now,
            updatedAt: now,
          };
          await db.transact(
            (db.tx as any).checkIns[checkInId]
              .update(createPayload)
              .link({ couple: targetSpaceId, author: userId }),
          );
          if (!isPrivate) {
            await notifySpaceMutation({
              spaceId: targetSpaceId,
              spaceKind: space?.kind ?? null,
              excludeUserId: userId,
              title: user?.displayName ?? 'Someone',
              body: input.mood ? `checked in: ${input.mood}` : 'checked in today',
              eventKind: 'checkInCreated',
              entityId: checkInId,
              mood: input.mood ?? undefined,
              route: '/(tabs)/us/checkins',
            });
          }
        }
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [
      enabled,
      coupleId,
      personalSpaceId,
      sharedSpaceId,
      userId,
      encrypt,
      today,
      checkIns,
      space?.kind,
      user?.displayName,
    ],
  );

  const update = useCallback(
    async (checkInId: string, input: CheckInMutationInput) => {
      if (!enabled) return;
      const current = checkInById.get(checkInId);
      if (!current || current.authorId !== userId) {
        throw new Error('Check-in not found');
      }
      assertValidCheckInPrivacy(input.isPrivate);
      const targetSpaceId = personalOrSharedSpaceId({
        isPrivate: input.isPrivate,
        personalSpaceId,
        sharedSpaceId,
        fallbackSpaceId: coupleId,
      });
      if (!targetSpaceId) throw new Error('No active space');
      const isPrivate = Boolean(input.isPrivate || isPersonalTarget(targetSpaceId, personalSpaceId));
      const checkInDate =
        input.checkInDate !== undefined
          ? validateCheckInDate(input.checkInDate)
          : isValidDateKey(current.checkInDate)
            ? current.checkInDate
            : undefined;
      const updatePayload = {
        mood: input.mood ?? null,
        note: input.note ? await encrypt(input.note) : null,
        isPrivate,
        updatedAt: Date.now(),
        ...(checkInDate ? { checkInDate } : {}),
      };
      await db.transact(
        (db.tx as any).checkIns[checkInId]
          .update(updatePayload)
          .link({ couple: targetSpaceId }),
      );
    },
    [checkInById, coupleId, enabled, encrypt, personalSpaceId, sharedSpaceId, userId],
  );

  const remove = useCallback(async (checkInId: string) => {
    if (!enabled) return;
    const current = checkInById.get(checkInId);
    if (!current || current.authorId !== userId) throw new Error('Check-in not found');
    await db.transact((db.tx as any).checkIns[checkInId].delete());
  }, [checkInById, enabled, userId]);

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
    isLoading: enabled && readableSpaceIds.length > 0 && queryLoading,
    isSubmitting,
    createOrUpdate,
    update,
    remove,
    refetch: async () => {},
  };
}

function firstRel(value: any): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toDateKey(value: Date | string): string {
  return typeof value === 'string' ? value : getLocalDateKey(value);
}
