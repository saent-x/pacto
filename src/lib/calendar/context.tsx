import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { db } from '@/src/lib/instant';
import { useSession } from '@/src/hooks/useSession';
import {
  buildTimelineItems,
  buildMilestones,
  formatMonthLabel,
} from '@/src/lib/home/builders';
import type { MilestoneStripItem, TimelineItem } from '@/src/lib/home/types';
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

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const { activeCouple, isFeatureEnabled } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const anniversary = activeCouple?.couple?.anniversary ?? null;

  const initial = todayString();
  const [selectedDate, setSelectedDate] = useState(initial);

  const month = selectedDate.slice(0, 7);
  const calendarEnabled = isFeatureEnabled('calendar');
  const goalsEnabled = isFeatureEnabled('goals');
  const recurringEnabled = isFeatureEnabled('recurring');
  const tasksEnabled = isFeatureEnabled('tasks');
  const memoriesEnabled = isFeatureEnabled('memories');

  const query = useMemo(() => {
    if (!coupleId) return null;

    const where = { 'couple.id': coupleId };
    const sources: Record<string, { $: { where: typeof where } }> = {};

    if (calendarEnabled) sources.events = { $: { where } };
    if (goalsEnabled) sources.plans = { $: { where } };
    if (recurringEnabled) {
      sources.reminders = { $: { where } };
      sources.rituals = { $: { where } };
    }
    if (tasksEnabled) sources.tasks = { $: { where } };
    if (memoriesEnabled) sources.milestones = { $: { where } };

    return Object.keys(sources).length > 0 ? sources : null;
  }, [
    coupleId,
    calendarEnabled,
    goalsEnabled,
    recurringEnabled,
    tasksEnabled,
    memoriesEnabled,
  ]);

  const { data, isLoading } = (db as any).useQuery(query);

  const derived = useMemo(() => {
    const now = Date.now();
    const timeline = buildTimelineItems({
      now,
      previewDays: 400,
      events: calendarEnabled ? (data?.events ?? []) : [],
      plans: goalsEnabled ? (data?.plans ?? []) : [],
      reminders: recurringEnabled ? (data?.reminders ?? []) : [],
      tasks: tasksEnabled ? (data?.tasks ?? []) : [],
      rituals: recurringEnabled ? (data?.rituals ?? []) : [],
      memories: [],
    });

    const milestones: MilestoneStripItem[] = buildMilestones({
      now,
      couple: { id: coupleId ?? '', anniversary: memoriesEnabled ? anniversary : null },
      milestones: memoriesEnabled ? (data?.milestones ?? []) : [],
    });

    const heroStats = computeHeroStats({ now, month, items: timeline, milestones });
    const week = buildWeekStrip({
      selectedDate,
      today: todayString(),
      items: timeline,
      milestones,
    });
    const agenda = filterAgendaForDate(timeline, selectedDate);
    const tomorrow = buildTomorrowCard({ selectedDate, items: timeline, milestones });

    return { timeline, milestones, heroStats, week, agenda, tomorrow };
  }, [
    data,
    coupleId,
    anniversary,
    month,
    selectedDate,
    calendarEnabled,
    goalsEnabled,
    recurringEnabled,
    tasksEnabled,
    memoriesEnabled,
  ]);

  const selectDate = useCallback((date: string) => setSelectedDate(date), []);

  const goToPreviousMonth = useCallback(() => {
    setSelectedDate((current) => {
      const d = new Date(`${current}T12:00:00.000Z`);
      d.setUTCMonth(d.getUTCMonth() - 1);
      return d.toISOString().slice(0, 10);
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedDate((current) => {
      const d = new Date(`${current}T12:00:00.000Z`);
      d.setUTCMonth(d.getUTCMonth() + 1);
      return d.toISOString().slice(0, 10);
    });
  }, []);

  const goToToday = useCallback(() => setSelectedDate(todayString()), []);

  const value: CalendarState = {
    isLoading: !!coupleId && isLoading,
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

export function useCalendar(): CalendarState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider');
  return ctx;
}
