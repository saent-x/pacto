import { queryGeneric } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import type { CoupleRecord } from "./lib/auth";
import { presenceSummaryValidator, resolveCurrentSession } from "./lib/auth";
import { getActiveCouple } from "./lib/permissions";
import { listCheckInsForCouple } from "./checkIns";
import { getDailyVerseForNow } from "./dailyVerse";
import { listEventsForCouple } from "./events";
import { listPlansForCouple } from "./plans";
import { listRitualsForCouple } from "./rituals";
import { getCuratedDailyVerse, type DailyVerse } from "../src/lib/home/dailyVerse";

type SharedDoc = Record<string, unknown> & { _id: string };

function emptyHomeView(): HomeView {
  const dateKey = new Date().toISOString().slice(0, 10);
  return {
    hero: null,
    timeline: [],
    milestones: [],
    memories: [],
    memoryPreview: null,
    presence: null,
    dailyVerse: getCuratedDailyVerse(dateKey),
  };
}
type StorageReader = {
  getUrl(storageId: string): Promise<string | null>;
};

export type TimelineItem = {
  id: string;
  type: "event" | "plan" | "reminder" | "task" | "ritual" | "memory";
  sourceId: string;
  sourceTable: string;
  title: string;
  subtitle: string | null;
  occursAt: number | null;
  priority: number;
  isPrivate: boolean;
  isOverdue: boolean;
};

export type FeaturedSignal = {
  kind: "checkIn" | "loveNote" | "memory" | "countdown" | "presence";
  sourceId: string;
  sourceTable: string;
  title: string;
  body: string;
  occursAt: number | null;
};

export type MilestoneStripItem = {
  id: string;
  type: "countdown" | "milestone";
  title: string;
  subtitle: string | null;
  date: string;
  daysUntil: number;
};

export type MemoryPreview = {
  sourceId: string;
  sourceTable: string;
  title: string;
  body: string;
  createdAt: number;
  mediaUrls: string[];
};

export type HomeView = {
  hero: FeaturedSignal | null;
  timeline: TimelineItem[];
  milestones: MilestoneStripItem[];
  /** All shared memories (journal entries + love notes), newest first */
  memories: MemoryPreview[];
  /** @deprecated Use `memories[0]` instead */
  memoryPreview: MemoryPreview | null;
  presence: ReturnType<typeof normalizePresence>;
  dailyVerse: DailyVerse;
};

export type CalendarDay = {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  itemCount: number;
  kinds: Array<TimelineItem["type"] | "milestone">;
};

export type CalendarView = {
  month: string;
  monthLabel: string;
  selectedDate: string | null;
  days: CalendarDay[];
  agenda: TimelineItem[];
  milestones: MilestoneStripItem[];
};

const timelineItemValidator = v.object({
  id: v.string(),
  type: v.union(
    v.literal("event"),
    v.literal("plan"),
    v.literal("reminder"),
    v.literal("task"),
    v.literal("ritual"),
    v.literal("memory"),
  ),
  sourceId: v.string(),
  sourceTable: v.string(),
  title: v.string(),
  subtitle: v.union(v.string(), v.null()),
  occursAt: v.union(v.number(), v.null()),
  priority: v.number(),
  isPrivate: v.boolean(),
  isOverdue: v.boolean(),
});

const featuredSignalValidator = v.object({
  kind: v.union(
    v.literal("checkIn"),
    v.literal("loveNote"),
    v.literal("memory"),
    v.literal("countdown"),
    v.literal("presence"),
  ),
  sourceId: v.string(),
  sourceTable: v.string(),
  title: v.string(),
  body: v.string(),
  occursAt: v.union(v.number(), v.null()),
});

const milestoneStripItemValidator = v.object({
  id: v.string(),
  type: v.union(v.literal("countdown"), v.literal("milestone")),
  title: v.string(),
  subtitle: v.union(v.string(), v.null()),
  date: v.string(),
  daysUntil: v.number(),
});

const singleMemoryValidator = v.object({
  sourceId: v.string(),
  sourceTable: v.string(),
  title: v.string(),
  body: v.string(),
  createdAt: v.number(),
  mediaUrls: v.array(v.string()),
});

const memoryPreviewValidator = v.union(v.null(), singleMemoryValidator);

