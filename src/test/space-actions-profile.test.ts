import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  queryOnce: vi.fn(async (_query: any) => ({ data: {} })),
  storage: {
    uploadFile: vi.fn(async (_path: string, _file: File, _options: any) => undefined),
  },
  transact: vi.fn(async (_ops: any) => undefined),
}));

vi.mock('@/src/lib/db', () => ({
  db: dbMock,
}));

vi.mock('@instantdb/react-native', () => ({
  id: () => 'mock-id',
  lookup: (field: string, value: string) => {
    const ref = { field, value };
    Object.defineProperty(ref, 'toString', {
      enumerable: false,
      value: () => `lookup:${field}:${value}`,
    });
    return ref;
  },
  tx: new Proxy(
    {},
    {
      get: (_target, table: string) =>
        new Proxy(
          {},
          {
            get: (_entityTarget, entityId: string) => ({
              update: (payload: Record<string, unknown>) => {
                const op = {
                  table,
                  entityId,
                  type: 'update',
                  payload,
                };
                Object.defineProperty(op, 'link', {
                  enumerable: false,
                  value: (links: Record<string, unknown>) => ({
                    ...op,
                    links,
                  }),
                });
                return op;
              },
              link: (links: Record<string, unknown>) => ({
                table,
                entityId,
                type: 'link',
                links,
              }),
              unlink: (links: Record<string, unknown>) => ({
                table,
                entityId,
                type: 'unlink',
                links,
              }),
              delete: () => ({ table, entityId, type: 'delete' }),
            }),
          },
        ),
    },
  ),
}));

import {
  deleteAccountData,
  deleteUploadedAvatar,
  createSpace,
  createSharedPactInvite,
  ensureSoloSpaceForUser,
  ensureUserRow,
  joinSpaceByCode,
  leaveSpace,
  regenerateInviteCode,
  updateUserAvatar,
  updateUserProfile,
  uploadAvatarFromUri,
} from '@/src/lib/space-actions';

