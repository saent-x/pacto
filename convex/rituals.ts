import { mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  assertPrivateAccess,
  assertSharedAccess,
  requireActiveCouple,
} from "./lib/permissions";

type QueryCtx = {
  db: any;
};

export type RitualRecord = {
  _id: Id<"rituals">;
  coupleId: Id<"couples">;
  createdBy: Id<"users">;
  title: string;
  description: string | null;
  cadence: string;
  dueDate: string | null;
  nextOccurrenceAt: number | null;
  lastCompletedAt: number | null;
  streak: number;
  priority: number;
  isPrivate: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

export const ritualRecordValidator = v.object({
  _id: v.string(),
  coupleId: v.string(),
  createdBy: v.string(),
  title: v.string(),
  description: v.union(v.string(), v.null()),
  cadence: v.string(),
  dueDate: v.union(v.string(), v.null()),
  nextOccurrenceAt: v.union(v.number(), v.null()),
  lastCompletedAt: v.union(v.number(), v.null()),
  streak: v.number(),
  priority: v.number(),
  isPrivate: v.boolean(),
  isActive: v.boolean(),
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

function toRitualRecord(
  doc: Record<string, unknown> & { _id: Id<"rituals"> },
): RitualRecord | null {
  const coupleId = readCoupleId(doc, "coupleId", "couple_id");
  const createdBy = readUserId(
    doc,
    "createdBy",
    "created_by",
    "authorId",
    "author_id",
  );
  const title = readString(doc, "title");
  if (!coupleId || !createdBy || !title) {
    return null;
  }

  return {
    _id: doc._id,
    coupleId,
    createdBy,
    title,
    description: readOptionalString(doc, "description"),
    cadence: readString(doc, "cadence") ?? "weekly",
    dueDate: readOptionalString(doc, "dueDate", "due_date"),
    nextOccurrenceAt: readNumber(doc, "nextOccurrenceAt", "next_occurrence_at"),
    lastCompletedAt: readNumber(doc, "lastCompletedAt", "last_completed_at", "completedAt"),
    streak: readNumber(doc, "streak") ?? 0,
    priority: readNumber(doc, "priority") ?? 0,
    isPrivate: readBoolean(doc, "isPrivate", "is_private"),
    isActive: doc.isActive === undefined ? true : readBoolean(doc, "isActive", "is_active"),
    createdAt: readNumber(doc, "createdAt", "created_at", "_creationTime") ?? 0,
    updatedAt:
      readNumber(doc, "updatedAt", "updated_at", "createdAt", "created_at", "_creationTime") ??
      0,
  };
}

export async function listRitualsForCouple(
  ctx: QueryCtx,
  coupleId: Id<"couples">,
): Promise<RitualRecord[]> {
  const rows = (await ctx.db.query("rituals").collect()) as Array<
    Record<string, unknown> & { _id: Id<"rituals"> }
  >;
  return rows
    .map(toRitualRecord)
    .filter((ritual): ritual is RitualRecord => !!ritual && ritual.coupleId === coupleId)
    .sort((left, right) => {
      const leftSort = left.nextOccurrenceAt ?? Number.MAX_SAFE_INTEGER;
      const rightSort = right.nextOccurrenceAt ?? Number.MAX_SAFE_INTEGER;
      return (
        leftSort - rightSort ||
        right.priority - left.priority ||
        left.createdAt - right.createdAt ||
        left._id.localeCompare(right._id)
      );
    });
}

export const createRitual = mutationGeneric({
  args: {
    title: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    cadence: v.optional(v.string()),
    dueDate: v.optional(v.union(v.string(), v.null())),
    nextOccurrenceAt: v.optional(v.union(v.number(), v.null())),
    priority: v.optional(v.number()),
    isPrivate: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  returns: ritualRecordValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const now = Date.now();
    const ritualId = await ctx.db.insert("rituals", {
      coupleId: activeCouple.couple._id,
      createdBy: activeCouple.membership.userId,
      title: args.title,
      description: args.description ?? null,
      cadence: args.cadence ?? "weekly",
      dueDate: args.dueDate ?? null,
      nextOccurrenceAt: args.nextOccurrenceAt ?? null,
      lastCompletedAt: null,
      streak: 0,
      priority: args.priority ?? 0,
      isPrivate: args.isPrivate ?? false,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });

    return {
      _id: ritualId,
      coupleId: activeCouple.couple._id,
      createdBy: activeCouple.membership.userId,
      title: args.title,
      description: args.description ?? null,
      cadence: args.cadence ?? "weekly",
      dueDate: args.dueDate ?? null,
      nextOccurrenceAt: args.nextOccurrenceAt ?? null,
      lastCompletedAt: null,
      streak: 0,
      priority: args.priority ?? 0,
      isPrivate: args.isPrivate ?? false,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
  },
});

export const updateRitual = mutationGeneric({
  args: {
    ritualId: v.id("rituals"),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    cadence: v.optional(v.string()),
    dueDate: v.optional(v.union(v.string(), v.null())),
    nextOccurrenceAt: v.optional(v.union(v.number(), v.null())),
    lastCompletedAt: v.optional(v.union(v.number(), v.null())),
    streak: v.optional(v.number()),
    priority: v.optional(v.number()),
    isPrivate: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  returns: ritualRecordValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const existing = toRitualRecord((await ctx.db.get(args.ritualId)) as any);
    if (!existing) {
      throw new ConvexError("Ritual not found.");
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
    const nextRitual: RitualRecord = {
      ...existing,
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.description !== undefined ? { description: args.description } : {}),
      ...(args.cadence !== undefined ? { cadence: args.cadence } : {}),
      ...(args.dueDate !== undefined ? { dueDate: args.dueDate } : {}),
      ...(args.nextOccurrenceAt !== undefined
        ? { nextOccurrenceAt: args.nextOccurrenceAt }
        : {}),
      ...(args.lastCompletedAt !== undefined
        ? { lastCompletedAt: args.lastCompletedAt }
        : {}),
      ...(args.streak !== undefined ? { streak: args.streak } : {}),
      ...(args.priority !== undefined ? { priority: args.priority } : {}),
      ...(args.isPrivate !== undefined ? { isPrivate: args.isPrivate } : {}),
      ...(args.isActive !== undefined ? { isActive: args.isActive } : {}),
      updatedAt,
    };

    await ctx.db.patch(existing._id, {
      ...nextRitual,
    });

    return nextRitual;
  },
});

export const deleteRitual = mutationGeneric({
  args: {
    ritualId: v.id("rituals"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const existing = toRitualRecord((await ctx.db.get(args.ritualId)) as any);
    if (!existing) {
      throw new ConvexError("Ritual not found.");
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

    await ctx.db.delete(args.ritualId);
    return null;
  },
});

export const listRituals = queryGeneric({
  args: {},
  returns: v.array(ritualRecordValidator),
  handler: async (ctx) => {
    const activeCouple = await requireActiveCouple(ctx);
    const rituals = await listRitualsForCouple(
      ctx,
      activeCouple.couple._id as Id<"couples">,
    );

    return rituals.filter((ritual) => {
      if (!ritual.isActive) {
        return false;
      }
      if (ritual.isPrivate && ritual.createdBy !== activeCouple.membership.userId) {
        return false;
      }
      return true;
    });
  },
});
