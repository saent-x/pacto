const MONTH_ABBR = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const WEEKDAY_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function validDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function bucketOfDue(dueAt: string, nowIso?: string): string {
  const now = validDate(nowIso) ?? new Date();
  const due = validDate(dueAt);
  if (!due) return 'Later';
  const today = startOfDay(now);
  const dueDay = startOfDay(due);
  const diff = Math.floor((dueDay - today) / 86400000);
  if (diff < 0) return 'Overdue';
  if (diff === 0 && due.getTime() < now.getTime()) return 'Overdue';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 7) return 'This week';
  return MONTH_ABBR[due.getMonth()];
}

const FIXED_ORDER = ['Overdue', 'Today', 'Tomorrow', 'This week'];

export function orderReminderBuckets(labels: string[], nowIso?: string): string[] {
  const now = validDate(nowIso) ?? new Date();
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

export function formatWhenChip(dueAt: string, nowIso?: string): string {
  const due = validDate(dueAt);
  if (!due) return 'No date';
  const now = validDate(nowIso) ?? new Date();
  const diffDays = Math.floor((startOfDay(due) - startOfDay(now)) / 86400000);
  const hhmm = `${pad(due.getHours())}:${pad(due.getMinutes())}`;
  if (diffDays < 0) return 'Yesterday';
  if (diffDays === 0) return hhmm;
  if (diffDays === 1) return `Tomorrow · ${hhmm}`;
  if (diffDays < 7) return `${WEEKDAY_ABBR[due.getDay()]} · ${hhmm}`;
  return `${MONTH_ABBR[due.getMonth()]} ${due.getDate()}`;
}

export function isOverdue(dueAt: string, isCompleted: boolean, nowIso?: string): boolean {
  if (isCompleted) return false;
  const now = validDate(nowIso) ?? new Date();
  const due = validDate(dueAt);
  return due ? due.getTime() < now.getTime() : false;
}
