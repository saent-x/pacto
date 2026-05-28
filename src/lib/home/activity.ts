export type ActivityHeatmapDay = {
  dateKey: string;
  count: number;
  weight: 0 | 1 | 2 | 3;
};

export type ActivityHeatmapInput = {
  now?: number;
  weeks?: number;
  events?: any[];
  plans?: any[];
  reminders?: any[];
  tasks?: any[];
  rituals?: any[];
  checkIns?: any[];
  journalEntries?: any[];
  timetableItems?: any[];
  memories?: any[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildActivityHeatmapDays({
  now = Date.now(),
  weeks = 15,
  events = [],
  plans = [],
  reminders = [],
  tasks = [],
  rituals = [],
  checkIns = [],
  journalEntries = [],
  timetableItems: _timetableItems = [],   // intentionally ignored — recurring slots, not events
  memories = [],
}: ActivityHeatmapInput): ActivityHeatmapDay[] {
  const end = startOfLocalDay(new Date(now));
  const start = addDays(startOfWeekMonday(end), -(weeks - 1) * 7);
  const todayKey = formatLocalDateKey(end);
  const counts = new Map<string, number>();
  // Dedup per (entity-row, dateKey) so a single row contributes at most +1
  // to a given day, no matter how many of its date fields land on that day.
  const seen = new Set<string>();

  const bump = (entityKey: string, value: unknown) => {
    const dateKey = toLocalDateKey(value);
    if (!dateKey) return;
    if (!isWithinWindow(dateKey, start, end)) return;
    // Heatmap reflects *what already happened*. Drop future dates so a task
    // due next week or an upcoming milestone doesn't paint heat onto a day
    // where nothing has actually occurred yet.
    if (dateKey > todayKey) return;
    const k = `${entityKey}::${dateKey}`;
    if (seen.has(k)) return;
    seen.add(k);
    counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
  };

  // ── Per-entity policy ──────────────────────────────────────────────────
  //
  //  - One bump per row per day max (enforced by `seen`).
  //  - Bump on dates that represent something happening (completedAt,
  //    checkInDate, entryDate, …) plus the row's primary "owned" date
  //    (dueDate, milestone date, purchasedAt). Avoid `updatedAt` — every
  //    minor edit would silently shift heat. Avoid `createdAt` for entities
  //    that already have a stronger "when did this thing actually happen"
  //    field.

  for (const event of events) {
    if (event?.isPrivate) continue;
    bump(`event:${event?.id}`, event?.startsAt);
  }

  for (const plan of plans) {
    if (plan?.isPrivate) continue;
    bump(`plan:${plan?.id}`, plan?.targetDate);
  }

  for (const reminder of reminders) {
    if (reminder?.isPrivate) continue;
    bump(`reminder:${reminder?.id}`, reminder?.dueAt);
    bump(`reminder:${reminder?.id}`, reminder?.completedAt);
  }

  for (const task of tasks) {
    if (task?.isPrivate) continue;
    bump(`task:${task?.id}`, task?.dueDate);
    bump(`task:${task?.id}`, task?.completedAt);
  }

  for (const ritual of rituals) {
    if (ritual?.isPrivate) continue;
    bump(`ritual:${ritual?.id}`, ritual?.nextOccurrenceAt);
  }

  for (const checkIn of checkIns) {
    if (checkIn?.isPrivate) continue;
    bump(`checkIn:${checkIn?.id}`, checkIn?.checkInDate);
  }

  for (const entry of journalEntries) {
    if (entry?.isPrivate) continue;
    bump(`journal:${entry?.id}`, entry?.entryDate);
  }

  // Memories: written on a specific date, no schedule field.
  for (const memory of memories) {
    if (memory?.isPrivate) continue;
    bump(`memory:${memory?.id}`, memory?.createdAt);
  }

  const length = Math.max(1, weeks * 7);
  return Array.from({ length }, (_, index) => {
    const dateKey = formatLocalDateKey(addDays(start, index));
    const count = counts.get(dateKey) ?? 0;
    return {
      dateKey,
      count,
      weight: count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3,
    };
  });
}

function isWithinWindow(dateKey: string, start: Date, end: Date): boolean {
  const date = parseDateOnly(dateKey);
  return !!date && date >= start && date <= end;
}

function toLocalDateKey(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') {
    const datePrefix = /^(\d{4}-\d{2}-\d{2})/.exec(value)?.[1] ?? null;
    if (datePrefix && !parseDateOnly(datePrefix)) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return datePrefix;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : formatLocalDateKey(parsed);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? formatLocalDateKey(parsed) : null;
  }
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? formatLocalDateKey(value) : null;
  }
  return null;
}

function parseDateOnly(dateKey: string): Date | null {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  const [year, month, day] = parts;
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeekMonday(date: Date): Date {
  const next = startOfLocalDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfLocalDay(next);
}
