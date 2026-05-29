import { useCallback, useEffect, useRef, useState } from 'react';
import { id, lookup } from '@/src/lib/instant';
import { db } from '@/src/lib/instant';
import { useSession } from '@/src/hooks/useSession';
import { canUse } from '@/src/lib/plan';
import { notifySpaceMutation } from '@/src/lib/push';
import { notifyMemoryQuote } from '@/src/lib/memories/notifications';
import type { SpaceMode } from '@/src/lib/session';
import { safeInstantId } from '@/src/lib/instant-id';
import { relationWhere, uniqueSpaceIds } from '@/src/lib/space-scope';

export type EditableMemoryKind = 'post' | 'reply' | 'quote';
export type ComposerMode = 'post' | 'reply' | 'quote' | 'edit';

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
    | 'plan'
    | 'checkIn'
    | 'timetable'
    | 'journal';
  refId?: string;
  spaceId?: string;
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
  editId?: string;
  editKind?: EditableMemoryKind;
  parentId?: string;
  quoteId?: string;
  isPrivate?: boolean;
  notifyMembers?: boolean;
}

type ComposerValidationSpace = {
  id: string;
  kind: 'solo' | 'pair' | 'couple' | 'crew';
  plan?: string | null;
};

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

export async function removeMemoryDraftAttachmentAt(
  index: number,
  userId?: string | null,
): Promise<AttachmentDraft | null> {
  const attachment = sharedDraft.attachments[index] ?? null;
  if (!attachment) return null;

  await deleteOwnedDraftMediaPath(attachment.mediaPath, userId);

  setMemoryComposerDraft((current) => ({
    ...current,
    attachments: current.attachments.filter((_, currentIndex) => currentIndex !== index),
  }));
  return attachment;
}

export async function setMemoryComposerPrivacy(
  isPrivate: boolean,
  userId?: string | null,
  targetSpaceId?: string | null,
): Promise<{ removedMediaCount: number; removedEntityRefCount: number }> {
  if ((sharedDraft.isPrivate === true) === isPrivate) {
    return { removedMediaCount: 0, removedEntityRefCount: 0 };
  }

  const mediaAttachments = sharedDraft.attachments.filter(isDraftMediaAttachment);
  const crossSpaceEntityRefs = targetSpaceId
    ? sharedDraft.attachments.filter(
        (attachment) =>
          isDraftEntityRefAttachment(attachment) &&
          typeof attachment.spaceId === 'string' &&
          attachment.spaceId !== targetSpaceId,
      )
    : [];
  for (const attachment of mediaAttachments) {
    await deleteOwnedDraftMediaPath(attachment.mediaPath, userId);
  }
  const removedEntityRefIds = new Set(crossSpaceEntityRefs);

  setMemoryComposerDraft((current) => ({
    ...current,
    isPrivate,
    notifyMembers: isPrivate ? false : current.notifyMembers ?? true,
    attachments: current.attachments.filter(
      (attachment) => !isDraftMediaAttachment(attachment) && !removedEntityRefIds.has(attachment),
    ),
  }));

  return {
    removedMediaCount: mediaAttachments.length,
    removedEntityRefCount: crossSpaceEntityRefs.length,
  };
}

export async function deleteOwnedDraftMediaPath(
  mediaPath: string | null | undefined,
  userId?: string | null,
): Promise<void> {
  const ownedPath = ownedDraftMediaPathOrNull(mediaPath, userId);
  if (!ownedPath) return;
  await db.transact([
    db.tx.$files[lookup('path', ownedPath)].delete(),
  ]);
}

export function sumDraftMediaBytes(attachments: AttachmentDraft[]): number {
  return attachments.reduce((total, attachment) => {
    const mediaSize = attachment.mediaSize;
    return total + (typeof mediaSize === 'number' && Number.isFinite(mediaSize) && mediaSize > 0 ? mediaSize : 0);
  }, 0);
}

