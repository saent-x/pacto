const MONTH_ABBR = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function parseIsoDate(iso: string): Date | null {
  // Interpret 'YYYY-MM-DD' as local midnight to match due-date semantics.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function bucketOf(dueDate: string | null, todayIso?: string): string {
  if (!dueDate) return 'Later';
  const now = (todayIso ? parseIsoDate(todayIso) : null) ?? new Date();
  const parsedDue = parseIsoDate(dueDate);
  if (!parsedDue) return 'Later';
  const today = startOfDay(now);
  const due = startOfDay(parsedDue);
  const diff = Math.floor((due - today) / 86400000);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 7) return 'This week';
  return MONTH_ABBR[parsedDue.getMonth()];
}

const FIXED_ORDER = ['Overdue', 'Today', 'Tomorrow', 'This week'];

export function orderBuckets(labels: string[], todayIso?: string): string[] {
  const now = (todayIso ? parseIsoDate(todayIso) : null) ?? new Date();
  const monthsFromNow = (abbr: string) => {
    const idx = MONTH_ABBR.indexOf(abbr);
    if (idx === -1) return Infinity;
    const year = now.getFullYear() + (idx < now.getMonth() ? 1 : 0);
    return year * 12 + idx;
  };
  const rank = (x: string) => {
    const fx = FIXED_ORDER.indexOf(x);
    if (fx !== -1) return fx;
    if (x === 'Later') return Number.MAX_SAFE_INTEGER;
    return 100 + monthsFromNow(x);
  };
  return [...new Set(labels)].sort((a, b) => rank(a) - rank(b));
}

export function formatDueChip(dueDate: string | null, todayIso?: string): string | null {
  if (!dueDate) return null;
  const d = parseIsoDate(dueDate);
  if (!d) return null;
  const now = (todayIso ? parseIsoDate(todayIso) : null) ?? new Date();
  const today = startOfDay(now);
  const due = startOfDay(d);
  const diff = Math.floor((due - today) / 86400000);
  if (diff === 0) return 'TODAY';
  if (diff === 1) return 'TOMORROW';
  return `${MONTH_ABBR[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
}
