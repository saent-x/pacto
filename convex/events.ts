import { mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  assertPrivateAccess,
  assertSharedAccess,
  getActiveCouple,
  requireActiveCouple,
} from "./lib/permissions";

type QueryCtx = {
  db: any;
};

type EventRecord = {
  _id: Id<"events">;
  coupleId: Id<"couples">;
  createdBy: Id<"users">;
  title: string;
  description: string | null;
  startsAt: number;
  endsAt: number | null;
  category: string | null;
  location: string | null;
  priority: number;
  isPrivate: boolean;
  createdAt: number;
  updatedAt: number;
};

export const eventRecordValidator = v.object({
  _id: v.string(),
  coupleId: v.string(),
  createdBy: v.string(),
  title: v.string(),
  description: v.union(v.string(), v.null()),
  startsAt: v.number(),
  endsAt: v.union(v.number(), v.null()),
  category: v.union(v.string(), v.null()),
  location: v.union(v.string(), v.null()),
  priority: v.number(),
  isPrivate: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

function readString(
  doc: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = doc[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}

function readCoupleId(
  doc: Record<string, unknown>,
  ...keys: string[]
): Id<"couples"> | null {
  const value = readString(doc, ...keys);
  return value as Id<"couples"> | null;
}

function readUserId(
  doc: Record<string, unknown>,
  ...keys: string[]
): Id<"users"> | null {
  const value = readString(doc, ...keys);
  return value as Id<"users"> | null;
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

function readNumber(
  doc: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = doc[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function readBoolean(
  doc: Record<string, unknown>,
  ...keys: string[]
): boolean {
  for (const key of keys) {
    const value = doc[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return false;
}

function toEventRecord(
  doc: Record<string, unknown> & { _id: Id<"events"> },
): EventRecord | null {
  const coupleId = readCoupleId(doc, "coupleId", "couple_id");
  const createdBy = readUserId(
    doc,
    "createdBy",
    "created_by",
    "authorId",
    "author_id",
  );
  const title = readString(doc, "title");
  const startsAt = readNumber(doc, "startsAt", "startAt", "starts_at");
  if (!coupleId || !createdBy || !title || startsAt === null) {
    return null;
  }

  return {
    _id: doc._id,
    coupleId,
    createdBy,
    title,
    description: readOptionalString(doc, "description"),
    startsAt,
    endsAt: readNumber(doc, "endsAt", "endAt", "ends_at"),
    category: readOptionalString(doc, "category"),
    location: readOptionalString(doc, "location"),
    priority: readNumber(doc, "priority") ?? 0,
    isPrivate: readBoolean(doc, "isPrivate", "is_private"),
    createdAt: readNumber(doc, "createdAt", "created_at", "_creationTime") ?? 0,
    updatedAt:
      readNumber(doc, "updatedAt", "updated_at", "createdAt", "created_at", "_creationTime") ??
      0,
  };
}

export async function listEventsForCouple(
  ctx: QueryCtx,
  coupleId: Id<"couples">,
): Promise<EventRecord[]> {
  const rows = (await ctx.db
    .query("events")
    .withIndex("by_coupleId", (q: any) => q.eq("coupleId", coupleId))
    .collect()) as Array<
    Record<string, unknown> & { _id: Id<"events"> }
  >;
  return rows
    .map(toEventRecord)
    .filter((event): event is EventRecord => !!event)
    .sort(
      (left, right) =>
        left.startsAt - right.startsAt ||
        right.priority - left.priority ||
        left.createdAt - right.createdAt ||
        left._id.localeCompare(right._id),
    );
}

export const createEvent = mutationGeneric({
  args: {
    title: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    startsAt: v.number(),
    endsAt: v.optional(v.union(v.number(), v.null())),
    category: v.optional(v.union(v.string(), v.null())),
    location: v.optional(v.union(v.string(), v.null())),
    priority: v.optional(v.number()),
    isPrivate: v.optional(v.boolean()),
  },
  returns: eventRecordValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const now = Date.now();
    const eventId = await ctx.db.insert("events", {
      coupleId: activeCouple.couple._id,
      createdBy: activeCouple.membership.userId,
      title: args.title,
      description: args.description ?? null,
      startsAt: args.startsAt,
      endsAt: args.endsAt ?? null,
      category: args.category ?? null,
      location: args.location ?? null,
      priority: args.priority ?? 0,
      isPrivate: args.isPrivate ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return {
      _id: eventId,
      coupleId: activeCouple.couple._id,
      createdBy: activeCouple.membership.userId,
      title: args.title,
      description: args.description ?? null,
      startsAt: args.startsAt,
      endsAt: args.endsAt ?? null,
      category: args.category ?? null,
      location: args.location ?? null,
      priority: args.priority ?? 0,
      isPrivate: args.isPrivate ?? false,
      createdAt: now,
      updatedAt: now,
    };
  },
});

export const updateEvent = mutationGeneric({
  args: {
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.union(v.number(), v.null())),
    category: v.optional(v.union(v.string(), v.null())),
    location: v.optional(v.union(v.string(), v.null())),
    priority: v.optional(v.number()),
    isPrivate: v.optional(v.boolean()),
  },
  returns: eventRecordValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const existing = toEventRecord((await ctx.db.get(args.eventId)) as any);
    if (!existing) {
      throw new ConvexError("Event not found.");
    }

    assertSharedAccess({
      coupleId: existing.coupleId,
      activeCoupleId: activeCouple.couple._id,
    });
    if (existing.isPrivate) {
      assertPrivateAccess({
        authorId: existing.createdBy,
        currentUserId: activeCouple.membership.userId,
      });
    }

    const updatedAt = Date.now();
    const nextEvent: EventRecord = {
      ...existing,
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.description !== undefined ? { description: args.description } : {}),
      ...(args.startsAt !== undefined ? { startsAt: args.startsAt } : {}),
      ...(args.endsAt !== undefined ? { endsAt: args.endsAt } : {}),
      ...(args.category !== undefined ? { category: args.category } : {}),
      ...(args.location !== undefined ? { location: args.location } : {}),
      ...(args.priority !== undefined ? { priority: args.priority } : {}),
      ...(args.isPrivate !== undefined ? { isPrivate: args.isPrivate } : {}),
      updatedAt,
    };

    await ctx.db.patch(existing._id, {
      ...nextEvent,
    });

    return nextEvent;
  },
});

export const deleteEvent = mutationGeneric({
  args: {
    eventId: v.id("events"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const existing = toEventRecord((await ctx.db.get(args.eventId)) as any);
    if (!existing) {
      throw new ConvexError("Event not found.");
    }

    assertSharedAccess({
      coupleId: existing.coupleId,
      activeCoupleId: activeCouple.couple._id,
    });
    if (existing.isPrivate) {
      assertPrivateAccess({
        authorId: existing.createdBy,
        currentUserId: activeCouple.membership.userId,
      });
    }

    await ctx.db.delete(args.eventId);
    return null;
  },
});

export const listEvents = queryGeneric({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  returns: v.array(eventRecordValidator),
  handler: async (ctx, args) => {
    const result = await getActiveCouple(ctx);
    if (!result) return [];
    const events = await listEventsForCouple(
      ctx,
      result.couple._id as Id<"couples">,
    );

    return events.filter((event) => {
      if (event.isPrivate && event.createdBy !== result.membership.userId) {
        return false;
      }
      if (args.from !== undefined && event.startsAt < args.from) {
        return false;
      }
      if (args.to !== undefined && event.startsAt > args.to) {
        return false;
      }
      return true;
    });
  },
});