function firstRel(value: any): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function isDraftMediaAttachment(attachment: AttachmentDraft): boolean {
  return (
    attachment.type === 'image' ||
    attachment.type === 'gif' ||
    attachment.type === 'video' ||
    !!attachment.mediaPath ||
    !!attachment.mediaUrl
  );
}

function isDraftEntityRefAttachment(attachment: AttachmentDraft): boolean {
  return !!attachment.refId && isEntityAttachmentType(attachment.type);
}

function isEntityAttachmentType(type: unknown): type is AttachmentDraft['type'] {
  return (
    type === 'task' ||
    type === 'reminder' ||
    type === 'plan' ||
    type === 'checkIn' ||
    type === 'timetable' ||
    type === 'journal'
  );
}

function ownedDraftMediaPathOrNull(
  mediaPath: string | null | undefined,
  userId?: string | null,
): string | null {
  if (!userId || typeof mediaPath !== 'string') return null;
  const trimmed = mediaPath.trim();
  if (!trimmed.startsWith(`users/${userId}/spaces/`)) return null;
  return trimmed;
}

function subscribeToComposerDraft(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function validateComposerDraft(
  draft: ComposerDraft,
  space: ComposerValidationSpace,
): { ok: true } | { ok: false; reason: string } {
  const trimmed = draft.body.trim();
  const poll = normalizePollOptions(draft.pollOptions);
  const ids = validateComposerDraftIds(draft);
  if (!ids.ok) return ids;
  if (!trimmed && draft.attachments.length === 0 && poll.options.length === 0) {
    return { ok: false, reason: 'Memory must have text, media, or a poll.' };
  }
  if (draft.pollOptions.length > 0 && space.kind !== 'crew') {
    return { ok: false, reason: 'Polls are available only in crew spaces.' };
  }
  if (draft.pollOptions.length > 0 && (poll.options.length < 2 || poll.hasDuplicateLabels)) {
    return { ok: false, reason: 'Polls need at least two distinct options.' };
  }
  if (
    draft.attachments.some((a) => a.type === 'video') &&
    !canUse({ plan: space.plan ?? undefined }, 'videoUploads')
  ) {
    return { ok: false, reason: 'Video uploads require Pro.' };
  }
  if (
    draft.attachments.some(
      (attachment) =>
        isDraftEntityRefAttachment(attachment) &&
        typeof attachment.spaceId === 'string' &&
        attachment.spaceId !== space.id,
    )
  ) {
    return { ok: false, reason: 'Attached items must belong to the same space as the memory.' };
  }
  return { ok: true };
}

function validateComposerDraftIds(
  draft: ComposerDraft,
): { ok: true } | { ok: false; reason: string } {
  if (draft.mode === 'reply' && !safeInstantId(draft.parentId)) {
    return { ok: false, reason: 'Reply memory id is invalid.' };
  }
  if (draft.mode === 'quote' && !safeInstantId(draft.quoteId)) {
    return { ok: false, reason: 'Quoted memory id is invalid.' };
  }
  if (draft.mode === 'edit' && !safeInstantId(draft.editId)) {
    return { ok: false, reason: 'Edit memory id is invalid.' };
  }
  for (const attachment of draft.attachments) {
    if (!isEntityAttachmentType(attachment.type)) continue;
    if (!safeInstantId(attachment.refId)) {
      return { ok: false, reason: 'Attachment id is invalid.' };
    }
  }
  return { ok: true };
}

export function canSubmitComposerDraft(
  draft: ComposerDraft,
  space: ComposerValidationSpace | null | undefined,
) {
  if (!space?.id) return false;
  if (draft.mode === 'edit' && (!draft.editId || !draft.editKind)) return false;
  return validateComposerDraft(draft, space).ok;
}

export function resolveMemoryDraftAttachmentScopeId(
  targetSpaceId: string | null | undefined,
  attachmentSpaceId: string | null | undefined,
): string | null {
  if (typeof targetSpaceId === 'string' && targetSpaceId.length > 0) return targetSpaceId;
  if (typeof attachmentSpaceId === 'string' && attachmentSpaceId.length > 0) return attachmentSpaceId;
  return null;
}

function normalizePollOptions(options: string[]) {
  const trimmed = options.map((option) => option.trim()).filter(Boolean);
  const normalizedLabels = new Set(trimmed.map((option) => option.toLocaleLowerCase()));
  return {
    options: trimmed,
    hasDuplicateLabels: normalizedLabels.size !== trimmed.length,
  };
}

export function buildMemoryEditUpdate(draft: ComposerDraft, updatedAt = Date.now()) {
  if (draft.mode !== 'edit') {
    throw new Error('Composer draft is not in edit mode.');
  }
  if (!draft.editKind) {
    throw new Error('Cannot edit memory without its original kind.');
  }
  return {
    body: draft.body.trim(),
    tags: extractHashtags(draft.body),
    kind: draft.editKind,
    isPrivate: draft.isPrivate ?? false,
    updatedAt,
  };
}

export function useMemoryComposer() {
  const session = useSession() as any;
  const { user } = session;
  const [draft, setDraftSnapshot] = useState<ComposerDraft>(sharedDraft);
  const submittingRef = useRef(false);

  useEffect(() => subscribeToComposerDraft(() => setDraftSnapshot(sharedDraft)), []);

  const setDraft = useCallback(
    (next: ComposerDraft | ((current: ComposerDraft) => ComposerDraft)) => {
      setMemoryComposerDraft(next);
    },
    [],
  );

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      const submissionDraft = isSoloComposerSession(session)
        ? { ...draft, isPrivate: true, notifyMembers: false }
        : draft;
      const targetSpace = resolveComposerTargetSpace(session, submissionDraft);
      if (!user?.id || !targetSpace?.id) throw new Error('Not signed in or no active space');
      const validation = validateComposerDraft(submissionDraft, targetSpace as any);
      if (!validation.ok) throw new Error(validation.reason);
      await validateComposerLinkedMemoryTargets({
        draft: submissionDraft,
        targetSpaceId: targetSpace.id,
        userId: user.id,
        readableSpaceIds: composerReadableSpaceIds(session),
      });

      const memoryId = id();
      const now = Date.now();

      if (submissionDraft.mode === 'edit') {
        if (!submissionDraft.editId) throw new Error('Cannot edit memory without an id.');
        await db.transact([
          db.tx.memories[submissionDraft.editId].update(buildMemoryEditUpdate(submissionDraft, now)),
        ]);
        setMemoryComposerDraft(EMPTY_DRAFT);
        return;
      }

      const isPrivate = submissionDraft.isPrivate ?? false;
      const notifyMembers = isPrivate ? false : submissionDraft.notifyMembers ?? true;
      const tags = extractHashtags(submissionDraft.body);
      const pollOptions = normalizePollOptions(submissionDraft.pollOptions).options;

      const notifyCreatedMemory = async (createdMemoryId: string) => {
        if (notifyMembers) {
          const authorName =
            user.displayName?.trim() ||
            user.email?.split('@')[0] ||
            'Someone';
          await notifySpaceMutation({
            spaceId: targetSpace.id,
            spaceKind: targetSpace.kind,
            excludeUserId: user.id,
            title: submissionDraft.mode === 'reply' ? 'New memory reply' : 'New memory',
            body: submissionDraft.mode === 'reply'
              ? `${authorName} replied to a memory`
              : `${authorName} added a memory`,
            eventKind: submissionDraft.mode === 'reply' ? 'memoryReply' : 'memoryCreated',
            memoryId: createdMemoryId,
            route: `/(tabs)/memories/${createdMemoryId}`,
          });
        }
        if (!isPrivate && submissionDraft.quoteId) {
          await notifyMemoryQuote({
            sourceMemoryId: submissionDraft.quoteId,
            actorUserId: user.id,
            actorName:
              user.displayName?.trim() ||
              user.email?.split('@')[0] ||
              'Someone',
            routeMemoryId: createdMemoryId,
          });
        }
      };

      const trustedMemoryId = await submitTrustedMemoryWithAttachments({
        draft: submissionDraft,
        spaceId: targetSpace.id,
        isPrivate,
        notifyMembers,
      });
      if (trustedMemoryId) {
        await notifyCreatedMemory(trustedMemoryId);
        setMemoryComposerDraft(EMPTY_DRAFT);
        return;
      }

      const ops: any[] = [
        db.tx.memories[memoryId]
          .update({
            body: submissionDraft.body.trim(),
            kind: submissionDraft.mode,
            isPrivate,
            notifyMembers,
            tags,
            createdAt: now,
          })
          .link({
            space: targetSpace.id,
            author: user.id,
            ...(submissionDraft.parentId ? { replyTo: submissionDraft.parentId } : {}),
            ...(submissionDraft.quoteId ? { quoteOf: submissionDraft.quoteId } : {}),
          }),
      ];

      if (pollOptions.length > 0) {
        const pollId = id();
        ops.push(
          db.tx.memoryPolls[pollId]
            .update({ question: submissionDraft.pollQuestion, createdAt: now })
            .link({ memory: memoryId }),
        );
        for (const [index, label] of pollOptions.entries()) {
          const optId = id();
          ops.push(
            db.tx.memoryPollOptions[optId]
              .update({ label, voteCount: 0, sortOrder: index, createdAt: now })
              .link({ poll: pollId }),
          );
        }
      }

      await db.transact(ops);
      await notifyCreatedMemory(memoryId);
      setMemoryComposerDraft(EMPTY_DRAFT);
    } finally {
      submittingRef.current = false;
    }
  }, [draft, session, user?.id]);

  return { draft, setDraft, submit };
}

