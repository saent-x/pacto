import type { MilestoneStripItem, TimelineItem } from '@/src/lib/home/types';

export type HeroStats = {
  total: number;
  shared: number;
  upcoming: number;
  nextInHours: number | null;
};

export type WeekDay = {
  date: string;
  dayNum: number;
  hasEvent: boolean;
  isToday: boolean;
  isSelected: boolean;
};

export type TomorrowCard = {
  kind: 'milestone' | 'event';
  id: string;
  title: string;
  subtitle: string;
  accent: 'mint' | 'peach' | 'butter';
} | null;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export function toDateString(ts: number) {
  return new Date(ts).toISOString().slice(0, 10);
}

export function addDaysIso(isoDate: string, offset: number) {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function computeHeroStats({
  now,
  month,
  items,
  milestones,
}: {
  now: number;
  month: string;
  items: TimelineItem[];
  milestones: MilestoneStripItem[];
}): HeroStats {
  const inMonth = items.filter(
    (i) => i.occursAt !== null && toDateString(i.occursAt).startsWith(month),
  );
  const milestonesInMonth = milestones.filter((m) => m.date.startsWith(month));
  const total = inMonth.length + milestonesInMonth.length;

  const shared = inMonth.filter((i) => !i.isPrivate).length + milestonesInMonth.length;

  const upcoming = inMonth.filter((i) => (i.occursAt ?? 0) >= now).length;

  const nextTs = inMonth
    .map((i) => i.occursAt ?? 0)
    .filter((t) => t >= now)
    .sort((a, b) => a - b)[0];
  const nextInHours = nextTs ? Math.max(0, Math.round((nextTs - now) / HOUR_MS)) : null;

  return { total, shared, upcoming, nextInHours };
}

export function buildWeekStrip({
  selectedDate,
  today,
  items,
  milestones,
}: {
  selectedDate: string;
  today: string;
  items: TimelineItem[];
  milestones: MilestoneStripItem[];
}): WeekDay[] {
  const anchor = new Date(`${selectedDate}T12:00:00.000Z`);
  const dayOfWeek = anchor.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStartIso = addDaysIso(selectedDate, mondayOffset);

  const eventDays = new Set<string>();
  for (const item of items) {
    if (item.occursAt === null) continue;
    eventDays.add(toDateString(item.occursAt));
  }
  for (const m of milestones) eventDays.add(m.date);

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDaysIso(weekStartIso, i);
    return {
      date,
      dayNum: Number(date.slice(8, 10)),
      hasEvent: eventDays.has(date),
      isToday: date === today,
      isSelected: date === selectedDate,
    };
  });
}

export function filterAgendaForDate(items: TimelineItem[], date: string): TimelineItem[] {
  return items
    .filter((i) => i.occursAt !== null && toDateString(i.occursAt) === date)
    .sort((a, b) => (a.occursAt ?? 0) - (b.occursAt ?? 0));
}

export function buildTomorrowCard({
  selectedDate,
  items,
  milestones,
}: {
  selectedDate: string;
  items: TimelineItem[];
  milestones: MilestoneStripItem[];
}): TomorrowCard {
  const tomorrow = addDaysIso(selectedDate, 1);

  const milestone = milestones.find((m) => m.date === tomorrow);
  if (milestone) {
    return {
      kind: 'milestone',
      id: milestone.id,
      title: milestone.title,
      subtitle: `${formatShortDate(tomorrow)} · All day`,
      accent: 'mint',
    };
  }

  const next = items
    .filter((i) => i.occursAt !== null && toDateString(i.occursAt) === tomorrow)
    .sort((a, b) => (a.occursAt ?? 0) - (b.occursAt ?? 0))[0];
  if (next) {
    return {
      kind: 'event',
      id: next.id,
      title: next.title,
      subtitle: `${formatShortDate(tomorrow)} · ${formatTime(next.occursAt!)}`,
      accent: 'peach',
    };
  }

  const futureMilestone = milestones.find((m) => m.date > selectedDate);
  if (futureMilestone) {
    const days = Math.round(
      (new Date(`${futureMilestone.date}T12:00:00.000Z`).getTime() -
        new Date(`${selectedDate}T12:00:00.000Z`).getTime()) /
        DAY_MS,
    );
    return {
      kind: 'milestone',
      id: futureMilestone.id,
      title: futureMilestone.title,
      subtitle: `In ${days} day${days === 1 ? '' : 's'}`,
      accent: 'butter',
    };
  }

  return null;
}

export function formatShortDate(iso: string) {
  const d = new Date(`${iso}T12:00:00.000Z`);
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()];
  return `${weekday} ${d.getUTCDate()}`;
}

export function formatTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatAgendaTime(ts: number) {
  return formatTime(ts);
}

export function formatAgendaDayHeader(iso: string) {
  const d = new Date(`${iso}T12:00:00.000Z`);
  const weekday = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][
    d.getUTCDay()
  ];
  const month = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ][d.getUTCMonth()];
  return `${weekday} · ${d.getUTCDate()} ${month}`;
}
