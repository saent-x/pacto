import { useEffect, useMemo, useRef } from 'react';
import { addDays, endOfDay, format, startOfDay, subWeeks } from 'date-fns';
import { db } from '@/src/lib/instant';
import type { PresenceInfo } from '@/src/lib/home/types';
import {
  buildTimelineItems,
  buildMemoryPreviews,
  selectFeaturedSignal,
} from '@/src/lib/home/builders';
import { buildActivityHeatmapDays } from '@/src/lib/home/activity';
import { getCuratedDailyVerse } from '@/src/lib/home/dailyVerse';
import { buildTodayRingSummary, type TodayRingSummary } from '@/src/lib/home/todayRings';
import { useSession } from '@/src/hooks/useSession';
import { childRowMatchesParentSpace, relationWhere, uniqueSpaceIds } from '@/src/lib/space-scope';

export type TodaySummary = TodayRingSummary;

const API_BASE = normalizeApiBase(process.env.EXPO_PUBLIC_API_URL);
const HOME_ACTIVITY_WEEKS = 15;
const HOME_SOURCE_LIMIT = 250;
const HOME_RECENT_SOURCE_LIMIT = 100;

function getLocalDateKey(date: Date = new Date()) {
  return format(date, 'yyyy-MM-dd');
}

function getHomeQueryWindow(previewDays: number, now: Date = new Date()) {
  const start = startOfDay(subWeeks(now, HOME_ACTIVITY_WEEKS));
  const end = endOfDay(addDays(now, previewDays));
  return {
    startMs: start.getTime(),
    endMs: end.getTime(),
    startKey: getLocalDateKey(start),
    endKey: getLocalDateKey(end),
  };
}

function boundedSource(
  baseWhere: Record<string, unknown>,
  rangeWhere: Record<string, unknown>,
  order: Record<string, 'asc' | 'desc'>,
  limit = HOME_SOURCE_LIMIT,
) {
  return {
    $: {
      where: { ...baseWhere, ...rangeWhere },
      order,
      limit,
    },
    couple: {},
  };
}

