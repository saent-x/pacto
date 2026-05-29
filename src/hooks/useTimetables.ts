import { useCallback, useMemo } from 'react';
import { db, id as newId } from '@/src/lib/instant';
import { useSession } from './useSession';
import { personalOrSharedSpaceId, relationWhere, uniqueSpaceIds } from '@/src/lib/space-scope';
import { safeInstantId } from '@/src/lib/instant-id';
import type { IconName } from '@/src/components/ui/Icon';
import { normalizeTemplateKey, normalizeWho, TEMPLATES } from '@/src/lib/timetables-data';
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

type UseTimetablesOptions = {
  enabled?: boolean;
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

const MAX_TIMETABLE_ITEM_DURATION_MINUTES = 24 * 60;

function isPersonalTarget(
  targetSpaceId: string | null | undefined,
  personalSpaceId: string | null | undefined,
) {
  return Boolean(targetSpaceId && personalSpaceId && targetSpaceId === personalSpaceId);
}

function normalizedShareForSpace(
  rawShare: ShareKind | null | undefined,
  owningSpaceId: string | null | undefined,
  personalSpaceId: string | null | undefined,
  sharedSpaceId: string | null | undefined,
): ShareKind {
  const share = normalizeShareKind(rawShare);
  if (personalSpaceId && owningSpaceId === personalSpaceId) return 'solo';
  if (sharedSpaceId && owningSpaceId === sharedSpaceId && share === 'solo') return 'shared';
  return share;
}

function timestampMs(value: unknown): number | null {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) && Number.isFinite(new Date(value).getTime()) ? value : null;
  }
  if (typeof value === 'string' && value.trim()) {
    if (!hasValidDatePrefix(value)) return null;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  return null;
}

function hasValidDatePrefix(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return true;
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

function normalizedTimestamp(value: unknown, fallback: unknown = 0): number {
  return timestampMs(value) ?? timestampMs(fallback) ?? 0;
}

function isValidShareKind(value: unknown): value is ShareKind {
  return value === 'solo' || value === 'partner' || value === 'shared';
}

function normalizeShareKind(value: unknown): ShareKind {
  return isValidShareKind(value) ? value : 'solo';
}

function assertValidTimetableShare(value: unknown): asserts value is ShareKind {
  if (!isValidShareKind(value)) {
    throw new Error('Invalid timetable share');
  }
}

function assertValidTimetableTemplate(value: unknown): asserts value is TemplateKey | undefined {
  if (value !== undefined && !TEMPLATES.some((template) => template.key === value)) {
    throw new Error('Invalid timetable template');
  }
}

function isValidTimetableItemDay(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6;
}

function isValidTimetableItemStartHour(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 24;
}

function isValidTimetableItemDuration(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= MAX_TIMETABLE_ITEM_DURATION_MINUTES
  );
}

function normalizedTimetableItemDay(value: unknown): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 6 ? n : 0;
}

function normalizedTimetableItemStartHour(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n < 24 ? n : 0;
}

function normalizedTimetableItemDurationHours(value: unknown): number {
  const rawDuration = Number(value);
  if (!Number.isFinite(rawDuration) || rawDuration <= 0) return 1;
  if (rawDuration <= 24) return rawDuration;
  if (rawDuration <= MAX_TIMETABLE_ITEM_DURATION_MINUTES) return rawDuration / 60;
  return 1;
}

function assertValidTimetableItemSchedule(input: Partial<TimetableItemInput>) {
  if (input.day !== undefined && !isValidTimetableItemDay(input.day)) {
    throw new Error('Invalid timetable item schedule');
  }
  if (input.startHour !== undefined && !isValidTimetableItemStartHour(input.startHour)) {
    throw new Error('Invalid timetable item schedule');
  }
  if (input.duration !== undefined && !isValidTimetableItemDuration(input.duration)) {
    throw new Error('Invalid timetable item schedule');
  }
}

function normalizedTimetableItemStar(value: unknown): boolean {
  return value === true;
}

function assertValidTimetableItemStar(value: unknown): asserts value is boolean | undefined {
  if (value !== undefined && typeof value !== 'boolean') {
    throw new Error('Invalid timetable item star');
  }
}

