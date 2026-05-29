import { safeInstantId } from '@/src/lib/instant-id';
import { getAdminDb, readJsonBody } from '@/src/lib/server/request-guards';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

type PushBody = {
  kind?: string;
  spaceId?: string;
  title?: string;
  body?: string;
  route?: string;
  eventKind?: string;
  entityId?: string;
  entityTitle?: string;
  mood?: string;
  memoryId?: string;
  sourceMemoryId?: string;
  routeMemoryId?: string;
};

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  channelId: 'default';
  data: Record<string, unknown>;
};

// SECURITY TODO: rate limiting requires shared infra (KV/Redis); not implemented here.
export async function POST(request: Request) {
  const token = bearerToken(request);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const appId = process.env.EXPO_PUBLIC_INSTANT_APP_ID;
  const adminToken = process.env.INSTANT_ADMIN_TOKEN;
  if (!appId || !adminToken) {
    return Response.json({ error: 'Push relay is not configured.' }, { status: 503 });
  }

  // SEC-5: enforce JSON Content-Type (415) and body size cap (413) before parsing.
  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;
  const payload = parsedBody.body as PushBody;

  const db = getAdminDb(appId, adminToken);
  const user = await db.auth.verifyToken(token).catch(() => null);
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (payload.kind === 'spaceMutation') {
    const validation = validateSpaceMutationPayload(payload);
    if (!validation.ok) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    normalizeSpaceMutationPayloadIds(payload);
    return handleSpaceMutationPush(db, user.id, payload);
  }

  if (isMemoryNotificationKind(payload.kind)) {
    const validation = validateMemoryNotificationPayload(payload);
    if (!validation.ok) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    normalizeMemoryNotificationPayloadIds(payload);
    return handleMemoryNotificationPush(db, user.id, payload);
  }

  return Response.json({ error: 'Unsupported push kind.' }, { status: 400 });
}

