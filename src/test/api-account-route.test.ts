import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const adminState = vi.hoisted(() => {
  const tableProxy = (table: string) =>
    new Proxy(
      {},
      {
        get: (_target, entityId: string) => ({
          delete: () => {
            return { table, entityId, type: 'delete' };
          },
          link: (links: unknown) => {
            return { table, entityId, type: 'link', links };
          },
          unlink: (links: unknown) => {
            return { table, entityId, type: 'unlink', links };
          },
          update: (payload: unknown) => ({
            table,
            entityId,
            type: 'update',
            payload,
          }),
        }),
      },
    );

  return {
    verifyToken: vi.fn(),
    query: vi.fn(),
    deleteUser: vi.fn(),
    transact: vi.fn(),
    tx: {
      $files: tableProxy('$files'),
      $users: tableProxy('$users'),
      profiles: tableProxy('profiles'),
      devices: tableProxy('devices'),
      memberships: tableProxy('memberships'),
      spaces: tableProxy('spaces'),
      events: tableProxy('events'),
      plans: tableProxy('plans'),
      rituals: tableProxy('rituals'),
      checkIns: tableProxy('checkIns'),
      reminders: tableProxy('reminders'),
      tasks: tableProxy('tasks'),
      taskLists: tableProxy('taskLists'),
      timetables: tableProxy('timetables'),
      milestones: tableProxy('milestones'),
      journalEntries: tableProxy('journalEntries'),
      loveNotes: tableProxy('loveNotes'),
      wishlists: tableProxy('wishlists'),
      wishlistItems: tableProxy('wishlistItems'),
      memories: tableProxy('memories'),
      memoryReactions: tableProxy('memoryReactions'),
      memoryPollVotes: tableProxy('memoryPollVotes'),
      ringsHistory: tableProxy('ringsHistory'),
    },
  };
});

vi.mock('@instantdb/admin', () => ({
  init: vi.fn(() => ({
    auth: {
      verifyToken: adminState.verifyToken,
      deleteUser: adminState.deleteUser,
    },
    query: adminState.query,
    transact: adminState.transact,
    tx: adminState.tx,
  })),
  lookup: (field: string, value: string) => {
    const ref = { field, value };
    Object.defineProperty(ref, 'toString', {
      enumerable: false,
      value: () => `lookup:${field}:${value}`,
    });
    return ref;
  },
}));

