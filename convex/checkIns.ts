import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireActiveCouple } from "./lib/permissions";

type QueryCtx = {
  db: any;
};

export type CheckInRecord = {
  _id: Id<"checkIns">;
  coupleId: Id<"couples">;
  authorId: Id<"users">;
  mood: string | null;
  note: string | null;
  checkInDate: string;
  isPrivate: boolean;
  createdAt: number;
  updatedAt: number;
};

export const checkInRecordValidator = v.object({
  _id: v.string(),
  coupleId: v.string(),
  authorId: v.string(),
  mood: v.union(v.string(), v.null()),
  note: v.union(v.string(), v.null()),
  checkInDate: v.string(),
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

function toCheckInRecord(
  doc: Record<string, unknown> & { _id: Id<"checkIns"> },
): CheckInRecord | null {
  const coupleId = readCoupleId(doc, "coupleId", "couple_id");
  const authorId = readUserId(doc, "authorId", "author_id", "userId", "user_id");
  const checkInDate = readString(doc, "checkInDate", "check_in_date");
  if (!coupleId || !authorId || !checkInDate) {
    return null;
  }

  return {
    _id: doc._id,
    coupleId,
    authorId,
    mood: readOptionalString(doc, "mood", "emoji"),
    note: readOptionalString(doc, "note"),
    checkInDate,
    isPrivate: readBoolean(doc, "isPrivate", "is_private"),
    createdAt: readNumber(doc, "createdAt", "created_at", "_creationTime") ?? 0,
    updatedAt:
      readNumber(doc, "updatedAt", "updated_at", "createdAt", "created_at", "_creationTime") ??
      0,
  };
}

export async function listCheckInsForCouple(
  ctx: QueryCtx,
  coupleId: Id<"couples">,
): Promise<CheckInRecord[]> {
  const rows = (await ctx.db
    .query("checkIns")
    .withIndex("by_coupleId", (q: any) => q.eq("coupleId", coupleId))
    .collect()) as Array<
    Record<string, unknown> & { _id: Id<"checkIns"> }
  >;
  return rows
    .map(toCheckInRecord)
    .filter((checkIn): checkIn is CheckInRecord => !!checkIn)
    .sort(
      (left, right) =>
        right.createdAt - left.createdAt || left._id.localeCompare(right._id),
    );
}

async function listCheckInsForAuthorOnDate(
  ctx: QueryCtx,
  coupleId: Id<"couples">,
  authorId: Id<"users">,
  checkInDate: string,
): Promise<CheckInRecord[]> {
  const rows = (await ctx.db
    .query("checkIns")
    .withIndex(
      "by_coupleId_and_authorId_and_checkInDate",
      (q: any) =>
        q.eq("coupleId", coupleId)
          .eq("authorId", authorId)
          .eq("checkInDate", checkInDate),
    )
    .collect()) as Array<
    Record<string, unknown> & { _id: Id<"checkIns"> }
  >;
  return rows
    .map(toCheckInRecord)
    .filter((checkIn): checkIn is CheckInRecord => !!checkIn)
    .sort(
      (left, right) =>
        right.createdAt - left.createdAt || left._id.localeCompare(right._id),
    );
}

function toDateString(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export const submitCheckIn = mutationGeneric({
  args: {
    mood: v.optional(v.union(v.string(), v.null())),
    note: v.optional(v.union(v.string(), v.null())),
    checkInDate: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
  },
  returns: checkInRecordValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const now = Date.now();
    const checkInDate = args.checkInDate ?? toDateString(now);
    const [existing, ...duplicates] = await listCheckInsForAuthorOnDate(
      ctx,
      activeCouple.couple._id as Id<"couples">,
      activeCouple.membership.userId as Id<"users">,
      checkInDate,
    );

    for (const duplicate of duplicates) {
      await ctx.db.delete(duplicate._id);
    }

    if (existing) {
      const updates = {
        ...(args.mood !== undefined ? { mood: args.mood } : {}),
        ...(args.note !== undefined ? { note: args.note } : {}),
        ...(args.isPrivate !== undefined ? { isPrivate: args.isPrivate } : {}),
        updatedAt: now,
      };
      await ctx.db.patch(existing._id, updates);
      return {
        ...existing,
        ...updates,
      };
    }

    const checkInId = await ctx.db.insert("checkIns", {
      coupleId: activeCouple.couple._id,
      authorId: activeCouple.membership.userId,
      mood: args.mood ?? null,
      note: args.note ?? null,
      checkInDate,
      isPrivate: args.isPrivate ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return {
      _id: checkInId,
      coupleId: activeCouple.couple._id,
      authorId: activeCouple.membership.userId,
      mood: args.mood ?? null,
      note: args.note ?? null,
      checkInDate,
      isPrivate: args.isPrivate ?? false,
      createdAt: now,
      updatedAt: now,
    };
  },
});

import { ConvexError } from "convex/values";

export const deleteCheckIn = mutationGeneric({
  args: {
    checkInId: v.id("checkIns"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const existing = toCheckInRecord((await ctx.db.get(args.checkInId)) as any);
    if (!existing) {
      throw new ConvexError("Check-in not found.");
    }

    if (existing.coupleId !== activeCouple.couple._id) {
      throw new ConvexError("Check-in not found.");
    }

    if (existing.authorId !== activeCouple.membership.userId) {
      throw new ConvexError("You can only delete your own check-ins.");
    }

    await ctx.db.delete(args.checkInId);
    return null;
  },
});

export const getCheckIns = queryGeneric({
  args: {
    checkInDate: v.optional(v.string()),
  },
  returns: v.array(checkInRecordValidator),
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const checkIns = await listCheckInsForCouple(
      ctx,
      activeCouple.couple._id as Id<"couples">,
    );

    return checkIns.filter((checkIn) => {
      if (
        checkIn.isPrivate &&
        checkIn.authorId !== activeCouple.membership.userId
      ) {
        return false;
      }
      if (args.checkInDate && checkIn.checkInDate !== args.checkInDate) {
        return false;
      }
      return true;
    });
  },
});
