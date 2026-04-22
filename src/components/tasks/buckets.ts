const MONTH_ABBR = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function parseIsoDate(iso: string): Date {
  // Interpret 'YYYY-MM-DD' as local midnight to match due-date semantics.
  return new Date(`${iso}T00:00:00`);
}

export function bucketOf(dueDate: string | null, todayIso?: string): string {
  if (!dueDate) return 'Later';
  const now = todayIso ? parseIsoDate(todayIso) : new Date();
  const today = startOfDay(now);
  const due = startOfDay(parseIsoDate(dueDate));
  const diff = Math.floor((due - today) / 86400000);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 7) return 'This week';
  return MONTH_ABBR[parseIsoDate(dueDate).getMonth()];
}

const FIXED_ORDER = ['Overdue', 'Today', 'Tomorrow', 'This week'];

export function orderBuckets(labels: string[], todayIso?: string): string[] {
  const now = todayIso ? parseIsoDate(todayIso) : new Date();
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
  const now = todayIso ? parseIsoDate(todayIso) : new Date();
  const today = startOfDay(now);
  const due = startOfDay(d);
  const diff = Math.floor((due - today) / 86400000);
  if (diff === 0) return 'TODAY';
  if (diff === 1) return 'TOMORROW';
  return `${MONTH_ABBR[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
}
