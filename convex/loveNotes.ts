import { mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  assertPrivateAccess,
  assertSharedAccess,
  requireActiveCouple,
} from "./lib/permissions";

const loveNoteValidator = v.object({
  _id: v.string(),
  coupleId: v.string(),
  authorId: v.string(),
  body: v.string(),
  isPrivate: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const listLoveNotes = queryGeneric({
  args: {},
  returns: v.array(loveNoteValidator),
  handler: async (ctx) => {
    const activeCouple = await requireActiveCouple(ctx);
    const coupleId = activeCouple.couple._id as Id<"couples">;
    const notes = await ctx.db
      .query("loveNotes")
      .withIndex("by_coupleId", (q: any) => q.eq("coupleId", coupleId))
      .collect();
    return notes.filter(
      (n: any) =>
        !n.isPrivate || n.authorId === activeCouple.membership.userId,
    );
  },
});

export const createLoveNote = mutationGeneric({
  args: {
    body: v.string(),
    isPrivate: v.optional(v.boolean()),
  },
  returns: loveNoteValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("loveNotes", {
      coupleId: activeCouple.couple._id,
      authorId: activeCouple.membership.userId,
      body: args.body,
      isPrivate: args.isPrivate ?? false,
      createdAt: now,
      updatedAt: now,
    });
    return {
      _id: id,
      coupleId: activeCouple.couple._id,
      authorId: activeCouple.membership.userId,
      body: args.body,
      isPrivate: args.isPrivate ?? false,
      createdAt: now,
      updatedAt: now,
    };
  },
});

export const updateLoveNote = mutationGeneric({
  args: {
    noteId: v.id("loveNotes"),
    body: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
  },
  returns: loveNoteValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const existing = await ctx.db.get(args.noteId);
    if (!existing) throw new ConvexError("Love note not found.");
    assertSharedAccess({ coupleId: existing.coupleId, activeCoupleId: activeCouple.couple._id });
    assertPrivateAccess({ authorId: existing.authorId, currentUserId: activeCouple.membership.userId });
    const now = Date.now();
    const patch = {
      ...(args.body !== undefined ? { body: args.body } : {}),
      ...(args.isPrivate !== undefined ? { isPrivate: args.isPrivate } : {}),
      updatedAt: now,
    };
    await ctx.db.patch(args.noteId, patch);
    return { ...existing, ...patch };
  },
});

export const deleteLoveNote = mutationGeneric({
  args: { noteId: v.id("loveNotes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const existing = await ctx.db.get(args.noteId);
    if (!existing) throw new ConvexError("Love note not found.");
    assertSharedAccess({ coupleId: existing.coupleId, activeCoupleId: activeCouple.couple._id });
    assertPrivateAccess({ authorId: existing.authorId, currentUserId: activeCouple.membership.userId });
    await ctx.db.delete(args.noteId);
    return null;
  },
});
