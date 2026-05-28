import { safeInstantId } from '@/src/lib/instant-id';
import { quotaCapForPlan } from '@/src/lib/memories/quota';
import { getAdminDb, readJsonBody } from '@/src/lib/server/request-guards';

// SEC-5: memory posts carry attachment metadata arrays (paths/urls/sizes, no
// binary — media bytes are uploaded to storage separately), so allow a roomier
// 2 MB JSON body cap than the 1 MB default.
const MAX_MEMORY_BODY_BYTES = 2 * 1_024 * 1_024;

const HASHTAG_RE = /#([\p{L}\p{N}_]+)/gu;

type MemoryBody = {
  spaceId?: string;
  body?: string;
  mode?: string;
  isPrivate?: boolean;
  notifyMembers?: boolean;
  parentId?: string;
  quoteId?: string;
  attachments?: AttachmentBody[];
  pollQuestion?: string;
  pollOptions?: string[];
};

type AttachmentBody = {
  type?: string;
  refId?: string;
  mediaUrl?: string;
  mediaPath?: string;
  mediaSize?: number;
  mediaWidth?: number;
  mediaHeight?: number;
};

type EntityAttachmentType = 'task' | 'reminder' | 'plan' | 'checkIn' | 'timetable' | 'journal';

const ENTITY_ATTACHMENT_COLLECTIONS: Record<EntityAttachmentType, string> = {
  task: 'tasks',
  reminder: 'reminders',
  plan: 'plans',
  checkIn: 'checkIns',
  timetable: 'timetables',
  journal: 'journalEntries',
};

const ENTITY_ATTACHMENT_LABELS: Record<EntityAttachmentType, string> = {
  task: 'Task',
  reminder: 'Reminder',
  plan: 'Plan',
  checkIn: 'Check-in',
  timetable: 'Timetable',
  journal: 'Journal entry',
};

const ENTITY_ATTACHMENT_OWNER_LINKS: Record<EntityAttachmentType, 'createdBy' | 'author'> = {
  task: 'createdBy',
  reminder: 'createdBy',
  plan: 'createdBy',
  checkIn: 'author',
  timetable: 'createdBy',
  journal: 'author',
};

const OWNERLESS_PERSONAL_ENTITY_ATTACHMENTS = new Set<EntityAttachmentType>(['task', 'plan', 'timetable']);

