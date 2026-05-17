import { useCallback, useEffect, useState } from 'react';
import { id } from '@/src/lib/instant';
import { db } from '@/src/lib/instant';
import { useSession } from '@/src/hooks/useSession';
import { canUse } from '@/src/lib/plan';
import { notifySpaceMutation } from '@/src/lib/push';
import { notifyMemoryQuote } from '@/src/lib/memories/notifications';
import type { SpaceMode } from '@/src/lib/session';

export type ComposerMode = 'post' | 'reply' | 'quote';

const HASHTAG_RE = /#([\p{L}\p{N}_]+)/gu;

/** Parse #hashtags from body text into a deduped lowercase array. */
export function extractHashtags(body: string): string[] {
  const matches = body.match(HASHTAG_RE);
  if (!matches) return [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of matches) {
    const tag = raw.slice(1).toLowerCase();
    if (!seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}

export interface AttachmentDraft {
  type:
    | 'image'
    | 'gif'
    | 'video'
    | 'task'
    | 'reminder'
    | 'milestone'
    | 'plan'
    | 'checkIn'
    | 'wishlistItem'
    | 'timetable'
    | 'journal';
  refId?: string;
  mediaUrl?: string;
  mediaPath?: string;
  mediaSize?: number;
  mediaWidth?: number;
  mediaHeight?: number;
}

export interface ComposerDraft {
  body: string;
  attachments: AttachmentDraft[];
  pollOptions: string[];
  pollQuestion?: string;
  mode: ComposerMode;
  parentId?: string;
  quoteId?: string;
  isPrivate?: boolean;
  notifyMembers?: boolean;
}

const EMPTY_DRAFT: ComposerDraft = {
  body: '',
  attachments: [],
  pollOptions: [],
  mode: 'post',
};

let sharedDraft: ComposerDraft = EMPTY_DRAFT;
const listeners = new Set<() => void>();

function emitDraftChange() {
  listeners.forEach((listener) => listener());
}

export function getMemoryComposerDraft() {
  return sharedDraft;
}

export function setMemoryComposerDraft(
  next: ComposerDraft | ((current: ComposerDraft) => ComposerDraft),
) {
  sharedDraft =
    typeof next === 'function'
      ? (next as (current: ComposerDraft) => ComposerDraft)(sharedDraft)
      : next;
  emitDraftChange();
}

export function addMemoryDraftAttachment(attachment: AttachmentDraft) {
  setMemoryComposerDraft((current) => {
    const exists = current.attachments.some((item) => {
      if (attachment.refId && item.refId) {
        return item.type === attachment.type && item.refId === attachment.refId;
      }
      if (attachment.mediaPath && item.mediaPath) {
        return item.mediaPath === attachment.mediaPath;
      }
      if (attachment.mediaUrl && item.mediaUrl) {
        return item.mediaUrl === attachment.mediaUrl;
      }
      return false;
    });
    if (exists) return current;
    return {
      ...current,
      attachments: [...current.attachments, attachment],
    };
  });
}

function subscribeToComposerDraft(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function validateComposerDraft(
  draft: ComposerDraft,
  space: { id: string; kind: 'solo' | 'pair' | 'couple' | 'crew'; plan?: string },
): { ok: true } | { ok: false; reason: string } {
  const trimmed = draft.body.trim();
  if (!trimmed && draft.attachments.length === 0 && draft.pollOptions.length === 0) {
    return { ok: false, reason: 'Memory must have text, media, or a poll.' };
  }
  if (draft.pollOptions.length > 0 && space.kind !== 'crew') {
    return { ok: false, reason: 'Polls are available only in crew spaces.' };
  }
  if (draft.attachments.some((a) => a.type === 'video') && !canUse(space, 'videoUploads')) {
    return { ok: false, reason: 'Video uploads require Pro.' };
  }
  if (draft.isPrivate && space.kind === 'solo') {
    return { ok: false, reason: 'Private posts are not available in solo spaces.' };
  }
  return { ok: true };
}

export function useMemoryComposer() {
  const session = useSession() as any;
  const { user } = session;
  const space = resolveComposerSpace(session);
  const [draft, setDraftSnapshot] = useState<ComposerDraft>(sharedDraft);

  useEffect(() => subscribeToComposerDraft(() => setDraftSnapshot(sharedDraft)), []);

  const setDraft = useCallback(
    (next: ComposerDraft | ((current: ComposerDraft) => ComposerDraft)) => {
      setMemoryComposerDraft(next);
    },
    [],
  );

  const submit = useCallback(async () => {
    if (!user?.id || !space?.id) throw new Error('Not signed in or no active space');
    const validation = validateComposerDraft(draft, space as any);
    if (!validation.ok) throw new Error(validation.reason);

    const memoryId = id();
    const now = Date.now();
    const isPrivate = draft.isPrivate ?? false;
    const notifyMembers = isPrivate ? false : draft.notifyMembers ?? true;
    const tags = extractHashtags(draft.body);

    const ops: any[] = [
      db.tx.memories[memoryId]
        .update({
          body: draft.body.trim(),
          kind: draft.mode,
          isPrivate,
          notifyMembers,
          tags,
          createdAt: now,
        })
        .link({
          space: space.id,
          author: user.id,
          ...(draft.parentId ? { replyTo: draft.parentId } : {}),
          ...(draft.quoteId ? { quoteOf: draft.quoteId } : {}),
        }),
    ];

    for (const [index, att] of draft.attachments.entries()) {
      const attId = id();
      ops.push(
        db.tx.memoryAttachments[attId]
          .update({
            type: att.type,
            refId: att.refId,
            mediaUrl: att.mediaUrl,
            mediaPath: att.mediaPath,
            mediaSize: att.mediaSize ?? 0,
            mediaWidth: att.mediaWidth,
            mediaHeight: att.mediaHeight,
            sortOrder: index,
            createdAt: now,
          })
          .link({ memory: memoryId }),
      );
    }

    if (draft.pollOptions.length > 0) {
      const pollId = id();
      ops.push(
        db.tx.memoryPolls[pollId]
          .update({ question: draft.pollQuestion, createdAt: now })
          .link({ memory: memoryId }),
      );
      for (const [index, label] of draft.pollOptions.entries()) {
        const optId = id();
        ops.push(
          db.tx.memoryPollOptions[optId]
            .update({ label, voteCount: 0, sortOrder: index, createdAt: now })
            .link({ poll: pollId }),
        );
      }
    }

    await db.transact(ops);
    if (notifyMembers) {
      const authorName =
        user.displayName?.trim() ||
        user.email?.split('@')[0] ||
        'Someone';
      await notifySpaceMutation({
        spaceId: space.id,
        spaceKind: space.kind,
        excludeUserId: user.id,
        title: draft.mode === 'reply' ? 'New memory reply' : 'New memory',
        body: draft.mode === 'reply'
          ? `${authorName} replied to a memory`
          : `${authorName} added a memory`,
        route: `/(tabs)/memories/${memoryId}`,
      });
    }
    if (draft.quoteId) {
      await notifyMemoryQuote({
        sourceMemoryId: draft.quoteId,
        actorUserId: user.id,
        actorName:
          user.displayName?.trim() ||
          user.email?.split('@')[0] ||
          'Someone',
        routeMemoryId: memoryId,
      });
    }
    setMemoryComposerDraft(EMPTY_DRAFT);
  }, [draft, user?.id, space]);

  return { draft, setDraft, submit };
}

export function resolveComposerSpace(session: any): {
  id: string;
  kind: SpaceMode;
  plan?: string | null;
} | null {
  const raw = session?.space ?? session?.activeCouple?.couple;
  const id = raw?.id;
  if (!id) return null;

  const kind = normalizeComposerMode(raw.kind ?? session?.mode);
  return {
    id,
    kind,
    plan: raw.plan ?? null,
  };
}

function normalizeComposerMode(value: unknown): SpaceMode {
  if (value === 'solo' || value === 'pair' || value === 'crew') return value;
  if (value === 'couple') return 'pair';
  return 'solo';
}