export function useHomeTimeline(options?: { previewDays?: number }) {
  const { activeCouple, profile, isFeatureEnabled, personalSpaceId, sharedSpaceId } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const readableSpaceIdsKey = uniqueSpaceIds([
    personalSpaceId ?? coupleId,
    sharedSpaceId ?? coupleId,
  ]).join('|');
  const readableSpaceIds = useMemo(
    () => (readableSpaceIdsKey ? readableSpaceIdsKey.split('|') : []),
    [readableSpaceIdsKey],
  );
  const previewDays = options?.previewDays ?? 7;
  const todayKey = getLocalDateKey();
  const warmedDateRef = useRef<string | null>(null);
  const calendarEnabled = isFeatureEnabled('calendar');
  const goalsEnabled = isFeatureEnabled('goals');
  const recurringEnabled = isFeatureEnabled('recurring');
  const checkinsEnabled = isFeatureEnabled('checkins');
  const tasksEnabled = isFeatureEnabled('tasks');
  const memoryFeedEnabled = isFeatureEnabled('memoryFeed');
  const journalEnabled = isFeatureEnabled('journal');

  const query = useMemo(() => {
    if (readableSpaceIds.length === 0) return null;
    const coupleWhere = relationWhere('couple', readableSpaceIds);
    const window = getHomeQueryWindow(previewDays);
    const recentCoupleSource = {
      $: { where: coupleWhere, order: { createdAt: 'desc' as const }, limit: HOME_RECENT_SOURCE_LIMIT },
      couple: {},
    };
    // The new `memories` entity uses link `space` (not `couple`), so it needs
    // a separate where clause keyed on `space.id`.
    const memoriesWhere = {
      $: {
        where: {
          ...relationWhere('space', readableSpaceIds),
          createdAt: { $gte: window.startMs, $lte: window.endMs },
        },
        order: { createdAt: 'desc' as const },
        limit: HOME_SOURCE_LIMIT,
      },
      space: {},
    };
    return {
      ...(calendarEnabled
        ? {
            events: boundedSource(
              coupleWhere,
              { startsAt: { $gte: window.startMs, $lte: window.endMs } },
              { startsAt: 'asc' },
            ),
          }
        : {}),
      ...(goalsEnabled
        ? {
            plans: boundedSource(
              coupleWhere,
              { targetDate: { $gte: window.startKey, $lte: window.endKey } },
              { targetDate: 'asc' },
            ),
          }
        : {}),
      ...(recurringEnabled
        ? {
            rituals: recentCoupleSource,
            reminders: boundedSource(
              coupleWhere,
              { dueAt: { $gte: window.startMs, $lte: window.endMs } },
              { dueAt: 'asc' },
            ),
          }
        : {}),
      ...(checkinsEnabled
        ? {
            checkIns: boundedSource(
              coupleWhere,
              { checkInDate: { $gte: window.startKey, $lte: window.endKey } },
              { checkInDate: 'desc' },
            ),
          }
        : {}),
      ...(tasksEnabled
        ? {
            tasks: {
              ...boundedSource(
                coupleWhere,
                { dueDate: { $gte: window.startKey, $lte: window.endKey } },
                { dueDate: 'asc' },
              ),
              list: { couple: {} },
            },
          }
        : {}),
      ...(memoryFeedEnabled ? { memories: memoriesWhere } : {}),
      ...(journalEnabled
        ? {
            journalEntries: boundedSource(
              coupleWhere,
              { entryDate: { $gte: window.startKey, $lte: window.endKey } },
              { entryDate: 'desc' },
            ),
          }
        : {}),
      dailyVerseCache: { $: { where: { dateKey: todayKey }, limit: 1 } },
    };
  }, [
    readableSpaceIdsKey,
    previewDays,
    calendarEnabled,
    goalsEnabled,
    recurringEnabled,
    checkinsEnabled,
    tasksEnabled,
    memoryFeedEnabled,
    journalEnabled,
    todayKey,
  ]);

  const { data, isLoading: queryLoading, error: queryError } = (
    db as any
  ).useQuery(query);

  useEffect(() => {
    if (warmedDateRef.current === todayKey || !activeCouple || !API_BASE) return;
    warmedDateRef.current = todayKey;
    (db as any).getAuth().then((auth: any) => {
      const token = auth?.refresh_token ?? null;
      if (!token) return;
      fetch(`${API_BASE}/api/daily-verse`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    });
  }, [todayKey, activeCouple]);

  const presence = useMemo<PresenceInfo | null>(() => {
    if (!activeCouple || !profile) return null;
    return {
      coupleId: activeCouple.couple.id,
      coupleName: activeCouple.couple.name ?? '',
      memberCount: activeCouple.memberCount,
      relationshipState: activeCouple.partner ? 'paired' : 'waiting',
      self: {
        userId: profile.id,
        displayName: profile.displayName ?? '',
        avatarUrl: profile.avatarUrl,
      },
      partner: activeCouple.partner
        ? {
            userId: activeCouple.partner.id,
            displayName: activeCouple.partner.displayName,
            avatarUrl: activeCouple.partner.avatarUrl,
          }
        : null,
      joinedAt: 0,
    };
  }, [activeCouple, profile]);

  const homeView = useMemo(() => {
    const now = Date.now();
    const events = calendarEnabled ? normalizePersonalSpacePrivacy(data?.events ?? [], personalSpaceId) : [];
    const plans = goalsEnabled ? normalizePersonalSpacePrivacy(data?.plans ?? [], personalSpaceId) : [];
    const reminders = recurringEnabled ? normalizePersonalSpacePrivacy(data?.reminders ?? [], personalSpaceId) : [];
    const rituals = recurringEnabled ? normalizePersonalSpacePrivacy(data?.rituals ?? [], personalSpaceId) : [];
    const tasks = tasksEnabled
      ? normalizePersonalSpacePrivacy(data?.tasks ?? [], personalSpaceId).filter((task) =>
          childRowMatchesParentSpace(task, 'list'),
        )
      : [];
    const journalEntries = journalEnabled ? normalizePersonalSpacePrivacy(data?.journalEntries ?? [], personalSpaceId) : [];
    const checkIns = checkinsEnabled ? normalizePersonalSpacePrivacy(data?.checkIns ?? [], personalSpaceId) : [];
    const feedMemories = memoryFeedEnabled
      ? normalizePersonalSpacePrivacy(data?.memories ?? [], personalSpaceId, 'space')
      : [];

    const memories = buildMemoryPreviews({
      journalEntries,
    });
    const memoryPreview = memories[0] ?? null;

    const timeline = buildTimelineItems({
      now,
      previewDays,
      events,
      plans,
      reminders,
      tasks,
      rituals,
      memories: [],
    });

    const hero = selectFeaturedSignal({
      now,
      presence,
      memoryPreview: null,
      checkIns,
    });

    const verseRecord = (data?.dailyVerseCache ?? [])[0];
    const dailyVerse = verseRecord
      ? {
          text: verseRecord.text,
          reference: verseRecord.reference,
          translation: verseRecord.translation,
          source: verseRecord.source as 'remote' | 'fallback',
          dateKey: todayKey,
        }
      : getCuratedDailyVerse(todayKey);

    const todaySummary = buildTodayRingSummary({
      now,
      plans,
      events,
      tasks,
      reminders,
    });

    const activity = buildActivityHeatmapDays({
      now,
      weeks: 15,
      events,
      plans,
      reminders,
      tasks,
      rituals,
      checkIns,
      journalEntries,
      memories: feedMemories,
    });

    return {
      hero,
      timeline,
      memories,
      memoryPreview,
      dailyVerse,
      todaySummary,
      activity,
    };
  }, [
    data,
    previewDays,
    presence,
    todayKey,
    calendarEnabled,
    goalsEnabled,
    recurringEnabled,
    checkinsEnabled,
    tasksEnabled,
    memoryFeedEnabled,
    journalEnabled,
    personalSpaceId,
  ]);

  return {
    isLoading: queryLoading,
    error: queryError ?? null,
    hero: homeView.hero,
    timeline: homeView.timeline,
    memories: homeView.memories,
    memoryPreview: homeView.memoryPreview,
    presence,
    dailyVerse: homeView.dailyVerse,
    todaySummary: homeView.todaySummary,
    activity: homeView.activity,
    refetch: async () => {},
  };
}

function normalizeApiBase(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return trimmed.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function normalizePersonalSpacePrivacy<T extends { isPrivate?: boolean }>(
  rows: T[],
  personalSpaceId: string | null | undefined,
  relationKey: 'couple' | 'space' = 'couple',
): T[] {
  if (!personalSpaceId) return rows;
  return rows.map((row: any) => {
    const spaceId =
      firstRel(row[relationKey])?.id ??
      firstRel(firstRel(row.list)?.couple)?.id ??
      null;
    const isPrivate = row.isPrivate === true || spaceId === personalSpaceId;
    return row.isPrivate === isPrivate ? row : { ...row, isPrivate };
  });
}

function firstRel(value: any): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