// SECURITY TODO: rate limiting requires shared infra (KV/Redis); not implemented here.
export async function POST(request: Request) {
  const token = bearerToken(request);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const appId = process.env.EXPO_PUBLIC_INSTANT_APP_ID;
  const adminToken = process.env.INSTANT_ADMIN_TOKEN;
  if (!appId || !adminToken) {
    return Response.json({ error: 'Memory API is not configured.' }, { status: 503 });
  }

  // SEC-5: enforce JSON Content-Type (415) and body size cap (413) before parsing.
  const parsedBody = await readJsonBody(request, { maxBytes: MAX_MEMORY_BODY_BYTES });
  if (!parsedBody.ok) return parsedBody.response;
  const payload = parsedBody.body as MemoryBody;

  const validation = validatePayload(payload);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }
  normalizePayloadIds(payload);

  const db = getAdminDb(appId, adminToken);
  const user = await db.auth.verifyToken(token).catch(() => null);
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const mediaPaths = mediaAttachmentPaths(Array.isArray(payload.attachments) ? payload.attachments : []);

  const query: any = {
    spaces: {
      $: { where: { id: payload.spaceId } },
      memberships: {
        user: {},
      },
      mediaQuota: {},
      memories: {
        attachments: {},
      },
    },
    ...(mediaPaths.length > 0
      ? {
          $files: {
            $: { where: pathWhere(mediaPaths) },
          },
        }
      : {}),
  };
  const result = await db.query(query);
  const space = firstRow((result as any)?.spaces ?? (result as any)?.data?.spaces);
  if (!space) return Response.json({ error: 'Space not found.' }, { status: 404 });
  if (!spaceMemberIds(space).has(user.id)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (payload.isPrivate === true && space.kind !== 'solo') {
    return Response.json({ error: 'Private memories must target a solo space.' }, { status: 400 });
  }
  if (space.kind === 'solo' && payload.isPrivate !== true) {
    return Response.json({ error: 'Solo-space memories must be private.' }, { status: 400 });
  }

  const linkedMemoryValidation = await validateLinkedMemoryTargets(db, payload, user.id);
  if (!linkedMemoryValidation.ok) {
    return Response.json(
      { error: linkedMemoryValidation.error },
      { status: linkedMemoryValidation.status },
    );
  }

  const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
  for (const attachment of attachments) {
    const attachmentValidation = validateAttachment(attachment, user.id, payload.spaceId!);
    if (!attachmentValidation.ok) {
      return Response.json({ error: attachmentValidation.error }, { status: 400 });
    }
  }
  const entityAttachmentValidation = await validateEntityAttachmentTargets(
    db,
    attachments,
    payload.spaceId!,
    user.id,
    space.kind,
    payload.isPrivate === true,
  );
  if (!entityAttachmentValidation.ok) {
    return Response.json(
      { error: entityAttachmentValidation.error },
      { status: entityAttachmentValidation.status },
    );
  }

  const pollOptions = normalizePollOptions(Array.isArray(payload.pollOptions) ? payload.pollOptions : []);
  if (pollOptions.length > 0 && space.kind !== 'crew') {
    return Response.json({ error: 'Polls are available only in crew spaces.' }, { status: 400 });
  }
  if (attachments.some((attachment) => attachment.type === 'video') && space.plan !== 'pro') {
    return Response.json({ error: 'Video uploads require Pro.' }, { status: 403 });
  }

  const nextMediaBytes = sumAttachmentBytes(attachments);
  const currentBytes = Math.max(
    attachmentBytesUsed(space.memories),
    materializedQuotaBytesUsed(space.mediaQuota),
  );
  const bytesUsed = currentBytes + nextMediaBytes;
  if (bytesUsed > quotaCapForPlan(space.plan === 'pro' ? 'pro' : 'free')) {
    return Response.json({ error: 'Media quota exceeded.' }, { status: 413 });
  }
  const uploadedMediaValidation = validateUploadedMediaRows(
    attachments,
    (result as any)?.$files ?? (result as any)?.data?.$files,
  );
  if (!uploadedMediaValidation.ok) {
    return Response.json(
      { error: uploadedMediaValidation.error },
      { status: uploadedMediaValidation.status },
    );
  }

  const now = Date.now();
  const memoryId = randomId();
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  const ops: any[] = [];
  if (nextMediaBytes > 0) {
    const quota = firstRel(space.mediaQuota);
    const quotaId = typeof quota?.id === 'string' ? quota.id : randomId();
    ops.push(
      db.tx.mediaQuotaUsage[quotaId]
        .update({ bytesUsed, updatedAt: now })
        .link({ space: payload.spaceId }),
    );
  }

  ops.push(
    db.tx.memories[memoryId]
      .update({
        body,
        kind: payload.mode ?? 'post',
        isPrivate: payload.isPrivate ?? false,
        notifyMembers: payload.isPrivate ? false : payload.notifyMembers ?? true,
        tags: extractHashtags(body),
        createdAt: now,
      })
      .link({
        space: payload.spaceId,
        author: user.id,
        ...(payload.parentId ? { replyTo: payload.parentId } : {}),
        ...(payload.quoteId ? { quoteOf: payload.quoteId } : {}),
      }),
  );

  for (const [index, attachment] of attachments.entries()) {
    ops.push(
      db.tx.memoryAttachments[randomId()]
        .update({
          type: attachment.type,
          refId: attachment.refId,
          spaceId: payload.spaceId,
          mediaUrl: attachment.mediaUrl,
          mediaPath: attachment.mediaPath,
          mediaSize: numberOrZero(attachment.mediaSize),
          mediaWidth: attachment.mediaWidth,
          mediaHeight: attachment.mediaHeight,
          sortOrder: index,
          createdAt: now,
        })
        .link({ memory: memoryId }),
    );
  }

  if (pollOptions.length > 0) {
    const pollId = randomId();
    ops.push(
      db.tx.memoryPolls[pollId]
        .update({ question: payload.pollQuestion, createdAt: now })
        .link({ memory: memoryId }),
    );
    for (const [index, label] of pollOptions.entries()) {
      ops.push(
        db.tx.memoryPollOptions[randomId()]
          .update({ label, voteCount: 0, sortOrder: index, createdAt: now })
          .link({ poll: pollId }),
      );
    }
  }

  await db.transact(ops);
  return Response.json({ ok: true, memoryId });
}

function bearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  return match?.[1]?.trim() || null;
}

function validatePayload(payload: MemoryBody): { ok: true } | { ok: false; error: string } {
  if (!nonEmptyString(payload.spaceId)) return { ok: false, error: 'spaceId is required.' };
  if (!safeInstantId(payload.spaceId)) return { ok: false, error: 'spaceId is invalid.' };
  if (payload.isPrivate !== undefined && typeof payload.isPrivate !== 'boolean') {
    return { ok: false, error: 'isPrivate must be a boolean.' };
  }
  if (payload.notifyMembers !== undefined && typeof payload.notifyMembers !== 'boolean') {
    return { ok: false, error: 'notifyMembers must be a boolean.' };
  }
  if (payload.body !== undefined && typeof payload.body !== 'string') {
    return { ok: false, error: 'body must be a string.' };
  }
  if (nonEmptyString(payload.parentId) && !safeInstantId(payload.parentId)) {
    return { ok: false, error: 'parentId is invalid.' };
  }
  if (nonEmptyString(payload.quoteId) && !safeInstantId(payload.quoteId)) {
    return { ok: false, error: 'quoteId is invalid.' };
  }
  if (!['post', 'reply', 'quote'].includes(payload.mode ?? 'post')) {
    return { ok: false, error: 'mode is invalid.' };
  }
  if ((payload.mode ?? 'post') !== 'reply' && nonEmptyString(payload.parentId)) {
    return { ok: false, error: 'parentId is only valid for replies.' };
  }
  if ((payload.mode ?? 'post') !== 'quote' && nonEmptyString(payload.quoteId)) {
    return { ok: false, error: 'quoteId is only valid for quotes.' };
  }
  if (payload.attachments !== undefined && !Array.isArray(payload.attachments)) {
    return { ok: false, error: 'attachments must be an array.' };
  }
  if (Array.isArray(payload.attachments) && payload.attachments.some((attachment) => !isObjectRecord(attachment))) {
    return { ok: false, error: 'attachments must contain objects.' };
  }
  const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
  for (const attachment of attachments) {
    if (isEntityAttachmentType(attachment.type)) {
      if (!nonEmptyString(attachment.refId)) {
        return { ok: false, error: 'refId is required for entity attachments.' };
      }
      if (!safeInstantId(attachment.refId)) {
        return { ok: false, error: 'refId is invalid for entity attachments.' };
      }
    }
  }
  if (payload.pollOptions !== undefined && !Array.isArray(payload.pollOptions)) {
    return { ok: false, error: 'pollOptions must be an array.' };
  }
  if (Array.isArray(payload.pollOptions) && payload.pollOptions.some((option) => typeof option !== 'string')) {
    return { ok: false, error: 'pollOptions must contain strings.' };
  }
  const pollOptions = Array.isArray(payload.pollOptions) ? payload.pollOptions : [];
  const normalizedPollOptions = normalizePollOptions(pollOptions);
  if (pollOptions.length > 0) {
    if (!nonEmptyString(payload.pollQuestion)) {
      return { ok: false, error: 'pollQuestion is required for polls.' };
    }
    if (normalizedPollOptions.length < 2) {
      return { ok: false, error: 'Polls require at least two unique options.' };
    }
  }
  if (!nonEmptyString(payload.body) && attachments.length === 0 && normalizedPollOptions.length === 0) {
    return { ok: false, error: 'Memory must have text, media, or a poll.' };
  }
  if (payload.mode === 'reply' && !nonEmptyString(payload.parentId)) {
    return { ok: false, error: 'parentId is required for replies.' };
  }
  if (payload.mode === 'quote' && !nonEmptyString(payload.quoteId)) {
    return { ok: false, error: 'quoteId is required for quotes.' };
  }
  return { ok: true };
}

