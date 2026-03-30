import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import {
  resolveCurrentSession,
  upsertCurrentUser,
  sessionValidator,
  userProfileValidator,
} from "./lib/auth";

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