const dailyVerseValidator = v.object({
  text: v.string(),
  reference: v.string(),
  translation: v.string(),
  source: v.union(v.literal("remote"), v.literal("fallback")),
  dateKey: v.string(),
});

const homeViewValidator = v.object({
  hero: v.union(featuredSignalValidator, v.null()),
  timeline: v.array(timelineItemValidator),
  milestones: v.array(milestoneStripItemValidator),
  memories: v.array(singleMemoryValidator),
  memoryPreview: memoryPreviewValidator,
  presence: presenceSummaryValidator,
  dailyVerse: dailyVerseValidator,
});

const calendarDayValidator = v.object({
  date: v.string(),
  inMonth: v.boolean(),
  isToday: v.boolean(),
  itemCount: v.number(),
  kinds: v.array(
    v.union(
      v.literal("event"),
      v.literal("plan"),
      v.literal("reminder"),
      v.literal("task"),
      v.literal("ritual"),
      v.literal("memory"),
      v.literal("milestone"),
    ),
  ),
});

const calendarViewValidator = v.object({
  month: v.string(),
  monthLabel: v.string(),
  selectedDate: v.union(v.string(), v.null()),
  days: v.array(calendarDayValidator),
  agenda: v.array(timelineItemValidator),
  milestones: v.array(milestoneStripItemValidator),
});

function readString(doc: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = doc[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}

function readOptionalString(
  doc: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = doc[key];
    if (value === null) {
      return null;
    }
    if (typeof value === "string") {
      return value;
    }
  }
  return null;
}