function normalizePayloadIds(payload: MemoryBody) {
  payload.spaceId = safeInstantId(payload.spaceId)!;
  const parentId = safeInstantId(payload.parentId);
  if (parentId) payload.parentId = parentId;
  const quoteId = safeInstantId(payload.quoteId);
  if (quoteId) payload.quoteId = quoteId;
  if (!Array.isArray(payload.attachments)) return;
  for (const attachment of payload.attachments) {
    const refId = safeInstantId(attachment.refId);
    if (refId) attachment.refId = refId;
  }
}

async function validateLinkedMemoryTargets(
  db: any,
  payload: MemoryBody,
  userId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const refs = linkedMemoryRefs(payload);
  if (refs.length === 0) return { ok: true };

  const result = await db.query({
    memories: {
      $: { where: idWhere(refs.map((ref) => ref.id)) },
      author: {},
      space: {
        memberships: {
          user: {},
        },
      },
    },
  });
  const rows = ((result as any)?.memories ?? (result as any)?.data?.memories ?? []) as any[];
  const byId = new Map(rows.map((row) => [row?.id, row]));

  for (const ref of refs) {
    const memory = byId.get(ref.id);
    if (!memory) {
      return { ok: false, status: 404, error: `${ref.label} memory not found.` };
    }
    const sourceSpace = firstRel(memory.space);
    const sourceAuthor = firstRel(memory.author);
    const memberIds = spaceMemberIds(sourceSpace);
    const isSourceMember = memberIds.has(userId);
    const isSourceAuthorMember =
      typeof sourceAuthor?.id === 'string' && memberIds.has(sourceAuthor.id);
    if (!sourceSpace?.id || !isSourceMember || !isSourceAuthorMember) {
      return { ok: false, status: 403, error: 'Forbidden' };
    }

    const sourceIsPrivate = memory.isPrivate === true;
    if (sourceSpace.kind === 'solo' && sourceAuthor?.id !== userId) {
      return { ok: false, status: 403, error: 'Forbidden' };
    }
    if (sourceIsPrivate && (sourceAuthor?.id !== userId || payload.isPrivate !== true)) {
      return { ok: false, status: 403, error: 'Forbidden' };
    }
    if (payload.isPrivate !== true && sourceSpace.id !== payload.spaceId) {
      return { ok: false, status: 403, error: `${ref.label} memory must belong to the target space.` };
    }
  }

  return { ok: true };
}

function linkedMemoryRefs(payload: MemoryBody): Array<{ id: string; label: string }> {
  const refs: Array<{ id: string; label: string }> = [];
  if (nonEmptyString(payload.parentId)) refs.push({ id: payload.parentId, label: 'Parent' });
  if (nonEmptyString(payload.quoteId) && payload.quoteId !== payload.parentId) {
    refs.push({ id: payload.quoteId, label: 'Quoted' });
  }
  return refs;
}

function idWhere(ids: string[]): Record<string, unknown> {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 1) return { id: uniqueIds[0] };
  return { or: uniqueIds.map((id) => ({ id })) };
}

function pathWhere(paths: string[]): Record<string, unknown> {
  const uniquePaths = Array.from(new Set(paths));
  if (uniquePaths.length === 1) return { path: uniquePaths[0] };
  return { or: uniquePaths.map((path) => ({ path })) };
}

