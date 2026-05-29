import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUOTA_FREE_BYTES } from '@/src/lib/memories/quota';

const adminState = vi.hoisted(() => {
  const txCalls: unknown[] = [];
  const tableProxy = (table: string) =>
    new Proxy(
      {},
      {
        get: (_target, entityId: string) => ({
          update: (payload: unknown) => ({
            table,
            entityId,
            payload,
            link: (links: unknown) => {
              const op = { table, entityId, payload, links };
              txCalls.push(op);
              return op;
            },
          }),
          delete: () => {
            const op = { table, entityId, delete: true };
            txCalls.push(op);
            return op;
          },
        }),
      },
    );

  return {
    verifyToken: vi.fn(),
    query: vi.fn(),
    transact: vi.fn(),
    txCalls,
    tx: {
      memories: tableProxy('memories'),
      memoryAttachments: tableProxy('memoryAttachments'),
      memoryPolls: tableProxy('memoryPolls'),
      memoryPollOptions: tableProxy('memoryPollOptions'),
      mediaQuotaUsage: tableProxy('mediaQuotaUsage'),
    },
  };
});

vi.mock('@instantdb/admin', () => ({
  init: vi.fn(() => ({
    auth: {
      verifyToken: adminState.verifyToken,
    },
    query: adminState.query,
    transact: adminState.transact,
    tx: adminState.tx,
  })),
}));