describe('space profile actions', () => {
  beforeEach(() => {
    dbMock.queryOnce.mockReset();
    dbMock.queryOnce.mockResolvedValue({ data: {} });
    dbMock.storage.uploadFile.mockClear();
    dbMock.transact.mockReset();
    dbMock.transact.mockResolvedValue(undefined);
  });

  function mockLeaveMembership(kind: 'solo' | 'pair' | 'couple' | 'crew' = 'pair', memberCount?: number) {
    const totalMembers = memberCount ?? (kind === 'solo' ? 1 : 2);
    const memberships = Array.from({ length: Math.max(totalMembers, 1) }, (_, index) => ({
      id: index === 0 ? 'membership-1' : `membership-${index + 1}`,
      user: { id: index === 0 ? 'user-1' : `user-${index + 1}` },
    }));
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        memberships: [
          {
            id: 'membership-1',
            space: { id: 'space-1', kind, memberships },
          },
        ],
      },
    });
  }

  it('persists a trimmed display name to the Instant user row', async () => {
    await updateUserProfile({ userId: 'user-1', displayName: '  Matteo  ' });

    expect(dbMock.transact).toHaveBeenCalledWith([
      {
        table: '$users',
        entityId: 'user-1',
        type: 'update',
        payload: { displayName: 'Matteo' },
      },
    ]);
  });

  it('persists default avatar ids and clears the previous uploaded avatar path', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        $users: [
          {
            id: 'user-1',
            avatarPath: 'avatars/user-1/old.jpg',
          },
        ],
      },
    });

    await updateUserAvatar({ userId: 'user-1', avatarUrl: 'pacto:avatar-2' });

    expect(dbMock.queryOnce).toHaveBeenCalledWith({
      $users: { $: { where: { id: 'user-1' } } },
    });
    expect(dbMock.transact).toHaveBeenCalledWith(
      expect.arrayContaining([
        {
          table: '$files',
          entityId: 'lookup:path:avatars/user-1/old.jpg',
          type: 'delete',
        },
        {
          table: '$users',
          entityId: 'user-1',
          type: 'update',
          payload: { avatarUrl: 'pacto:avatar-2', avatarPath: null },
        },
      ]),
    );
  });

  it('stores uploaded avatar paths and deletes a replaced owner-scoped avatar file', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        $users: [
          {
            id: 'user-1',
            avatarPath: 'avatars/user-1/old.jpg',
          },
        ],
      },
    });

    await updateUserAvatar({
      userId: 'user-1',
      avatarUrl: 'https://cdn.pacto.test/new.jpg',
      avatarPath: 'avatars/user-1/new.jpg',
    });

    expect(dbMock.transact).toHaveBeenCalledWith(
      expect.arrayContaining([
        {
          table: '$files',
          entityId: 'lookup:path:avatars/user-1/old.jpg',
          type: 'delete',
        },
        {
          table: '$users',
          entityId: 'user-1',
          type: 'update',
          payload: {
            avatarUrl: 'https://cdn.pacto.test/new.jpg',
            avatarPath: 'avatars/user-1/new.jpg',
          },
        },
      ]),
    );
  });

  it('returns both the uploaded avatar URL and owner-scoped storage path', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        blob: async () => new Blob(['avatar'], { type: 'image/png' }),
      })),
    );
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        $files: [{ url: 'https://cdn.pacto.test/avatar.png' }],
      },
    });

    const result = await uploadAvatarFromUri({
      userId: 'user-1',
      uri: 'file:///tmp/avatar.png',
      contentType: 'image/png',
    });

    expect(result).toEqual({
      avatarUrl: 'https://cdn.pacto.test/avatar.png',
      avatarPath: expect.stringMatching(/^avatars\/user-1\/\d+\.png$/),
    });
    expect(dbMock.storage.uploadFile).toHaveBeenCalledWith(
      expect.stringMatching(/^avatars\/user-1\/\d+\.png$/),
      expect.any(File),
      { contentType: 'image/png' },
    );
  });

  it('deletes an uploaded avatar file by owner-scoped path', async () => {
    await deleteUploadedAvatar({
      userId: 'user-1',
      avatarPath: 'avatars/user-1/failed-update.png',
    });

    expect(dbMock.transact).toHaveBeenCalledWith([
      {
        table: '$files',
        entityId: 'lookup:path:avatars/user-1/failed-update.png',
        type: 'delete',
      },
    ]);
  });

  it('lets onboarding seed both display name and avatar in one user update', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        $users: [{ id: 'user-1', baseSoloSpace: [{ id: 'solo-space' }] }],
        memberships: [
          { id: 'solo-membership', space: { id: 'solo-space', kind: 'solo' } },
        ],
      },
    });

    await ensureUserRow({
      userId: 'user-1',
      email: 'me@pacto.app',
      displayName: '  Me  ',
      avatarUrl: 'pacto:avatar-1',
    });

    expect(dbMock.transact).toHaveBeenCalledWith([
      {
        table: '$users',
        entityId: 'user-1',
        type: 'update',
        payload: {
          displayName: 'Me',
          avatarUrl: 'pacto:avatar-1',
        },
      },
    ]);
  });

  it('does not transact when there are no profile fields to persist', async () => {
    await updateUserProfile({ userId: 'user-1' });

    expect(dbMock.transact).not.toHaveBeenCalled();
  });

  it('creates and links a base solo space when the user has none', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({ data: { $users: [{ id: 'user-1' }], memberships: [] } });

    const result = await ensureSoloSpaceForUser({ userId: 'user-1' });

    expect(result).toEqual({ spaceId: 'mock-id', membershipId: 'mock-id' });
    expect(dbMock.transact).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'spaces',
          entityId: 'mock-id',
          type: 'update',
          payload: expect.objectContaining({ kind: 'solo' }),
          links: { createdBy: 'user-1' },
        }),
        expect.objectContaining({
          table: 'memberships',
          entityId: 'mock-id',
          type: 'update',
          payload: expect.objectContaining({ role: 'owner' }),
          links: { user: 'user-1', space: 'mock-id' },
        }),
        {
          table: '$users',
          entityId: 'user-1',
          type: 'link',
          links: { baseSoloSpace: 'mock-id' },
        },
      ]),
    );
  });

  it('repairs a base solo link that points at a shared pact during ensure', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        $users: [{ id: 'user-1', baseSoloSpace: [{ id: 'pair-space', kind: 'pair' }] }],
        memberships: [
          { id: 'pair-membership', space: { id: 'pair-space', kind: 'pair' } },
          { id: 'solo-membership', space: { id: 'solo-space', kind: 'solo' } },
        ],
      },
    });

    const result = await ensureSoloSpaceForUser({ userId: 'user-1' });

    expect(result).toEqual({ spaceId: 'solo-space', membershipId: 'solo-membership' });
    expect(dbMock.transact).toHaveBeenCalledWith([
      {
        table: '$users',
        entityId: 'user-1',
        type: 'link',
        links: { baseSoloSpace: 'solo-space' },
      },
    ]);
  });

  it('creates a shared pact invite without mutating the base solo pact', async () => {
    await createSharedPactInvite({ userId: 'user-1', mode: 'pair' });

    expect(dbMock.transact).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'spaces',
          entityId: 'mock-id',
          type: 'update',
          payload: expect.objectContaining({ kind: 'pair' }),
          links: { createdBy: 'user-1' },
        }),
        expect.objectContaining({
          table: 'memberships',
          entityId: 'mock-id',
          type: 'update',
          payload: expect.objectContaining({ role: 'owner' }),
          links: { user: 'user-1', space: 'mock-id' },
        }),
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual(
      expect.objectContaining({ entityId: 'solo-space' }),
    );
  });

  it('creates a zeroed media quota row when creating a new space', async () => {
    await createSpace({ userId: 'user-1', kind: 'couple', mode: 'pair' });

    expect(dbMock.transact).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'mediaQuotaUsage',
          type: 'update',
          payload: expect.objectContaining({
            bytesUsed: 0,
          }),
          links: { space: 'mock-id' },
        }),
      ]),
    );
  });

  it('promotes a full pair to crew when generating a third-member invite', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        memberships: [
          {
            id: 'membership-1',
            space: { id: 'pair-space', kind: 'pair' },
          },
        ],
      },
    });

    await regenerateInviteCode({ spaceId: 'pair-space', userId: 'user-1', promoteToCrew: true });

    expect(dbMock.transact).toHaveBeenCalledWith([
      expect.objectContaining({
        table: 'spaces',
        entityId: 'pair-space',
        type: 'update',
        payload: expect.objectContaining({
          kind: 'crew',
          enabledFeatures: [
            'tasks',
            'calendar',
            'memoryFeed',
            'recurring',
            'timetable',
            'goals',
          ],
        }),
      }),
    ]);
  });

  it('fails closed before regenerating an invite for a space outside the current user memberships', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({ data: { memberships: [] } });

    await expect(
      regenerateInviteCode({
        spaceId: 'pair-space',
        userId: 'user-1',
        promoteToCrew: true,
      }),
    ).rejects.toThrow('Space not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
  });

  it('regenerates an invite after proving the current user belongs to the space', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        memberships: [
          {
            id: 'membership-1',
            space: { id: 'pair-space', kind: 'pair' },
          },
        ],
      },
    });

    await regenerateInviteCode({
      spaceId: 'pair-space',
      userId: 'user-1',
      promoteToCrew: true,
    });

    expect(dbMock.transact).toHaveBeenCalledWith([
      expect.objectContaining({
        table: 'spaces',
        entityId: 'pair-space',
        type: 'update',
        payload: expect.objectContaining({
          inviteCode: expect.any(String),
          kind: 'crew',
        }),
      }),
    ]);
  });

  it('reuses an existing one-person pending shared invite instead of creating another shared pact', async () => {
    dbMock.queryOnce
      .mockResolvedValueOnce({
        data: {
          $users: [{ id: 'user-1', baseSoloSpace: [{ id: 'solo-space' }] }],
          memberships: [{ id: 'solo-membership', space: { id: 'solo-space', kind: 'solo' } }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          memberships: [
            {
              id: 'pending-membership',
              space: {
                id: 'pending-space',
                kind: 'pair',
                inviteCode: 'OLD234',
                memberships: [{ id: 'pending-membership', user: { id: 'user-1' } }],
              },
            },
          ],
        },
      });

    const code = await createSharedPactInvite({ userId: 'user-1', mode: 'pair' });

    expect(code).toBe('OLD234');
    expect(dbMock.transact).not.toHaveBeenCalled();
  });

  it('joins by crew invite code, keeps the base solo pact, then consumes the code', async () => {
    dbMock.queryOnce
      .mockResolvedValueOnce({
        data: {
          $users: [{ id: 'user-1', baseSoloSpace: [{ id: 'solo-space' }] }],
          memberships: [{ id: 'solo-membership', space: { id: 'solo-space', kind: 'solo' } }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          spaces: [
            {
              id: 'shared-space',
              kind: 'crew',
              memberships: [
                { id: 'owner-membership', user: { id: 'owner-user' } },
                { id: 'partner-membership', user: { id: 'partner-user' } },
              ],
            },
          ],
        },
      });

    await joinSpaceByCode({
      userId: 'user-1',
      code: 'ABC234',
      currentSoloMembershipId: 'solo-membership',
      currentSoloSpaceId: 'solo-space',
    });

    expect(dbMock.queryOnce).toHaveBeenLastCalledWith({
      spaces: {
        $: { where: { inviteCode: 'ABC234' } },
        memberships: { user: {} },
      },
    });
    expect(dbMock.transact).toHaveBeenCalledTimes(2);
    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'memberships',
          links: {
            user: 'user-1',
            space: { field: 'inviteCode', value: 'ABC234' },
          },
        }),
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'memberships',
      entityId: 'solo-membership',
      type: 'delete',
    });
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'spaces',
      entityId: 'solo-space',
      type: 'delete',
    });
    expect(dbMock.transact.mock.calls[1][0]).toEqual([
      expect.objectContaining({
        table: 'spaces',
        type: 'update',
        payload: expect.objectContaining({
          inviteCode: null,
        }),
      }),
    ]);
    expect(dbMock.transact.mock.calls[1][0][0].payload).not.toHaveProperty('kind');
  });

  it('rejects full pair invite codes before trying to create the third membership', async () => {
    dbMock.queryOnce
      .mockResolvedValueOnce({
        data: {
          $users: [{ id: 'user-1', baseSoloSpace: [{ id: 'solo-space' }] }],
          memberships: [{ id: 'solo-membership', space: { id: 'solo-space', kind: 'solo' } }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          spaces: [
            {
              id: 'pair-space',
              kind: 'pair',
              memberships: [
                { id: 'owner-membership', user: { id: 'owner-user' } },
                { id: 'partner-membership', user: { id: 'partner-user' } },
              ],
            },
          ],
        },
      });

    await expect(
      joinSpaceByCode({
        userId: 'user-1',
        code: 'ABC234',
      }),
    ).rejects.toThrow('fresh crew invite');

    expect(dbMock.transact).not.toHaveBeenCalled();
  });

  it('does not reject a successful join when invite-code cleanup fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    dbMock.queryOnce
      .mockResolvedValueOnce({
        data: {
          $users: [{ id: 'user-1', baseSoloSpace: [{ id: 'solo-space' }] }],
          memberships: [{ id: 'solo-membership', space: { id: 'solo-space', kind: 'solo' } }],
        },
      })
      .mockResolvedValueOnce({ data: { spaces: [{ id: 'shared-space', kind: 'pair' }] } });
    dbMock.transact.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('permission'));

    try {
      await expect(
        joinSpaceByCode({
          userId: 'user-1',
          code: 'ABC234',
        }),
      ).resolves.toBeUndefined();
    } finally {
      warnSpy.mockRestore();
    }

    expect(dbMock.transact).toHaveBeenCalledTimes(2);
  });

  it('rejects invite joins when the user is already a member of the target space', async () => {
    dbMock.queryOnce
      .mockResolvedValueOnce({
        data: {
          $users: [{ id: 'user-1', baseSoloSpace: [{ id: 'solo-space' }] }],
          memberships: [{ id: 'solo-membership', space: { id: 'solo-space', kind: 'solo' } }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          spaces: [
            {
              id: 'shared-space',
              kind: 'pair',
              memberships: [
                { id: 'owner-membership', user: { id: 'user-1' } },
              ],
            },
          ],
        },
      });

    await expect(
      joinSpaceByCode({
        userId: 'user-1',
        code: 'ABC234',
      }),
    ).rejects.toThrow('already a member');

    expect(dbMock.transact).not.toHaveBeenCalled();
  });

  it('does not replace a solo pact membership while joining by invite code', async () => {
    dbMock.queryOnce
      .mockResolvedValueOnce({
        data: {
          $users: [{ id: 'user-1', baseSoloSpace: [{ id: 'solo-space' }] }],
          memberships: [{ id: 'solo-membership', space: { id: 'solo-space', kind: 'solo' } }],
        },
      })
      .mockResolvedValueOnce({ data: { spaces: [{ id: 'shared-space', kind: 'couple' }] } });

    await joinSpaceByCode({
      userId: 'user-1',
      code: 'ABC234',
      currentSoloMembershipId: 'solo-membership',
      currentSoloSpaceId: 'solo-space',
    });

    expect(dbMock.transact).toHaveBeenCalledTimes(2);
    const ops = dbMock.transact.mock.calls[0][0];
    expect(ops).not.toContainEqual({ table: 'memberships', entityId: 'solo-membership', type: 'delete' });
    expect(ops).not.toContainEqual({ table: 'spaces', entityId: 'solo-space', type: 'delete' });
    expect(ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'memberships',
          entityId: 'mock-id',
          type: 'update',
          payload: expect.objectContaining({ role: 'partner' }),
          links: {
            user: 'user-1',
            space: { field: 'inviteCode', value: 'ABC234' },
          },
        }),
      ]),
    );
    expect(dbMock.transact.mock.calls[1][0]).toEqual([
      expect.objectContaining({
        table: 'spaces',
        type: 'update',
        payload: expect.objectContaining({ inviteCode: null }),
      }),
    ]);
    expect(dbMock.transact.mock.calls[1][0][0].payload).not.toHaveProperty('kind');
  });

  it('rejects stale solo invite codes before adding the user to someone else base solo pact', async () => {
    dbMock.queryOnce
      .mockResolvedValueOnce({
        data: {
          $users: [{ id: 'user-1', baseSoloSpace: [{ id: 'solo-space' }] }],
          memberships: [{ id: 'solo-membership', space: { id: 'solo-space', kind: 'solo' } }],
        },
      })
      .mockResolvedValueOnce({ data: { spaces: [{ id: 'other-solo', kind: 'solo' }] } });

    await expect(
      joinSpaceByCode({
        userId: 'user-1',
        code: 'ABC234',
      }),
    ).rejects.toThrow('no longer valid');

    expect(dbMock.transact).not.toHaveBeenCalled();
  });

  it('fails closed before leave cleanup when the membership is outside the current user space', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({ data: { memberships: [] } });

    await expect(
      leaveSpace({
        userId: 'user-1',
        spaceId: 'space-1',
        membershipId: 'membership-1',
        isLastMember: false,
        remainingMemberCount: 2,
        personalSpaceId: 'solo-base',
      }),
    ).rejects.toThrow('Space not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
  });

  it('refuses to leave the permanent personal solo space before deleting membership rows', async () => {
    mockLeaveMembership('solo');

    await expect(
      leaveSpace({
        userId: 'user-1',
        spaceId: 'space-1',
        membershipId: 'membership-1',
        isLastMember: false,
        remainingMemberCount: 0,
        personalSpaceId: 'space-1',
      }),
    ).rejects.toThrow('Cannot leave personal solo space');

    expect(dbMock.transact).not.toHaveBeenCalled();
  });

  it('leaves a shared pact without downgrading it into the base solo pact', async () => {
    mockLeaveMembership();

    await leaveSpace({
      userId: 'user-1',
      spaceId: 'space-1',
      membershipId: 'membership-1',
      isLastMember: false,
      remainingMemberCount: 1,
      personalSpaceId: 'solo-space',
    });

    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        { table: 'memberships', entityId: 'membership-1', type: 'delete' },
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: 'spaces', entityId: 'space-1', type: 'update' }),
      ]),
    );
  });

  it('deletes a stale sole-member shared pact even when the caller thinks another member remains', async () => {
    mockLeaveMembership('pair', 1);

    await leaveSpace({
      userId: 'user-1',
      spaceId: 'space-1',
      membershipId: 'membership-1',
      isLastMember: false,
      remainingMemberCount: 1,
      personalSpaceId: 'solo-base',
    });

    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        { table: 'memberships', entityId: 'membership-1', type: 'delete' },
        { table: 'spaces', entityId: 'space-1', type: 'delete' },
      ]),
    );
  });

  it('keeps a shared pact when the membership query shows remaining members despite a stale last-member caller flag', async () => {
    mockLeaveMembership('pair', 2);
    dbMock.queryOnce
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({
        data: {
          tasks: [{ id: 'shared-task', assignedTo: { id: 'user-1' } }],
        },
      });

    await leaveSpace({
      userId: 'user-1',
      spaceId: 'space-1',
      membershipId: 'membership-1',
      isLastMember: true,
      remainingMemberCount: 0,
      personalSpaceId: 'solo-base',
    });

    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        { table: 'tasks', entityId: 'shared-task', type: 'unlink', links: { assignedTo: 'user-1' } },
        { table: 'memberships', entityId: 'membership-1', type: 'delete' },
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'spaces',
      entityId: 'space-1',
      type: 'delete',
    });
  });

  it('keeps private authored data by moving it into the permanent base solo pact when leaving', async () => {
    mockLeaveMembership();
    dbMock.queryOnce
      .mockResolvedValueOnce({
        data: {
          journalEntries: [{ id: 'journal-private' }],
          plans: [{ id: 'plan-private' }],
          memories: [{ id: 'memory-private', attachments: [{ id: 'attachment-1' }] }],
        },
      });

    await leaveSpace({
      userId: 'user-1',
      spaceId: 'space-1',
      membershipId: 'membership-1',
      isLastMember: false,
      remainingMemberCount: 2,
      personalSpaceId: 'solo-base',
    });

    expect(dbMock.queryOnce).toHaveBeenCalledWith(
      expect.objectContaining({
        journalEntries: {
          $: {
            where: {
              'author.id': 'user-1',
              'couple.id': 'space-1',
              isPrivate: true,
            },
          },
        },
        plans: {
          $: {
            where: {
              'createdBy.id': 'user-1',
              'couple.id': 'space-1',
              isPrivate: true,
            },
          },
        },
        memories: {
          $: {
            where: {
              'author.id': 'user-1',
              'space.id': 'space-1',
              isPrivate: true,
            },
          },
          attachments: {},
        },
      }),
    );

    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        {
          table: 'journalEntries',
          entityId: 'journal-private',
          type: 'link',
          links: { couple: 'solo-base' },
        },
        {
          table: 'plans',
          entityId: 'plan-private',
          type: 'link',
          links: { couple: 'solo-base' },
        },
        {
          table: 'memories',
          entityId: 'memory-private',
          type: 'link',
          links: { space: 'solo-base' },
        },
        {
          table: 'memoryAttachments',
          entityId: 'attachment-1',
          type: 'update',
          payload: { spaceId: 'solo-base' },
        },
        { table: 'memberships', entityId: 'membership-1', type: 'delete' },
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: 'spaces', payload: expect.objectContaining({ kind: 'solo' }) }),
      ]),
    );
  });

  it('keeps legacy solo timetables by moving them into the permanent base solo pact when leaving', async () => {
    mockLeaveMembership();
    dbMock.queryOnce
      .mockResolvedValueOnce({
        data: {
          timetables: [{ id: 'timetable-private', items: [{ id: 'item-1' }, { id: 'item-2' }] }],
        },
      });

    await leaveSpace({
      userId: 'user-1',
      spaceId: 'space-1',
      membershipId: 'membership-1',
      isLastMember: false,
      remainingMemberCount: 2,
      personalSpaceId: 'solo-base',
    });

    expect(dbMock.queryOnce).toHaveBeenCalledWith(
      expect.objectContaining({
        timetables: {
          $: {
            where: {
              'createdBy.id': 'user-1',
              'couple.id': 'space-1',
              share: 'solo',
            },
          },
          couple: {},
          items: { couple: {} },
        },
      }),
    );
    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        {
          table: 'timetables',
          entityId: 'timetable-private',
          type: 'link',
          links: { couple: 'solo-base' },
        },
        {
          table: 'timetableItems',
          entityId: 'item-1',
          type: 'link',
          links: { couple: 'solo-base' },
        },
        {
          table: 'timetableItems',
          entityId: 'item-2',
          type: 'link',
          links: { couple: 'solo-base' },
        },
        { table: 'memberships', entityId: 'membership-1', type: 'delete' },
      ]),
    );
  });

  it('does not move malformed timetable items from another space when leaving a shared pact', async () => {
    mockLeaveMembership();
    dbMock.queryOnce
      .mockResolvedValueOnce({
        data: {
          timetables: [
            {
              id: 'timetable-private',
              couple: { id: 'space-1' },
              items: [
                { id: 'valid-item', couple: { id: 'space-1' } },
                { id: 'cross-space-item', couple: { id: 'other-space' } },
              ],
            },
          ],
        },
      });

    await leaveSpace({
      userId: 'user-1',
      spaceId: 'space-1',
      membershipId: 'membership-1',
      isLastMember: false,
      remainingMemberCount: 2,
      personalSpaceId: 'solo-base',
    });

    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        {
          table: 'timetables',
          entityId: 'timetable-private',
          type: 'link',
          links: { couple: 'solo-base' },
        },
        {
          table: 'timetableItems',
          entityId: 'valid-item',
          type: 'link',
          links: { couple: 'solo-base' },
        },
        { table: 'memberships', entityId: 'membership-1', type: 'delete' },
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toEqual(
      expect.arrayContaining([
        {
          table: 'timetableItems',
          entityId: 'cross-space-item',
          type: 'link',
          links: { couple: 'solo-base' },
        },
      ]),
    );
  });

  it('removes stale former-member links from shared rows before leaving so the pact stays editable', async () => {
    mockLeaveMembership();
    dbMock.queryOnce
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({
        data: {
          plans: [{ id: 'shared-plan', isPrivate: false, createdBy: { id: 'user-1' } }],
          journalEntries: [{ id: 'shared-journal', isPrivate: false, author: { id: 'user-1' } }],
          tasks: [
            {
              id: 'shared-task',
              createdBy: { id: 'user-1' },
              assignedTo: { id: 'user-1' },
              completedBy: { id: 'partner-1' },
            },
          ],
          reminders: [
            {
              id: 'shared-reminder',
              createdBy: { id: 'partner-1' },
              assignedTo: { id: 'user-1' },
              completedBy: { id: 'user-1' },
            },
          ],
          memories: [
            { id: 'shared-memory', isPrivate: false, author: { id: 'user-1' } },
            { id: 'private-memory', isPrivate: true, author: { id: 'user-1' } },
          ],
          timetables: [
            { id: 'shared-timetable', share: 'shared', createdBy: { id: 'user-1' } },
            { id: 'solo-timetable', share: 'solo', createdBy: { id: 'user-1' } },
          ],
        },
      });

    await leaveSpace({
      userId: 'user-1',
      spaceId: 'space-1',
      membershipId: 'membership-1',
      isLastMember: false,
      remainingMemberCount: 2,
      personalSpaceId: 'solo-base',
    });

    expect(dbMock.queryOnce).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        plans: expect.objectContaining({
          $: { where: { 'couple.id': 'space-1' } },
          createdBy: {},
        }),
        tasks: expect.objectContaining({
          $: { where: { 'couple.id': 'space-1' } },
          createdBy: {},
          assignedTo: {},
          completedBy: {},
        }),
        reminders: expect.objectContaining({
          $: { where: { 'couple.id': 'space-1' } },
          createdBy: {},
          assignedTo: {},
          completedBy: {},
        }),
        memories: expect.objectContaining({
          $: { where: { 'space.id': 'space-1' } },
          author: {},
        }),
      }),
    );
    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        { table: 'plans', entityId: 'shared-plan', type: 'unlink', links: { createdBy: 'user-1' } },
        { table: 'journalEntries', entityId: 'shared-journal', type: 'unlink', links: { author: 'user-1' } },
        { table: 'tasks', entityId: 'shared-task', type: 'unlink', links: { createdBy: 'user-1' } },
        { table: 'tasks', entityId: 'shared-task', type: 'unlink', links: { assignedTo: 'user-1' } },
        { table: 'reminders', entityId: 'shared-reminder', type: 'unlink', links: { assignedTo: 'user-1' } },
        { table: 'reminders', entityId: 'shared-reminder', type: 'unlink', links: { completedBy: 'user-1' } },
        { table: 'memories', entityId: 'shared-memory', type: 'unlink', links: { author: 'user-1' } },
        { table: 'timetables', entityId: 'shared-timetable', type: 'unlink', links: { createdBy: 'user-1' } },
        { table: 'memberships', entityId: 'membership-1', type: 'delete' },
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual(
      { table: 'memories', entityId: 'private-memory', type: 'unlink', links: { author: 'user-1' } },
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual(
      { table: 'timetables', entityId: 'solo-timetable', type: 'unlink', links: { createdBy: 'user-1' } },
    );
  });

  it('removes former-member memory reactions and poll votes when leaving a shared pact', async () => {
    mockLeaveMembership();
    dbMock.queryOnce
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({
        data: {
          memoryReactions: [{ id: 'reaction-1' }],
          memoryPollVotes: [{ id: 'vote-1' }],
        },
      });

    await leaveSpace({
      userId: 'user-1',
      spaceId: 'space-1',
      membershipId: 'membership-1',
      isLastMember: false,
      remainingMemberCount: 2,
      personalSpaceId: 'solo-base',
    });

    expect(dbMock.queryOnce).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        memoryReactions: {
          $: {
            where: {
              'user.id': 'user-1',
              'memory.space.id': 'space-1',
            },
          },
        },
        memoryPollVotes: {
          $: {
            where: {
              'user.id': 'user-1',
              'option.poll.memory.space.id': 'space-1',
            },
          },
        },
      }),
    );
    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        { table: 'memoryReactions', entityId: 'reaction-1', type: 'delete' },
        { table: 'memoryPollVotes', entityId: 'vote-1', type: 'delete' },
        { table: 'memberships', entityId: 'membership-1', type: 'delete' },
      ]),
    );
  });

  it('deletes profile, device, membership, and solo space so linked data cascades', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        $users: { id: 'user-1' },
        profiles: [{ id: 'profile-1' }],
        devices: [{ id: 'device-1' }],
      },
    });

    await deleteAccountData({
      userId: 'user-1',
      membershipId: 'membership-1',
      spaceId: 'space-1',
      isLastMember: true,
    });

    expect(dbMock.queryOnce).toHaveBeenCalledWith(
      expect.objectContaining({
        $users: { $: { where: { id: 'user-1' } } },
        profiles: { $: { where: { 'user.id': 'user-1' } } },
        devices: { $: { where: { 'user.id': 'user-1' } } },
        memberships: {
          $: { where: { 'user.id': 'user-1' } },
          space: { memberships: { user: {} } },
        },
        journalEntries: { $: { where: { 'author.id': 'user-1' } } },
        memories: {
          $: { where: { 'author.id': 'user-1' } },
          attachments: {},
        },
      }),
    );
    expect(dbMock.transact).toHaveBeenCalledWith([
      { table: 'profiles', entityId: 'profile-1', type: 'delete' },
      { table: 'devices', entityId: 'device-1', type: 'delete' },
      { table: 'spaces', entityId: 'space-1', type: 'delete' },
    ]);
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'memberships',
      entityId: 'membership-1',
      type: 'delete',
    });
  });

  it('removes user-authored shared rows before leaving a non-solo pact', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        profiles: [{ id: 'profile-1' }],
        devices: [],
        memories: [{ id: 'memory-1' }],
        memoryReactions: [{ id: 'reaction-1' }],
        events: [{ id: 'event-1' }],
        ringsHistory: [{ id: 'ring-1' }],
      },
    });

    await deleteAccountData({
      userId: 'user-1',
      membershipId: 'membership-1',
      spaceId: 'space-1',
      isLastMember: false,
    });

    expect(dbMock.queryOnce).toHaveBeenCalledWith(
      expect.objectContaining({
        memories: {
          $: { where: { 'author.id': 'user-1' } },
          attachments: {},
        },
        memoryReactions: { $: { where: { 'user.id': 'user-1' } } },
        events: { $: { where: { 'createdBy.id': 'user-1' } } },
        ringsHistory: { $: { where: { 'membership.user.id': 'user-1' } } },
      }),
    );
    expect(dbMock.transact).toHaveBeenCalledWith(
      expect.arrayContaining([
        { table: 'profiles', entityId: 'profile-1', type: 'delete' },
        { table: 'memories', entityId: 'memory-1', type: 'delete' },
        { table: 'memoryReactions', entityId: 'reaction-1', type: 'delete' },
        { table: 'events', entityId: 'event-1', type: 'delete' },
        { table: 'ringsHistory', entityId: 'ring-1', type: 'delete' },
        { table: 'memberships', entityId: 'membership-1', type: 'delete' },
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'spaces',
      entityId: 'space-1',
      type: 'delete',
    });
  });

  it('unlinks deleted accounts from partner-owned task and reminder rows that remain shared', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        tasks: [
          {
            id: 'partner-task',
            couple: { id: 'shared-space', kind: 'pair' },
            createdBy: { id: 'partner-1' },
            assignedTo: { id: 'user-1' },
            completedBy: { id: 'user-1' },
          },
          {
            id: 'owned-task',
            couple: { id: 'shared-space', kind: 'pair' },
            createdBy: { id: 'user-1' },
            assignedTo: { id: 'user-1' },
          },
        ],
        reminders: [
          {
            id: 'partner-reminder',
            couple: { id: 'shared-space', kind: 'pair' },
            createdBy: { id: 'partner-1' },
            assignedTo: { id: 'user-1' },
            completedBy: { id: 'user-1' },
          },
        ],
      },
    });

    await deleteAccountData({
      userId: 'user-1',
      membershipId: 'membership-1',
      spaceId: 'space-1',
      isLastMember: false,
    });

    expect(dbMock.queryOnce).toHaveBeenCalledWith(
      expect.objectContaining({
        tasks: {
          $: {
            where: {
              or: [
                { 'createdBy.id': 'user-1' },
                { 'assignedTo.id': 'user-1' },
                { 'completedBy.id': 'user-1' },
              ],
            },
          },
          createdBy: {},
          assignedTo: {},
          completedBy: {},
          couple: {},
        },
        reminders: {
          $: {
            where: {
              or: [
                { 'createdBy.id': 'user-1' },
                { 'assignedTo.id': 'user-1' },
                { 'completedBy.id': 'user-1' },
              ],
            },
          },
          createdBy: {},
          assignedTo: {},
          completedBy: {},
          couple: {},
        },
      }),
    );
    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        { table: 'tasks', entityId: 'partner-task', type: 'unlink', links: { assignedTo: 'user-1' } },
        { table: 'tasks', entityId: 'partner-task', type: 'unlink', links: { completedBy: 'user-1' } },
        { table: 'tasks', entityId: 'owned-task', type: 'delete' },
        { table: 'reminders', entityId: 'partner-reminder', type: 'unlink', links: { assignedTo: 'user-1' } },
        { table: 'reminders', entityId: 'partner-reminder', type: 'unlink', links: { completedBy: 'user-1' } },
        { table: 'memberships', entityId: 'membership-1', type: 'delete' },
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'tasks',
      entityId: 'partner-task',
      type: 'delete',
    });
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'tasks',
      entityId: 'owned-task',
      type: 'unlink',
      links: { assignedTo: 'user-1' },
    });
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'tasks',
      entityId: 'owned-task',
      type: 'unlink',
      links: { createdBy: 'user-1' },
    });
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'reminders',
      entityId: 'partner-reminder',
      type: 'delete',
    });
  });

  it('preserves shared task-list and timetable containers when deleting their creator account', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        taskLists: [{ id: 'shared-list', couple: { id: 'shared-space', kind: 'pair' }, createdBy: { id: 'user-1' } }],
        timetables: [{ id: 'shared-timetable', share: 'shared', couple: { id: 'shared-space', kind: 'pair' }, createdBy: { id: 'user-1' } }],
      },
    });

    await deleteAccountData({
      userId: 'user-1',
      membershipId: 'membership-1',
      spaceId: 'space-1',
      isLastMember: false,
    });

    expect(dbMock.queryOnce).toHaveBeenCalledWith(
      expect.objectContaining({
        taskLists: { $: { where: { 'createdBy.id': 'user-1' } }, couple: {} },
        timetables: { $: { where: { 'createdBy.id': 'user-1' } }, couple: {} },
      }),
    );
    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        { table: 'taskLists', entityId: 'shared-list', type: 'unlink', links: { createdBy: 'user-1' } },
        { table: 'timetables', entityId: 'shared-timetable', type: 'unlink', links: { createdBy: 'user-1' } },
        { table: 'memberships', entityId: 'membership-1', type: 'delete' },
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'taskLists',
      entityId: 'shared-list',
      type: 'delete',
    });
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'timetables',
      entityId: 'shared-timetable',
      type: 'delete',
    });
  });

  it('preserves owner-created containers when their owning space relation is missing during account deletion', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        taskLists: [{ id: 'maybe-shared-list', createdBy: { id: 'user-1' } }],
        timetables: [{ id: 'maybe-shared-timetable', share: 'shared', createdBy: { id: 'user-1' } }],
      },
    });

    await deleteAccountData({
      userId: 'user-1',
      membershipId: 'shared-membership',
      spaceId: 'shared-space',
      isLastMember: false,
      personalMembershipId: 'solo-membership',
      personalSpaceId: 'solo-space',
      sharedMembershipId: 'shared-membership',
      sharedSpaceId: 'shared-space',
      sharedIsLastMember: false,
    });

    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        { table: 'taskLists', entityId: 'maybe-shared-list', type: 'unlink', links: { createdBy: 'user-1' } },
        { table: 'timetables', entityId: 'maybe-shared-timetable', type: 'unlink', links: { createdBy: 'user-1' } },
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'taskLists',
      entityId: 'maybe-shared-list',
      type: 'delete',
    });
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'timetables',
      entityId: 'maybe-shared-timetable',
      type: 'delete',
    });
  });

  it('deletes shared task and reminder rows when deleting their creator account', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        tasks: [
          {
            id: 'shared-task',
            couple: { id: 'shared-space', kind: 'pair' },
            createdBy: { id: 'user-1' },
            assignedTo: { id: 'partner-1' },
            completedBy: { id: 'user-1' },
          },
        ],
        reminders: [
          {
            id: 'shared-reminder',
            couple: { id: 'shared-space', kind: 'pair' },
            createdBy: { id: 'user-1' },
            assignedTo: { id: 'partner-1' },
            completedBy: { id: 'user-1' },
          },
        ],
      },
    });

    await deleteAccountData({
      userId: 'user-1',
      membershipId: 'membership-1',
      spaceId: 'space-1',
      isLastMember: false,
    });

    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        { table: 'tasks', entityId: 'shared-task', type: 'delete' },
        { table: 'reminders', entityId: 'shared-reminder', type: 'delete' },
        { table: 'memberships', entityId: 'membership-1', type: 'delete' },
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'tasks',
      entityId: 'shared-task',
      type: 'unlink',
      links: { createdBy: 'user-1' },
    });
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'tasks',
      entityId: 'shared-task',
      type: 'unlink',
      links: { completedBy: 'user-1' },
    });
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'reminders',
      entityId: 'shared-reminder',
      type: 'unlink',
      links: { createdBy: 'user-1' },
    });
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'reminders',
      entityId: 'shared-reminder',
      type: 'unlink',
      links: { completedBy: 'user-1' },
    });
  });

  it('deletes owner-created task and reminder rows with other member links when their owning space relation is missing', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        tasks: [
          {
            id: 'maybe-shared-task',
            createdBy: { id: 'user-1' },
            assignedTo: { id: 'partner-1' },
            completedBy: { id: 'user-1' },
          },
        ],
        reminders: [
          {
            id: 'maybe-shared-reminder',
            createdBy: { id: 'user-1' },
            assignedTo: { id: 'partner-1' },
            completedBy: { id: 'user-1' },
          },
        ],
      },
    });

    await deleteAccountData({
      userId: 'user-1',
      membershipId: 'shared-membership',
      spaceId: 'shared-space',
      isLastMember: false,
      personalMembershipId: 'solo-membership',
      personalSpaceId: 'solo-space',
      sharedMembershipId: 'shared-membership',
      sharedSpaceId: 'shared-space',
      sharedIsLastMember: false,
    });

    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        { table: 'tasks', entityId: 'maybe-shared-task', type: 'delete' },
        { table: 'reminders', entityId: 'maybe-shared-reminder', type: 'delete' },
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'tasks',
      entityId: 'maybe-shared-task',
      type: 'unlink',
      links: { createdBy: 'user-1' },
    });
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'tasks',
      entityId: 'maybe-shared-task',
      type: 'unlink',
      links: { completedBy: 'user-1' },
    });
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'reminders',
      entityId: 'maybe-shared-reminder',
      type: 'unlink',
      links: { createdBy: 'user-1' },
    });
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'reminders',
      entityId: 'maybe-shared-reminder',
      type: 'unlink',
      links: { completedBy: 'user-1' },
    });
  });

  it('deletes owner-created wishlist items and removes wishlist item purchasedBy links for the deleted owner', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        wishlistItems: [
          {
            id: 'wishlist-item-owned',
            addedBy: { id: 'user-1' },
            purchasedBy: { id: 'user-2' },
            couple: { id: 'shared-space', kind: 'pair' },
          },
          {
            id: 'wishlist-item-purchased',
            addedBy: { id: 'user-2' },
            purchasedBy: { id: 'user-1' },
            couple: { id: 'shared-space', kind: 'pair' },
          },
        ],
      },
    });

    await deleteAccountData({
      userId: 'user-1',
      membershipId: 'membership-1',
      spaceId: 'space-1',
      isLastMember: false,
    });

    expect(dbMock.queryOnce).toHaveBeenCalledWith(
      expect.objectContaining({
        wishlistItems: {
          $: {
            where: {
              or: [
                { 'addedBy.id': 'user-1' },
                { 'purchasedBy.id': 'user-1' },
              ],
            },
          },
          addedBy: {},
          purchasedBy: {},
          couple: {},
        },
      }),
    );
    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
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
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'wishlistItems',
      entityId: 'wishlist-item-owned',
      type: 'unlink',
      links: { addedBy: 'user-1' },
    });
  });

  it('deletes personal task, reminder, and task-list rows when deleting their owner account', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        tasks: [
          {
            id: 'personal-task',
            couple: { id: 'solo-space', kind: 'solo' },
            createdBy: { id: 'user-1' },
            assignedTo: { id: 'user-1' },
          },
        ],
        reminders: [
          {
            id: 'personal-reminder',
            couple: { id: 'solo-space', kind: 'solo' },
            createdBy: { id: 'user-1' },
            assignedTo: { id: 'user-1' },
          },
        ],
        taskLists: [
          {
            id: 'personal-list',
            couple: { id: 'solo-space', kind: 'solo' },
            createdBy: { id: 'user-1' },
          },
        ],
      },
    });

    await deleteAccountData({
      userId: 'user-1',
      membershipId: 'shared-membership',
      spaceId: 'shared-space',
      isLastMember: false,
      personalMembershipId: 'solo-membership',
      personalSpaceId: 'solo-space',
      sharedMembershipId: 'shared-membership',
      sharedSpaceId: 'shared-space',
      sharedIsLastMember: false,
    });

    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        { table: 'tasks', entityId: 'personal-task', type: 'delete' },
        { table: 'reminders', entityId: 'personal-reminder', type: 'delete' },
        { table: 'taskLists', entityId: 'personal-list', type: 'delete' },
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'tasks',
      entityId: 'personal-task',
      type: 'unlink',
      links: { createdBy: 'user-1' },
    });
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'taskLists',
      entityId: 'personal-list',
      type: 'unlink',
      links: { createdBy: 'user-1' },
    });
  });

  it('deletes personal task and reminder rows even when malformed other-member links exist', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        tasks: [
          {
            id: 'malformed-personal-task',
            couple: { id: 'solo-space', kind: 'solo' },
            createdBy: { id: 'user-1' },
            assignedTo: { id: 'partner-1' },
          },
        ],
        reminders: [
          {
            id: 'malformed-personal-reminder',
            couple: { id: 'solo-space', kind: 'solo' },
            createdBy: { id: 'user-1' },
            assignedTo: { id: 'partner-1' },
          },
        ],
      },
    });

    await deleteAccountData({
      userId: 'user-1',
      membershipId: 'shared-membership',
      spaceId: 'shared-space',
      isLastMember: false,
      personalMembershipId: 'solo-membership',
      personalSpaceId: 'solo-space',
      sharedMembershipId: 'shared-membership',
      sharedSpaceId: 'shared-space',
      sharedIsLastMember: false,
    });

    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        { table: 'tasks', entityId: 'malformed-personal-task', type: 'delete' },
        { table: 'reminders', entityId: 'malformed-personal-reminder', type: 'delete' },
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'tasks',
      entityId: 'malformed-personal-task',
      type: 'unlink',
      links: { createdBy: 'user-1' },
    });
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'reminders',
      entityId: 'malformed-personal-reminder',
      type: 'unlink',
      links: { createdBy: 'user-1' },
    });
  });

  it('deletes the permanent solo pact as well as shared rows when deleting an account from a shared pact', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        profiles: [{ id: 'profile-1' }],
        devices: [{ id: 'device-1' }],
        journalEntries: [{ id: 'shared-journal-1' }],
        memories: [{ id: 'shared-memory-1' }],
        memoryReactions: [{ id: 'reaction-1' }],
      },
    });

    await deleteAccountData({
      userId: 'user-1',
      membershipId: 'shared-membership',
      spaceId: 'shared-space',
      isLastMember: false,
      personalMembershipId: 'solo-membership',
      personalSpaceId: 'solo-space',
      sharedMembershipId: 'shared-membership',
      sharedSpaceId: 'shared-space',
      sharedIsLastMember: false,
    });

    expect(dbMock.queryOnce).toHaveBeenCalledWith(
      expect.objectContaining({
        journalEntries: {
          $: { where: { 'author.id': 'user-1' } },
        },
        memories: {
          $: { where: { 'author.id': 'user-1' } },
          attachments: {},
        },
        ringsHistory: { $: { where: { 'membership.user.id': 'user-1' } } },
      }),
    );
    expect(dbMock.transact).toHaveBeenCalledWith(
      expect.arrayContaining([
        { table: 'profiles', entityId: 'profile-1', type: 'delete' },
        { table: 'devices', entityId: 'device-1', type: 'delete' },
        { table: 'journalEntries', entityId: 'shared-journal-1', type: 'delete' },
        { table: 'memories', entityId: 'shared-memory-1', type: 'delete' },
        { table: 'memoryReactions', entityId: 'reaction-1', type: 'delete' },
        { table: 'memberships', entityId: 'shared-membership', type: 'delete' },
        { table: 'spaces', entityId: 'solo-space', type: 'delete' },
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'memberships',
      entityId: 'solo-membership',
      type: 'delete',
    });
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'spaces',
      entityId: 'shared-space',
      type: 'delete',
    });
  });

  it('deletes account memberships and owned last-member spaces across every pact', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        profiles: [],
        devices: [],
        memberships: [
          {
            id: 'solo-membership',
            space: {
              id: 'solo-space',
              kind: 'solo',
              memberships: [{ id: 'solo-membership', user: { id: 'user-1' } }],
            },
          },
          {
            id: 'shared-a-membership',
            space: {
              id: 'shared-a',
              kind: 'pair',
              memberships: [
                { id: 'shared-a-membership', user: { id: 'user-1' } },
                { id: 'shared-a-other', user: { id: 'user-2' } },
              ],
            },
          },
          {
            id: 'shared-b-membership',
            space: {
              id: 'shared-b',
              kind: 'crew',
              memberships: [{ id: 'shared-b-membership', user: { id: 'user-1' } }],
            },
          },
        ],
        memories: [{ id: 'memory-1' }],
        journalEntries: [{ id: 'journal-1' }],
        ringsHistory: [{ id: 'ring-1' }],
      },
    });

    await deleteAccountData({
      userId: 'user-1',
      membershipId: 'shared-a-membership',
      spaceId: 'shared-a',
      isLastMember: false,
      personalMembershipId: 'solo-membership',
      personalSpaceId: 'solo-space',
      sharedMembershipId: 'shared-a-membership',
      sharedSpaceId: 'shared-a',
      sharedIsLastMember: false,
    });

    expect(dbMock.queryOnce).toHaveBeenCalledWith(
      expect.objectContaining({
        memberships: {
          $: { where: { 'user.id': 'user-1' } },
          space: { memberships: { user: {} } },
        },
        memories: {
          $: { where: { 'author.id': 'user-1' } },
          attachments: {},
        },
        journalEntries: {
          $: { where: { 'author.id': 'user-1' } },
        },
        ringsHistory: { $: { where: { 'membership.user.id': 'user-1' } } },
      }),
    );
    expect(dbMock.transact).toHaveBeenCalledWith(
      expect.arrayContaining([
        { table: 'memories', entityId: 'memory-1', type: 'delete' },
        { table: 'journalEntries', entityId: 'journal-1', type: 'delete' },
        { table: 'ringsHistory', entityId: 'ring-1', type: 'delete' },
        { table: 'memberships', entityId: 'shared-a-membership', type: 'delete' },
        { table: 'spaces', entityId: 'solo-space', type: 'delete' },
        { table: 'spaces', entityId: 'shared-b', type: 'delete' },
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'memberships',
      entityId: 'solo-membership',
      type: 'delete',
    });
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'memberships',
      entityId: 'shared-b-membership',
      type: 'delete',
    });
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'spaces',
      entityId: 'shared-a',
      type: 'delete',
    });
  });

  it('deletes the explicit personal solo space even when its nested member list is missing', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        profiles: [],
        devices: [],
        memberships: [
          {
            id: 'solo-membership',
            space: { id: 'solo-space', kind: 'solo' },
          },
          {
            id: 'shared-membership',
            space: {
              id: 'shared-space',
              kind: 'pair',
              memberships: [
                { id: 'shared-membership', user: { id: 'user-1' } },
                { id: 'partner-membership', user: { id: 'partner-1' } },
              ],
            },
          },
        ],
      },
    });

    await deleteAccountData({
      userId: 'user-1',
      membershipId: 'shared-membership',
      spaceId: 'shared-space',
      isLastMember: false,
      personalMembershipId: 'solo-membership',
      personalSpaceId: 'solo-space',
      sharedMembershipId: 'shared-membership',
      sharedSpaceId: 'shared-space',
      sharedIsLastMember: false,
    });

    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        { table: 'spaces', entityId: 'solo-space', type: 'delete' },
        { table: 'memberships', entityId: 'shared-membership', type: 'delete' },
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'memberships',
      entityId: 'solo-membership',
      type: 'delete',
    });
  });

  it('deletes an explicit last-member shared space even when its nested member list is missing', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        profiles: [],
        devices: [],
        memberships: [
          {
            id: 'solo-membership',
            space: { id: 'solo-space', kind: 'solo' },
          },
          {
            id: 'shared-membership',
            space: { id: 'shared-space', kind: 'pair' },
          },
        ],
      },
    });

    await deleteAccountData({
      userId: 'user-1',
      membershipId: 'shared-membership',
      spaceId: 'shared-space',
      isLastMember: false,
      personalMembershipId: 'solo-membership',
      personalSpaceId: 'solo-space',
      sharedMembershipId: 'shared-membership',
      sharedSpaceId: 'shared-space',
      sharedIsLastMember: true,
    });

    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        { table: 'spaces', entityId: 'solo-space', type: 'delete' },
        { table: 'spaces', entityId: 'shared-space', type: 'delete' },
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'memberships',
      entityId: 'shared-membership',
      type: 'delete',
    });
  });

  it('deletes the explicit shared membership when the membership query omits it', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        profiles: [],
        devices: [],
        memberships: [
          {
            id: 'solo-membership',
            space: {
              id: 'solo-space',
              kind: 'solo',
              memberships: [{ id: 'solo-membership', user: { id: 'user-1' } }],
            },
          },
        ],
      },
    });

    await deleteAccountData({
      userId: 'user-1',
      membershipId: 'shared-membership',
      spaceId: 'shared-space',
      isLastMember: false,
      personalMembershipId: 'solo-membership',
      personalSpaceId: 'solo-space',
      sharedMembershipId: 'shared-membership',
      sharedSpaceId: 'shared-space',
      sharedIsLastMember: false,
    });

    expect(dbMock.transact.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        { table: 'spaces', entityId: 'solo-space', type: 'delete' },
        { table: 'memberships', entityId: 'shared-membership', type: 'delete' },
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: 'spaces',
      entityId: 'shared-space',
      type: 'delete',
    });
  });

  it('deletes owned memory media files from personal and shared spaces during account deletion', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        $users: [
          {
            id: 'user-1',
            avatarPath: 'avatars/user-1/avatar.jpg',
          },
        ],
        profiles: [],
        devices: [],
        journalEntries: [
          {
            id: 'shared-journal-1',
            mediaPaths: [
              'users/user-1/spaces/shared-space/journal/shared.jpg',
              'users/user-2/spaces/shared-space/journal/theirs.jpg',
            ],
          },
          {
            id: 'solo-journal-1',
            mediaPaths: [
              'users/user-1/spaces/solo-space/journal/private.jpg',
              'spaces/solo-space/journal/legacy.jpg',
            ],
          },
        ],
        memories: [
          {
            id: 'shared-memory-1',
            attachments: [
              { mediaPath: 'users/user-1/spaces/shared-space/memories/shared.jpg' },
              { mediaPath: 'users/user-2/spaces/shared-space/memories/theirs.jpg' },
              { mediaPath: 'spaces/shared-space/memories/legacy.jpg' },
            ],
          },
          {
            id: 'solo-memory-1',
            attachments: [
              { mediaPath: 'users/user-1/spaces/solo-space/memories/private.jpg' },
              { mediaPath: 'users/user-1/spaces/solo-space/memories/private.jpg' },
            ],
          },
        ],
      },
    });

    await deleteAccountData({
      userId: 'user-1',
      membershipId: 'shared-membership',
      spaceId: 'shared-space',
      isLastMember: false,
      personalMembershipId: 'solo-membership',
      personalSpaceId: 'solo-space',
      sharedMembershipId: 'shared-membership',
      sharedSpaceId: 'shared-space',
      sharedIsLastMember: false,
    });

    expect(dbMock.queryOnce).toHaveBeenCalledWith(
      expect.objectContaining({
        journalEntries: {
          $: { where: { 'author.id': 'user-1' } },
        },
        memories: {
          $: { where: { 'author.id': 'user-1' } },
          attachments: {},
        },
      }),
    );
    expect(dbMock.transact).toHaveBeenCalledWith(
      expect.arrayContaining([
        {
          table: '$files',
          entityId: 'lookup:path:users/user-1/spaces/shared-space/memories/shared.jpg',
          type: 'delete',
        },
        {
          table: '$files',
          entityId: 'lookup:path:users/user-1/spaces/shared-space/journal/shared.jpg',
          type: 'delete',
        },
        {
          table: '$files',
          entityId: 'lookup:path:avatars/user-1/avatar.jpg',
          type: 'delete',
        },
        {
          table: '$files',
          entityId: 'lookup:path:users/user-1/spaces/solo-space/memories/private.jpg',
          type: 'delete',
        },
        {
          table: '$files',
          entityId: 'lookup:path:users/user-1/spaces/solo-space/journal/private.jpg',
          type: 'delete',
        },
        { table: 'journalEntries', entityId: 'shared-journal-1', type: 'delete' },
        { table: 'journalEntries', entityId: 'solo-journal-1', type: 'delete' },
        { table: 'memories', entityId: 'shared-memory-1', type: 'delete' },
        { table: 'memories', entityId: 'solo-memory-1', type: 'delete' },
      ]),
    );
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: '$files',
      entityId: 'lookup:path:users/user-2/spaces/shared-space/memories/theirs.jpg',
      type: 'delete',
    });
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: '$files',
      entityId: 'lookup:path:users/user-2/spaces/shared-space/journal/theirs.jpg',
      type: 'delete',
    });
    expect(dbMock.transact.mock.calls[0][0]).not.toContainEqual({
      table: '$files',
      entityId: 'lookup:path:spaces/shared-space/memories/legacy.jpg',
      type: 'delete',
    });
  });
});