function readNumber(doc: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = doc[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function readBoolean(doc: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = doc[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return false;
}

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
  if (!date) {
    return null;
  }
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
  if (!dateOnly) {
    return false;
  }
  return daysBetween(now, dateOnly) <= previewDays;
}

function normalizePresence(session: Awaited<ReturnType<typeof resolveCurrentSession>>) {
  if (!session?.profile || !session.activeCouple) {
    return null;
  }

  const { couple, membership, memberCount, partner } = session.activeCouple;
  return {
    coupleId: couple._id,
    coupleName: couple.name,
    memberCount,
    relationshipState: partner ? ("paired" as const) : ("waiting" as const),
    self: {
      userId: session.profile._id,
      displayName: session.profile.displayName,
      avatarUrl: session.profile.avatarUrl ?? null,
    },
    partner: partner
      ? {
          userId: partner._id,
          displayName: partner.displayName,
          avatarUrl: partner.avatarUrl ?? null,
        }
      : null,
    joinedAt: membership.joinedAt,
  };
}

async function listIndexedSharedDocs(
  ctx: { db: any },
  table: string,
  coupleId: string,
) {
  return (await ctx.db
    .query(table)
    .withIndex("by_coupleId", (q: any) => q.eq("coupleId", coupleId))
    .collect()) as SharedDoc[];
}

function isCompleted(doc: Record<string, unknown>) {
  return readBoolean(doc, "isCompleted", "is_completed");
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

function buildTimelineItems({
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
  events: Awaited<ReturnType<typeof listEventsForCouple>>;
  plans: Awaited<ReturnType<typeof listPlansForCouple>>;
  reminders: SharedDoc[];
  tasks: SharedDoc[];
  rituals: Awaited<ReturnType<typeof listRitualsForCouple>>;
  memories: MemoryPreview[];
}) {
  const today = toDateString(now);
  const items: TimelineItem[] = [];

  for (const event of events) {
    if (event.isPrivate) {
      continue;
    }
    if (!withinPreviewWindow(now, previewDays, event.startsAt, null)) {
      continue;
    }
    items.push({
      id: `event:${event._id}`,
      type: "event",
      sourceId: event._id,
      sourceTable: "events",
      title: event.title,
      subtitle: event.description,
      occursAt: event.startsAt,
      priority: event.priority,
      isPrivate: event.isPrivate,
      isOverdue: event.startsAt < now,
    });
  }

  for (const plan of plans) {
    if (plan.isPrivate) {
      continue;
    }
    if (["done", "completed", "cancelled"].includes(plan.status.toLowerCase())) {
      continue;
    }
    if (!withinPreviewWindow(now, previewDays, null, plan.targetDate)) {
      continue;
    }
    items.push({
      id: `plan:${plan._id}`,
      type: "plan",
      sourceId: plan._id,
      sourceTable: "plans",
      title: plan.title,
      subtitle: plan.description ?? plan.notes,
      occursAt: parseDateOnly(plan.targetDate),
      priority: plan.priority,
      isPrivate: plan.isPrivate,
      isOverdue: !!plan.targetDate && plan.targetDate < today,
    });
  }

  for (const reminder of reminders) {
    if (isCompleted(reminder)) {
      continue;
    }
    const dueAt = readNumber(reminder, "dueAt", "due_at");
    if (dueAt === null) {
      continue;
    }
    if (!withinPreviewWindow(now, previewDays, dueAt, null)) {
      continue;
    }
    items.push({
      id: `reminder:${reminder._id}`,
      type: "reminder",
      sourceId: reminder._id,
      sourceTable: "reminders",
      title: readString(reminder, "title") ?? "Reminder",
      subtitle: readOptionalString(reminder, "description"),
      occursAt: dueAt,
      priority: readNumber(reminder, "priority") ?? 0,
      isPrivate: false,
      isOverdue: dueAt < now,
    });
  }

  for (const task of tasks) {
    if (isCompleted(task)) {
      continue;
    }
    const dueDate = readString(task, "dueDate", "due_date");
    if (!dueDate || !withinPreviewWindow(now, previewDays, null, dueDate)) {
      continue;
    }
    items.push({
      id: `task:${task._id}`,
      type: "task",
      sourceId: task._id,
      sourceTable: "tasks",
      title: readString(task, "title") ?? "Task",
      subtitle: readOptionalString(task, "notes", "description"),
      occursAt: parseDateOnly(dueDate),
      priority: readNumber(task, "priority") ?? 0,
      isPrivate: false,
      isOverdue: dueDate < today,
    });
  }

  for (const ritual of rituals) {
    if (ritual.isPrivate || !ritual.isActive) {
      continue;
    }
    const occursAt = ritual.nextOccurrenceAt ?? parseDateOnly(ritual.dueDate);
    if (!withinPreviewWindow(now, previewDays, occursAt, ritual.dueDate)) {
      continue;
    }
    items.push({
      id: `ritual:${ritual._id}`,
      type: "ritual",
      sourceId: ritual._id,
      sourceTable: "rituals",
      title: ritual.title,
      subtitle: ritual.description ?? ritual.cadence,
      occursAt,
      priority: ritual.priority,
      isPrivate: ritual.isPrivate,
      isOverdue:
        occursAt !== null ? occursAt < now : !!ritual.dueDate && ritual.dueDate < today,
    });
  }

  for (const memory of memories.slice(0, 1)) {
    items.push({
      id: `memory:${memory.sourceId}`,
      type: "memory",
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

async function resolveMediaUrls(storage: StorageReader, refs: unknown) {
  const mediaRefs = Array.isArray(refs) ? refs.filter((value): value is string => typeof value === "string") : [];
  const mediaUrls = await Promise.all(mediaRefs.map(async (ref) => {
    if (ref.startsWith("http://") || ref.startsWith("https://")) {
      return ref;
    }
    return (await storage.getUrl(ref)) ?? ref;
  }));
  return mediaUrls;
}

async function buildMemoryPreview({
  storage,
  journalEntries,
  loveNotes,
}: {
  storage: StorageReader;
  journalEntries: SharedDoc[];
  loveNotes: SharedDoc[];
}): Promise<MemoryPreview[]> {
  const previews: MemoryPreview[] = [];

  for (const entry of journalEntries) {
    const isPrivate = readBoolean(entry, "isPrivate", "is_private");
    if (isPrivate) {
      continue;
    }
    const mediaRefs = Array.isArray(entry.mediaStorageIds)
      ? entry.mediaStorageIds
      : Array.isArray(entry.mediaUrls)
        ? entry.mediaUrls
        : [];
    previews.push({
      sourceId: entry._id,
      sourceTable: "journalEntries",
      title: readString(entry, "title") ?? "Shared memory",
      body: readString(entry, "body") ?? "",
      createdAt: readNumber(entry, "createdAt", "created_at", "_creationTime") ?? 0,
      mediaUrls: await resolveMediaUrls(storage, mediaRefs),
    });
  }

  for (const note of loveNotes) {
    const isPrivate = readBoolean(note, "isPrivate", "is_private");
    if (isPrivate) {
      continue;
    }
    previews.push({
      sourceId: note._id,
      sourceTable: "loveNotes",
      title: "Love note",
      body: readString(note, "body", "message") ?? "",
      createdAt: readNumber(note, "createdAt", "created_at", "_creationTime") ?? 0,
      mediaUrls: [],
    });
  }

  previews.sort(
    (left, right) =>
      right.createdAt - left.createdAt || left.sourceId.localeCompare(right.sourceId),
  );

  return previews;
}

function buildMilestones({
  now,
  couple,
  milestones,
}: {
  now: number;
  couple: CoupleRecord;
  milestones: SharedDoc[];
}) {
  const items: MilestoneStripItem[] = [];

  if (couple.anniversary) {
    const daysUntil = daysBetween(now, couple.anniversary);
    if (daysUntil >= 0 && daysUntil <= 30) {
      items.push({
        id: `countdown:${couple._id}`,
        type: "countdown",
        title: "Anniversary",
        subtitle: `${daysUntil} day${daysUntil === 1 ? "" : "s"} to go`,
        date: couple.anniversary,
        daysUntil,
      });
    }
  }

  for (const milestone of milestones) {
    const date = readString(milestone, "date");
    if (!date) {
      continue;
    }
    const daysUntil = daysBetween(now, date);
    if (daysUntil < 0 || daysUntil > 30) {
      continue;
    }
    items.push({
      id: `milestone:${milestone._id}`,
      type: "milestone",
      title: readString(milestone, "title") ?? "Milestone",
      subtitle: readOptionalString(milestone, "description"),
      date,
      daysUntil,
    });
  }

  return items.sort(
    (left, right) =>
      left.daysUntil - right.daysUntil || left.title.localeCompare(right.title),
  );
}

function selectFeaturedSignal({
  now,
  presence,
  milestones,
  memoryPreview,
  checkIns,
}: {
  now: number;
  presence: ReturnType<typeof normalizePresence>;
  milestones: MilestoneStripItem[];
  memoryPreview: MemoryPreview | null;
  checkIns: Awaited<ReturnType<typeof listCheckInsForCouple>>;
}): FeaturedSignal | null {
  const sharedCheckIns = checkIns
    .filter((checkIn) => !checkIn.isPrivate)
    .filter((checkIn) => !!checkIn.note)
    .sort(
      (left, right) =>
        right.createdAt - left.createdAt || left._id.localeCompare(right._id),
    );
  if (sharedCheckIns[0]) {
    const featured = sharedCheckIns[0];
    return {
      kind: "checkIn",
      sourceId: featured._id,
      sourceTable: "checkIns",
      title: "Relationship pulse",
      body: featured.note ?? "A check-in was shared.",
      occursAt: featured.createdAt,
    };
  }

  if (memoryPreview?.sourceTable === "loveNotes") {
    return {
      kind: "loveNote",
      sourceId: memoryPreview.sourceId,
      sourceTable: memoryPreview.sourceTable,
      title: memoryPreview.title,
      body: memoryPreview.body,
      occursAt: memoryPreview.createdAt,
    };
  }

  if (memoryPreview) {
    return {
      kind: "memory",
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
      kind: "countdown",
      sourceId: countdown.id,
      sourceTable: "milestones",
      title: countdown.title,
      body:
        countdown.type === "countdown"
          ? `${countdown.daysUntil} day${countdown.daysUntil === 1 ? "" : "s"} until ${countdown.title.toLowerCase()}.`
          : `${countdown.daysUntil} day${countdown.daysUntil === 1 ? "" : "s"} until ${countdown.title}.`,
      occursAt: parseDateOnly(countdown.date),
    };
  }

  return presence
    ? {
        kind: "presence",
        sourceId: presence.coupleId,
        sourceTable: "couples",
        title: presence.partner ? "You two are in sync" : "Invite your partner in",
        body: presence.partner
          ? `${presence.self.displayName} and ${presence.partner.displayName} are connected today.`
          : "Your shared space is ready when your partner joins.",
        occursAt: now,
      }
    : null;
}

function addDays(date: Date, days: number) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days),
  );
}

function formatMonthLabel(monthStart: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthStart);
}

function buildCalendarDays({
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
  const [year, monthIndex] = month.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, monthIndex - 1, 1));
  const firstGridDay = addDays(monthStart, -monthStart.getUTCDay());
  const today = toDateString(now);

  return Array.from({ length: 42 }, (_, index) => {
    const current = addDays(firstGridDay, index);
    const date = current.toISOString().slice(0, 10);
    const dayItems = items.filter((item) => {
      if (item.occursAt === null) {
        return false;
      }
      return toDateString(item.occursAt) === date;
    });
    const dayMilestones = milestones.filter((milestone) => milestone.date === date);
    const kinds = Array.from(
      new Set([
        ...dayItems.map((item) => item.type),
        ...dayMilestones.map(() => "milestone" as const),
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

async function buildHomeView(
  ctx: QueryCtx,
  now: number,
  previewDays: number,
): Promise<HomeView> {
  const result = await getActiveCouple(ctx);
  if (!result) {
    return emptyHomeView();
  }
  const activeCouple = result;
  const session = await resolveCurrentSession(ctx);
  const presence = normalizePresence(session);
  const coupleId = activeCouple.couple._id as Id<"couples">;
  const storage = ctx.storage as unknown as StorageReader;
  const dailyVerse = await getDailyVerseForNow(ctx, now);

  const [
    events,
    plans,
    rituals,
    checkIns,
    reminders,
    tasks,
    milestones,
    journalEntries,
    loveNotes,
  ] =
    await Promise.all([
      listEventsForCouple(ctx, coupleId),
      listPlansForCouple(ctx, coupleId),
      listRitualsForCouple(ctx, coupleId),
      listCheckInsForCouple(ctx, coupleId),
      listIndexedSharedDocs(ctx, "reminders", coupleId),
      listIndexedSharedDocs(ctx, "tasks", coupleId),
      listIndexedSharedDocs(ctx, "milestones", coupleId),
      listIndexedSharedDocs(ctx, "journalEntries", coupleId),
      listIndexedSharedDocs(ctx, "loveNotes", coupleId),
    ]);

  const allMemories = await buildMemoryPreview({
    storage,
    journalEntries,
    loveNotes,
  });
  const memoryPreview = allMemories[0] ?? null;
  const milestoneStrip = buildMilestones({
    now,
    couple: activeCouple.couple,
    milestones,
  });
  const timeline = buildTimelineItems({
    now,
    previewDays,
    events,
    plans,
    reminders,
    tasks,
    rituals,
    memories: memoryPreview ? [memoryPreview] : [],
  });
  const hero = selectFeaturedSignal({
    now,
    presence,
    milestones: milestoneStrip,
    memoryPreview,
    checkIns,
  });

  return {
    hero,
    timeline,
    milestones: milestoneStrip,
    memories: allMemories,
    memoryPreview,
    presence,
    dailyVerse,
  };
}

export const getHomeView = queryGeneric({
  args: {
    now: v.optional(v.number()),
    previewDays: v.optional(v.number()),
  },
  returns: homeViewValidator,
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    return buildHomeView(ctx, now, args.previewDays ?? 7);
  },
});

export const getCalendarView = queryGeneric({
  args: {
    month: v.optional(v.string()),
    selectedDate: v.optional(v.string()),
    now: v.optional(v.number()),
    previewDays: v.optional(v.number()),
  },
  returns: calendarViewValidator,
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const selectedDate = args.selectedDate ?? null;
    const month = args.month ?? (selectedDate ? selectedDate.slice(0, 7) : toDateString(now).slice(0, 7));
    const monthEnd = new Date(Date.parse(`${month}-01T00:00:00.000Z`));
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
    monthEnd.setUTCDate(0);
    const daysUntilMonthEnd = Math.max(30, daysBetween(now, monthEnd.toISOString().slice(0, 10)));
    const homeView = await buildHomeView(
      ctx,
      now,
      Math.max(args.previewDays ?? 30, daysUntilMonthEnd),
    );
    const monthStart = new Date(Date.parse(`${month}-01T00:00:00.000Z`));

    return {
      month,
      monthLabel: formatMonthLabel(monthStart),
      selectedDate,
      days: buildCalendarDays({
        now,
        month,
        items: homeView.timeline,
        milestones: homeView.milestones,
      }),
      agenda: homeView.timeline.filter((item) => {
        if (item.occursAt === null) {
          return false;
        }
        const itemDate = toDateString(item.occursAt);
        if (selectedDate) {
          return itemDate === selectedDate;
        }
        return itemDate.startsWith(month);
      }),
      milestones: homeView.milestones.filter((milestone) => {
        return milestone.date.startsWith(month);
      }),
    };
  },
});