function validateAttachment(
  attachment: AttachmentBody,
  userId: string,
  spaceId: string,
): { ok: true } | { ok: false; error: string } {
  if (!nonEmptyString(attachment.type)) return { ok: false, error: 'attachment type is required.' };
  if (!isMediaType(attachment.type)) {
    if (isEntityAttachmentType(attachment.type) && !nonEmptyString(attachment.refId)) {
      return { ok: false, error: 'refId is required for entity attachments.' };
    }
    if (isEntityAttachmentType(attachment.type)) return { ok: true };
    return { ok: false, error: 'attachment type is unsupported.' };
  }

  if (!nonEmptyString(attachment.mediaPath)) {
    return { ok: false, error: 'mediaPath is required for media attachments.' };
  }
  if (!nonEmptyString(attachment.mediaUrl)) {
    return { ok: false, error: 'mediaUrl is required for media attachments.' };
  }
  if (!isAbsoluteHttpUrl(attachment.mediaUrl)) {
    return { ok: false, error: 'mediaUrl must be an absolute http(s) URL.' };
  }
  if (!attachment.mediaPath.startsWith(`users/${userId}/spaces/${spaceId}/`)) {
    return { ok: false, error: 'mediaPath must be owned by the authenticated user and target space.' };
  }
  if (
    typeof attachment.mediaSize !== 'number' ||
    !Number.isFinite(attachment.mediaSize) ||
    attachment.mediaSize <= 0
  ) {
    return { ok: false, error: 'mediaSize must be positive.' };
  }
  if (!isOptionalPositiveNumber(attachment.mediaWidth)) {
    return { ok: false, error: 'mediaWidth must be a positive number.' };
  }
  if (!isOptionalPositiveNumber(attachment.mediaHeight)) {
    return { ok: false, error: 'mediaHeight must be a positive number.' };
  }
  return { ok: true };
}

function mediaAttachmentPaths(attachments: AttachmentBody[]): string[] {
  return attachments
    .filter((attachment) => isMediaType(attachment.type) && nonEmptyString(attachment.mediaPath))
    .map((attachment) => attachment.mediaPath!.trim());
}

function validateUploadedMediaRows(
  attachments: AttachmentBody[],
  files: unknown,
): { ok: true } | { ok: false; status: number; error: string } {
  const rows = Array.isArray(files) ? files : [];
  const filesByPath = new Map(
    rows
      .filter((file): file is { path: string; url?: unknown } =>
        typeof file?.path === 'string',
      )
      .map((file) => [file.path, file]),
  );

  for (const attachment of attachments) {
    if (!isMediaType(attachment.type)) continue;
    if (!nonEmptyString(attachment.mediaPath) || !nonEmptyString(attachment.mediaUrl)) continue;
    const file = filesByPath.get(attachment.mediaPath);
    if (!file) return { ok: false, status: 404, error: 'Uploaded media not found.' };
    if (file.url !== attachment.mediaUrl) {
      return { ok: false, status: 400, error: 'mediaUrl must match uploaded media.' };
    }
  }
  return { ok: true };
}

async function validateEntityAttachmentTargets(
  db: any,
  attachments: AttachmentBody[],
  spaceId: string,
  userId: string,
  targetSpaceKind: string | null | undefined,
  targetMemoryIsPrivate: boolean,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const refsByType = new Map<EntityAttachmentType, Set<string>>();
  for (const attachment of attachments) {
    if (!isEntityAttachmentType(attachment.type) || !nonEmptyString(attachment.refId)) continue;
    const refs = refsByType.get(attachment.type) ?? new Set<string>();
    refs.add(attachment.refId.trim());
    refsByType.set(attachment.type, refs);
  }
  if (refsByType.size === 0) return { ok: true };

  const query: Record<string, unknown> = {};
  for (const [type, refs] of refsByType.entries()) {
    query[ENTITY_ATTACHMENT_COLLECTIONS[type]] = {
      $: { where: idWhere(Array.from(refs)) },
      couple: {},
      ...(type === 'task' ? { list: { couple: {} } } : {}),
      [ENTITY_ATTACHMENT_OWNER_LINKS[type]]: {},
    };
  }

  const result = await db.query(query);
  for (const [type, refs] of refsByType.entries()) {
    const collection = ENTITY_ATTACHMENT_COLLECTIONS[type];
    const rows = ((result as any)?.[collection] ?? (result as any)?.data?.[collection] ?? []) as any[];
    const byId = new Map(rows.map((row) => [row?.id, row]));
    for (const refId of refs) {
      const row = byId.get(refId);
      if (!row) {
        return { ok: false, status: 404, error: `${ENTITY_ATTACHMENT_LABELS[type]} not found.` };
      }
      const rowSpace = firstRel(row.couple);
      let effectiveSpaceId = typeof rowSpace?.id === 'string' ? rowSpace.id : null;
      if (type === 'task') {
        const listSpace = firstRel(firstRel(row.list)?.couple);
        const listSpaceId = typeof listSpace?.id === 'string' ? listSpace.id : null;
        if (!listSpaceId || (effectiveSpaceId && effectiveSpaceId !== listSpaceId)) {
          return { ok: false, status: 403, error: 'Task must belong to the target space.' };
        }
        effectiveSpaceId = effectiveSpaceId ?? listSpaceId;
      }
      if (effectiveSpaceId !== spaceId) {
        return { ok: false, status: 403, error: `${ENTITY_ATTACHMENT_LABELS[type]} must belong to the target space.` };
      }
      const isPrivateAttachment = isPrivateEntityAttachment(type, row);
      if (isPrivateAttachment && !targetMemoryIsPrivate) {
        return { ok: false, status: 403, error: 'Private attachments require a private memory.' };
      }
      const ownerLink = ENTITY_ATTACHMENT_OWNER_LINKS[type];
      const ownerId = firstRel(row?.[ownerLink])?.id ?? null;
      const ownerlessPersonalLegacyAllowed =
        targetSpaceKind === 'solo' &&
        !ownerId &&
        OWNERLESS_PERSONAL_ENTITY_ATTACHMENTS.has(type);
      if (
        (targetSpaceKind === 'solo' || isPrivateAttachment) &&
        ownerId !== userId &&
        !ownerlessPersonalLegacyAllowed
      ) {
        return { ok: false, status: 403, error: 'Forbidden' };
      }
    }
  }

  return { ok: true };
}

