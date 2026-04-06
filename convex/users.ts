import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import {
  resolveCurrentSession,
  resolveActiveCoupleForUser,
  upsertCurrentUser,
  sessionValidator,
  userProfileValidator,
} from "./lib/auth";
import { requireAuthenticatedUser } from "./lib/permissions";

export const createProfile = mutationGeneric({
  args: {
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    preferences: v.optional(v.record(v.string(), v.any())),
  },
  returns: userProfileValidator,
  handler: async (ctx, args) => {
    const profile = await upsertCurrentUser(ctx, {
      ...(args.displayName !== undefined ? { displayName: args.displayName } : {}),
      ...(args.avatarUrl !== undefined ? { avatarUrl: args.avatarUrl } : {}),
      ...(args.preferences !== undefined ? { preferences: args.preferences } : {}),
    });
    return profile;
  },
});

export const getCurrentSessionUser = queryGeneric({
  args: {},
  returns: v.union(v.null(), sessionValidator),
  handler: async (ctx) => resolveCurrentSession(ctx),
});

const CONTENT_TABLES = [
  "journalEntries",
  "loveNotes",
  "checkIns",
  "expenses",
  "milestones",
  "events",
  "plans",
  "rituals",
  "reminders",
  "tasks",
  "taskLists",
  "wishlists",
  "wishlistItems",
] as const;

export const deleteAccount = mutationGeneric({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await requireAuthenticatedUser(ctx);
    const activeCouple = await resolveActiveCoupleForUser(ctx, user._id);

    if (activeCouple) {
      const coupleId = activeCouple.couple._id;

      for (const table of CONTENT_TABLES) {
        // Loop until all authored rows are deleted (handles >500 rows)
        let hasMore = true;
        while (hasMore) {
          const rows = await ctx.db
            .query(table)
            .withIndex("by_coupleId", (q: any) => q.eq("coupleId", coupleId))
            .take(200);
          let deletedAny = false;
          for (const row of rows) {
            if (row.authorId === user._id || row.createdBy === user._id || row.addedBy === user._id) {
              await ctx.db.delete(row._id);
              deletedAny = true;
            }
          }
          // Stop when batch had no deletions or was smaller than limit
          hasMore = deletedAny && rows.length === 200;
        }
      }

      await (ctx.db as any).patch(activeCouple.membership._id, {
        status: "left",
        updatedAt: Date.now(),
      });
    }

    await (ctx.db as any).delete(user._id);
    return null;
  },
});
