import { beforeEach, describe, expect, it, vi } from 'vitest';

const adminState = vi.hoisted(() => ({
  verifyToken: vi.fn(),
  query: vi.fn(),
}));

vi.mock('@instantdb/admin', () => ({
  init: vi.fn(() => ({
    auth: {
      verifyToken: adminState.verifyToken,
    },
    query: adminState.query,
  })),
}));

describe('push API route', () => {
  const spaceResult = () => ({
    spaces: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        memberships: [
          { user: { id: 'sender', displayName: 'Ari', devices: [{ expoPushToken: 'ExpoPushToken[sender]' }] } },
          { user: { id: 'partner', devices: [{ expoPushToken: 'ExpoPushToken[partner]' }] } },
        ],
      },
    ],
  });

  beforeEach(() => {
    vi.stubEnv('EXPO_PUBLIC_INSTANT_APP_ID', 'app-id');
    vi.stubEnv('INSTANT_ADMIN_TOKEN', 'admin-token');
    adminState.verifyToken.mockReset();
    adminState.query.mockReset();
    vi.unstubAllGlobals();
    adminState.verifyToken.mockResolvedValue({ id: 'sender' });
    adminState.query.mockResolvedValue(spaceResult());
  });

  it('requires a valid bearer token before sending push notifications', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      body: JSON.stringify({ kind: 'spaceMutation', spaceId: '22222222-2222-4222-8222-222222222222', title: 'Update', body: 'Changed' }),
    }));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects malformed space ids before querying Instant for space pushes', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'spaceMutation',
        spaceId: 'not-a-uuid',
        eventKind: 'memoryCreated',
        memoryId: '33333333-3333-4333-8333-333333333330',
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'spaceId is invalid.' });
    expect(adminState.query).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects malformed entity ids before querying Instant for space pushes', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'spaceMutation',
        spaceId: '22222222-2222-4222-8222-222222222222',
        eventKind: 'reminderCreated',
        entityId: 'not-a-uuid',
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'entityId is invalid.' });
    expect(adminState.query).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects malformed source memory ids before querying Instant for memory pushes', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'memoryReaction',
        sourceMemoryId: 'not-a-uuid',
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'sourceMemoryId is invalid.' });
    expect(adminState.query).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects malformed route memory ids before querying Instant for quote pushes', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'memoryQuote',
        sourceMemoryId: '33333333-3333-4333-8333-333333333333',
        routeMemoryId: 'not-a-uuid',
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'routeMemoryId is invalid.' });
    expect(adminState.query).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('templates a deduped same-space push batch from the authenticated sender', async () => {
    adminState.query
      .mockResolvedValueOnce(spaceResult())
      .mockResolvedValueOnce({
        reminders: [
          {
            id: '33333333-3333-4333-8333-333333333331',
            title: 'Buy milk',
            createdBy: { id: 'sender' },
            couple: { id: '22222222-2222-4222-8222-222222222222' },
          },
        ],
      });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'spaceMutation',
        spaceId: '22222222-2222-4222-8222-222222222222',
        eventKind: 'reminderCreated',
        entityId: '33333333-3333-4333-8333-333333333331',
        entityTitle: 'Buy milk',
        title: 'Forged title',
        body: 'Forged body',
        route: '/forged',
      }),
    }));

    expect(response.status).toBe(200);
    expect(adminState.verifyToken).toHaveBeenCalledWith('refresh-token');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual([
      expect.objectContaining({
        to: 'ExpoPushToken[partner]',
        title: 'Ari',
        body: 'added a reminder: Buy milk',
        data: { route: '/(tabs)/us/reminders' },
      }),
    ]);
  });

  it('does not fan out space mutation pushes for solo spaces', async () => {
    adminState.query
      .mockResolvedValueOnce({
        spaces: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            kind: 'solo',
            memberships: [
              { user: { id: 'sender', displayName: 'Ari', devices: [{ expoPushToken: 'ExpoPushToken[sender]' }] } },
              { user: { id: 'partner', devices: [{ expoPushToken: 'ExpoPushToken[partner]' }] } },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({
        plans: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            title: 'Private target',
            createdBy: { id: 'sender' },
            couple: { id: '22222222-2222-4222-8222-222222222222' },
          },
        ],
      });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'spaceMutation',
        spaceId: '22222222-2222-4222-8222-222222222222',
        eventKind: 'planCreated',
        entityId: '33333333-3333-4333-8333-333333333333',
      }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, sent: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires a reminder id for reminder push fan-out', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'spaceMutation',
        spaceId: '22222222-2222-4222-8222-222222222222',
        eventKind: 'reminderCreated',
        entityTitle: 'Forged reminder',
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'entityId is required.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('templates reminder pushes from the persisted reminder row instead of forged client text', async () => {
    adminState.query
      .mockResolvedValueOnce(spaceResult())
      .mockResolvedValueOnce({
        reminders: [
          {
            id: '33333333-3333-4333-8333-333333333331',
            title: 'Buy milk',
            createdBy: { id: 'sender' },
            couple: { id: '22222222-2222-4222-8222-222222222222' },
          },
        ],
      });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'spaceMutation',
        spaceId: '22222222-2222-4222-8222-222222222222',
        eventKind: 'reminderCreated',
        entityId: '33333333-3333-4333-8333-333333333331',
        entityTitle: 'Forged title',
      }),
    }));

    expect(response.status).toBe(200);
    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual([
      expect.objectContaining({
        to: 'ExpoPushToken[partner]',
        title: 'Ari',
        body: 'added a reminder: Buy milk',
        data: { route: '/(tabs)/us/reminders' },
      }),
    ]);
  });

  it('rejects reminder pushes for reminders outside the target space', async () => {
    adminState.query
      .mockResolvedValueOnce(spaceResult())
      .mockResolvedValueOnce({
        reminders: [
          {
            id: '33333333-3333-4333-8333-333333333332',
            title: 'Other reminder',
            createdBy: { id: 'sender' },
            couple: { id: 'other-space' },
          },
        ],
      });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'spaceMutation',
        spaceId: '22222222-2222-4222-8222-222222222222',
        eventKind: 'reminderCreated',
        entityId: '33333333-3333-4333-8333-333333333332',
        entityTitle: 'Other reminder',
      }),
    }));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects reminder pushes for reminders not authored by the sender', async () => {
    adminState.query
      .mockResolvedValueOnce(spaceResult())
      .mockResolvedValueOnce({
        reminders: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            title: 'Partner reminder',
            createdBy: { id: 'partner' },
            couple: { id: '22222222-2222-4222-8222-222222222222' },
          },
        ],
      });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'spaceMutation',
        spaceId: '22222222-2222-4222-8222-222222222222',
        eventKind: 'reminderCreated',
        entityId: '33333333-3333-4333-8333-333333333333',
        entityTitle: 'Partner reminder',
      }),
    }));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('templates plan pushes from the persisted plan row instead of forged client text', async () => {
    adminState.query
      .mockResolvedValueOnce(spaceResult())
      .mockResolvedValueOnce({
        plans: [
          {
            id: '33333333-3333-4333-8333-333333333334',
            title: 'Summer trip',
            isPrivate: false,
            createdBy: { id: 'sender' },
            couple: { id: '22222222-2222-4222-8222-222222222222' },
          },
        ],
      });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'spaceMutation',
        spaceId: '22222222-2222-4222-8222-222222222222',
        eventKind: 'planCreated',
        entityId: '33333333-3333-4333-8333-333333333334',
        entityTitle: 'Forged plan',
      }),
    }));

    expect(response.status).toBe(200);
    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual([
      expect.objectContaining({
        to: 'ExpoPushToken[partner]',
        title: 'Ari',
        body: 'added a plan: Summer trip',
        data: { route: '/(tabs)/us/plans' },
      }),
    ]);
  });

  it('rejects check-in pushes for private check-ins before sending', async () => {
    adminState.query
      .mockResolvedValueOnce(spaceResult())
      .mockResolvedValueOnce({
        checkIns: [
          {
            id: '33333333-3333-4333-8333-333333333335',
            mood: 'quiet',
            isPrivate: true,
            author: { id: 'sender' },
            couple: { id: '22222222-2222-4222-8222-222222222222' },
          },
        ],
      });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'spaceMutation',
        spaceId: '22222222-2222-4222-8222-222222222222',
        eventKind: 'checkInCreated',
        entityId: '33333333-3333-4333-8333-333333333335',
        mood: 'forged',
      }),
    }));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects space memory pushes for private memories before sending', async () => {
    adminState.query
      .mockResolvedValueOnce(spaceResult())
      .mockResolvedValueOnce({
        memories: [
          {
            id: '33333333-3333-4333-8333-333333333336',
            isPrivate: true,
            author: { id: 'sender' },
            space: { id: '22222222-2222-4222-8222-222222222222' },
          },
        ],
      });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'spaceMutation',
        spaceId: '22222222-2222-4222-8222-222222222222',
        eventKind: 'memoryCreated',
        memoryId: '33333333-3333-4333-8333-333333333336',
      }),
    }));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects space memory pushes for memories outside the target space', async () => {
    adminState.query
      .mockResolvedValueOnce(spaceResult())
      .mockResolvedValueOnce({
        memories: [
          {
            id: '33333333-3333-4333-8333-333333333337',
            isPrivate: false,
            author: { id: 'sender' },
            space: { id: 'other-space' },
          },
        ],
      });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'spaceMutation',
        spaceId: '22222222-2222-4222-8222-222222222222',
        eventKind: 'memoryCreated',
        memoryId: '33333333-3333-4333-8333-333333333337',
      }),
    }));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects space memory pushes for memories not authored by the sender', async () => {
    adminState.query
      .mockResolvedValueOnce(spaceResult())
      .mockResolvedValueOnce({
        memories: [
          {
            id: '33333333-3333-4333-8333-333333333338',
            isPrivate: false,
            author: { id: 'partner' },
            space: { id: '22222222-2222-4222-8222-222222222222' },
          },
        ],
      });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'spaceMutation',
        spaceId: '22222222-2222-4222-8222-222222222222',
        eventKind: 'memoryReply',
        memoryId: '33333333-3333-4333-8333-333333333338',
      }),
    }));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects reply fan-out when the persisted memory is not a reply', async () => {
    adminState.query
      .mockResolvedValueOnce(spaceResult())
      .mockResolvedValueOnce({
        memories: [
          {
            id: '33333333-3333-4333-8333-333333333342',
            kind: 'post',
            isPrivate: false,
            author: { id: 'sender' },
            space: { id: '22222222-2222-4222-8222-222222222222' },
          },
        ],
      });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'spaceMutation',
        spaceId: '22222222-2222-4222-8222-222222222222',
        eventKind: 'memoryReply',
        memoryId: '33333333-3333-4333-8333-333333333342',
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Memory kind does not match push event.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects created-memory fan-out when the persisted memory is a reply', async () => {
    adminState.query
      .mockResolvedValueOnce(spaceResult())
      .mockResolvedValueOnce({
        memories: [
          {
            id: '33333333-3333-4333-8333-333333333343',
            kind: 'reply',
            isPrivate: false,
            author: { id: 'sender' },
            space: { id: '22222222-2222-4222-8222-222222222222' },
          },
        ],
      });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'spaceMutation',
        spaceId: '22222222-2222-4222-8222-222222222222',
        eventKind: 'memoryCreated',
        memoryId: '33333333-3333-4333-8333-333333333343',
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Memory kind does not match push event.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('templates memory reaction pushes on the server for the source-memory author', async () => {
    adminState.query.mockResolvedValueOnce({
      memories: [
        {
          id: '33333333-3333-4333-8333-333333333339',
          isPrivate: false,
          author: { id: 'author', devices: [
            { expoPushToken: 'ExpoPushToken[author]' },
            { expoPushToken: 'ExpoPushToken[author]' },
          ] },
          reactions: [
            { id: 'reaction-sender', user: { id: 'sender' } },
          ],
          space: {
            id: '22222222-2222-4222-8222-222222222222',
            memberships: [
              { user: { id: 'sender', displayName: 'Ari' } },
              { user: { id: 'author', devices: [{ expoPushToken: 'ExpoPushToken[author]' }] } },
            ],
          },
        },
      ],
    });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'memoryReaction',
        sourceMemoryId: '33333333-3333-4333-8333-333333333339',
        title: 'Forged title',
        body: 'Forged body',
      }),
    }));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual([
      expect.objectContaining({
        to: 'ExpoPushToken[author]',
        title: 'New reaction',
        body: 'Ari reacted to your memory',
        data: { route: '/(tabs)/memories/33333333-3333-4333-8333-333333333339' },
      }),
    ]);
  });

  it('rejects memory pushes when the source-memory author is not a space member', async () => {
    adminState.query.mockResolvedValueOnce({
      memories: [
        {
          id: '33333333-3333-4333-8333-333333333344',
          isPrivate: false,
          author: { id: 'partner', devices: [{ expoPushToken: 'ExpoPushToken[partner]' }] },
          reactions: [
            { id: 'reaction-sender', user: { id: 'sender' } },
          ],
          space: {
            id: '22222222-2222-4222-8222-222222222222',
            kind: 'solo',
            memberships: [
              { user: { id: 'sender', displayName: 'Ari' } },
            ],
          },
        },
      ],
    });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'memoryReaction',
        sourceMemoryId: '33333333-3333-4333-8333-333333333344',
      }),
    }));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects memory pushes for stale public memories in solo spaces', async () => {
    adminState.query.mockResolvedValueOnce({
      memories: [
        {
          id: '33333333-3333-4333-8333-333333333345',
          isPrivate: false,
          author: { id: 'author', devices: [{ expoPushToken: 'ExpoPushToken[author]' }] },
          reactions: [
            { id: 'reaction-sender', user: { id: 'sender' } },
          ],
          space: {
            id: '22222222-2222-4222-8222-222222222222',
            kind: 'solo',
            memberships: [
              { user: { id: 'sender', displayName: 'Ari' } },
              { user: { id: 'author', devices: [{ expoPushToken: 'ExpoPushToken[author]' }] } },
            ],
          },
        },
      ],
    });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'memoryReaction',
        sourceMemoryId: '33333333-3333-4333-8333-333333333345',
      }),
    }));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects memory reaction pushes when the sender has no reaction row', async () => {
    adminState.query.mockResolvedValueOnce({
      memories: [
        {
          id: '33333333-3333-4333-8333-333333333339',
          isPrivate: false,
          author: { id: 'author', devices: [{ expoPushToken: 'ExpoPushToken[author]' }] },
          space: {
            id: '22222222-2222-4222-8222-222222222222',
            memberships: [
              { user: { id: 'sender', displayName: 'Ari' } },
              { user: { id: 'author', devices: [{ expoPushToken: 'ExpoPushToken[author]' }] } },
            ],
          },
          reactions: [
            { id: 'reaction-partner', user: { id: 'partner' } },
          ],
        },
      ],
    });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'memoryReaction',
        sourceMemoryId: '33333333-3333-4333-8333-333333333339',
      }),
    }));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a relay error when Expo rejects the push batch', async () => {
    adminState.query.mockResolvedValueOnce({
      memories: [
        {
          id: '33333333-3333-4333-8333-333333333339',
          isPrivate: false,
          author: { id: 'author', devices: [{ expoPushToken: 'ExpoPushToken[author]' }] },
          reactions: [
            { id: 'reaction-sender', user: { id: 'sender' } },
          ],
          space: {
            id: '22222222-2222-4222-8222-222222222222',
            memberships: [
              { user: { id: 'sender', displayName: 'Ari' } },
              { user: { id: 'author', devices: [{ expoPushToken: 'ExpoPushToken[author]' }] } },
            ],
          },
        },
      ],
    });
    const fetchMock = vi.fn(async () => ({ ok: false, status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'memoryReaction',
        sourceMemoryId: '33333333-3333-4333-8333-333333333339',
      }),
    }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: 'Push delivery failed.' });
  });

  it('returns a relay error when Expo returns ticket errors', async () => {
    adminState.query.mockResolvedValueOnce({
      memories: [
        {
          id: '33333333-3333-4333-8333-333333333339',
          isPrivate: false,
          author: { id: 'author', devices: [{ expoPushToken: 'ExpoPushToken[author]' }] },
          reactions: [
            { id: 'reaction-sender', user: { id: 'sender' } },
          ],
          space: {
            id: '22222222-2222-4222-8222-222222222222',
            memberships: [
              { user: { id: 'sender', displayName: 'Ari' } },
              { user: { id: 'author', devices: [{ expoPushToken: 'ExpoPushToken[author]' }] } },
            ],
          },
        },
      ],
    });
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [
          { status: 'error', message: 'DeviceNotRegistered' },
        ],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'memoryReaction',
        sourceMemoryId: '33333333-3333-4333-8333-333333333339',
      }),
    }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: 'Push delivery failed.' });
  });

  it('returns a relay error when the Expo push request fails', async () => {
    adminState.query.mockResolvedValueOnce({
      memories: [
        {
          id: '33333333-3333-4333-8333-333333333339',
          isPrivate: false,
          author: { id: 'author', devices: [{ expoPushToken: 'ExpoPushToken[author]' }] },
          reactions: [
            { id: 'reaction-sender', user: { id: 'sender' } },
          ],
          space: {
            id: '22222222-2222-4222-8222-222222222222',
            memberships: [
              { user: { id: 'sender', displayName: 'Ari' } },
              { user: { id: 'author', devices: [{ expoPushToken: 'ExpoPushToken[author]' }] } },
            ],
          },
        },
      ],
    });
    const fetchMock = vi.fn(async () => {
      throw new Error('network down');
    });
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'memoryReaction',
        sourceMemoryId: '33333333-3333-4333-8333-333333333339',
      }),
    }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: 'Push delivery failed.' });
  });

  it('rejects memory pushes when the sender is not a source-memory space member', async () => {
    adminState.query.mockResolvedValueOnce({
      memories: [
        {
          id: '33333333-3333-4333-8333-333333333339',
          isPrivate: false,
          author: { id: 'author', devices: [{ expoPushToken: 'ExpoPushToken[author]' }] },
          space: {
            id: '22222222-2222-4222-8222-222222222222',
            memberships: [
              { user: { id: 'author', devices: [{ expoPushToken: 'ExpoPushToken[author]' }] } },
            ],
          },
        },
      ],
    });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'memoryRepost',
        sourceMemoryId: '33333333-3333-4333-8333-333333333339',
        routeMemoryId: '33333333-3333-4333-8333-333333333340',
      }),
    }));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('validates the repost or quote route memory before sending', async () => {
    adminState.query
      .mockResolvedValueOnce({
        memories: [
          {
            id: '33333333-3333-4333-8333-333333333339',
            isPrivate: false,
            author: { id: 'author', devices: [{ expoPushToken: 'ExpoPushToken[author]' }] },
            space: {
              id: '22222222-2222-4222-8222-222222222222',
              memberships: [
                { user: { id: 'sender', displayName: 'Ari' } },
                { user: { id: 'author', devices: [{ expoPushToken: 'ExpoPushToken[author]' }] } },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        memories: [
          {
            id: '33333333-3333-4333-8333-333333333341',
            kind: 'quote',
            author: { id: 'sender' },
            space: { id: '22222222-2222-4222-8222-222222222222' },
          },
        ],
      });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'memoryQuote',
        sourceMemoryId: '33333333-3333-4333-8333-333333333339',
        routeMemoryId: '33333333-3333-4333-8333-333333333341',
      }),
    }));

    expect(response.status).toBe(200);
    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual([
      expect.objectContaining({
        to: 'ExpoPushToken[author]',
        title: 'Memory quoted',
        body: 'Ari quoted your memory',
        data: { route: '/(tabs)/memories/33333333-3333-4333-8333-333333333341' },
      }),
    ]);
  });

  it('rejects repost or quote pushes when the route memory is private', async () => {
    adminState.query
      .mockResolvedValueOnce({
        memories: [
          {
            id: '33333333-3333-4333-8333-333333333339',
            isPrivate: false,
            author: { id: 'author', devices: [{ expoPushToken: 'ExpoPushToken[author]' }] },
            space: {
              id: '22222222-2222-4222-8222-222222222222',
              memberships: [
                { user: { id: 'sender', displayName: 'Ari' } },
                { user: { id: 'author', devices: [{ expoPushToken: 'ExpoPushToken[author]' }] } },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        memories: [
          {
            id: '33333333-3333-4333-8333-333333333341',
            kind: 'quote',
            isPrivate: true,
            author: { id: 'sender' },
            space: { id: '22222222-2222-4222-8222-222222222222' },
          },
        ],
      });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'memoryQuote',
        sourceMemoryId: '33333333-3333-4333-8333-333333333339',
        routeMemoryId: '33333333-3333-4333-8333-333333333341',
      }),
    }));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects repost or quote pushes when the route memory is not actor-authored in the source space', async () => {
    adminState.query
      .mockResolvedValueOnce({
        memories: [
          {
            id: '33333333-3333-4333-8333-333333333339',
            isPrivate: false,
            author: { id: 'author', devices: [{ expoPushToken: 'ExpoPushToken[author]' }] },
            space: {
              id: '22222222-2222-4222-8222-222222222222',
              memberships: [
                { user: { id: 'sender', displayName: 'Ari' } },
                { user: { id: 'author', devices: [{ expoPushToken: 'ExpoPushToken[author]' }] } },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        memories: [
          {
            id: '33333333-3333-4333-8333-333333333341',
            kind: 'quote',
            author: { id: 'someone-else' },
            space: { id: '22222222-2222-4222-8222-222222222222' },
          },
        ],
      });
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const route = await import('../../app/api/push+api');

    const response = await route.POST(new Request('https://pacto.test/api/push', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'memoryQuote',
        sourceMemoryId: '33333333-3333-4333-8333-333333333339',
        routeMemoryId: '33333333-3333-4333-8333-333333333341',
      }),
    }));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
