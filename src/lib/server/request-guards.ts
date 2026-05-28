import { init } from '@instantdb/admin';

/**
 * Shared hardening for the expo-router API routes (SEC-5).
 *
 * These routes accept JSON bodies and talk to InstantDB via the admin SDK.
 * This module centralizes three cross-cutting concerns so each route stays
 * behaviorally identical but consistently guarded:
 *
 *   1. Body size cap        -> 413 when a request body exceeds a sane limit.
 *   2. Content-Type guard   -> 415 when a JSON route receives non-JSON.
 *   3. Admin `init()` reuse  -> a single memoized client per credential pair,
 *                              instead of re-initializing on every request.
 *
 * SECURITY TODO: rate limiting requires shared infra (KV/Redis); not
 * implemented here. A naive in-memory limiter in a serverless route is useless
 * (each cold start / instance has its own memory) and misleading.
 *
 * SECURITY NOTE: any caller presenting a valid InstantDB refresh token is
 * accepted as Bearer — that is by design. The token is validated as a real
 * Instant refresh token via `db.auth.verifyToken`; finer-grained authorization
 * (who may read/write which rows) is enforced by `instant.perms.ts` plus the
 * per-route ownership/membership checks. There is no additional app-level
 * authz layer in these handlers beyond those.
 */

/** Default maximum JSON body size: 1 MB. */
export const DEFAULT_MAX_JSON_BODY_BYTES = 1_024 * 1_024;

export type ReadJsonBodyResult =
  | { ok: true; body: unknown }
  | { ok: false; response: Response };

/**
 * Validate Content-Type and body size, then parse the JSON body.
 *
 * - Rejects a non-`application/json` Content-Type with 415 BEFORE reading the
 *   body, for routes that expect JSON.
 * - Rejects bodies larger than `maxBytes` with 413, using both the
 *   `Content-Length` header (fast path) and the actual decoded byte length
 *   (so a missing or dishonest header cannot bypass the cap).
 * - On a malformed-but-correctly-typed JSON body, resolves to `{ body: {} }`,
 *   matching the previous per-route `parseJson` behavior so downstream
 *   field-level validators still produce their existing 400 responses.
 */
export async function readJsonBody(
  request: Request,
  options: { maxBytes?: number } = {},
): Promise<ReadJsonBodyResult> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_JSON_BODY_BYTES;

  if (!hasJsonContentType(request)) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Content-Type must be application/json.' },
        { status: 415 },
      ),
    };
  }

  const declaredLength = Number(request.headers.get('Content-Length') ?? '');
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, response: payloadTooLarge() };
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    // Could not read the body at all; treat as an empty JSON object so the
    // route's own validators decide the outcome (matches prior behavior).
    return { ok: true, body: {} };
  }

  if (byteLength(raw) > maxBytes) {
    return { ok: false, response: payloadTooLarge() };
  }

  return { ok: true, body: parseJsonObject(raw) };
}

function hasJsonContentType(request: Request): boolean {
  const contentType = request.headers.get('Content-Type');
  if (!contentType) return false;
  // Allow charset / boundary parameters, e.g. "application/json; charset=utf-8".
  return contentType.split(';')[0].trim().toLowerCase() === 'application/json';
}

function payloadTooLarge(): Response {
  return Response.json({ error: 'Request body is too large.' }, { status: 413 });
}

function byteLength(value: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length;
  }
  // Fallback for runtimes without TextEncoder.
  return value.length;
}

function parseJsonObject(raw: string): unknown {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Memoized admin clients keyed by `${appId}::${adminToken}`.
 *
 * SEC-5: previously every request called `init()`, re-creating the admin client
 * on each invocation. We reuse one client per credential pair across requests
 * (guarding against re-init) while keeping behavior identical.
 */
const adminDbCache = new Map<string, ReturnType<typeof init>>();

export function getAdminDb(appId: string, adminToken: string): ReturnType<typeof init> {
  const cacheKey = `${appId}::${adminToken}`;
  const existing = adminDbCache.get(cacheKey);
  if (existing) return existing;

  const db = init({ appId, adminToken });
  adminDbCache.set(cacheKey, db);
  return db;
}
