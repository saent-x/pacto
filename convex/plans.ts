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

export type PlanRecord = {
  _id: Id<"plans">;
  coupleId: Id<"couples">;
  createdBy: Id<"users">;
  title: string;
  description: string | null;
  category: string | null;
  targetDate: string | null;
  status: string;
  notes: string | null;
  coverImageUrl: string | null;
  budget: number | null;
  priority: number;
  isPrivate: boolean;
  createdAt: number;
  updatedAt: number;
};

export const planRecordValidator = v.object({
  _id: v.string(),
  coupleId: v.string(),
  createdBy: v.string(),
  title: v.string(),
  description: v.union(v.string(), v.null()),
  category: v.union(v.string(), v.null()),
  targetDate: v.union(v.string(), v.null()),
  status: v.string(),
  notes: v.union(v.string(), v.null()),
  coverImageUrl: v.union(v.string(), v.null()),
  budget: v.union(v.number(), v.null()),
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

function toPlanRecord(
  doc: Record<string, unknown> & { _id: Id<"plans"> },
): PlanRecord | null {
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
    category: readOptionalString(doc, "category"),
    targetDate: readOptionalString(doc, "targetDate", "target_date"),
    status: readString(doc, "status") ?? "active",
    notes: readOptionalString(doc, "notes"),
    coverImageUrl: readOptionalString(doc, "coverImageUrl", "cover_image_url"),
    budget: readNumber(doc, "budget"),
    priority: readNumber(doc, "priority") ?? 0,
    isPrivate: readBoolean(doc, "isPrivate", "is_private"),
    createdAt: readNumber(doc, "createdAt", "created_at", "_creationTime") ?? 0,
    updatedAt:
      readNumber(doc, "updatedAt", "updated_at", "createdAt", "created_at", "_creationTime") ??
      0,
  };
}

export async function listPlansForCouple(
  ctx: QueryCtx,
  coupleId: Id<"couples">,
): Promise<PlanRecord[]> {
  const rows = (await ctx.db.query("plans").collect()) as Array<
    Record<string, unknown> & { _id: Id<"plans"> }
  >;
  return rows
    .map(toPlanRecord)
    .filter((plan): plan is PlanRecord => !!plan && plan.coupleId === coupleId)
    .sort((left, right) => {
      const leftDate = left.targetDate ?? "9999-12-31";
      const rightDate = right.targetDate ?? "9999-12-31";
      return (
        leftDate.localeCompare(rightDate) ||
        right.priority - left.priority ||
        left.createdAt - right.createdAt ||
        left._id.localeCompare(right._id)
      );
    });
}

export const createPlan = mutationGeneric({
  args: {
    title: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    category: v.optional(v.union(v.string(), v.null())),
    targetDate: v.optional(v.union(v.string(), v.null())),
    status: v.optional(v.string()),
    notes: v.optional(v.union(v.string(), v.null())),
    coverImageUrl: v.optional(v.union(v.string(), v.null())),
    budget: v.optional(v.union(v.number(), v.null())),
    priority: v.optional(v.number()),
    isPrivate: v.optional(v.boolean()),
  },
  returns: planRecordValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const now = Date.now();
    const planId = await ctx.db.insert("plans", {
      coupleId: activeCouple.couple._id,
      createdBy: activeCouple.membership.userId,
      title: args.title,
      description: args.description ?? null,
      category: args.category ?? null,
      targetDate: args.targetDate ?? null,
      status: args.status ?? "active",
      notes: args.notes ?? null,
      coverImageUrl: args.coverImageUrl ?? null,
      budget: args.budget ?? null,
      priority: args.priority ?? 0,
      isPrivate: args.isPrivate ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return {
      _id: planId,
      coupleId: activeCouple.couple._id,
      createdBy: activeCouple.membership.userId,
      title: args.title,
      description: args.description ?? null,
      category: args.category ?? null,
      targetDate: args.targetDate ?? null,
      status: args.status ?? "active",
      notes: args.notes ?? null,
      coverImageUrl: args.coverImageUrl ?? null,
      budget: args.budget ?? null,
      priority: args.priority ?? 0,
      isPrivate: args.isPrivate ?? false,
      createdAt: now,
      updatedAt: now,
    };
  },
});

export const updatePlan = mutationGeneric({
  args: {
    planId: v.id("plans"),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    category: v.optional(v.union(v.string(), v.null())),
    targetDate: v.optional(v.union(v.string(), v.null())),
    status: v.optional(v.string()),
    notes: v.optional(v.union(v.string(), v.null())),
    coverImageUrl: v.optional(v.union(v.string(), v.null())),
    budget: v.optional(v.union(v.number(), v.null())),
    priority: v.optional(v.number()),
    isPrivate: v.optional(v.boolean()),
  },
  returns: planRecordValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const existing = toPlanRecord((await ctx.db.get(args.planId)) as any);
    if (!existing) {
      throw new ConvexError("Plan not found.");
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
    const nextPlan: PlanRecord = {
      ...existing,
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.description !== undefined ? { description: args.description } : {}),
      ...(args.category !== undefined ? { category: args.category } : {}),
      ...(args.targetDate !== undefined ? { targetDate: args.targetDate } : {}),
      ...(args.status !== undefined ? { status: args.status } : {}),
      ...(args.notes !== undefined ? { notes: args.notes } : {}),
      ...(args.coverImageUrl !== undefined ? { coverImageUrl: args.coverImageUrl } : {}),
      ...(args.budget !== undefined ? { budget: args.budget } : {}),
      ...(args.priority !== undefined ? { priority: args.priority } : {}),
      ...(args.isPrivate !== undefined ? { isPrivate: args.isPrivate } : {}),
      updatedAt,
    };

    await ctx.db.patch(existing._id, {
      ...nextPlan,
    });

    return nextPlan;
  },
});

export const deletePlan = mutationGeneric({
  args: {
    planId: v.id("plans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const existing = toPlanRecord((await ctx.db.get(args.planId)) as any);
    if (!existing) {
      throw new ConvexError("Plan not found.");
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

    await ctx.db.delete(args.planId);
    return null;
  },
});

export const listPlans = queryGeneric({
  args: {
    statuses: v.optional(v.array(v.string())),
  },
  returns: v.array(planRecordValidator),
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const plans = await listPlansForCouple(
      ctx,
      activeCouple.couple._id as Id<"couples">,
    );

    return plans.filter((plan) => {
      if (plan.isPrivate && plan.createdBy !== activeCouple.membership.userId) {
        return false;
      }
      if (args.statuses && !args.statuses.includes(plan.status)) {
        return false;
      }
      return true;
    });
  },
});
