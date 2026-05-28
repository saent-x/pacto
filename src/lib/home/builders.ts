import type {
  TimelineItem,
  FeaturedSignal,
  MemoryPreview,
  PresenceInfo,
  CalendarDay,
} from './types';
import {
  addDays as addLocalDays,
  differenceInCalendarDays,
  endOfDay,
  format,
} from 'date-fns';

function toDateString(timestamp: number) {
  if (!isValidTimestamp(timestamp)) return null;
  return format(new Date(timestamp), 'yyyy-MM-dd');
}

function isValidTimestamp(timestamp: number) {
  return Number.isFinite(timestamp) && Number.isFinite(new Date(timestamp).getTime());
}

function parseDateOnly(date: string | null) {
  if (!date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed.getTime();
}

function daysBetween(now: number, date: string) {
  const parsed = parseDateOnly(date);
  if (parsed === null) return Number.POSITIVE_INFINITY;
  return differenceInCalendarDays(new Date(parsed), new Date(now));
}

function withinPreviewWindow(
  now: number,
  previewDays: number,
  occursAt: number | null,
  dateOnly: string | null,
) {
  if (occursAt !== null) {
    if (!isValidTimestamp(occursAt)) return false;
    return occursAt <= endOfDay(addLocalDays(new Date(now), previewDays)).getTime();
  }
  if (!dateOnly) return false;
  return daysBetween(now, dateOnly) <= previewDays;
}

function timelineSort(left: TimelineItem, right: TimelineItem) {
  const leftBucket = left.isOverdue ? 0 : 1;
  const rightBucket = right.isOverdue ? 0 : 1;
  const leftOccurs = left.occursAt ?? Number.MAX_SAFE_INTEGER;
  const rightOccurs = right.occursAt ?? Number.MAX_SAFE_INTEGER;
  return (
    leftBucket - rightBucket ||
    leftOccurs - rightOccurs ||
    right.priority - left.priority ||
    left.title.localeCompare(right.title) ||
    left.sourceId.localeCompare(right.sourceId)
  );
}

function firstRel(value: any): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function buildTimelineItems({
  now,
  previewDays,
  events,
  plans,
  reminders,
  tasks,
  rituals,
  memories,
}: {
  now: number;
  previewDays: number;
  events: any[];
  plans: any[];
  reminders: any[];
  tasks: any[];
  rituals: any[];
  memories: MemoryPreview[];
}) {
  const today = toDateString(now) ?? '';
  const items: TimelineItem[] = [];

  for (const event of events) {
    if (event.isPrivate) continue;
    if (!withinPreviewWindow(now, previewDays, event.startsAt, null)) continue;
    items.push({
      id: `event:${event.id}`,
      type: 'event',
      sourceId: event.id,
      sourceTable: 'events',
      title: event.title,
      subtitle: event.description ?? null,
      occursAt: event.startsAt,
      priority: event.priority,
      isPrivate: event.isPrivate,
      isOverdue: event.startsAt < now,
    });
  }

  for (const plan of plans) {
    if (plan.isPrivate) continue;
    if (['done', 'completed', 'cancelled'].includes((plan.status ?? '').toLowerCase())) continue;
    if (!withinPreviewWindow(now, previewDays, null, plan.targetDate ?? null)) continue;
    items.push({
      id: `plan:${plan.id}`,
      type: 'plan',
      sourceId: plan.id,
      sourceTable: 'plans',
      title: plan.title,
      subtitle: plan.description ?? plan.notes ?? null,
      occursAt: parseDateOnly(plan.targetDate ?? null),
      priority: plan.priority,
      isPrivate: plan.isPrivate,
      isOverdue: !!plan.targetDate && plan.targetDate < today,
    });
  }

  for (const reminder of reminders) {
    if (reminder.isPrivate) continue;
    if (reminder.isCompleted) continue;
    const dueAt = reminder.dueAt;
    if (dueAt == null) continue;
    if (!withinPreviewWindow(now, previewDays, dueAt, null)) continue;
    items.push({
      id: `reminder:${reminder.id}`,
      type: 'reminder',
      sourceId: reminder.id,
      sourceTable: 'reminders',
      title: reminder.title ?? 'Reminder',
      subtitle: reminder.description ?? null,
      occursAt: dueAt,
      priority: reminder.priority ?? 0,
      isPrivate: !!reminder.isPrivate,
      isOverdue: dueAt < now,
      isCompleted: !!reminder.isCompleted,
    });
  }

  for (const task of tasks) {
    if (task.isPrivate) continue;
    if (task.isCompleted) continue;
    const dueDate = task.dueDate ?? null;
    if (!dueDate || !withinPreviewWindow(now, previewDays, null, dueDate)) continue;
    items.push({
      id: `task:${task.id}`,
      type: 'task',
      sourceId: task.id,
      sourceParentId: firstRel(task.list)?.id ?? null,
      sourceTable: 'tasks',
      title: task.title ?? 'Task',
      subtitle: task.notes ?? null,
      occursAt: parseDateOnly(dueDate),
      priority: task.priority ?? 0,
      isPrivate: !!task.isPrivate,
      isOverdue: dueDate < today,
      isCompleted: !!task.isCompleted,
    });
  }

  for (const ritual of rituals) {
    if (ritual.isPrivate || !ritual.isActive) continue;
    const occursAt = ritual.nextOccurrenceAt ?? parseDateOnly(ritual.dueDate ?? null);
    if (!withinPreviewWindow(now, previewDays, occursAt, ritual.dueDate ?? null)) continue;
    items.push({
      id: `ritual:${ritual.id}`,
      type: 'ritual',
      sourceId: ritual.id,
      sourceTable: 'rituals',
      title: ritual.title,
      subtitle: ritual.description ?? ritual.cadence ?? null,
      occursAt,
      priority: ritual.priority,
      isPrivate: ritual.isPrivate,
      isOverdue: occursAt !== null ? occursAt < now : !!ritual.dueDate && ritual.dueDate < today,
    });
  }

  for (const memory of memories.slice(0, 1)) {
    items.push({
      id: `memory:${memory.sourceId}`,
      type: 'memory',
      sourceId: memory.sourceId,
      sourceTable: memory.sourceTable,
      title: memory.title,
      subtitle: memory.body,
      occursAt: memory.createdAt,
      priority: -1,
      isPrivate: false,
      isOverdue: false,
    });
  }

  return items.sort(timelineSort);
}

export function buildMemoryPreviews({
  journalEntries,
}: {
  journalEntries: any[];
}): MemoryPreview[] {
  const previews: MemoryPreview[] = [];

  for (const entry of journalEntries) {
    if (entry.isPrivate) continue;
    previews.push({
      sourceId: entry.id,
      sourceTable: 'journalEntries',
      title: entry.title ?? 'Shared memory',
      body: entry.body ?? '',
      createdAt: entry.createdAt ?? 0,
      mediaUrls: Array.isArray(entry.mediaUrls) ? entry.mediaUrls : [],
    });
  }

  previews.sort(
    (left, right) =>
      right.createdAt - left.createdAt || left.sourceId.localeCompare(right.sourceId),
  );

  return previews;
}

export function selectFeaturedSignal({
  now,
  presence,
  memoryPreview,
  checkIns,
}: {
  now: number;
  presence: PresenceInfo | null;
  memoryPreview: MemoryPreview | null;
  checkIns: any[];
}): FeaturedSignal | null {
  const sharedCheckIns = checkIns
    .filter((c) => !c.isPrivate && !!c.note)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  if (sharedCheckIns[0]) {
    const featured = sharedCheckIns[0];
    return {
      kind: 'checkIn',
      sourceId: featured.id,
      sourceTable: 'checkIns',
      title: 'Relationship pulse',
      body: featured.note ?? 'A check-in was shared.',
      occursAt: featured.createdAt,
    };
  }

  if (memoryPreview) {
    return {
      kind: 'memory',
      sourceId: memoryPreview.sourceId,
      sourceTable: memoryPreview.sourceTable,
      title: memoryPreview.title,
      body: memoryPreview.body,
      occursAt: memoryPreview.createdAt,
    };
  }

  return presence
    ? {
        kind: 'presence',
        sourceId: presence.coupleId,
        sourceTable: 'couples',
        title: presence.partner ? 'You two are in sync' : 'Invite your partner in',
        body: presence.partner
          ? `${presence.self.displayName} and ${presence.partner.displayName} are connected today.`
          : 'Your shared space is ready when your partner joins.',
        occursAt: now,
      }
    : null;
}

function addDays(date: Date, days: number) {
  return addLocalDays(date, days);
}

export function buildCalendarDays({
  now,
  month,
  items,
}: {
  now: number;
  month: string;
  items: TimelineItem[];
}): CalendarDay[] {
  const [year, monthIndex] = month.split('-').map(Number);
  const monthStart = new Date(year, monthIndex - 1, 1, 12, 0, 0, 0);
  const firstGridDay = addDays(monthStart, -monthStart.getDay());
  const today = toDateString(now);

  return Array.from({ length: 42 }, (_, index) => {
    const current = addDays(firstGridDay, index);
    const date = format(current, 'yyyy-MM-dd');
    const dayItems = items.filter((item) => {
      if (item.occursAt === null) return false;
      return toDateString(item.occursAt) === date;
    });
    const kinds = Array.from(new Set(dayItems.map((item) => item.type)));

    return {
      date,
      inMonth: current.getMonth() === monthStart.getMonth(),
      isToday: date === today,
      itemCount: dayItems.length,
      kinds,
    };
  });
}

export function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1, 12));
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(monthStart);
}
