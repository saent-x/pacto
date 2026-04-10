import { mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { assertSharedAccess, requireActiveCouple } from "./lib/permissions";

const expenseValidator = v.object({
  _id: v.string(),
  coupleId: v.string(),
  title: v.string(),
  amount: v.number(),
  paidBy: v.string(),
  currency: v.string(),
  splitType: v.string(),
  splitAmount: v.union(v.number(), v.null()),
  category: v.string(),
  date: v.string(),
  isSettled: v.boolean(),
  createdAt: v.number(),
});

type ExpenseRecord = {
  _id: string;
  coupleId: string;
  title: string;
  amount: number;
  paidBy: string;
  currency?: string;
  splitType: string;
  splitAmount: number | null;
  category: string;
  date: string;
  isSettled: boolean;
  createdAt: number;
};

function normalizeExpenseRecord(record: ExpenseRecord) {
  return {
    _id: record._id,
    coupleId: record.coupleId,
    title: record.title,
    amount: record.amount,
    paidBy: record.paidBy,
    currency: record.currency ?? "USD",
    splitType: record.splitType,
    splitAmount: record.splitAmount,
    category: record.category,
    date: record.date,
    isSettled: record.isSettled,
    createdAt: record.createdAt,
  };
}

async function assertExpensePayerBelongsToCouple(
  ctx: MutationCtx,
  activeCouple: Awaited<ReturnType<typeof requireActiveCouple>>,
  paidBy: string,
) {
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_coupleId", (q) => q.eq("coupleId", activeCouple.couple._id as Id<"couples">))
    .collect();
  const validUserIds = memberships
    .filter((membership: Record<string, unknown>) => membership.status === "active")
    .map((membership: Record<string, unknown>) => membership.userId)
    .filter((value: unknown): value is Id<"users"> => typeof value === "string");

  if (!validUserIds.includes(paidBy as Id<"users">)) {
    throw new ConvexError("Paid by must be one of the active couple members.");
  }
}

export const listExpenses = queryGeneric({
  args: {},
  returns: v.array(expenseValidator),
  handler: async (ctx) => {
    const activeCouple = await requireActiveCouple(ctx);
    const rows = await ctx.db
      .query("expenses")
      .withIndex("by_coupleId", (q: any) =>
        q.eq("coupleId", activeCouple.couple._id),
      )
      .collect();
    return rows.map((row: ExpenseRecord) => normalizeExpenseRecord(row));
  },
});

export const createExpense = mutationGeneric({
  args: {
    title: v.string(),
    amount: v.number(),
    paidBy: v.optional(v.id("users")),
    currency: v.optional(v.string()),
    splitType: v.optional(v.string()),
    splitAmount: v.optional(v.union(v.number(), v.null())),
    category: v.optional(v.string()),
    date: v.optional(v.string()),
  },
  returns: expenseValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const paidBy = args.paidBy ?? activeCouple.membership.userId;
    await assertExpensePayerBelongsToCouple(ctx, activeCouple, paidBy);
    const now = Date.now();
    const id = await ctx.db.insert("expenses", {
      coupleId: activeCouple.couple._id,
      title: args.title,
      amount: args.amount,
      paidBy,
      currency: args.currency ?? "USD",
      splitType: args.splitType ?? "even",
      splitAmount: args.splitAmount ?? null,
      category: args.category ?? "general",
      date: args.date ?? new Date(now).toISOString().slice(0, 10),
      isSettled: false,
      createdAt: now,
    });
    return normalizeExpenseRecord({
      _id: id,
      coupleId: activeCouple.couple._id,
      title: args.title,
      amount: args.amount,
      paidBy,
      currency: args.currency ?? "USD",
      splitType: args.splitType ?? "even",
      splitAmount: args.splitAmount ?? null,
      category: args.category ?? "general",
      date: args.date ?? new Date(now).toISOString().slice(0, 10),
      isSettled: false,
      createdAt: now,
    });
  },
});

export const updateExpense = mutationGeneric({
  args: {
    expenseId: v.id("expenses"),
    title: v.optional(v.string()),
    amount: v.optional(v.number()),
    paidBy: v.optional(v.id("users")),
    currency: v.optional(v.string()),
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
    if (args.paidBy !== undefined) {
      await assertExpensePayerBelongsToCouple(ctx, activeCouple, args.paidBy);
    }
    const patch = {
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.amount !== undefined ? { amount: args.amount } : {}),
      ...(args.paidBy !== undefined ? { paidBy: args.paidBy } : {}),
      ...(args.currency !== undefined ? { currency: args.currency } : {}),
      ...(args.splitType !== undefined ? { splitType: args.splitType } : {}),
      ...(args.splitAmount !== undefined ? { splitAmount: args.splitAmount } : {}),
      ...(args.category !== undefined ? { category: args.category } : {}),
      ...(args.date !== undefined ? { date: args.date } : {}),
    };
    await ctx.db.patch(args.expenseId, patch);
    return normalizeExpenseRecord({ ...(existing as ExpenseRecord), ...patch });
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
    return normalizeExpenseRecord({
      ...(existing as ExpenseRecord),
      isSettled: true,
    });
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