export function useTimetables(options: UseTimetablesOptions = {}) {
  const enabled = options.enabled ?? true;
  const { activeCouple, user, personalSpaceId, sharedSpaceId } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const readableSpaceIds = uniqueSpaceIds([personalSpaceId ?? coupleId, sharedSpaceId ?? coupleId]);
  const userId = user?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    enabled && readableSpaceIds.length > 0
      ? {
          timetables: {
            $: { where: relationWhere('couple', readableSpaceIds) },
            items: { couple: {} },
            couple: {},
            createdBy: {},
          },
        }
      : null,
  );

  const timetables = useMemo<TimetableRow[]>(() => {
    const raw = (data?.timetables ?? []) as any[];
    return raw
      .filter((t) => timetableVisibleForPersonalSpace(t, personalSpaceId, userId))
      .map((t): TimetableRow => {
        const owningSpaceId = firstRel(t.couple)?.id ?? null;
        const share = normalizedShareForSpace(t.share, owningSpaceId, personalSpaceId, sharedSpaceId);
        // Items store `day` 0-6 with Sunday=0. Re-index to Monday-first
        // so the week-strip preview lines up with the rest of the app.
        const dayCounts = [0, 0, 0, 0, 0, 0, 0];
        const items = Array.isArray(t.items)
          ? t.items.filter((item: any) => childBelongsToParentSpace(item, owningSpaceId))
          : [];
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
          template: normalizeTemplateKey(t.template, t.title),
          share,
          itemsCount: items.length,
          dayCounts,
          updatedAt: normalizedTimestamp(t.updatedAt, t.createdAt),
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [data?.timetables, personalSpaceId, sharedSpaceId, userId]);
  const timetableById = useMemo(
    () => new Map(timetables.map((timetable) => [timetable.id, timetable])),
    [timetables],
  );

  const create = useCallback(
    async (input: TimetableInput) => {
      const requestedShare = input.share ?? 'solo';
      assertValidTimetableShare(requestedShare);
      assertValidTimetableTemplate(input.template);
      const targetSpaceId = personalOrSharedSpaceId({
        share: requestedShare,
        personalSpaceId,
        sharedSpaceId,
        fallbackSpaceId: coupleId,
      });
      if (!targetSpaceId) throw new Error('No active space');
      if (!userId) throw new Error('No current user');
      const share: ShareKind = isPersonalTarget(targetSpaceId, personalSpaceId)
        ? 'solo'
        : requestedShare;
      const tId = newId();
      const now = Date.now();
      await db.transact(
        db.tx.timetables[tId]
          .update({
            title: input.title,
            template: input.template ?? 'custom',
            share,
            createdAt: now,
            updatedAt: now,
          })
          .link({ couple: targetSpaceId, createdBy: userId }),
      );
    },
    [coupleId, personalSpaceId, sharedSpaceId, userId],
  );

  const update = useCallback(
    async (timetableId: string, input: Partial<TimetableInput>) => {
      if (!timetableById.has(timetableId)) throw new Error('Timetable not found');
      const timetable = (data?.timetables ?? []).find((item: any) => String(item.id) === timetableId);
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.template !== undefined) {
        assertValidTimetableTemplate(input.template);
        updates.template = input.template;
      }
      const ops: any[] = [];
      let requestedShare: ShareKind | undefined;
      if (input.share !== undefined) {
        assertValidTimetableShare(input.share);
        requestedShare = input.share;
      }
      const targetSpaceId = requestedShare !== undefined
        ? personalOrSharedSpaceId({
            share: requestedShare,
            personalSpaceId,
            sharedSpaceId,
            fallbackSpaceId: coupleId,
          })
        : null;
      if (requestedShare !== undefined && !targetSpaceId) throw new Error('No active space');
      if (requestedShare !== undefined) {
        if (
          targetSpaceId &&
          personalSpaceId &&
          targetSpaceId === personalSpaceId &&
          firstRel((timetable as any)?.createdBy)?.id !== userId
        ) {
          throw new Error('Cannot move another member timetable into personal space');
        }
        updates.share = isPersonalTarget(targetSpaceId, personalSpaceId) ? 'solo' : requestedShare;
      }
      let timetableOp: any = db.tx.timetables[timetableId].update(updates);
      if (targetSpaceId) {
        timetableOp = timetableOp.link({ couple: targetSpaceId });
      }
      ops.push(timetableOp);

      if (targetSpaceId) {
        const currentSpaceId = firstRel((timetable as any)?.couple)?.id ?? null;
        const items = Array.isArray((timetable as any)?.items) ? (timetable as any).items : [];
        for (const item of items) {
          if (typeof item?.id === 'string' && childBelongsToParentSpace(item, currentSpaceId)) {
            ops.push((db.tx as any).timetableItems[item.id].link({ couple: targetSpaceId }));
          }
        }
      }

      await db.transact(ops);
    },
    [coupleId, data?.timetables, personalSpaceId, sharedSpaceId, timetableById, userId],
  );

  const remove = useCallback(async (timetableId: string) => {
    if (!timetableById.has(timetableId)) throw new Error('Timetable not found');
    await db.transact(db.tx.timetables[timetableId].delete());
  }, [timetableById]);

  return {
    timetables,
    isLoading: enabled && readableSpaceIds.length > 0 && queryLoading,
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
  // Legacy values that were already <= 24 are treated as hours so older
  // persisted rows continue to render correctly.
  const dur = normalizedTimetableItemDurationHours(raw.duration);
  return {
    id: String(raw.id),
    day: normalizedTimetableItemDay(raw.day),
    start: normalizedTimetableItemStartHour(raw.startHour),
    dur,
    title: String(raw.title ?? ''),
    icon: ((raw.icon as IconName) ?? 'coffee') as IconName,
    color: (raw.color as string) ?? '#D88B74',
    ink: (raw.ink as string) ?? '#3A1F14',
    cat: (raw.category as string) ?? 'other',
    who: normalizeWho(raw.who),
    star: normalizedTimetableItemStar(raw.star),
  };
}

export function useTimetable(timetableId: string | null) {
  const { activeCouple, user, personalSpaceId, sharedSpaceId } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const readableSpaceIds = uniqueSpaceIds([personalSpaceId ?? coupleId, sharedSpaceId ?? coupleId]);
  const userId = user?.id ?? null;
  const safeTimetableId = safeInstantId(timetableId);

  const { data, isLoading: queryLoading } = db.useQuery(
    readableSpaceIds.length > 0 && safeTimetableId
      ? {
          timetables: {
            $: {
              where: {
                id: safeTimetableId,
                ...(relationWhere('couple', readableSpaceIds) ?? {}),
              },
            },
            items: { couple: {} },
            couple: {},
            createdBy: {},
          },
        }
      : null,
  );

  const visibleTimetableNode = useMemo(() => {
    const first = (data?.timetables ?? [])[0] as any | undefined;
    if (!first || !timetableVisibleForPersonalSpace(first, personalSpaceId, userId)) return null;
    return first;
  }, [data?.timetables, personalSpaceId, userId]);

  const timetable = useMemo(() => {
    const first = visibleTimetableNode;
    if (!first) return null;
    const owningSpaceId = firstRel(first.couple)?.id ?? null;
    return {
      id: String(first.id),
      title: String(first.title ?? ''),
      template: normalizeTemplateKey(first.template, first.title),
      share: normalizedShareForSpace(first.share, owningSpaceId, personalSpaceId, sharedSpaceId),
      updatedAt: normalizedTimestamp(first.updatedAt, first.createdAt),
    };
  }, [visibleTimetableNode, personalSpaceId, sharedSpaceId]);

  const items = useMemo<TimetableItem[]>(() => {
    const first = visibleTimetableNode;
    const owningSpaceId = firstRel(first?.couple)?.id ?? null;
    const raw = (first?.items ?? []) as any[];
    return raw
      .filter((item: any) => childBelongsToParentSpace(item, owningSpaceId))
      .map(normalizeTimetableItem);
  }, [visibleTimetableNode]);
  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );

  const add = useCallback(
    async (input: TimetableItemInput) => {
      if (readableSpaceIds.length === 0) throw new Error('No active space');
      if (!safeTimetableId) throw new Error('Timetable not found');
      const targetSpaceId = firstRel(visibleTimetableNode?.couple)?.id ?? null;
      if (!targetSpaceId) throw new Error('Timetable not found');
      assertValidTimetableItemSchedule(input);
      assertValidTimetableItemStar(input.star);
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
            color: input.color ?? '#D88B74',
            ink: input.ink ?? '#3A1F14',
            who: input.who ?? 'both',
            repeat: input.repeat ?? 'weekly',
            star: input.star === true,
            createdAt: now,
            updatedAt: now,
          })
          .link({ timetable: safeTimetableId, couple: targetSpaceId }),
      );
    },
    [readableSpaceIds.length, safeTimetableId, visibleTimetableNode],
  );

  const update = useCallback(
    async (itemId: string, input: Partial<TimetableItemInput>) => {
      if (!itemById.has(itemId)) throw new Error('Timetable item not found');
      assertValidTimetableItemSchedule(input);
      assertValidTimetableItemStar(input.star);
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
      if (input.star !== undefined) updates.star = input.star;
      await db.transact(db.tx.timetableItems[itemId].update(updates));
    },
    [itemById],
  );

  const remove = useCallback(async (itemId: string) => {
    if (!itemById.has(itemId)) throw new Error('Timetable item not found');
    await db.transact(db.tx.timetableItems[itemId].delete());
  }, [itemById]);

  return {
    timetable,
    items,
    isLoading: readableSpaceIds.length > 0 && !!safeTimetableId && queryLoading,
    add,
    update,
    remove,
    refetch: async () => {},
  };
}

function firstRel(value: any): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function childBelongsToParentSpace(child: any, parentSpaceId: string | null | undefined) {
  const childSpaceId = firstRel(child?.couple)?.id ?? null;
  return !parentSpaceId || !childSpaceId || childSpaceId === parentSpaceId;
}

function timetableVisibleForPersonalSpace(
  timetable: any,
  personalSpaceId: string | null | undefined,
  userId: string | null | undefined,
) {
  const owningSpaceId = firstRel(timetable?.couple)?.id ?? null;
  const creatorId = firstRel(timetable?.createdBy)?.id ?? null;
  return !(personalSpaceId && owningSpaceId === personalSpaceId && creatorId && creatorId !== userId);
}
