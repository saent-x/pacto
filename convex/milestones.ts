import { mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { assertSharedAccess, requireActiveCouple } from "./lib/permissions";

const milestoneValidator = v.object({
  _id: v.string(),
  coupleId: v.string(),
  title: v.string(),
  date: v.string(),
  description: v.union(v.string(), v.null()),
  icon: v.string(),
  createdBy: v.string(),
  createdAt: v.number(),
  _creationTime: v.optional(v.float64()),
});

export const listMilestones = queryGeneric({
  args: {},
  returns: v.array(milestoneValidator),
  handler: async (ctx) => {
    const activeCouple = await requireActiveCouple(ctx);
    return ctx.db
      .query("milestones")
      .withIndex("by_coupleId", (q: any) =>
        q.eq("coupleId", activeCouple.couple._id),
      )
      .collect();
  },
});

export const createMilestone = mutationGeneric({
  args: {
    title: v.string(),
    date: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    icon: v.optional(v.string()),
  },
  returns: milestoneValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("milestones", {
      coupleId: activeCouple.couple._id,
      title: args.title,
      date: args.date,
      description: args.description ?? null,
      icon: args.icon ?? "star",
      createdBy: activeCouple.membership.userId,
      createdAt: now,
    });
    return {
      _id: id,
      coupleId: activeCouple.couple._id,
      title: args.title,
      date: args.date,
      description: args.description ?? null,
      icon: args.icon ?? "star",
      createdBy: activeCouple.membership.userId,
      createdAt: now,
    };
  },
});

export const updateMilestone = mutationGeneric({
  args: {
    milestoneId: v.id("milestones"),
    title: v.optional(v.string()),
    date: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    icon: v.optional(v.string()),
  },
  returns: milestoneValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const existing = await ctx.db.get(args.milestoneId);
    if (!existing) throw new ConvexError("Milestone not found.");
    assertSharedAccess({
      coupleId: existing.coupleId,
      activeCoupleId: activeCouple.couple._id,
    });
    const patch = {
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.date !== undefined ? { date: args.date } : {}),
      ...(args.description !== undefined ? { description: args.description } : {}),
      ...(args.icon !== undefined ? { icon: args.icon } : {}),
    };
    await ctx.db.patch(args.milestoneId, patch);
    return { ...existing, ...patch };
  },
});

export const deleteMilestone = mutationGeneric({
  args: { milestoneId: v.id("milestones") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const existing = await ctx.db.get(args.milestoneId);
    if (!existing) throw new ConvexError("Milestone not found.");
    assertSharedAccess({
      coupleId: existing.coupleId,
      activeCoupleId: activeCouple.couple._id,
    });
    await ctx.db.delete(args.milestoneId);
    return null;
  },
});