async function submitTrustedMemoryWithAttachments(args: {
  draft: ComposerDraft;
  spaceId: string;
  isPrivate: boolean;
  notifyMembers: boolean;
}): Promise<string | null> {
  if (args.draft.attachments.length === 0) return null;
  const apiBase = apiBaseUrl();
  if (!apiBase) throw new Error('Memory API is required for attachments.');
  if (typeof (db as any).getAuth !== 'function') {
    throw new Error('Memory API requires a signed-in session.');
  }

  const auth = await (db as any).getAuth().catch(() => null);
  const token = auth?.refresh_token;
  if (!token) throw new Error('Memory API requires a signed-in session.');

  const response = await fetch(`${apiBase}/api/memories`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      spaceId: args.spaceId,
      body: args.draft.body,
      mode: args.draft.mode,
      isPrivate: args.isPrivate,
      notifyMembers: args.notifyMembers,
      parentId: args.draft.parentId,
      quoteId: args.draft.quoteId,
      attachments: args.draft.attachments,
      pollQuestion: args.draft.pollQuestion,
      pollOptions: args.draft.pollOptions,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload?.error === 'string' ? payload.error : 'Memory API failed.');
  }
  if (typeof payload?.memoryId !== 'string') {
    throw new Error('Memory API did not return a memory id.');
  }
  return payload.memoryId;
}

function apiBaseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_API_URL?.trim();
  return raw ? raw.replace(/\/+$/, '') : null;
}

async function validateComposerLinkedMemoryTargets(params: {
  draft: ComposerDraft;
  targetSpaceId: string;
  userId: string;
  readableSpaceIds: string[];
}): Promise<void> {
  const refs = composerLinkedMemoryRefs(params.draft);
  if (refs.length === 0) return;
  if (params.readableSpaceIds.length === 0) throw new Error('Memory not found');

  const result = await db.queryOnce({
    memories: {
      $: {
        where: andWhere(idWhere(refs.map((ref) => ref.id)), relationWhere('space', params.readableSpaceIds)),
        limit: refs.length,
      },
      space: {},
      author: {},
    },
  });
  const rows = (result?.data?.memories ?? []) as any[];
  const byId = new Map(rows.map((row) => [row?.id, row]));

  for (const ref of refs) {
    const memory = byId.get(ref.id);
    if (!memory) throw new Error(linkedMemoryNotFoundMessage(ref));
    const space = firstRel(memory.space);
    const author = firstRel(memory.author);
    if (!space?.id || !params.readableSpaceIds.includes(space.id)) {
      throw new Error(linkedMemoryNotFoundMessage(ref));
    }

    if (ref.kind === 'edit') {
      if (author?.id !== params.userId) throw new Error('Memory not owned');
      if (space.id !== params.targetSpaceId) throw new Error('Memory not found');
      if (memory.kind !== params.draft.editKind || (memory.isPrivate === true) !== (params.draft.isPrivate === true)) {
        throw new Error('Memory cannot be edited from this composer state.');
      }
      continue;
    }

    const linkedIsPrivate = memory.isPrivate === true;
    const draftIsPrivate = params.draft.isPrivate === true;
    if (linkedIsPrivate && (author?.id !== params.userId || !draftIsPrivate)) {
      throw new Error(linkedMemoryNotFoundMessage(ref));
    }
    if (!draftIsPrivate && space.id !== params.targetSpaceId) {
      throw new Error(`${ref.label} memory must belong to the target space.`);
    }
  }
}

