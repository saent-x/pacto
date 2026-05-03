export interface ReactionPayload {
  actor: string;
  aggregate?: { others: number };
}

export interface DebouncerOptions {
  windowMs: number;
  send: (payload: ReactionPayload & { memoryId: string; recipientId: string }) => void;
}

interface PendingBucket {
  count: number;
  firstActor: string;
  timer: ReturnType<typeof setTimeout>;
}

export class ReactionDebouncer {
  private pending = new Map<string, PendingBucket>();

  constructor(private opts: DebouncerOptions) {}

  private key(memoryId: string, recipientId: string) {
    return `${memoryId}::${recipientId}`;
  }

  notify(memoryId: string, recipientId: string, payload: ReactionPayload) {
    const k = this.key(memoryId, recipientId);
    const existing = this.pending.get(k);

    if (!existing) {
      // First reaction in the window: send immediately, then start the window.
      this.opts.send({ memoryId, recipientId, actor: payload.actor });
      const timer = setTimeout(() => {
        const bucket = this.pending.get(k);
        if (bucket && bucket.count > 0) {
          this.opts.send({
            memoryId,
            recipientId,
            actor: bucket.firstActor,
            aggregate: { others: bucket.count },
          });
        }
        this.pending.delete(k);
      }, this.opts.windowMs);
      this.pending.set(k, { count: 0, firstActor: payload.actor, timer });
      return;
    }

    existing.count += 1;
  }
}

// TODO(memories-notifications-integration): wire this debouncer plus the
// new-post / reply / repost / quote fan-out into the existing notifications
// pipeline. See `src/hooks/useNotifications.ts` for the established pattern
// (look at how tasks/reminders are notified). Each event type needs:
//   - new memory (kind='post')   → notify all space members except author,
//                                  unless isPrivate=true or notifyMembers=false
//   - new reply on your memory   → notify memory.author (skip if author == replier)
//   - new reaction               → use ReactionDebouncer (5min window)
//   - new repost / quote         → notify original author (skip self)
// Per-user opt-outs live on memberships.notifyOn{Post,Reply,Reaction,Repost}.
// Push delivery uses the existing `devices` table's expoPushToken.
