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
  const { activeCouple } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const anniversary = activeCouple?.couple?.anniversary ?? null;

  const initial = todayString();
  const [selectedDate, setSelectedDate] = useState(initial);

  const month = selectedDate.slice(0, 7);

  const { data, isLoading } = (db as any).useQuery(
    coupleId
      ? {
          events: { $: { where: { 'couple.id': coupleId } } },
          plans: { $: { where: { 'couple.id': coupleId } } },
          reminders: { $: { where: { 'couple.id': coupleId } } },
          tasks: { $: { where: { 'couple.id': coupleId } } },
          rituals: { $: { where: { 'couple.id': coupleId } } },
          milestones: { $: { where: { 'couple.id': coupleId } } },
        }
      : null,
  );

  const derived = useMemo(() => {
    const now = Date.now();
    const timeline = buildTimelineItems({
      now,
      previewDays: 400,
      events: data?.events ?? [],
      plans: data?.plans ?? [],
      reminders: data?.reminders ?? [],
      tasks: data?.tasks ?? [],
      rituals: data?.rituals ?? [],
      memories: [],
    });

    const milestones: MilestoneStripItem[] = buildMilestones({
      now,
      couple: { id: coupleId ?? '', anniversary },
      milestones: data?.milestones ?? [],
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
  }, [data, coupleId, anniversary, month, selectedDate]);

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