describe('account API route', () => {
  beforeEach(() => {
    vi.stubEnv('EXPO_PUBLIC_INSTANT_APP_ID', 'app-id');
    vi.stubEnv('INSTANT_ADMIN_TOKEN', 'admin-token');
    adminState.deleteUser.mockReset();
    adminState.verifyToken.mockReset();
    adminState.query.mockReset();
    adminState.transact.mockReset();
    adminState.deleteUser.mockResolvedValue(undefined);
    adminState.verifyToken.mockResolvedValue({ id: 'user-1' });
    adminState.query.mockResolvedValue({ data: {} });
    adminState.transact.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('requires a valid bearer token before deleting an account', async () => {
    const route = await import('../../app/api/account+api');

    const response = await route.DELETE(new Request('https://pacto.test/api/account', { method: 'DELETE' }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(adminState.verifyToken).not.toHaveBeenCalled();
    expect(adminState.query).not.toHaveBeenCalled();
    expect(adminState.transact).not.toHaveBeenCalled();
    expect(adminState.deleteUser).not.toHaveBeenCalled();
  });

  it('rejects requests when the configured admin env vars are missing', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('EXPO_PUBLIC_INSTANT_APP_ID', '');
    vi.stubEnv('INSTANT_ADMIN_TOKEN', '');
    const route = await import('../../app/api/account+api');

    const response = await route.DELETE(new Request('https://pacto.test/api/account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user-1' }),
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Account API is not configured.' });
    expect(adminState.verifyToken).not.toHaveBeenCalled();
    expect(adminState.query).not.toHaveBeenCalled();
    expect(adminState.transact).not.toHaveBeenCalled();
    expect(adminState.deleteUser).not.toHaveBeenCalled();
  });

  it('forbids deleting a different user id than the token subject', async () => {
    const route = await import('../../app/api/account+api');

    const response = await route.DELETE(new Request('https://pacto.test/api/account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user-2' }),
    }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Forbidden' });
    expect(adminState.verifyToken).toHaveBeenCalledWith('refresh-token');
    expect(adminState.query).not.toHaveBeenCalled();
    expect(adminState.transact).not.toHaveBeenCalled();
    expect(adminState.deleteUser).not.toHaveBeenCalled();
  });

  it('deletes the authenticated account even when no related rows exist', async () => {
    const route = await import('../../app/api/account+api');

    const response = await route.DELETE(new Request('https://pacto.test/api/account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(adminState.verifyToken).toHaveBeenCalledWith('refresh-token');
    expect(adminState.query).toHaveBeenCalledTimes(1);
    expect(adminState.transact).not.toHaveBeenCalled();
    expect(adminState.deleteUser).toHaveBeenCalledWith({ id: 'user-1' });
  });

  it('rejects bad bearer tokens', async () => {
    adminState.verifyToken.mockRejectedValueOnce(new Error('invalid'));
    const route = await import('../../app/api/account+api');

    const response = await route.DELETE(new Request('https://pacto.test/api/account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer bad-token' },
    }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(adminState.verifyToken).toHaveBeenCalledWith('bad-token');
    expect(adminState.query).not.toHaveBeenCalled();
    expect(adminState.transact).not.toHaveBeenCalled();
    expect(adminState.deleteUser).not.toHaveBeenCalled();
  });

  it('deletes account-linked data and then deletes the account', async () => {
    const route = await import('../../app/api/account+api');
    adminState.query.mockResolvedValue({
      data: {
        $users: [{ id: 'user-1', avatarPath: 'avatars/user-1/avatar.jpg' }],
        profiles: [{ id: 'profile-1', user: { id: 'user-1' } }],
        devices: [{ id: 'device-1', user: { id: 'user-1' } }],
        memories: [
          {
            id: 'memory-1',
            author: { id: 'user-1' },
            space: { id: 'space-personal', kind: 'solo' },
            attachments: [
              { mediaPath: 'users/user-1/spaces/space-personal/memories/private.jpg' },
              { mediaPath: 'users/user-2/spaces/space-personal/memories/shared.jpg' },
            ],
          },
        ],
        journalEntries: [
          {
            id: 'journal-1',
            author: { id: 'user-1' },
            mediaPaths: [
              'users/user-1/spaces/space-personal/journal/private.jpg',
              'legacy/journal/other.jpg',
            ],
          },
        ],
        memberships: [
          {
            id: 'membership-personal',
            space: {
              id: 'space-personal',
              kind: 'solo',
              memberships: [{ user: { id: 'user-1' }, id: 'membership-personal' }],
            },
          },
          {
            id: 'membership-shared',
            space: {
              id: 'space-shared',
              kind: 'pair',
              memberships: [
                { id: 'membership-shared', user: { id: 'user-1' } },
                { id: 'membership-other', user: { id: 'user-2' } },
              ],
            },
          },
        ],
        reminders: [
          {
            id: 'reminder-1',
            isPrivate: false,
            couple: { kind: 'pair', id: 'space-shared' },
            createdBy: { id: 'user-2' },
            assignedTo: { id: 'user-1' },
            completedBy: { id: 'user-1' },
          },
        ],
        taskLists: [
          {
            id: 'task-list-1',
            createdBy: { id: 'user-1' },
            couple: { kind: 'pair', id: 'space-shared' },
          },
        ],
        ringsHistory: [
          { id: 'ring-1', membership: { id: 'membership-shared', user: { id: 'user-1' } } },
        ],
        memoryReactions: [
          { id: 'reaction-1', user: { id: 'user-1' } },
        ],
        memoryPollVotes: [
          { id: 'vote-1', user: { id: 'user-1' } },
        ],
        tasks: [
          {
            id: 'task-1',
            isPrivate: false,
            couple: { kind: 'pair', id: 'space-shared' },
            createdBy: { id: 'user-1' },
            assignedTo: { id: 'user-1' },
            completedBy: { id: 'user-2' },
          },
        ],
        wishlistItems: [
          {
            id: 'wishlist-item-owned',
            addedBy: { id: 'user-1' },
            purchasedBy: { id: 'user-2' },
            couple: { kind: 'pair', id: 'space-shared' },
          },
          {
            id: 'wishlist-item-purchased',
            addedBy: { id: 'user-2' },
            purchasedBy: { id: 'user-1' },
            couple: { kind: 'pair', id: 'space-shared' },
          },
        ],
      },
    });

    const response = await route.DELETE(new Request('https://pacto.test/api/account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user-1' }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(adminState.query).toHaveBeenCalledTimes(1);
    expect(adminState.transact).toHaveBeenCalledTimes(1);
    expect(adminState.deleteUser).toHaveBeenCalledWith({ id: 'user-1' });

    const ops = adminState.transact.mock.calls[0][0];
    expect(ops).toEqual(
      expect.arrayContaining([
        { table: 'profiles', entityId: 'profile-1', type: 'delete' },
        { table: 'devices', entityId: 'device-1', type: 'delete' },
        { table: 'taskLists', entityId: 'task-list-1', type: 'unlink', links: { createdBy: 'user-1' } },
        { table: 'ringsHistory', entityId: 'ring-1', type: 'delete' },
        { table: 'memoryReactions', entityId: 'reaction-1', type: 'delete' },
        { table: 'memoryPollVotes', entityId: 'vote-1', type: 'delete' },
        { table: 'memories', entityId: 'memory-1', type: 'delete' },
        { table: '$files', entityId: 'lookup:path:avatars/user-1/avatar.jpg', type: 'delete' },
        { table: '$files', entityId: 'lookup:path:users/user-1/spaces/space-personal/memories/private.jpg', type: 'delete' },
        { table: '$files', entityId: 'lookup:path:users/user-1/spaces/space-personal/journal/private.jpg', type: 'delete' },
        { table: 'memberships', entityId: 'membership-shared', type: 'delete' },
        { table: 'spaces', entityId: 'space-personal', type: 'delete' },
        { table: '$users', entityId: 'user-1', type: 'delete' },
      ]),
    );
    expect(ops).toEqual(
      expect.arrayContaining([
        {
          table: 'reminders',
          entityId: 'reminder-1',
          type: 'unlink',
          links: { assignedTo: 'user-1' },
        },
        {
          table: 'reminders',
          entityId: 'reminder-1',
          type: 'unlink',
          links: { completedBy: 'user-1' },
        },
        {
          table: 'tasks',
          entityId: 'task-1',
          type: 'delete',
        },
        {
          table: 'wishlistItems',
          entityId: 'wishlist-item-owned',
          type: 'delete',
        },
        {
          table: 'wishlistItems',
          entityId: 'wishlist-item-purchased',
          type: 'unlink',
          links: { purchasedBy: 'user-1' },
        },
      ]),
    );

    const query = adminState.query.mock.calls[0][0];
    expect(query.wishlistItems).toEqual({
      $: {
        where: {
          or: [{ 'addedBy.id': 'user-1' }, { 'purchasedBy.id': 'user-1' }],
        },
      },
      addedBy: {},
      purchasedBy: {},
      couple: {},
    });
  });

  it('batches large account deletion operations to avoid oversized transactions', async () => {
    const route = await import('../../app/api/account+api');
    adminState.query.mockResolvedValue({
      data: {
        profiles: Array.from({ length: 205 }, (_, index) => ({
          id: `profile-${index + 1}`,
          user: { id: 'user-1' },
        })),
      },
    });

    const response = await route.DELETE(new Request('https://pacto.test/api/account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(adminState.transact).toHaveBeenCalledTimes(2);
    expect(adminState.transact.mock.calls[0][0]).toHaveLength(200);
    expect(adminState.transact.mock.calls[1][0]).toHaveLength(5);
    expect(adminState.deleteUser).toHaveBeenCalledWith({ id: 'user-1' });
  });

  // SEC-4: the deletion targets are derived ENTIRELY server-side from the
  // authenticated user's queried memberships. Client-supplied membership/space
  // hints (membershipId/spaceId/personal*/shared*/isLastMember) are IGNORED.
  // Because the admin SDK bypasses instant.perms.ts, honoring those hints would
  // let a caller delete spaces/memberships that are not theirs. Here the server
  // query returns NO memberships, so NO spaces or memberships may be deleted —
  // even though the client supplied space ids it would like removed.
  it('ignores client-supplied deletion context when memberships are not returned by query', async () => {
    const route = await import('../../app/api/account+api');
    adminState.query.mockResolvedValue({
      data: {
        $users: [{ id: 'user-1', avatarPath: 'avatars/user-1/avatar.jpg' }],
      },
    });

    const response = await route.DELETE(new Request('https://pacto.test/api/account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-1',
        membershipId: 'membership-fallback',
        spaceId: 'space-fallback',
        isLastMember: false,
        personalMembershipId: 'membership-personal',
        personalSpaceId: 'space-personal',
        sharedMembershipId: 'membership-shared',
        sharedSpaceId: 'space-shared',
        sharedIsLastMember: true,
      }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    expect(adminState.query).toHaveBeenCalledTimes(1);
    expect(adminState.transact).toHaveBeenCalledTimes(1);
    const ops = adminState.transact.mock.calls[0][0];

    // Only the user's own avatar + the user row are deleted; the client hints
    // do NOT cause any space or membership deletions.
    expect(ops).toEqual(
      expect.arrayContaining([
        { table: '$files', entityId: 'lookup:path:avatars/user-1/avatar.jpg', type: 'delete' },
        { table: '$users', entityId: 'user-1', type: 'delete' },
      ]),
    );

    const deletedTables = ops.map((op: any) => `${op.table}:${op.type}`);
    expect(deletedTables).not.toContain('spaces:delete');
    expect(deletedTables).not.toContain('memberships:delete');
    expect(ops).not.toContainEqual({ table: 'spaces', entityId: 'space-shared', type: 'delete' });
    expect(ops).not.toContainEqual({ table: 'spaces', entityId: 'space-personal', type: 'delete' });
    expect(ops).not.toContainEqual({ table: 'spaces', entityId: 'space-fallback', type: 'delete' });
  });

  it('does not explicitly delete memberships when deleting spaces owned solely by the user', async () => {
    const route = await import('../../app/api/account+api');
    adminState.query.mockResolvedValue({
      data: {
        $users: [{ id: 'user-1' }],
        memberships: [
          {
            id: 'membership-personal',
            space: {
              id: 'space-personal',
              kind: 'solo',
              memberships: [{ id: 'membership-personal', user: { id: 'user-1' } }],
            },
          },
          {
            id: 'membership-shared',
            space: {
              id: 'space-shared',
              kind: 'pair',
              memberships: [{ id: 'membership-shared', user: { id: 'user-1' } }],
            },
          },
        ],
      },
    });

    // SEC-4: send NO client deletion context. The space deletions below are
    // derived purely from the server-queried memberships (the user is the sole
    // remaining member of each space), proving client hints are not required.
    const response = await route.DELETE(
      new Request('https://pacto.test/api/account', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    const ops = adminState.transact.mock.calls[0][0];
    expect(ops).toEqual(
      expect.arrayContaining([
        { table: 'spaces', entityId: 'space-personal', type: 'delete' },
        { table: 'spaces', entityId: 'space-shared', type: 'delete' },
        { table: '$users', entityId: 'user-1', type: 'delete' },
      ]),
    );
    expect(ops).not.toContainEqual({ table: 'memberships', entityId: 'membership-personal', type: 'delete' });
    expect(ops).not.toContainEqual({ table: 'memberships', entityId: 'membership-shared', type: 'delete' });
  });

  it('returns 500 when account data cleanup fails', async () => {
    adminState.transact.mockRejectedValueOnce(new Error('transact failed'));
    adminState.query.mockResolvedValueOnce({
      data: {
        $users: [{ id: 'user-1', avatarPath: 'avatars/user-1/avatar.jpg' }],
      },
    });
    const route = await import('../../app/api/account+api');

    const response = await route.DELETE(new Request('https://pacto.test/api/account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Could not delete account.' });
    expect(adminState.transact).toHaveBeenCalled();
    expect(adminState.deleteUser).not.toHaveBeenCalled();
  });

  it('returns 500 when auth delete fails', async () => {
    adminState.deleteUser.mockRejectedValue(new Error('boom'));
    const route = await import('../../app/api/account+api');

    const response = await route.DELETE(new Request('https://pacto.test/api/account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer refresh-token', 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Could not delete account.' });
    expect(adminState.deleteUser).toHaveBeenCalledWith({ id: 'user-1' });
  });
});
