import type {
  TimelineItem,
  FeaturedSignal,
  MilestoneStripItem,
  MemoryPreview,
  PresenceInfo,
  CalendarDay,
} from './types';

function startOfUtcDay(timestamp: number) {
  const day = new Date(timestamp);
  return Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
}

function endOfUtcDay(timestamp: number) {
  return startOfUtcDay(timestamp) + 24 * 60 * 60 * 1000 - 1;
}

function toDateString(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function parseDateOnly(date: string | null) {
  if (!date) return null;
  return Date.parse(`${date}T12:00:00.000Z`);
}

function daysBetween(now: number, date: string) {
  return Math.round((parseDateOnly(date)! - startOfUtcDay(now)) / (24 * 60 * 60 * 1000));
}

function withinPreviewWindow(
  now: number,
  previewDays: number,
  occursAt: number | null,
  dateOnly: string | null,
) {
  if (occursAt !== null) {
    return occursAt <= endOfUtcDay(now + previewDays * 24 * 60 * 60 * 1000);
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
  const today = toDateString(now);
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
      isPrivate: false,
      isOverdue: dueAt < now,
    });
  }

  for (const task of tasks) {
    if (task.isCompleted) continue;
    const dueDate = task.dueDate ?? null;
    if (!dueDate || !withinPreviewWindow(now, previewDays, null, dueDate)) continue;
    items.push({
      id: `task:${task.id}`,
      type: 'task',
      sourceId: task.id,
      sourceTable: 'tasks',
      title: task.title ?? 'Task',
      subtitle: task.notes ?? null,
      occursAt: parseDateOnly(dueDate),
      priority: task.priority ?? 0,
      isPrivate: false,
      isOverdue: dueDate < today,
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
  loveNotes,
}: {
  journalEntries: any[];
  loveNotes: any[];
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

  for (const note of loveNotes) {
    if (note.isPrivate) continue;
    previews.push({
      sourceId: note.id,
      sourceTable: 'loveNotes',
      title: 'Love note',
      body: note.body ?? '',
      createdAt: note.createdAt ?? 0,
      mediaUrls: [],
    });
  }

  previews.sort(
    (left, right) =>
      right.createdAt - left.createdAt || left.sourceId.localeCompare(right.sourceId),
  );

  return previews;
}

export function buildMilestones({
  now,
  couple,
  milestones,
}: {
  now: number;
  couple: { id: string; anniversary: string | null };
  milestones: any[];
}): MilestoneStripItem[] {
  const items: MilestoneStripItem[] = [];

  if (couple.anniversary) {
    const daysUntil = daysBetween(now, couple.anniversary);
    if (daysUntil >= 0 && daysUntil <= 30) {
      items.push({
        id: `countdown:${couple.id}`,
        type: 'countdown',
        title: 'Anniversary',
        subtitle: `${daysUntil} day${daysUntil === 1 ? '' : 's'} to go`,
        date: couple.anniversary,
        daysUntil,
      });
    }
  }

  for (const milestone of milestones) {
    const date = milestone.date;
    if (!date) continue;
    const daysUntil = daysBetween(now, date);
    if (daysUntil < 0 || daysUntil > 30) continue;
    items.push({
      id: `milestone:${milestone.id}`,
      type: 'milestone',
      title: milestone.title ?? 'Milestone',
      subtitle: milestone.description ?? null,
      date,
      daysUntil,
    });
  }

  return items.sort(
    (left, right) =>
      left.daysUntil - right.daysUntil || left.title.localeCompare(right.title),
  );
}

export function selectFeaturedSignal({
  now,
  presence,
  milestones,
  memoryPreview,
  checkIns,
}: {
  now: number;
  presence: PresenceInfo | null;
  milestones: MilestoneStripItem[];
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

  if (memoryPreview?.sourceTable === 'loveNotes') {
    return {
      kind: 'loveNote',
      sourceId: memoryPreview.sourceId,
      sourceTable: memoryPreview.sourceTable,
      title: memoryPreview.title,
      body: memoryPreview.body,
      occursAt: memoryPreview.createdAt,
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

  if (milestones[0]) {
    const countdown = milestones[0];
    return {
      kind: 'countdown',
      sourceId: countdown.id,
      sourceTable: 'milestones',
      title: countdown.title,
      body: `${countdown.daysUntil} day${countdown.daysUntil === 1 ? '' : 's'} until ${countdown.title.toLowerCase()}.`,
      occursAt: parseDateOnly(countdown.date),
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
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days),
  );
}

export function buildCalendarDays({
  now,
  month,
  items,
  milestones,
}: {
  now: number;
  month: string;
  items: TimelineItem[];
  milestones: MilestoneStripItem[];
}): CalendarDay[] {
  const [year, monthIndex] = month.split('-').map(Number);
  const monthStart = new Date(Date.UTC(year, monthIndex - 1, 1));
  const firstGridDay = addDays(monthStart, -monthStart.getUTCDay());
  const today = toDateString(now);

  return Array.from({ length: 42 }, (_, index) => {
    const current = addDays(firstGridDay, index);
    const date = current.toISOString().slice(0, 10);
    const dayItems = items.filter((item) => {
      if (item.occursAt === null) return false;
      return toDateString(item.occursAt) === date;
    });
    const dayMilestones = milestones.filter((m) => m.date === date);
    const kinds = Array.from(
      new Set([
        ...dayItems.map((item) => item.type),
        ...dayMilestones.map(() => 'milestone' as const),
      ]),
    );

    return {
      date,
      inMonth: current.getUTCMonth() === monthStart.getUTCMonth(),
      isToday: date === today,
      itemCount: dayItems.length + dayMilestones.length,
      kinds,
    };
  });
}

export function formatMonthLabel(month: string) {
  const monthStart = new Date(Date.parse(`${month}-01T00:00:00.000Z`));
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(monthStart);
}
