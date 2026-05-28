import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { addDays, addMonths, endOfDay, format, startOfDay } from 'date-fns';
import { db } from '@/src/lib/instant';
import { useSession } from '@/src/hooks/useSession';
import {
  buildTimelineItems,
  formatMonthLabel,
} from '@/src/lib/home/builders';
import type { TimelineItem } from '@/src/lib/home/types';
import { childRowMatchesParentSpace, relationWhere, uniqueSpaceIds } from '@/src/lib/space-scope';
import {
  buildTomorrowCard,
  buildWeekStrip,
  computeHeroStats,
  filterAgendaForDate,
  type HeroStats,
  type TomorrowCard,
  type WeekDay,
} from './builders';

type CalendarState = {
  isLoading: boolean;
  month: string;
  monthLabel: string;
  selectedDate: string;
  today: string;
  week: WeekDay[];
  agenda: TimelineItem[];
  heroStats: HeroStats;
  tomorrow: TomorrowCard;
  selectDate: (date: string) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
};

const Ctx = createContext<CalendarState | null>(null);
const CALENDAR_SOURCE_LIMIT = 500;
const CALENDAR_RECENT_SOURCE_LIMIT = 200;

function todayString() {
  return format(new Date(), 'yyyy-MM-dd');
}

function addMonthsIso(date: string, count: number) {
  const [year, month, day] = date.split('-').map(Number);
  return format(addMonths(new Date(year, month - 1, day, 12), count), 'yyyy-MM-dd');
}

function selectedMonthWindow(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const monthStart = startOfDay(new Date(year, monthNumber - 1, 1, 12));
  const start = startOfDay(addDays(monthStart, -7));
  const end = endOfDay(addDays(addMonths(monthStart, 1), 7));
  return {
    startMs: start.getTime(),
    endMs: end.getTime(),
    startKey: format(start, 'yyyy-MM-dd'),
    endKey: format(end, 'yyyy-MM-dd'),
  };
}

function boundedSource(
  baseWhere: Record<string, unknown>,
  rangeWhere: Record<string, unknown>,
  order: Record<string, 'asc' | 'desc'>,
  limit = CALENDAR_SOURCE_LIMIT,
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

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const { activeCouple, isFeatureEnabled, personalSpaceId, sharedSpaceId } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const readableSpaceIds = useMemo(
    () => uniqueSpaceIds([personalSpaceId ?? coupleId, sharedSpaceId ?? coupleId]),
    [coupleId, personalSpaceId, sharedSpaceId],
  );

  const initial = todayString();
  const [selectedDate, setSelectedDate] = useState(initial);

  const month = selectedDate.slice(0, 7);
  const calendarEnabled = isFeatureEnabled('calendar');
  const goalsEnabled = isFeatureEnabled('goals');
  const recurringEnabled = isFeatureEnabled('recurring');
  const tasksEnabled = isFeatureEnabled('tasks');

  const query = useMemo(() => {
    if (readableSpaceIds.length === 0) return null;

    const where = relationWhere('couple', readableSpaceIds);
    const window = selectedMonthWindow(month);
    const sources: Record<string, any> = {};

    if (calendarEnabled) {
      sources.events = boundedSource(
        where,
        { startsAt: { $gte: window.startMs, $lte: window.endMs } },
        { startsAt: 'asc' },
      );
    }
    if (goalsEnabled) {
      sources.plans = boundedSource(
        where,
        { targetDate: { $gte: window.startKey, $lte: window.endKey } },
        { targetDate: 'asc' },
      );
    }
    if (recurringEnabled) {
      sources.reminders = boundedSource(
        where,
        { dueAt: { $gte: window.startMs, $lte: window.endMs } },
        { dueAt: 'asc' },
      );
      sources.rituals = {
        $: { where, order: { createdAt: 'desc' as const }, limit: CALENDAR_RECENT_SOURCE_LIMIT },
        couple: {},
      };
    }
    if (tasksEnabled) {
      sources.tasks = {
        ...boundedSource(
          where,
          { dueDate: { $gte: window.startKey, $lte: window.endKey } },
          { dueDate: 'asc' },
        ),
        list: { couple: {} },
      };
    }

    return Object.keys(sources).length > 0 ? sources : null;
  }, [
    readableSpaceIds,
    month,
    calendarEnabled,
    goalsEnabled,
    recurringEnabled,
    tasksEnabled,
  ]);

  const { data, isLoading } = (db as any).useQuery(query);

  const derived = useMemo(() => {
    const now = Date.now();
    const timeline = buildTimelineItems({
      now,
      previewDays: 400,
      events: calendarEnabled ? normalizePersonalSpacePrivacy(data?.events ?? [], personalSpaceId) : [],
      plans: goalsEnabled ? normalizePersonalSpacePrivacy(data?.plans ?? [], personalSpaceId) : [],
      reminders: recurringEnabled ? normalizePersonalSpacePrivacy(data?.reminders ?? [], personalSpaceId) : [],
      tasks: tasksEnabled
        ? normalizePersonalSpacePrivacy(data?.tasks ?? [], personalSpaceId).filter((task) =>
            childRowMatchesParentSpace(task, 'list'),
          )
        : [],
      rituals: recurringEnabled ? normalizePersonalSpacePrivacy(data?.rituals ?? [], personalSpaceId) : [],
      memories: [],
    });

    const heroStats = computeHeroStats({ now, month, items: timeline });
    const week = buildWeekStrip({
      selectedDate,
      today: todayString(),
      items: timeline,
    });
    const agenda = filterAgendaForDate(timeline, selectedDate);
    const tomorrow = buildTomorrowCard({ selectedDate, items: timeline });

    return { timeline, heroStats, week, agenda, tomorrow };
  }, [
    data,
    month,
    selectedDate,
    calendarEnabled,
    goalsEnabled,
    recurringEnabled,
    tasksEnabled,
    personalSpaceId,
  ]);

  const selectDate = useCallback((date: string) => setSelectedDate(date), []);

  const goToPreviousMonth = useCallback(() => {
    setSelectedDate((current) => addMonthsIso(current, -1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedDate((current) => addMonthsIso(current, 1));
  }, []);

  const goToToday = useCallback(() => setSelectedDate(todayString()), []);

  const value: CalendarState = {
    isLoading: readableSpaceIds.length > 0 && isLoading,
    month,
    monthLabel: formatMonthLabel(month),
    selectedDate,
    today: todayString(),
    week: derived.week,
    agenda: derived.agenda,
    heroStats: derived.heroStats,
    tomorrow: derived.tomorrow,
    selectDate,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function normalizePersonalSpacePrivacy<T extends { isPrivate?: boolean; couple?: unknown; list?: unknown }>(
  rows: T[],
  personalSpaceId: string | null | undefined,
): T[] {
  if (!personalSpaceId) return rows;
  return rows.map((row) => {
    const spaceId =
      firstRel(row.couple)?.id ??
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

export function useCalendar(): CalendarState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider');
  return ctx;
}
