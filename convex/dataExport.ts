/**
 * Data export for GDPR right to portability.
 * Returns all couple data as a structured JSON object.
 */
import { queryGeneric } from "convex/server";
import { v } from "convex/values";
import { requireActiveCouple, requireAuthenticatedUser } from "./lib/permissions";

const TABLES_TO_EXPORT = [
  "journalEntries",
  "loveNotes",
  "checkIns",
  "events",
  "plans",
  "rituals",
  "reminders",
  "tasks",
  "taskLists",
  "wishlists",
  "wishlistItems",
  "expenses",
  "milestones",
] as const;

export const exportMyData = queryGeneric({
  args: {},
  returns: v.object({
    user: v.object({
      displayName: v.string(),
      email: v.optional(v.string()),
      createdAt: v.number(),
    }),
    couple: v.object({
      name: v.string(),
      anniversary: v.union(v.string(), v.null()),
      createdAt: v.number(),
    }),
    data: v.record(v.string(), v.any()),
    exportedAt: v.number(),
  }),
  handler: async (ctx) => {
    const user = await requireAuthenticatedUser(ctx);
    const activeCouple = await requireActiveCouple(ctx);
    const coupleId = activeCouple.couple._id;

    const data: Record<string, unknown[]> = {};

    for (const table of TABLES_TO_EXPORT) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_coupleId", (q: any) => q.eq("coupleId", coupleId))
        .take(1000);
      data[table] = rows.map((row: any) => {
        const { _id, ...rest } = row;
        return rest;
      });
    }

    return {
      user: {
        displayName: user.displayName,
        ...(user.email ? { email: user.email } : {}),
        createdAt: user.createdAt,
      },
      couple: {
        name: activeCouple.couple.name,
        anniversary: activeCouple.couple.anniversary,
        createdAt: activeCouple.couple.createdAt,
      },
      data,
      exportedAt: Date.now(),
    };
  },
});
