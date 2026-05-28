import { db } from './instant';
import type { SpaceMode } from './session';

export type MemoryNotificationKind = 'memoryReaction' | 'memoryRepost' | 'memoryQuote';
export type SpaceNotificationEventKind =
  | 'reminderCreated'
  | 'planCreated'
  | 'checkInCreated'
  | 'memoryCreated'
  | 'memoryReply';

// SEC-1: Whether we've already logged that the trusted relay is unavailable, so
// we warn once instead of spamming on every notification attempt.
let warnedRelayUnavailable = false;

function warnRelayUnavailable(fn: string): void {
  if (warnedRelayUnavailable) return;
  warnedRelayUnavailable = true;
  console.warn(
    `[push] ${fn}: trusted push relay unavailable (EXPO_PUBLIC_API_URL unset, non-https, or no session). ` +
      'Skipping push — the insecure direct-to-Expo fallback was removed for security.',
  );
}

export async function sendMemoryNotificationViaRelay(args: {
  kind: MemoryNotificationKind;
  sourceMemoryId: string;
  routeMemoryId?: string;
}): Promise<boolean> {
  const apiBase = apiBaseUrl();
  if (!apiBase || typeof (db as any).getAuth !== 'function') return false;

  const auth = await (db as any).getAuth().catch(() => null);
  const token = auth?.refresh_token;
  if (!token) return false;

  const response = await fetch(`${apiBase}/api/push`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      kind: args.kind,
      sourceMemoryId: args.sourceMemoryId,
      routeMemoryId: args.routeMemoryId,
    }),
  });
  if (!response.ok) {
    throw new Error('Trusted push relay failed.');
  }
  return true;
}

/**
 * Fan out a push to every member of `spaceId` except `excludeUserId`.
 *
 * Delivery ALWAYS goes through the trusted server relay (`POST /api/push`),
 * which authenticates the caller and enforces membership/ownership checks
 * server-side. Best-effort: never throws.
 *
 * SEC-1: There is intentionally NO client-side fallback that POSTs push
 * payloads directly to Expo. Such a fallback bypasses every server check and
 * lets anyone spoof pushes. `EXPO_PUBLIC_API_URL` is required in production, so
 * when the relay base URL is unavailable (or HTTPS validation fails) we no-op
 * safely and log once instead of contacting Expo directly.
 *
 * Skip when `space.kind === 'solo'` — there's nobody else to notify (the
 * server relay also enforces this).
 */
export async function sendPushToSpace(args: {
  spaceId: string;
  excludeUserId: string;
  title: string;
  body: string;
  eventKind?: SpaceNotificationEventKind;
  entityId?: string;
  entityTitle?: string;
  mood?: string;
  memoryId?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  try {
    if (await sendViaPushRelay(args)) return;
    warnRelayUnavailable('sendPushToSpace');
  } catch (e) {
    console.warn('[push] sendPushToSpace failed', e);
  }
}

async function sendViaPushRelay(args: {
  spaceId: string;
  title: string;
  body: string;
  eventKind?: SpaceNotificationEventKind;
  entityId?: string;
  entityTitle?: string;
  mood?: string;
  memoryId?: string;
  data?: Record<string, unknown>;
}): Promise<boolean> {
  const apiBase = apiBaseUrl();
  if (!apiBase || typeof (db as any).getAuth !== 'function') return false;
  if (!args.eventKind) {
    throw new Error('Trusted push relay requires a typed space notification event.');
  }

  const auth = await (db as any).getAuth().catch(() => null);
  const token = auth?.refresh_token;
  if (!token) return false;

  const response = await fetch(`${apiBase}/api/push`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      kind: 'spaceMutation',
      spaceId: args.spaceId,
      eventKind: args.eventKind,
      entityId: args.entityId,
      entityTitle: args.entityTitle,
      mood: args.mood,
      memoryId: args.memoryId,
    }),
  });
  if (!response.ok) {
    throw new Error('Trusted push relay failed.');
  }
  return true;
}

/**
 * Resolve the trusted relay base URL.
 *
 * SEC-7: The InstantDB `refresh_token` is sent as a Bearer to this base, so it
 * must never traverse plaintext http to a remote host. We require `https:`,
 * with a narrow exception for `http://localhost` / `http://127.0.0.1` during
 * local development. A non-https remote URL is rejected (returns null) so the
 * caller fails safe rather than leaking the token.
 */
function apiBaseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    console.warn('[push] EXPO_PUBLIC_API_URL is not a valid URL; refusing to use it.');
    return null;
  }

  const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocalhost)) {
    console.warn('[push] EXPO_PUBLIC_API_URL must use https (http allowed only for localhost); refusing to use it.');
    return null;
  }

  return raw.replace(/\/+$/, '');
}

/**
 * Deliver a single-user push via the trusted server relay.
 *
 * SEC-1: The previous implementation queried device tokens client-side and
 * POSTed straight to Expo whenever the relay base URL was missing. That path
 * bypassed all server authentication/authorization and let any client spoof
 * pushes to arbitrary users, so it has been removed entirely.
 *
 * Per-user notifications (memory reaction/repost/quote) flow through
 * `sendMemoryNotificationViaRelay` -> `POST /api/push`, which derives the
 * recipient and authorizes the sender server-side. This function is only ever
 * reached as the legacy fallback after the trusted relay declined (no relay
 * base URL configured). Since `EXPO_PUBLIC_API_URL` is required in production,
 * it now no-ops safely and logs once rather than contacting Expo directly.
 */
export async function sendPushToUser(args: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  void args;
  warnRelayUnavailable('sendPushToUser');
}

/**
 * Convenience wrapper for hook code: skips solo spaces and missing ids,
 * forwards `route` as `data.route` so taps deep-link via PushBootstrap.
 */
export async function notifySpaceMutation(args: {
  spaceId: string | null | undefined;
  spaceKind: SpaceMode | null | undefined;
  excludeUserId: string | null | undefined;
  title: string;
  body: string;
  eventKind: SpaceNotificationEventKind;
  entityId?: string;
  entityTitle?: string;
  mood?: string;
  memoryId?: string;
  route?: string;
}): Promise<void> {
  if (!args.spaceId || !args.excludeUserId) return;
  if (args.spaceKind === 'solo' || !args.spaceKind) return;
  await sendPushToSpace({
    spaceId: args.spaceId,
    excludeUserId: args.excludeUserId,
    title: args.title,
    body: args.body,
    eventKind: args.eventKind,
    entityId: args.entityId,
    entityTitle: args.entityTitle,
    mood: args.mood,
    memoryId: args.memoryId,
    data: args.route ? { route: args.route } : undefined,
  });
}
