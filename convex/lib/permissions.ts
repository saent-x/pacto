import { ConvexError } from "convex/values";
import {
  resolveActiveCoupleForUser,
  requireCurrentUser,
  type SessionUser,
  type ActiveCoupleSummary,
} from "./auth";

type QueryCtx = Parameters<typeof requireCurrentUser>[0];

export async function requireAuthenticatedUser(ctx: QueryCtx): Promise<SessionUser> {
  const { user } = await requireCurrentUser(ctx);
  if (!user) {
    throw new ConvexError("Create your profile before continuing.");
  }
  return user;
}

export async function requireActiveCouple(
  ctx: QueryCtx,
): Promise<ActiveCoupleSummary> {
  const user = await requireAuthenticatedUser(ctx);
  const activeCouple = await resolveActiveCoupleForUser(ctx, user._id);
  if (!activeCouple) {
    throw new ConvexError("Join a couple before accessing shared content.");
  }
  return activeCouple;
}

export function assertSharedAccess({
  coupleId,
  activeCoupleId,
}: {
  coupleId: string;
  activeCoupleId: string | null | undefined;
}) {
  if (activeCoupleId !== coupleId) {
    throw new ConvexError("You do not have access to this shared record.");
  }
}

export function assertPrivateAccess({
  authorId,
  currentUserId,
}: {
  authorId: string;
  currentUserId: string | null | undefined;
}) {
  if (authorId !== currentUserId) {
    throw new ConvexError("You do not have access to this private record.");
  }
}
