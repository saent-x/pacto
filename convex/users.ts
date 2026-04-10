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

async function collectCoupleRows(
  ctx: { db: any },
  table: (typeof CONTENT_TABLES)[number],
  coupleId: string,
) {
  return (await (ctx.db as any)
    .query(table)
    .withIndex("by_coupleId", (q: any) => q.eq("coupleId", coupleId))
    .collect()) as Array<Record<string, any> & { _id: string }>;
}

export const deleteAccount = mutationGeneric({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await requireAuthenticatedUser(ctx);
    const activeCouple = await resolveActiveCoupleForUser(ctx, user._id);

    if (activeCouple) {
      const coupleId = activeCouple.couple._id;
      const partnerId = activeCouple.partner?._id ?? null;

      const deleteOwnedRows = async (
        table: (typeof CONTENT_TABLES)[number],
        shouldDelete: (row: Record<string, any>) => boolean,
      ) => {
        const rows = await collectCoupleRows(ctx, table, coupleId);
        for (const row of rows) {
          if (shouldDelete(row)) {
            await (ctx.db as any).delete(row._id);
          }
        }
      };

      await deleteOwnedRows("journalEntries", (row) => row.authorId === user._id);
      await deleteOwnedRows("loveNotes", (row) => row.authorId === user._id);
      await deleteOwnedRows("checkIns", (row) => row.authorId === user._id);
      await deleteOwnedRows("expenses", (row) => row.paidBy === user._id);
      await deleteOwnedRows("milestones", (row) => row.createdBy === user._id);
      await deleteOwnedRows("events", (row) => row.createdBy === user._id);
      await deleteOwnedRows("plans", (row) => row.createdBy === user._id);
      await deleteOwnedRows("rituals", (row) => row.createdBy === user._id);
      await deleteOwnedRows("tasks", (row) => row.createdBy === user._id);
      await deleteOwnedRows("reminders", (row) => row.createdBy === user._id);

      const reminders = await collectCoupleRows(ctx, "reminders", coupleId);
      for (const reminder of reminders) {
        if (reminder.createdBy === user._id) continue;
        const patch: Record<string, unknown> = {};
        if (reminder.assignedTo === user._id) patch.assignedTo = null;
        if (reminder.completedBy === user._id) {
          patch.completedBy = null;
          patch.completedAt = null;
          patch.isCompleted = false;
        }
        if (Object.keys(patch).length > 0) {
          patch.updatedAt = Date.now();
          await (ctx.db as any).patch(reminder._id, patch);
        }
      }

      const wishlistItems = await collectCoupleRows(ctx, "wishlistItems", coupleId);
      for (const item of wishlistItems) {
        if (item.addedBy === user._id) {
          await (ctx.db as any).delete(item._id);
          continue;
        }
        if (item.purchasedBy === user._id) {
          await (ctx.db as any).patch(item._id, {
            isPurchased: false,
            purchasedBy: null,
          });
        }
      }

      const wishlists = await collectCoupleRows(ctx, "wishlists", coupleId);
      const remainingWishlistItems = await collectCoupleRows(ctx, "wishlistItems", coupleId);
      for (const wishlist of wishlists) {
        if (wishlist.createdBy !== user._id) continue;
        const hasItems = remainingWishlistItems.some(
          (item) => item.wishlistId === wishlist._id,
        );
        if (!hasItems) {
          await (ctx.db as any).delete(wishlist._id);
          continue;
        }
        if (partnerId) {
          await (ctx.db as any).patch(wishlist._id, { createdBy: partnerId });
        }
      }

      const tasks = await collectCoupleRows(ctx, "tasks", coupleId);
      for (const task of tasks) {
        if (task.createdBy === user._id) continue;
        const patch: Record<string, unknown> = {};
        if (task.assignedTo === user._id) patch.assignedTo = null;
        if (task.completedBy === user._id) {
          patch.completedBy = null;
          patch.completedAt = null;
          patch.isCompleted = false;
        }
        if (Object.keys(patch).length > 0) {
          patch.updatedAt = Date.now();
          await (ctx.db as any).patch(task._id, patch);
        }
      }

      const taskLists = await collectCoupleRows(ctx, "taskLists", coupleId);
      const remainingTasks = await collectCoupleRows(ctx, "tasks", coupleId);
      for (const list of taskLists) {
        const hasTasks = remainingTasks.some((task) => task.listId === list._id);
        if (list.createdBy === user._id && !hasTasks) {
          await (ctx.db as any).delete(list._id);
          continue;
        }
        if (list.createdBy === user._id && partnerId) {
          await (ctx.db as any).patch(list._id, { createdBy: partnerId });
        }
      }

      if (partnerId && activeCouple.couple.createdBy === user._id) {
        await (ctx.db as any).patch(activeCouple.couple._id, {
          createdBy: partnerId,
          updatedAt: Date.now(),
        });
      }

      await (ctx.db as any).patch(activeCouple.membership._id, {
        status: "left",
        updatedAt: Date.now(),
      });

      if (!partnerId) {
        await (ctx.db as any).delete(activeCouple.couple._id);
      }
    }

    const memberships = await (ctx.db as any)
      .query("memberships")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .collect();
    for (const membership of memberships) {
      await (ctx.db as any).delete(membership._id);
    }

    await (ctx.db as any).delete(user._id);
    return null;
  },
});
