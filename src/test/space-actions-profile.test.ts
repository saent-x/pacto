import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  transact: vi.fn(async (_ops: any) => undefined),
}));

vi.mock('@/src/lib/db', () => ({
  db: dbMock,
}));

vi.mock('@instantdb/react-native', () => ({
  id: () => 'mock-id',
  lookup: (field: string, value: string) => ({ field, value }),
  tx: {
    $users: new Proxy(
      {},
      {
        get: (_target, userId: string) => ({
          update: (payload: Record<string, unknown>) => ({
            table: '$users',
            userId,
            payload,
          }),
        }),
      },
    ),
  },
}));

import {
  ensureUserRow,
  updateUserAvatar,
  updateUserProfile,
} from '@/src/lib/space-actions';

describe('space profile actions', () => {
  beforeEach(() => {
    dbMock.transact.mockClear();
  });

  it('persists a trimmed display name to the Instant user row', async () => {
    await updateUserProfile({ userId: 'user-1', displayName: '  Matteo  ' });

    expect(dbMock.transact).toHaveBeenCalledWith([
      {
        table: '$users',
        userId: 'user-1',
        payload: { displayName: 'Matteo' },
      },
    ]);
  });

  it('persists default avatar ids through the same profile updater', async () => {
    await updateUserAvatar({ userId: 'user-1', avatarUrl: 'pacto:avatar-2' });

    expect(dbMock.transact).toHaveBeenCalledWith([
      {
        table: '$users',
        userId: 'user-1',
        payload: { avatarUrl: 'pacto:avatar-2' },
      },
    ]);
  });

  it('lets onboarding seed both display name and avatar in one user update', async () => {
    await ensureUserRow({
      userId: 'user-1',
      email: 'me@pacto.app',
      displayName: '  Me  ',
      avatarUrl: 'pacto:avatar-1',
    });

    expect(dbMock.transact).toHaveBeenCalledWith([
      {
        table: '$users',
        userId: 'user-1',
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
});