describe('memories API route', () => {
  beforeEach(() => {
    vi.stubEnv('EXPO_PUBLIC_INSTANT_APP_ID', 'app-id');
    vi.stubEnv('INSTANT_ADMIN_TOKEN', 'admin-token');
    adminState.verifyToken.mockReset();
    adminState.query.mockReset();
    adminState.transact.mockReset();
    adminState.txCalls.length = 0;
    adminState.verifyToken.mockResolvedValue({ id: 'user-1' });
    adminState.query.mockResolvedValue({
      spaces: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          kind: 'pair',
          plan: 'free',
          memberships: [{ user: { id: 'user-1' } }],
          mediaQuota: [{ id: 'quota-1', bytesUsed: 1 }],
          memories: [{ attachments: [{ mediaSize: 100 }] }],
        },
      ],
      $files: [
        {
          path: 'users/user-1/spaces/11111111-1111-4111-8111-111111111111/memories/photo.jpg',
          url: 'https://cdn.pacto.test/photo.jpg',
        },
        {
          path: 'users/user-1/spaces/11111111-1111-4111-8111-111111111111/memories/photo-only.jpg',
          url: 'https://cdn.pacto.test/photo-only.jpg',
        },
      ],
    });
  });

  it('requires a valid bearer token before writing a memory', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      body: JSON.stringify({ spaceId: '11111111-1111-4111-8111-111111111111', body: 'Photo' }),
    }));

    expect(response.status).toBe(401);
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects non-array attachments payloads before writing', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Malformed attachments',
        mode: 'post',
        attachments: { type: 'image' },
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'attachments must be an array.' });
    expect(adminState.verifyToken).not.toHaveBeenCalled();
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects non-object attachment entries before writing', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Malformed attachment entry',
        mode: 'post',
        attachments: [null],
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'attachments must contain objects.' });
    expect(adminState.verifyToken).not.toHaveBeenCalled();
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects malformed space ids before querying Instant', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: 'not-a-uuid',
        body: 'Malformed target space',
        mode: 'post',
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'spaceId is invalid.' });
    expect(adminState.verifyToken).not.toHaveBeenCalled();
    expect(adminState.query).not.toHaveBeenCalled();
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects malformed linked memory ids before querying Instant', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Malformed linked memory',
        mode: 'quote',
        quoteId: 'not-a-uuid',
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'quoteId is invalid.' });
    expect(adminState.verifyToken).not.toHaveBeenCalled();
    expect(adminState.query).not.toHaveBeenCalled();
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects malformed entity attachment refs before querying Instant', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Malformed entity ref',
        mode: 'post',
        attachments: [
          {
            type: 'task',
            refId: 'not-a-uuid',
          },
        ],
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'refId is invalid for entity attachments.' });
    expect(adminState.verifyToken).not.toHaveBeenCalled();
    expect(adminState.query).not.toHaveBeenCalled();
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects unsupported attachment types before writing', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Forged attachment type',
        mode: 'post',
        attachments: [
          {
            type: 'location',
            refId: 'somewhere-1',
          },
        ],
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'attachment type is unsupported.' });
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects non-array poll option payloads before writing', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Malformed poll',
        mode: 'post',
        pollOptions: 'yes',
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'pollOptions must be an array.' });
    expect(adminState.verifyToken).not.toHaveBeenCalled();
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects non-boolean privacy flags before auth or admin writes', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Malformed privacy',
        mode: 'post',
        isPrivate: 'true',
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'isPrivate must be a boolean.' });
    expect(adminState.verifyToken).not.toHaveBeenCalled();
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects non-boolean notify flags before auth or admin writes', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Malformed notify',
        mode: 'post',
        notifyMembers: 'false',
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'notifyMembers must be a boolean.' });
    expect(adminState.verifyToken).not.toHaveBeenCalled();
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects non-string bodies before auth or admin writes', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: { text: 'Forged body' },
        mode: 'post',
        attachments: [
          {
            type: 'image',
            mediaUrl: 'https://cdn.pacto.test/photo.jpg',
            mediaPath: 'users/user-1/spaces/11111111-1111-4111-8111-111111111111/memories/photo.jpg',
            mediaSize: 50,
          },
        ],
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'body must be a string.' });
    expect(adminState.verifyToken).not.toHaveBeenCalled();
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects reply links when the payload mode is not reply before admin writes', async () => {
    adminState.query
      .mockResolvedValueOnce({
        spaces: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            kind: 'pair',
            plan: 'free',
            memberships: [{ user: { id: 'user-1' } }],
            mediaQuota: [{ id: 'quota-1', bytesUsed: 0 }],
            memories: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        memories: [
          {
            id: '44444444-4444-4444-8444-444444444444',
            isPrivate: false,
            author: { id: 'user-1' },
            space: {
              id: '11111111-1111-4111-8111-111111111111',
              memberships: [{ user: { id: 'user-1' } }],
            },
          },
        ],
      });
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Looks like a reply but is typed as a post',
        mode: 'post',
        parentId: '44444444-4444-4444-8444-444444444444',
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'parentId is only valid for replies.' });
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects non-string poll option entries before writing', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Malformed poll option entry',
        mode: 'post',
        pollOptions: ['Yes', 3],
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'pollOptions must contain strings.' });
    expect(adminState.verifyToken).not.toHaveBeenCalled();
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects poll options without a question before writing', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Malformed poll question',
        mode: 'post',
        pollOptions: ['Yes', 'No'],
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'pollQuestion is required for polls.' });
    expect(adminState.verifyToken).not.toHaveBeenCalled();
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects polls with fewer than two unique options before writing', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Malformed poll options',
        mode: 'post',
        pollQuestion: 'Choose one',
        pollOptions: ['Yes'],
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Polls require at least two unique options.' });
    expect(adminState.verifyToken).not.toHaveBeenCalled();
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects duplicate poll options before writing', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Malformed duplicate poll options',
        mode: 'post',
        pollQuestion: 'Choose one',
        pollOptions: ['Yes', 'yes '],
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Polls require at least two unique options.' });
    expect(adminState.verifyToken).not.toHaveBeenCalled();
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects private memories targeted at shared spaces', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Private shared-space post',
        mode: 'post',
        isPrivate: true,
        notifyMembers: false,
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Private memories must target a solo space.' });
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('writes media memories through admin after checking aggregate quota bytes', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Photo #Trip',
        mode: 'post',
        isPrivate: false,
        notifyMembers: true,
        attachments: [
          {
            type: 'image',
            mediaUrl: 'https://cdn.pacto.test/photo.jpg',
            mediaPath: 'users/user-1/spaces/11111111-1111-4111-8111-111111111111/memories/photo.jpg',
            mediaSize: 50,
          },
        ],
        pollOptions: [],
      }),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.memoryId).toEqual(expect.any(String));
    expect(adminState.transact).toHaveBeenCalledTimes(1);
    expect(adminState.txCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'mediaQuotaUsage',
          entityId: 'quota-1',
          payload: expect.objectContaining({ bytesUsed: 150 }),
          links: { space: '11111111-1111-4111-8111-111111111111' },
        }),
        expect.objectContaining({
          table: 'memories',
          payload: expect.objectContaining({
            body: 'Photo #Trip',
            tags: ['trip'],
            isPrivate: false,
            notifyMembers: true,
          }),
          links: expect.objectContaining({ space: '11111111-1111-4111-8111-111111111111', author: 'user-1' }),
        }),
        expect.objectContaining({
          table: 'memoryAttachments',
          payload: expect.objectContaining({
            type: 'image',
            spaceId: '11111111-1111-4111-8111-111111111111',
            mediaPath: 'users/user-1/spaces/11111111-1111-4111-8111-111111111111/memories/photo.jpg',
            mediaSize: 50,
          }),
          links: expect.objectContaining({ memory: body.memoryId }),
        }),
      ]),
    );
  });

  it('writes media-only memories through admin with an empty body', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        mode: 'post',
        isPrivate: false,
        notifyMembers: true,
        attachments: [
          {
            type: 'image',
            mediaUrl: 'https://cdn.pacto.test/photo-only.jpg',
            mediaPath: 'users/user-1/spaces/11111111-1111-4111-8111-111111111111/memories/photo-only.jpg',
            mediaSize: 50,
          },
        ],
      }),
    }));

    expect(response.status).toBe(200);
    expect(adminState.transact).toHaveBeenCalledTimes(1);
    expect(adminState.txCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'memories',
          payload: expect.objectContaining({
            body: '',
            tags: [],
            isPrivate: false,
            notifyMembers: true,
          }),
        }),
      ]),
    );
  });

  it('writes poll-only crew memories through admin with an empty body', async () => {
    adminState.query.mockResolvedValueOnce({
      spaces: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          kind: 'crew',
          plan: 'free',
          memberships: [{ user: { id: 'user-1' } }],
          mediaQuota: [{ id: 'quota-1', bytesUsed: 0 }],
          memories: [],
        },
      ],
    });
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        mode: 'post',
        isPrivate: false,
        notifyMembers: true,
        pollQuestion: 'Which day works?',
        pollOptions: ['Friday', 'Saturday'],
      }),
    }));

    expect(response.status).toBe(200);
    expect(adminState.transact).toHaveBeenCalledTimes(1);
    expect(adminState.txCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'memories',
          payload: expect.objectContaining({
            body: '',
            tags: [],
            isPrivate: false,
            notifyMembers: true,
          }),
        }),
        expect.objectContaining({
          table: 'memoryPolls',
          payload: expect.objectContaining({ question: 'Which day works?' }),
        }),
        expect.objectContaining({
          table: 'memoryPollOptions',
          payload: expect.objectContaining({ label: 'Friday' }),
        }),
      ]),
    );
  });

  it('rejects media memories that would exceed aggregate quota bytes', async () => {
    adminState.query.mockResolvedValueOnce({
      spaces: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          kind: 'pair',
          plan: 'free',
          memberships: [{ user: { id: 'user-1' } }],
          mediaQuota: [{ id: 'quota-1', bytesUsed: 1 }],
          memories: [{ attachments: [{ mediaSize: QUOTA_FREE_BYTES }] }],
        },
      ],
    });
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Too large',
        mode: 'post',
        attachments: [
          {
            type: 'image',
            mediaUrl: 'https://cdn.pacto.test/extra.jpg',
            mediaPath: 'users/user-1/spaces/11111111-1111-4111-8111-111111111111/memories/extra.jpg',
            mediaSize: 1,
          },
        ],
      }),
    }));

    expect(response.status).toBe(413);
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('uses the materialized media quota row when it is higher than loaded attachment bytes', async () => {
    adminState.query.mockResolvedValueOnce({
      spaces: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          kind: 'pair',
          plan: 'free',
          memberships: [{ user: { id: 'user-1' } }],
          mediaQuota: [{ id: 'quota-1', bytesUsed: QUOTA_FREE_BYTES }],
          memories: [],
        },
      ],
    });
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Too large by materialized quota',
        mode: 'post',
        attachments: [
          {
            type: 'image',
            mediaUrl: 'https://cdn.pacto.test/extra.jpg',
            mediaPath: 'users/user-1/spaces/11111111-1111-4111-8111-111111111111/memories/extra.jpg',
            mediaSize: 1,
          },
        ],
      }),
    }));

    expect(response.status).toBe(413);
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects media attachments without a media URL', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Missing URL',
        mode: 'post',
        attachments: [
          {
            type: 'image',
            mediaPath: 'users/user-1/spaces/11111111-1111-4111-8111-111111111111/memories/photo.jpg',
            mediaSize: 50,
          },
        ],
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'mediaUrl is required for media attachments.' });
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects non-http media URLs before admin writes', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Bad media URL',
        mode: 'post',
        attachments: [
          {
            type: 'image',
            mediaUrl: 'javascript:alert(1)',
            mediaPath: 'users/user-1/spaces/11111111-1111-4111-8111-111111111111/memories/photo.jpg',
            mediaSize: 50,
          },
        ],
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'mediaUrl must be an absolute http(s) URL.' });
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects zero-byte media attachments before quota accounting', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Underreported upload',
        mode: 'post',
        attachments: [
          {
            type: 'gif',
            mediaUrl: 'https://cdn.pacto.test/animation.gif',
            mediaPath: 'users/user-1/spaces/11111111-1111-4111-8111-111111111111/memories/animation.gif',
            mediaSize: 0,
          },
        ],
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'mediaSize must be positive.' });
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects media attachments whose uploaded file row is missing', async () => {
    adminState.query.mockResolvedValueOnce({
      spaces: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          kind: 'pair',
          plan: 'free',
          memberships: [{ user: { id: 'user-1' } }],
          mediaQuota: [{ id: 'quota-1', bytesUsed: 0 }],
          memories: [],
        },
      ],
      $files: [],
    });
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Forged media row',
        mode: 'post',
        attachments: [
          {
            type: 'image',
            mediaUrl: 'https://cdn.pacto.test/missing.jpg',
            mediaPath: 'users/user-1/spaces/11111111-1111-4111-8111-111111111111/memories/missing.jpg',
            mediaSize: 50,
          },
        ],
      }),
    }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Uploaded media not found.' });
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects media attachments whose URL does not match the uploaded file row', async () => {
    adminState.query.mockResolvedValueOnce({
      spaces: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          kind: 'pair',
          plan: 'free',
          memberships: [{ user: { id: 'user-1' } }],
          mediaQuota: [{ id: 'quota-1', bytesUsed: 0 }],
          memories: [],
        },
      ],
      $files: [
        {
          path: 'users/user-1/spaces/11111111-1111-4111-8111-111111111111/memories/photo.jpg',
          url: 'https://cdn.pacto.test/actual.jpg',
        },
      ],
    });
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Mismatched media URL',
        mode: 'post',
        attachments: [
          {
            type: 'image',
            mediaUrl: 'https://cdn.pacto.test/forged.jpg',
            mediaPath: 'users/user-1/spaces/11111111-1111-4111-8111-111111111111/memories/photo.jpg',
            mediaSize: 50,
          },
        ],
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'mediaUrl must match uploaded media.' });
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects malformed media dimensions before admin writes', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Bad dimensions',
        mode: 'post',
        attachments: [
          {
            type: 'image',
            mediaUrl: 'https://cdn.pacto.test/photo.jpg',
            mediaPath: 'users/user-1/spaces/11111111-1111-4111-8111-111111111111/memories/photo.jpg',
            mediaSize: 50,
            mediaWidth: 'wide',
            mediaHeight: -1,
          },
        ],
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'mediaWidth must be a positive number.' });
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects shared quote memories that point at a different space', async () => {
    adminState.query
      .mockResolvedValueOnce({
        spaces: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            kind: 'pair',
            plan: 'free',
            memberships: [{ user: { id: 'user-1' } }],
            mediaQuota: [{ id: 'quota-1', bytesUsed: 0 }],
            memories: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        memories: [
          {
            id: '44444444-4444-4444-8444-444444444441',
            isPrivate: false,
            author: { id: 'user-1' },
            space: {
              id: 'other-space',
              memberships: [{ user: { id: 'user-1' } }],
            },
          },
        ],
      });
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Cross-space quote',
        mode: 'quote',
        quoteId: '44444444-4444-4444-8444-444444444441',
        isPrivate: false,
        attachments: [
          {
            type: 'image',
            mediaPath: 'users/user-1/spaces/11111111-1111-4111-8111-111111111111/memories/photo.jpg',
            mediaSize: 50,
          },
        ],
      }),
    }));

    expect(response.status).toBe(403);
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects linked memories whose source author is no longer a space member', async () => {
    adminState.query
      .mockResolvedValueOnce({
        spaces: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            kind: 'pair',
            plan: 'free',
            memberships: [{ user: { id: 'user-1' } }],
            mediaQuota: [{ id: 'quota-1', bytesUsed: 0 }],
            memories: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        memories: [
          {
            id: '44444444-4444-4444-8444-444444444441',
            isPrivate: false,
            author: { id: 'former-member' },
            space: {
              id: '11111111-1111-4111-8111-111111111111',
              memberships: [{ user: { id: 'user-1' } }],
            },
          },
        ],
      });
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Former-member source quote',
        mode: 'quote',
        quoteId: '44444444-4444-4444-8444-444444444441',
        isPrivate: false,
      }),
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects stale public solo-space linked memories authored by another member', async () => {
    adminState.query
      .mockResolvedValueOnce({
        spaces: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            kind: 'solo',
            plan: 'free',
            memberships: [
              { user: { id: 'user-1' } },
              { user: { id: 'partner-1' } },
            ],
            mediaQuota: [{ id: 'quota-1', bytesUsed: 0 }],
            memories: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        memories: [
          {
            id: '44444444-4444-4444-8444-444444444441',
            isPrivate: false,
            author: { id: 'partner-1' },
            space: {
              id: '11111111-1111-4111-8111-111111111111',
              kind: 'solo',
              memberships: [
                { user: { id: 'user-1' } },
                { user: { id: 'partner-1' } },
              ],
            },
          },
        ],
      });
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Personal quote',
        mode: 'quote',
        quoteId: '44444444-4444-4444-8444-444444444441',
        isPrivate: true,
      }),
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects entity attachment refs that point at a different space', async () => {
    adminState.query
      .mockResolvedValueOnce({
        spaces: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            kind: 'pair',
            plan: 'free',
            memberships: [{ user: { id: 'user-1' } }],
            mediaQuota: [{ id: 'quota-1', bytesUsed: 0 }],
            memories: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        tasks: [
          {
            id: '44444444-4444-4444-8444-444444444442',
            couple: { id: 'other-space' },
          },
        ],
      });
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Task reference',
        mode: 'post',
        isPrivate: false,
        attachments: [
          {
            type: 'task',
            refId: '44444444-4444-4444-8444-444444444442',
          },
        ],
      }),
    }));

    expect(response.status).toBe(403);
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('accepts legacy task attachment refs that inherit space from their parent list', async () => {
    adminState.query
      .mockResolvedValueOnce({
        spaces: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            kind: 'pair',
            plan: 'free',
            memberships: [{ user: { id: 'user-1' } }],
            mediaQuota: [{ id: 'quota-1', bytesUsed: 0 }],
            memories: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        tasks: [
          {
            id: '44444444-4444-4444-8444-444444444442',
            title: 'Legacy task',
            createdBy: { id: 'user-1' },
            list: {
              id: '55555555-5555-4555-8555-555555555555',
              couple: { id: '11111111-1111-4111-8111-111111111111' },
            },
          },
        ],
      });
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Legacy task reference',
        mode: 'post',
        isPrivate: false,
        attachments: [
          {
            type: 'task',
            refId: '44444444-4444-4444-8444-444444444442',
          },
        ],
      }),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(adminState.transact).toHaveBeenCalledTimes(1);
    expect(adminState.txCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'memoryAttachments',
          payload: expect.objectContaining({
            type: 'task',
            refId: '44444444-4444-4444-8444-444444444442',
            spaceId: '11111111-1111-4111-8111-111111111111',
          }),
          links: expect.objectContaining({ memory: body.memoryId }),
        }),
      ]),
    );
  });

  it('rejects task attachment refs whose parent list belongs to a different space', async () => {
    adminState.query
      .mockResolvedValueOnce({
        spaces: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            kind: 'pair',
            plan: 'free',
            memberships: [{ user: { id: 'user-1' } }],
            mediaQuota: [{ id: 'quota-1', bytesUsed: 0 }],
            memories: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        tasks: [
          {
            id: '44444444-4444-4444-8444-444444444442',
            couple: { id: '11111111-1111-4111-8111-111111111111' },
            list: { id: '55555555-5555-4555-8555-555555555555', couple: { id: 'other-space' } },
          },
        ],
      });
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Task reference',
        mode: 'post',
        isPrivate: false,
        attachments: [
          {
            type: 'task',
            refId: '44444444-4444-4444-8444-444444444442',
          },
        ],
      }),
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Task must belong to the target space.' });
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects task attachment refs whose parent list is unresolved', async () => {
    adminState.query
      .mockResolvedValueOnce({
        spaces: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            kind: 'pair',
            plan: 'free',
            memberships: [{ user: { id: 'user-1' } }],
            mediaQuota: [{ id: 'quota-1', bytesUsed: 0 }],
            memories: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        tasks: [
          {
            id: '44444444-4444-4444-8444-444444444442',
            couple: { id: '11111111-1111-4111-8111-111111111111' },
            list: { id: '55555555-5555-4555-8555-555555555555' },
          },
        ],
      });
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Task reference',
        mode: 'post',
        isPrivate: false,
        attachments: [
          {
            type: 'task',
            refId: '44444444-4444-4444-8444-444444444442',
          },
        ],
      }),
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Task must belong to the target space.' });
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects entity attachment refs without a refId', async () => {
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Dangling task reference',
        mode: 'post',
        isPrivate: false,
        attachments: [
          {
            type: 'task',
          },
        ],
      }),
    }));

    expect(response.status).toBe(400);
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects private entity attachment refs in the target space when owned by another user', async () => {
    adminState.query
      .mockResolvedValueOnce({
        spaces: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            kind: 'pair',
            plan: 'free',
            memberships: [{ user: { id: 'user-1' } }],
            mediaQuota: [{ id: 'quota-1', bytesUsed: 0 }],
            memories: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        plans: [
          {
            id: '44444444-4444-4444-8444-444444444443',
            isPrivate: true,
            couple: { id: '11111111-1111-4111-8111-111111111111' },
            createdBy: { id: 'partner-1' },
          },
        ],
      });
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Private plan reference',
        mode: 'post',
        isPrivate: false,
        attachments: [
          {
            type: 'plan',
            refId: '44444444-4444-4444-8444-444444444443',
          },
        ],
      }),
    }));

    expect(response.status).toBe(403);
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it('rejects private entity attachment refs in public shared memories even when owned by the caller', async () => {
    adminState.query
      .mockResolvedValueOnce({
        spaces: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            kind: 'pair',
            plan: 'free',
            memberships: [{ user: { id: 'user-1' } }],
            mediaQuota: [{ id: 'quota-1', bytesUsed: 0 }],
            memories: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        plans: [
          {
            id: '44444444-4444-4444-8444-444444444443',
            isPrivate: true,
            couple: { id: '11111111-1111-4111-8111-111111111111' },
            createdBy: { id: 'user-1' },
          },
        ],
      });
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: '11111111-1111-4111-8111-111111111111',
        body: 'Private plan reference',
        mode: 'post',
        isPrivate: false,
        attachments: [
          {
            type: 'plan',
            refId: '44444444-4444-4444-8444-444444444443',
          },
        ],
      }),
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Private attachments require a private memory.' });
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it.each([
    ['task', 'tasks', 'createdBy'],
    ['reminder', 'reminders', 'createdBy'],
    ['plan', 'plans', 'createdBy'],
    ['checkIn', 'checkIns', 'author'],
    ['timetable', 'timetables', 'createdBy'],
    ['journal', 'journalEntries', 'author'],
  ] as const)('rejects partner-authored personal-space %s attachment refs', async (type, collection, ownerLink) => {
    const soloSpaceId = '11111111-1111-4111-8111-111111111111';
    const entityId = '44444444-4444-4444-8444-444444444444';
    const row: any = {
      id: entityId,
      isPrivate: false,
      share: 'shared',
      couple: { id: soloSpaceId },
      [ownerLink]: { id: 'partner-1' },
    };
    if (type === 'task') {
      row.list = { id: '55555555-5555-4555-8555-555555555555', couple: { id: soloSpaceId } };
    }
    adminState.query
      .mockResolvedValueOnce({
        spaces: [
          {
            id: soloSpaceId,
            kind: 'solo',
            plan: 'free',
            memberships: [{ user: { id: 'user-1' } }],
            mediaQuota: [{ id: 'quota-1', bytesUsed: 0 }],
            memories: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        [collection]: [row],
      });
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: soloSpaceId,
        body: 'Personal entity reference',
        mode: 'post',
        isPrivate: true,
        attachments: [
          {
            type,
            refId: entityId,
          },
        ],
      }),
    }));

    expect(response.status).toBe(403);
    expect(adminState.transact).not.toHaveBeenCalled();
  });

  it.each([
    ['task', 'tasks'],
    ['plan', 'plans'],
    ['timetable', 'timetables'],
  ] as const)('accepts ownerless legacy personal-space %s attachment refs', async (type, collection) => {
    const soloSpaceId = '11111111-1111-4111-8111-111111111111';
    const entityId = '44444444-4444-4444-8444-444444444444';
    const row: any = {
      id: entityId,
      isPrivate: false,
      share: 'shared',
      couple: { id: soloSpaceId },
    };
    if (type === 'task') {
      row.list = { id: '55555555-5555-4555-8555-555555555555', couple: { id: soloSpaceId } };
    }
    adminState.query
      .mockResolvedValueOnce({
        spaces: [
          {
            id: soloSpaceId,
            kind: 'solo',
            plan: 'free',
            memberships: [{ user: { id: 'user-1' } }],
            mediaQuota: [{ id: 'quota-1', bytesUsed: 0 }],
            memories: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        [collection]: [row],
      });
    const route = await import('../../app/api/memories+api');

    const response = await route.POST(new Request('https://pacto.test/api/memories', {
      method: 'POST',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId: soloSpaceId,
        body: 'Ownerless personal entity reference',
        mode: 'post',
        isPrivate: true,
        attachments: [
          {
            type,
            refId: entityId,
          },
        ],
      }),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(adminState.transact).toHaveBeenCalledTimes(1);
    expect(adminState.txCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'memoryAttachments',
          payload: expect.objectContaining({
            type,
            refId: entityId,
            spaceId: soloSpaceId,
          }),
          links: expect.objectContaining({ memory: body.memoryId }),
        }),
      ]),
    );
  });
});