async function handleSpaceMutationPush(db: any, userId: string, payload: PushBody) {
  const result = await db.query({
    spaces: {
      $: { where: { id: payload.spaceId } },
      memberships: {
        user: {
          devices: {},
        },
      },
    },
  });
  const space = firstRow((result as any)?.spaces ?? (result as any)?.data?.spaces);
  if (!space) return Response.json({ error: 'Space not found.' }, { status: 404 });
  if (!spaceMemberIds(space).has(userId)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (space.kind === 'solo') {
    return Response.json({ ok: true, sent: 0 });
  }
  let templateData: SpaceMutationTemplateData = {};
  if (payload.eventKind === 'reminderCreated' || payload.eventKind === 'planCreated') {
    if (!nonEmptyString(payload.entityId)) {
      return Response.json({ error: 'entityId is required.' }, { status: 400 });
    }
    const entityCheck = await verifySpaceMutationEntity(db, {
      eventKind: payload.eventKind,
      entityId: payload.entityId,
      spaceId: payload.spaceId!,
      userId,
    });
    if (!entityCheck.ok) {
      return Response.json({ error: entityCheck.error }, { status: entityCheck.status });
    }
    templateData = { entityTitle: entityCheck.entityTitle };
  }
  if (payload.eventKind === 'checkInCreated') {
    if (!nonEmptyString(payload.entityId)) {
      return Response.json({ error: 'entityId is required.' }, { status: 400 });
    }
    const entityCheck = await verifySpaceMutationEntity(db, {
      eventKind: payload.eventKind,
      entityId: payload.entityId,
      spaceId: payload.spaceId!,
      userId,
    });
    if (!entityCheck.ok) {
      return Response.json({ error: entityCheck.error }, { status: entityCheck.status });
    }
    templateData = { mood: entityCheck.mood };
  }
  if (payload.eventKind === 'memoryCreated' || payload.eventKind === 'memoryReply') {
    const memoryCheck = await verifySpaceMutationMemory(db, {
      eventKind: payload.eventKind,
      memoryId: payload.memoryId!,
      spaceId: payload.spaceId!,
      userId,
    });
    if (!memoryCheck.ok) {
      return Response.json({ error: memoryCheck.error }, { status: memoryCheck.status });
    }
  }

  const tokens = pushTokensForSpace(space, userId);
  if (tokens.length === 0) {
    return Response.json({ ok: true, sent: 0 });
  }

  const template = spaceMutationTemplate(
    payload,
    displayNameForUser(spaceMemberUser(space, userId)),
    templateData,
  );
  const messages: ExpoMessage[] = tokens.map((to) => ({
    to,
    title: template.title,
    body: template.body,
    sound: 'default',
    channelId: 'default',
    data: { route: template.route },
  }));

  const delivery = await sendExpoPushMessages(messages);
  if (!delivery.ok) {
    return Response.json({ error: delivery.error }, { status: delivery.status });
  }

  return Response.json({ ok: true, sent: messages.length });
}

async function handleMemoryNotificationPush(db: any, userId: string, payload: PushBody) {
  const result = await db.query({
    memories: {
      $: { where: { id: payload.sourceMemoryId } },
      author: {
        devices: {},
      },
      reactions: {
        user: {},
      },
      space: {
        memberships: {
          user: {},
        },
      },
    },
  });
  const sourceMemory = firstRow((result as any)?.memories ?? (result as any)?.data?.memories);
  if (!sourceMemory) return Response.json({ error: 'Memory not found.' }, { status: 404 });
  if (sourceMemory.isPrivate === true) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const author = firstRel(sourceMemory.author);
  const space = firstRel(sourceMemory.space);
  if (!author?.id || !space?.id) {
    return Response.json({ error: 'Memory target is incomplete.' }, { status: 404 });
  }
  if (space.kind === 'solo') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const memberIds = spaceMemberIds(space);
  if (!memberIds.has(userId)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!memberIds.has(author.id)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (author.id === userId) {
    return Response.json({ ok: true, sent: 0 });
  }
  if (payload.kind === 'memoryReaction' && !sourceMemoryHasReaction(sourceMemory, userId)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const routeMemoryId = routeMemoryIdForPayload(payload);
  if (payload.kind !== 'memoryReaction') {
    const routeCheck = await verifyRouteMemory(db, {
      routeMemoryId,
      sourceSpaceId: space.id,
      userId,
      expectedKind: payload.kind === 'memoryRepost' ? 'repost' : 'quote',
    });
    if (!routeCheck.ok) {
      return Response.json({ error: routeCheck.error }, { status: routeCheck.status });
    }
  }

  const actorName = displayNameForUser(spaceMemberUser(space, userId));
  const template = memoryTemplate(payload.kind!, actorName, routeMemoryId);
  const tokens = pushTokensForUser(author);
  if (tokens.length === 0) {
    return Response.json({ ok: true, sent: 0 });
  }

  const messages: ExpoMessage[] = tokens.map((to) => ({
    to,
    title: template.title,
    body: template.body,
    sound: 'default',
    channelId: 'default',
    data: { route: template.route },
  }));

  const delivery = await sendExpoPushMessages(messages);
  if (!delivery.ok) {
    return Response.json({ error: delivery.error }, { status: delivery.status });
  }

  return Response.json({ ok: true, sent: messages.length });
}

async function sendExpoPushMessages(
  messages: ExpoMessage[],
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  try {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    if (!response.ok) {
      return { ok: false, status: 502, error: 'Push delivery failed.' };
    }
    const body = await parseOptionalJsonResponse(response);
    if (hasExpoTicketErrors(body)) {
      return { ok: false, status: 502, error: 'Push delivery failed.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, status: 502, error: 'Push delivery failed.' };
  }
}

async function parseOptionalJsonResponse(response: Response): Promise<unknown> {
  if (typeof response.json !== 'function') return null;
  return response.json().catch(() => null);
}

function hasExpoTicketErrors(body: unknown): boolean {
  const tickets = (body as { data?: unknown } | null)?.data;
  if (!Array.isArray(tickets)) return false;
  return tickets.some((ticket) => (ticket as { status?: unknown } | null)?.status === 'error');
}

function bearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  return match?.[1]?.trim() || null;
}

function validateSpaceMutationPayload(payload: PushBody): { ok: true } | { ok: false; error: string } {
  if (!nonEmptyString(payload.spaceId)) {
    return { ok: false, error: 'spaceId is required.' };
  }
  if (!safeInstantId(payload.spaceId)) {
    return { ok: false, error: 'spaceId is invalid.' };
  }
  if (!isSpaceMutationEventKind(payload.eventKind)) {
    return { ok: false, error: 'eventKind is required.' };
  }
  if (
    (payload.eventKind === 'reminderCreated' ||
      payload.eventKind === 'planCreated' ||
      payload.eventKind === 'checkInCreated') &&
    !nonEmptyString(payload.entityId)
  ) {
    return { ok: false, error: 'entityId is required.' };
  }
  if (
    (payload.eventKind === 'reminderCreated' ||
      payload.eventKind === 'planCreated' ||
      payload.eventKind === 'checkInCreated') &&
    !safeInstantId(payload.entityId)
  ) {
    return { ok: false, error: 'entityId is invalid.' };
  }
  if (
    (payload.eventKind === 'memoryCreated' || payload.eventKind === 'memoryReply') &&
    !nonEmptyString(payload.memoryId)
  ) {
    return { ok: false, error: 'memoryId is required.' };
  }
  if (
    (payload.eventKind === 'memoryCreated' || payload.eventKind === 'memoryReply') &&
    !safeInstantId(payload.memoryId)
  ) {
    return { ok: false, error: 'memoryId is invalid.' };
  }
  if (payload.mood !== undefined && typeof payload.mood !== 'string') {
    return { ok: false, error: 'mood must be a string.' };
  }
  return { ok: true };
}

function isSpaceMutationEventKind(kind: unknown): kind is
  | 'reminderCreated'
  | 'planCreated'
  | 'checkInCreated'
  | 'memoryCreated'
  | 'memoryReply' {
  return (
    kind === 'reminderCreated' ||
    kind === 'planCreated' ||
    kind === 'checkInCreated' ||
    kind === 'memoryCreated' ||
    kind === 'memoryReply'
  );
}

function validateMemoryNotificationPayload(
  payload: PushBody,
): { ok: true } | { ok: false; error: string } {
  if (!nonEmptyString(payload.sourceMemoryId)) {
    return { ok: false, error: 'sourceMemoryId is required.' };
  }
  if (!safeInstantId(payload.sourceMemoryId)) {
    return { ok: false, error: 'sourceMemoryId is invalid.' };
  }
  if (
    (payload.kind === 'memoryRepost' || payload.kind === 'memoryQuote') &&
    !nonEmptyString(payload.routeMemoryId)
  ) {
    return { ok: false, error: 'routeMemoryId is required.' };
  }
  if (
    (payload.kind === 'memoryRepost' || payload.kind === 'memoryQuote') &&
    !safeInstantId(payload.routeMemoryId)
  ) {
    return { ok: false, error: 'routeMemoryId is invalid.' };
  }
  return { ok: true };
}

function normalizeSpaceMutationPayloadIds(payload: PushBody) {
  payload.spaceId = safeInstantId(payload.spaceId)!;
  const entityId = safeInstantId(payload.entityId);
  if (entityId) payload.entityId = entityId;
  const memoryId = safeInstantId(payload.memoryId);
  if (memoryId) payload.memoryId = memoryId;
}

function normalizeMemoryNotificationPayloadIds(payload: PushBody) {
  payload.sourceMemoryId = safeInstantId(payload.sourceMemoryId)!;
  const routeMemoryId = safeInstantId(payload.routeMemoryId);
  if (routeMemoryId) payload.routeMemoryId = routeMemoryId;
}

function isMemoryNotificationKind(kind: unknown): kind is 'memoryReaction' | 'memoryRepost' | 'memoryQuote' {
  return kind === 'memoryReaction' || kind === 'memoryRepost' || kind === 'memoryQuote';
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function firstRow(value: unknown): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function firstRel(value: unknown): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function spaceMemberIds(space: any): Set<string> {
  const ids = new Set<string>();
  for (const membership of Array.isArray(space?.memberships) ? space.memberships : []) {
    const user = firstRel(membership?.user);
    if (typeof user?.id === 'string') ids.add(user.id);
  }
  return ids;
}

function spaceMemberUser(space: any, userId: string): any | null {
  for (const membership of Array.isArray(space?.memberships) ? space.memberships : []) {
    const user = firstRel(membership?.user);
    if (user?.id === userId) return user;
  }
  return null;
}

function pushTokensForSpace(space: any, excludeUserId: string): string[] {
  const tokens = new Set<string>();
  for (const membership of Array.isArray(space?.memberships) ? space.memberships : []) {
    const user = firstRel(membership?.user);
    if (!user || user.id === excludeUserId) continue;
    const devices = Array.isArray(user.devices) ? user.devices : [];
    for (const device of devices) {
      if (isExpoPushToken(device?.expoPushToken)) {
        tokens.add(device.expoPushToken);
      }
    }
  }
  return [...tokens];
}

function pushTokensForUser(user: any): string[] {
  const tokens = new Set<string>();
  const devices = Array.isArray(user?.devices) ? user.devices : [];
  for (const device of devices) {
    if (isExpoPushToken(device?.expoPushToken)) {
      tokens.add(device.expoPushToken);
    }
  }
  return [...tokens];
}

function sourceMemoryHasReaction(memory: any, userId: string): boolean {
  const reactions: any[] = Array.isArray(memory?.reactions) ? memory.reactions : [];
  return reactions.some((reaction) => firstRel(reaction?.user)?.id === userId);
}

function isExpoPushToken(token: unknown): token is string {
  return (
    typeof token === 'string' &&
    (token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken'))
  );
}

function displayNameForUser(user: any): string {
  const displayName = typeof user?.displayName === 'string' ? user.displayName.trim() : '';
  if (displayName) return displayName;
  const email = typeof user?.email === 'string' ? user.email : '';
  const emailName = email.split('@')[0]?.trim();
  return emailName || 'Someone';
}

function routeMemoryIdForPayload(payload: PushBody): string {
  return payload.kind === 'memoryReaction'
    ? payload.sourceMemoryId!
    : payload.routeMemoryId!;
}

function memoryTemplate(kind: string, actorName: string, routeMemoryId: string): {
  title: string;
  body: string;
  route: string;
} {
  if (kind === 'memoryReaction') {
    return {
      title: 'New reaction',
      body: `${actorName} reacted to your memory`,
      route: `/(tabs)/memories/${routeMemoryId}`,
    };
  }
  if (kind === 'memoryRepost') {
    return {
      title: 'Memory reposted',
      body: `${actorName} reposted your memory`,
      route: `/(tabs)/memories/${routeMemoryId}`,
    };
  }
  return {
    title: 'Memory quoted',
    body: `${actorName} quoted your memory`,
    route: `/(tabs)/memories/${routeMemoryId}`,
  };
}

type SpaceMutationTemplateData = {
  entityTitle?: string;
  mood?: string;
};

function spaceMutationTemplate(
  payload: PushBody,
  actorName: string,
  data: SpaceMutationTemplateData = {},
): {
  title: string;
  body: string;
  route: string;
} {
  if (payload.eventKind === 'reminderCreated') {
    return {
      title: actorName,
      body: `added a reminder: ${data.entityTitle ?? payload.entityTitle}`,
      route: '/(tabs)/us/reminders',
    };
  }
  if (payload.eventKind === 'planCreated') {
    return {
      title: actorName,
      body: `added a plan: ${data.entityTitle ?? payload.entityTitle}`,
      route: '/(tabs)/us/plans',
    };
  }
  if (payload.eventKind === 'checkInCreated') {
    const mood = typeof data.mood === 'string' && data.mood.trim()
      ? data.mood.trim()
      : null;
    return {
      title: actorName,
      body: mood ? `checked in: ${mood}` : 'checked in today',
      route: '/(tabs)/us/checkins',
    };
  }
  if (payload.eventKind === 'memoryReply') {
    return {
      title: 'New memory reply',
      body: `${actorName} replied to a memory`,
      route: `/(tabs)/memories/${payload.memoryId}`,
    };
  }
  return {
    title: 'New memory',
    body: `${actorName} added a memory`,
    route: `/(tabs)/memories/${payload.memoryId}`,
  };
}

async function verifyRouteMemory(db: any, args: {
  routeMemoryId: string;
  sourceSpaceId: string;
  userId: string;
  expectedKind: 'repost' | 'quote';
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const result = await db.query({
    memories: {
      $: { where: { id: args.routeMemoryId } },
      author: {},
      space: {},
    },
  });
  const memory = firstRow((result as any)?.memories ?? (result as any)?.data?.memories);
  if (!memory) return { ok: false, status: 404, error: 'Route memory not found.' };
  if (memory.isPrivate === true) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  const author = firstRel(memory.author);
  const space = firstRel(memory.space);
  if (author?.id !== args.userId || space?.id !== args.sourceSpaceId) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  if (memory.kind !== args.expectedKind) {
    return { ok: false, status: 400, error: 'Route memory kind does not match push kind.' };
  }
  return { ok: true };
}

async function verifySpaceMutationMemory(db: any, args: {
  eventKind: 'memoryCreated' | 'memoryReply';
  memoryId: string;
  spaceId: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const result = await db.query({
    memories: {
      $: { where: { id: args.memoryId } },
      author: {},
      space: {},
    },
  });
  const memory = firstRow((result as any)?.memories ?? (result as any)?.data?.memories);
  if (!memory) return { ok: false, status: 404, error: 'Memory not found.' };
  if (memory.isPrivate === true) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  const author = firstRel(memory.author);
  const space = firstRel(memory.space);
  if (author?.id !== args.userId || space?.id !== args.spaceId) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  if (
    (args.eventKind === 'memoryReply' && memory.kind !== 'reply') ||
    (args.eventKind === 'memoryCreated' && memory.kind === 'reply')
  ) {
    return { ok: false, status: 400, error: 'Memory kind does not match push event.' };
  }
  return { ok: true };
}

async function verifySpaceMutationEntity(db: any, args: {
  eventKind: 'reminderCreated' | 'planCreated' | 'checkInCreated';
  entityId: string;
  spaceId: string;
  userId: string;
}): Promise<
  | { ok: true; entityTitle?: string; mood?: string }
  | { ok: false; status: number; error: string }
> {
  const query = spaceMutationEntityQuery(args.eventKind, args.entityId);
  const result = await db.query(query);
  const collection = spaceMutationEntityCollection(args.eventKind);
  const row = firstRow((result as any)?.[collection] ?? (result as any)?.data?.[collection]);
  if (!row) return { ok: false, status: 404, error: 'Entity not found.' };

  const ownerLink = args.eventKind === 'checkInCreated' ? 'author' : 'createdBy';
  const owner = firstRel(row?.[ownerLink]);
  const space = firstRel(row?.couple);
  if (owner?.id !== args.userId || space?.id !== args.spaceId) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  if ((args.eventKind === 'planCreated' || args.eventKind === 'checkInCreated') && row.isPrivate === true) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  if (args.eventKind === 'checkInCreated') {
    return { ok: true, mood: typeof row.mood === 'string' ? row.mood : undefined };
  }
  return { ok: true, entityTitle: typeof row.title === 'string' ? row.title : '' };
}

function spaceMutationEntityQuery(
  eventKind: 'reminderCreated' | 'planCreated' | 'checkInCreated',
  entityId: string,
): Record<string, unknown> {
  const relation = eventKind === 'checkInCreated' ? 'author' : 'createdBy';
  return {
    [spaceMutationEntityCollection(eventKind)]: {
      $: { where: { id: entityId } },
      couple: {},
      [relation]: {},
    },
  };
}

function spaceMutationEntityCollection(
  eventKind: 'reminderCreated' | 'planCreated' | 'checkInCreated',
): 'reminders' | 'plans' | 'checkIns' {
  if (eventKind === 'reminderCreated') return 'reminders';
  if (eventKind === 'planCreated') return 'plans';
  return 'checkIns';
}
