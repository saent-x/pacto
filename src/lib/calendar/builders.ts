import { addDays, format } from 'date-fns';
import type { TimelineItem } from '@/src/lib/home/types';

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
  kind: 'event';
  id: string;
  title: string;
  subtitle: string;
  accent: 'peach';
} | null;

const HOUR_MS = 60 * 60 * 1000;

function parseDateOnly(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function toDateString(ts: number) {
  if (!isValidTimestamp(ts)) return '';
  return format(new Date(ts), 'yyyy-MM-dd');
}

function isValidTimestamp(ts: number) {
  return Number.isFinite(ts) && Number.isFinite(new Date(ts).getTime());
}

export function addDaysIso(isoDate: string, offset: number) {
  return format(addDays(parseDateOnly(isoDate), offset), 'yyyy-MM-dd');
}

export function computeHeroStats({
  now,
  month,
  items,
}: {
  now: number;
  month: string;
  items: TimelineItem[];
}): HeroStats {
  const inMonth = items.filter(
    (i) => i.occursAt !== null && toDateString(i.occursAt).startsWith(month),
  );
  const total = inMonth.length;

  const shared = inMonth.filter((i) => !i.isPrivate).length;

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
}: {
  selectedDate: string;
  today: string;
  items: TimelineItem[];
}): WeekDay[] {
  const anchor = parseDateOnly(selectedDate);
  const dayOfWeek = anchor.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStartIso = addDaysIso(selectedDate, mondayOffset);

  const eventDays = new Set<string>();
  for (const item of items) {
    if (item.occursAt === null) continue;
    const date = toDateString(item.occursAt);
    if (date) eventDays.add(date);
  }

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
}: {
  selectedDate: string;
  items: TimelineItem[];
}): TomorrowCard {
  const tomorrow = addDaysIso(selectedDate, 1);

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

  return null;
}

export function formatShortDate(iso: string) {
  const d = parseDateOnly(iso);
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  return `${weekday} ${d.getDate()}`;
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
  const d = parseDateOnly(iso);
  const weekday = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][
    d.getDay()
  ];
  const month = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ][d.getMonth()];
  return `${weekday} · ${d.getDate()} ${month}`;
}
