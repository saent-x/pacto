import { useCallback, useMemo } from 'react';
import { db, id as newId } from '@/src/lib/instant';
import { useSession } from './useSession';
import type { IconName } from '@/src/components/ui/Icon';
import type {
  ShareKind,
  TemplateKey,
  TimetableItem,
  Who,
} from '@/src/lib/timetables-data';

export type TimetableRow = {
  id: string;
  title: string;
  template: TemplateKey;
  share: ShareKind;
  itemsCount: number;
  /** Items per day-of-week, Monday first (length 7). */
  dayCounts: number[];
  updatedAt: number;
};

type TimetableInput = {
  title: string;
  template?: TemplateKey;
  share?: ShareKind;
};

type TimetableItemInput = {
  title: string;
  day: number;
  startHour: number;
  duration: number;
  category?: string;
  icon?: IconName;
  color?: string;
  ink?: string;
  who?: Who;
  repeat?: string;
  star?: boolean;
};

export function useTimetables() {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const userId = user?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? {
          timetables: {
            $: { where: { 'couple.id': coupleId } },
            items: {},
          },
        }
      : null,
  );

  const timetables = useMemo<TimetableRow[]>(() => {
    const raw = (data?.timetables ?? []) as any[];
    return raw
      .map((t): TimetableRow => {
        // Items store `day` 0-6 with Sunday=0. Re-index to Monday-first
        // so the week-strip preview lines up with the rest of the app.
        const dayCounts = [0, 0, 0, 0, 0, 0, 0];
        const items = Array.isArray(t.items) ? t.items : [];
        for (const it of items) {
          const sundayFirst = Number((it as any).day ?? 0);
          if (Number.isFinite(sundayFirst) && sundayFirst >= 0 && sundayFirst <= 6) {
            const mondayFirst = (sundayFirst + 6) % 7;
            dayCounts[mondayFirst] += 1;
          }
        }
        return {
          id: String(t.id),
          title: String(t.title ?? ''),
          template: (t.template ?? 'custom') as TemplateKey,
          share: (t.share ?? 'solo') as ShareKind,
          itemsCount: items.length,
          dayCounts,
          updatedAt: Number(t.updatedAt ?? t.createdAt ?? 0),
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [data?.timetables]);

  const create = useCallback(
    async (input: TimetableInput) => {
      if (!coupleId || !userId) return;
      const tId = newId();
      const now = Date.now();
      await db.transact(
        db.tx.timetables[tId]
          .update({
            title: input.title,
            template: input.template ?? 'custom',
            share: input.share ?? 'solo',
            createdAt: now,
            updatedAt: now,
          })
          .link({ couple: coupleId, createdBy: userId }),
      );
    },
    [coupleId, userId],
  );

  const update = useCallback(
    async (timetableId: string, input: Partial<TimetableInput>) => {
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.template !== undefined) updates.template = input.template;
      if (input.share !== undefined) updates.share = input.share;
      await db.transact(db.tx.timetables[timetableId].update(updates));
    },
    [],
  );

  const remove = useCallback(async (timetableId: string) => {
    await db.transact(db.tx.timetables[timetableId].delete());
  }, []);

  return {
    timetables,
    isLoading: !!coupleId && queryLoading,
    create,
    update,
    remove,
    refetch: async () => {},
  };
}

export function normalizeTimetableItem(raw: any): TimetableItem {
  // The new-timetable-item sheet stores `duration` in MINUTES (e.g. 90).
  // The views (and fmtHour math) expect `dur` in HOURS (e.g. 1.5). Convert
  // here so consumers don't have to know the storage unit.
  // Legacy values that were already <= 24 are treated as hours to remain
  // compatible with any seeded demo data.
  const rawDuration =
    typeof raw.duration === 'number' && Number.isFinite(raw.duration)
      ? raw.duration
      : 60;
  const dur = rawDuration > 24 ? rawDuration / 60 : rawDuration;
  return {
    id: String(raw.id),
    day: typeof raw.day === 'number' ? raw.day : 0,
    start: typeof raw.startHour === 'number' ? raw.startHour : 0,
    dur,
    title: String(raw.title ?? ''),
    icon: ((raw.icon as IconName) ?? 'coffee') as IconName,
    color: (raw.color as string) ?? '#F4A68C',
    ink: (raw.ink as string) ?? '#3A1F14',
    cat: (raw.category as string) ?? 'other',
    who: ((raw.who as Who) ?? 'both') as Who,
    star: Boolean(raw.star),
  };
}

export function useTimetable(timetableId: string | null) {
  const { activeCouple } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId && timetableId
      ? {
          timetables: {
            $: { where: { id: timetableId, 'couple.id': coupleId } },
            items: {},
          },
        }
      : null,
  );

  const timetable = useMemo(() => {
    const first = (data?.timetables ?? [])[0] as any | undefined;
    if (!first) return null;
    return {
      id: String(first.id),
      title: String(first.title ?? ''),
      template: (first.template ?? 'custom') as TemplateKey,
      share: (first.share ?? 'solo') as ShareKind,
      updatedAt: Number(first.updatedAt ?? first.createdAt ?? 0),
    };
  }, [data?.timetables]);

  const items = useMemo<TimetableItem[]>(() => {
    const first = (data?.timetables ?? [])[0] as any | undefined;
    const raw = (first?.items ?? []) as any[];
    return raw.map(normalizeTimetableItem);
  }, [data?.timetables]);

  const add = useCallback(
    async (input: TimetableItemInput) => {
      if (!coupleId || !timetableId) return;
      const itemId = newId();
      const now = Date.now();
      await db.transact(
        db.tx.timetableItems[itemId]
          .update({
            title: input.title,
            day: input.day,
            startHour: input.startHour,
            duration: input.duration,
            category: input.category ?? 'other',
            icon: input.icon ?? 'coffee',
            color: input.color ?? '#F4A68C',
            ink: input.ink ?? '#3A1F14',
            who: input.who ?? 'both',
            repeat: input.repeat ?? 'weekly',
            star: Boolean(input.star),
            createdAt: now,
            updatedAt: now,
          })
          .link({ timetable: timetableId, couple: coupleId }),
      );
    },
    [coupleId, timetableId],
  );

  const update = useCallback(
    async (itemId: string, input: Partial<TimetableItemInput>) => {
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.day !== undefined) updates.day = input.day;
      if (input.startHour !== undefined) updates.startHour = input.startHour;
      if (input.duration !== undefined) updates.duration = input.duration;
      if (input.category !== undefined) updates.category = input.category;
      if (input.icon !== undefined) updates.icon = input.icon;
      if (input.color !== undefined) updates.color = input.color;
      if (input.ink !== undefined) updates.ink = input.ink;
      if (input.who !== undefined) updates.who = input.who;
      if (input.repeat !== undefined) updates.repeat = input.repeat;
      if (input.star !== undefined) updates.star = Boolean(input.star);
      await db.transact(db.tx.timetableItems[itemId].update(updates));
    },
    [],
  );

  const remove = useCallback(async (itemId: string) => {
    await db.transact(db.tx.timetableItems[itemId].delete());
  }, []);

  return {
    timetable,
    items,
    isLoading: !!coupleId && !!timetableId && queryLoading,
    add,
    update,
    remove,
    refetch: async () => {},
  };
}
