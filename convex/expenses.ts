import { mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { assertSharedAccess, requireActiveCouple } from "./lib/permissions";

const expenseValidator = v.object({
  _id: v.string(),
  coupleId: v.string(),
  title: v.string(),
  amount: v.number(),
  paidBy: v.string(),
  splitType: v.string(),
  splitAmount: v.union(v.number(), v.null()),
  category: v.string(),
  date: v.string(),
  isSettled: v.boolean(),
  createdAt: v.number(),
});

export const listExpenses = queryGeneric({
  args: {},
  returns: v.array(expenseValidator),
  handler: async (ctx) => {
    const activeCouple = await requireActiveCouple(ctx);
    return ctx.db
      .query("expenses")
      .withIndex("by_coupleId", (q: any) =>
        q.eq("coupleId", activeCouple.couple._id),
      )
      .collect();
  },
});

export const createExpense = mutationGeneric({
  args: {
    title: v.string(),
    amount: v.number(),
    splitType: v.optional(v.string()),
    splitAmount: v.optional(v.union(v.number(), v.null())),
    category: v.optional(v.string()),
    date: v.optional(v.string()),
  },
  returns: expenseValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("expenses", {
      coupleId: activeCouple.couple._id,
      title: args.title,
      amount: args.amount,
      paidBy: activeCouple.membership.userId,
      splitType: args.splitType ?? "even",
      splitAmount: args.splitAmount ?? null,
      category: args.category ?? "general",
      date: args.date ?? new Date(now).toISOString().slice(0, 10),
      isSettled: false,
      createdAt: now,
    });
    return {
      _id: id,
      coupleId: activeCouple.couple._id,
      title: args.title,
      amount: args.amount,
      paidBy: activeCouple.membership.userId,
      splitType: args.splitType ?? "even",
      splitAmount: args.splitAmount ?? null,
      category: args.category ?? "general",
      date: args.date ?? new Date(now).toISOString().slice(0, 10),
      isSettled: false,
      createdAt: now,
    };
  },
});

export const updateExpense = mutationGeneric({
  args: {
    expenseId: v.id("expenses"),
    title: v.optional(v.string()),
    amount: v.optional(v.number()),
    splitType: v.optional(v.string()),
    splitAmount: v.optional(v.union(v.number(), v.null())),
    category: v.optional(v.string()),
    date: v.optional(v.string()),
  },
  returns: expenseValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const existing = await ctx.db.get(args.expenseId);
    if (!existing) throw new ConvexError("Expense not found.");
    assertSharedAccess({
      coupleId: existing.coupleId,
      activeCoupleId: activeCouple.couple._id,
    });
    const patch = {
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.amount !== undefined ? { amount: args.amount } : {}),
      ...(args.splitType !== undefined ? { splitType: args.splitType } : {}),
      ...(args.splitAmount !== undefined ? { splitAmount: args.splitAmount } : {}),
      ...(args.category !== undefined ? { category: args.category } : {}),
      ...(args.date !== undefined ? { date: args.date } : {}),
    };
    await ctx.db.patch(args.expenseId, patch);
    return { ...existing, ...patch };
  },
});

export const settleExpense = mutationGeneric({
  args: { expenseId: v.id("expenses") },
  returns: expenseValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const existing = await ctx.db.get(args.expenseId);
    if (!existing) throw new ConvexError("Expense not found.");
    assertSharedAccess({
      coupleId: existing.coupleId,
      activeCoupleId: activeCouple.couple._id,
    });
    await ctx.db.patch(args.expenseId, { isSettled: true });
    return { ...existing, isSettled: true };
  },
});

export const deleteExpense = mutationGeneric({
  args: { expenseId: v.id("expenses") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const existing = await ctx.db.get(args.expenseId);
    if (!existing) throw new ConvexError("Expense not found.");
    assertSharedAccess({
      coupleId: existing.coupleId,
      activeCoupleId: activeCouple.couple._id,
    });
    await ctx.db.delete(args.expenseId);
    return null;
  },
});
