import { mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { assertSharedAccess, requireActiveCouple } from "./lib/permissions";

const wishlistValidator = v.object({
  _id: v.string(),
  coupleId: v.string(),
  name: v.string(),
  createdBy: v.string(),
  createdAt: v.number(),
});

const wishlistItemValidator = v.object({
  _id: v.string(),
  wishlistId: v.string(),
  coupleId: v.string(),
  title: v.string(),
  description: v.union(v.string(), v.null()),
  url: v.union(v.string(), v.null()),
  price: v.union(v.number(), v.null()),
  isPurchased: v.boolean(),
  purchasedBy: v.union(v.string(), v.null()),
  priority: v.number(),
  sortOrder: v.number(),
  addedBy: v.string(),
  createdAt: v.number(),
});

export const listWishlists = queryGeneric({
  args: {},
  returns: v.array(wishlistValidator),
  handler: async (ctx) => {
    const activeCouple = await requireActiveCouple(ctx);
    return ctx.db
      .query("wishlists")
      .withIndex("by_coupleId", (q: any) =>
        q.eq("coupleId", activeCouple.couple._id),
      )
      .collect();
  },
});

export const createWishlist = mutationGeneric({
  args: { name: v.string() },
  returns: wishlistValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("wishlists", {
      coupleId: activeCouple.couple._id,
      name: args.name,
      createdBy: activeCouple.membership.userId,
      createdAt: now,
    });
    return {
      _id: id,
      coupleId: activeCouple.couple._id,
      name: args.name,
      createdBy: activeCouple.membership.userId,
      createdAt: now,
    };
  },
});

export const updateWishlist = mutationGeneric({
  args: {
    wishlistId: v.id("wishlists"),
    name: v.optional(v.string()),
  },
  returns: wishlistValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const existing = await ctx.db.get(args.wishlistId);
    if (!existing) throw new ConvexError("Wishlist not found.");
    assertSharedAccess({
      coupleId: existing.coupleId,
      activeCoupleId: activeCouple.couple._id,
    });
    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name;
    await ctx.db.patch(args.wishlistId, patch);
    return { ...existing, ...patch };
  },
});

export const deleteWishlist = mutationGeneric({
  args: { wishlistId: v.id("wishlists") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const existing = await ctx.db.get(args.wishlistId);
    if (!existing) throw new ConvexError("Wishlist not found.");
    assertSharedAccess({
      coupleId: existing.coupleId,
      activeCoupleId: activeCouple.couple._id,
    });
    const items = await ctx.db
      .query("wishlistItems")
      .withIndex("by_wishlistId", (q: any) =>
        q.eq("wishlistId", args.wishlistId),
      )
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }
    await ctx.db.delete(args.wishlistId);
    return null;
  },
});

export const getWishlistItems = queryGeneric({
  args: { wishlistId: v.id("wishlists") },
  returns: v.array(wishlistItemValidator),
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const wishlist = await ctx.db.get(args.wishlistId);
    if (!wishlist) throw new ConvexError("Wishlist not found.");
    assertSharedAccess({
      coupleId: wishlist.coupleId,
      activeCoupleId: activeCouple.couple._id,
    });
    return ctx.db
      .query("wishlistItems")
      .withIndex("by_wishlistId", (q: any) =>
        q.eq("wishlistId", args.wishlistId),
      )
      .collect();
  },
});

export const addWishlistItem = mutationGeneric({
  args: {
    wishlistId: v.id("wishlists"),
    title: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    url: v.optional(v.union(v.string(), v.null())),
    price: v.optional(v.union(v.number(), v.null())),
    priority: v.optional(v.number()),
  },
  returns: wishlistItemValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const wishlist = await ctx.db.get(args.wishlistId);
    if (!wishlist) throw new ConvexError("Wishlist not found.");
    assertSharedAccess({
      coupleId: wishlist.coupleId,
      activeCoupleId: activeCouple.couple._id,
    });
    const existing = await ctx.db
      .query("wishlistItems")
      .withIndex("by_wishlistId", (q: any) =>
        q.eq("wishlistId", args.wishlistId),
      )
      .collect();
    const now = Date.now();
    const id = await ctx.db.insert("wishlistItems", {
      wishlistId: args.wishlistId,
      coupleId: activeCouple.couple._id,
      title: args.title,
      description: args.description ?? null,
      url: args.url ?? null,
      price: args.price ?? null,
      isPurchased: false,
      purchasedBy: null,
      priority: args.priority ?? 0,
      sortOrder: existing.length,
      addedBy: activeCouple.membership.userId,
      createdAt: now,
    });
    return {
      _id: id,
      wishlistId: args.wishlistId,
      coupleId: activeCouple.couple._id,
      title: args.title,
      description: args.description ?? null,
      url: args.url ?? null,
      price: args.price ?? null,
      isPurchased: false,
      purchasedBy: null,
      priority: args.priority ?? 0,
      sortOrder: existing.length,
      addedBy: activeCouple.membership.userId,
      createdAt: now,
    };
  },
});

export const updateWishlistItem = mutationGeneric({
  args: {
    itemId: v.id("wishlistItems"),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    url: v.optional(v.union(v.string(), v.null())),
    price: v.optional(v.union(v.number(), v.null())),
    priority: v.optional(v.number()),
  },
  returns: wishlistItemValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const existing = await ctx.db.get(args.itemId);
    if (!existing) throw new ConvexError("Wishlist item not found.");
    assertSharedAccess({
      coupleId: existing.coupleId,
      activeCoupleId: activeCouple.couple._id,
    });
    const patch = {
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.description !== undefined ? { description: args.description } : {}),
      ...(args.url !== undefined ? { url: args.url } : {}),
      ...(args.price !== undefined ? { price: args.price } : {}),
      ...(args.priority !== undefined ? { priority: args.priority } : {}),
    };
    await ctx.db.patch(args.itemId, patch);
    return { ...existing, ...patch };
  },
});

export const toggleWishlistItemPurchased = mutationGeneric({
  args: { itemId: v.id("wishlistItems") },
  returns: wishlistItemValidator,
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const existing = await ctx.db.get(args.itemId);
    if (!existing) throw new ConvexError("Wishlist item not found.");
    assertSharedAccess({
      coupleId: existing.coupleId,
      activeCoupleId: activeCouple.couple._id,
    });
    const next = {
      isPurchased: !existing.isPurchased,
      purchasedBy: !existing.isPurchased
        ? activeCouple.membership.userId
        : null,
    };
    await ctx.db.patch(args.itemId, next);
    return { ...existing, ...next };
  },
});

export const deleteWishlistItem = mutationGeneric({
  args: { itemId: v.id("wishlistItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const activeCouple = await requireActiveCouple(ctx);
    const existing = await ctx.db.get(args.itemId);
    if (!existing) throw new ConvexError("Wishlist item not found.");
    assertSharedAccess({
      coupleId: existing.coupleId,
      activeCoupleId: activeCouple.couple._id,
    });
    await ctx.db.delete(args.itemId);
    return null;
  },
});