function isPrivateEntityAttachment(type: EntityAttachmentType, row: any): boolean {
  if (type === 'plan' || type === 'checkIn' || type === 'journal') return row?.isPrivate === true;
  if (type === 'timetable') return row?.share === 'solo';
  return false;
}

function isMediaType(type: unknown): boolean {
  return type === 'image' || type === 'gif' || type === 'video';
}

function isAbsoluteHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isEntityAttachmentType(type: unknown): type is EntityAttachmentType {
  return typeof type === 'string' && type in ENTITY_ATTACHMENT_COLLECTIONS;
}

function normalizePollOptions(options: string[]): string[] {
  const trimmed = options.map((option) => option.trim()).filter(Boolean);
  const normalizedLabels = new Set(trimmed.map((option) => option.toLocaleLowerCase()));
  return normalizedLabels.size === trimmed.length ? trimmed : [];
}

function extractHashtags(body: string): string[] {
  const matches = body.match(HASHTAG_RE);
  if (!matches) return [];
  return [...new Set(matches.map((match) => match.slice(1).toLowerCase()))];
}

function spaceMemberIds(space: any): Set<string> {
  const ids = new Set<string>();
  for (const membership of Array.isArray(space?.memberships) ? space.memberships : []) {
    const user = firstRel(membership?.user);
    if (typeof user?.id === 'string') ids.add(user.id);
  }
  return ids;
}

function attachmentBytesUsed(memories: unknown): number {
  if (!Array.isArray(memories)) return 0;
  let total = 0;
  for (const memory of memories) {
    const attachments = (memory as { attachments?: unknown } | null)?.attachments;
    if (!Array.isArray(attachments)) continue;
    for (const attachment of attachments) {
      total += numberOrZero((attachment as { mediaSize?: unknown } | null)?.mediaSize);
    }
  }
  return total;
}

function sumAttachmentBytes(attachments: AttachmentBody[]): number {
  return attachments.reduce((total, attachment) => total + numberOrZero(attachment.mediaSize), 0);
}

function materializedQuotaBytesUsed(mediaQuota: unknown): number {
  const rows = Array.isArray(mediaQuota) ? mediaQuota : mediaQuota ? [mediaQuota] : [];
  return rows.reduce((max, quota) => {
    const bytes = numberOrZero((quota as { bytesUsed?: unknown } | null)?.bytesUsed);
    return Math.max(max, bytes);
  }, 0);
}

function numberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function isOptionalPositiveNumber(value: unknown): boolean {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value) && value > 0);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstRow(value: unknown): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function firstRel(value: unknown): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function randomId(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}