function composerLinkedMemoryRefs(draft: ComposerDraft): Array<{ id: string; label: string; kind: 'edit' | 'parent' | 'quote' }> {
  const refs: Array<{ id: string; label: string; kind: 'edit' | 'parent' | 'quote' }> = [];
  const editId = safeInstantId(draft.editId);
  const parentId = safeInstantId(draft.parentId);
  const quoteId = safeInstantId(draft.quoteId);
  if (draft.mode === 'edit' && editId) refs.push({ id: editId, label: 'Memory', kind: 'edit' });
  if (draft.mode === 'reply' && parentId) refs.push({ id: parentId, label: 'Parent', kind: 'parent' });
  if (draft.mode === 'quote' && quoteId) refs.push({ id: quoteId, label: 'Quoted', kind: 'quote' });
  return refs;
}

function linkedMemoryNotFoundMessage(ref: { label: string; kind: 'edit' | 'parent' | 'quote' }): string {
  return ref.kind === 'edit' ? 'Memory not found' : `${ref.label} memory not found.`;
}

function idWhere(ids: string[]): any {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 1) return { id: uniqueIds[0] };
  return { or: uniqueIds.map((value) => ({ id: value })) };
}

function andWhere(base: any, scoped: any): any {
  return scoped ? { and: [base, scoped] } : base;
}

function composerReadableSpaceIds(session: any): string[] {
  return uniqueSpaceIds([
    session?.personalSpaceId,
    session?.sharedSpaceId,
    session?.soloSpace?.id,
    session?.sharedSpace?.id,
    session?.space?.id,
    session?.activeCouple?.couple?.id,
  ]);
}

function isSoloComposerSession(session: any): boolean {
  return session?.isSolo === true || session?.mode === 'solo';
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

export function resolveComposerTargetSpace(
  session: any,
  draft: Pick<ComposerDraft, 'isPrivate'>,
): {
  id: string;
  kind: SpaceMode;
  plan?: string | null;
} | null {
  if (draft.isPrivate && session?.personalSpaceId) {
    const raw = session?.soloSpace ?? { id: session.personalSpaceId, kind: 'solo', plan: null };
    return {
      id: session.personalSpaceId,
      kind: normalizeComposerMode(raw.kind ?? 'solo'),
      plan: raw.plan ?? null,
    };
  }
  if (session?.sharedSpaceId) {
    const raw = session?.sharedSpace ?? session?.space ?? { id: session.sharedSpaceId, kind: session?.mode };
    return {
      id: session.sharedSpaceId,
      kind: normalizeComposerMode(raw.kind ?? session?.mode),
      plan: raw.plan ?? null,
    };
  }
  return resolveComposerSpace(session);
}

function normalizeComposerMode(value: unknown): SpaceMode {
  if (value === 'solo' || value === 'pair' || value === 'crew') return value;
  if (value === 'couple') return 'pair';
  return 'solo';
}
