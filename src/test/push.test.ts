import { afterEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  queryOnce: vi.fn(),
  getAuth: vi.fn(),
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
}));

import {
  sendMemoryNotificationViaRelay,
  sendPushToSpace,
  sendPushToUser,
} from '@/src/lib/push';

describe('push delivery', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  // SEC-1: the insecure direct-to-Expo fallback was removed. When no trusted
  // relay base URL is configured, single-user sends must no-op and NEVER query
  // device tokens or contact Expo directly.
  it('does not query devices or contact Expo when no relay base URL is configured (sendPushToUser)', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await sendPushToUser({
      userId: 'user-1',
      title: 'Hello',
      body: 'Test push',
      data: { route: '/notifications' },
    });

    expect(dbMock.queryOnce).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // SEC-1: space fan-out without a relay base URL must also no-op rather than
  // falling back to a client-side device-token lookup + direct Expo POST.
  it('does not query devices or contact Expo when no relay base URL is configured (sendPushToSpace)', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await sendPushToSpace({
      spaceId: 'shared-1',
      excludeUserId: 'sender',
      title: 'Shared update',
      body: 'A reminder changed',
      eventKind: 'reminderCreated',
      entityId: 'reminder-1',
      entityTitle: 'Buy milk',
      data: { route: '/notifications' },
    });

    expect(dbMock.queryOnce).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // SEC-7: a non-https remote API base URL must be refused so the InstantDB
  // refresh token never travels over plaintext http. The relay is treated as
  // unavailable, so we fall through to the no-op (no fetch).
  it('refuses a non-https remote relay URL and does not send the bearer token over http', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'http://pacto.example.test');
    dbMock.getAuth.mockResolvedValue({ refresh_token: 'refresh-token' });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await sendPushToSpace({
      spaceId: 'shared-1',
      excludeUserId: 'sender',
      title: 'Shared update',
      body: 'A reminder changed',
      eventKind: 'reminderCreated',
      entityId: 'reminder-1',
      entityTitle: 'Buy milk',
      data: { route: '/notifications' },
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  // SEC-7: http is allowed for localhost during local development.
  it('allows http://localhost for the trusted relay during development', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'http://localhost:8081');
    dbMock.getAuth.mockResolvedValueOnce({ refresh_token: 'refresh-token' });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await sendPushToSpace({
      spaceId: 'shared-1',
      excludeUserId: 'sender',
      title: 'Shared update',
      body: 'A reminder changed',
      eventKind: 'reminderCreated',
      entityId: 'reminder-1',
      entityTitle: 'Buy milk',
      data: { route: '/notifications' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8081/api/push',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('uses the trusted push relay for space fan-out when an API base URL is configured', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://pacto.example.test');
    dbMock.getAuth.mockResolvedValueOnce({ refresh_token: 'refresh-token' });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await sendPushToSpace({
      spaceId: 'shared-1',
      excludeUserId: 'sender',
      title: 'Shared update',
      body: 'A reminder changed',
      eventKind: 'reminderCreated',
      entityId: 'reminder-1',
      entityTitle: 'Buy milk',
      data: { route: '/notifications' },
    });

    expect(dbMock.queryOnce).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://pacto.example.test/api/push',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer refresh-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          kind: 'spaceMutation',
          spaceId: 'shared-1',
          eventKind: 'reminderCreated',
          entityId: 'reminder-1',
          entityTitle: 'Buy milk',
        }),
      }),
    );
  });

  it('does not silently accept failed trusted space relay responses', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://pacto.example.test');
    dbMock.getAuth.mockResolvedValueOnce({ refresh_token: 'refresh-token' });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = vi.fn(async () => ({ ok: false, status: 502 }));
    vi.stubGlobal('fetch', fetchMock);

    await sendPushToSpace({
      spaceId: 'shared-1',
      excludeUserId: 'sender',
      title: 'Shared update',
      body: 'A reminder changed',
      eventKind: 'reminderCreated',
      entityId: 'reminder-1',
      entityTitle: 'Buy milk',
      data: { route: '/notifications' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(dbMock.queryOnce).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      '[push] sendPushToSpace failed',
      expect.any(Error),
    );
  });

  it('uses the trusted push relay for memory notification payloads', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://pacto.example.test/');
    dbMock.getAuth.mockResolvedValueOnce({ refresh_token: 'refresh-token' });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const sent = await sendMemoryNotificationViaRelay({
      kind: 'memoryQuote',
      sourceMemoryId: 'source-1',
      routeMemoryId: 'quote-1',
    });

    expect(sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://pacto.example.test/api/push',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer refresh-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          kind: 'memoryQuote',
          sourceMemoryId: 'source-1',
          routeMemoryId: 'quote-1',
        }),
      }),
    );
  });

  it('rejects failed trusted memory relay responses', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://pacto.example.test/');
    dbMock.getAuth.mockResolvedValueOnce({ refresh_token: 'refresh-token' });
    const fetchMock = vi.fn(async () => ({ ok: false, status: 502 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendMemoryNotificationViaRelay({
      kind: 'memoryQuote',
      sourceMemoryId: 'source-1',
      routeMemoryId: 'quote-1',
    })).rejects.toThrow('Trusted push relay failed.');
  });
});
