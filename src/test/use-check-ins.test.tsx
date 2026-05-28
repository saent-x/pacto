import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryState = vi.hoisted(() => ({
  data: null as any,
}));

const sessionState = vi.hoisted(() => ({
  activeCouple: { couple: { id: 'couple-1' } },
  personalSpaceId: 'solo-1',
  sharedSpaceId: 'couple-1',
  user: { id: 'user-1', displayName: 'Alex' },
  space: { kind: 'pair' },
}));

const txCalls = vi.hoisted(() => ({
  updates: [] as Array<{ table: string; id: string; payload: any }>,
  links: [] as Array<{ table: string; id: string; payload: any }>,
}));

const rowBuilder = (table: string, rowId: string) => ({
  update(payload: any) {
    txCalls.updates.push({ table, id: rowId, payload });
    return {
      link(linkPayload: any) {
        txCalls.links.push({ table, id: rowId, payload: linkPayload });
        return { type: 'link', table, id: rowId, payload, linkPayload };
      },
    };
  },
  delete: vi.fn(),
});

const dbMock = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: queryState.data, isLoading: false })),
  transact: vi.fn(async (operation: any) => operation),
  tx: new Proxy({}, {
    get: (_target, table: string) =>
      new Proxy({}, {
        get: (_rows, rowId: string) => rowBuilder(table, rowId),
      }),
  }),
}));

const encryptionState = vi.hoisted(() => ({
  encrypt: vi.fn(async (value: string) => `encrypted:${value}`),
  decrypt: vi.fn(async (value: string) => value.replace(/^encrypted:/, '')),
}));

const pushState = vi.hoisted(() => ({
  notifySpaceMutation: vi.fn(async () => undefined),
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
  id: vi.fn(() => 'new-check-in-id'),
}));

vi.mock('@/src/lib/push', () => ({
  notifySpaceMutation: pushState.notifySpaceMutation,
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: vi.fn(() => sessionState),
}));

vi.mock('@/src/hooks/useEncryption', () => ({
  useEncryption: () => ({
    encrypt: encryptionState.encrypt,
    decrypt: encryptionState.decrypt,
    hasKey: true,
  }),
}));

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));

async function renderHookValue<T>(useValue: () => T) {
  let latest: T | null = null;

  function Probe() {
    latest = useValue();
    return null;
  }

  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Probe));
    await flush();
  });

  return { latest: latest!, renderer };
}

describe('useCheckIns', () => {
  beforeEach(() => {
    sessionState.activeCouple = { couple: { id: 'couple-1' } };
    sessionState.personalSpaceId = 'solo-1';
    sessionState.sharedSpaceId = 'couple-1';
    sessionState.user = { id: 'user-1', displayName: 'Alex' };
    sessionState.space = { kind: 'pair' };
    queryState.data = null;
    txCalls.updates = [];
    txCalls.links = [];
    dbMock.useQuery.mockClear();
    dbMock.transact.mockClear();
    encryptionState.encrypt.mockClear();
    encryptionState.decrypt.mockClear();
    pushState.notifySpaceMutation.mockClear();
  });

  it('omits energy from create payloads', async () => {
    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    await act(async () => {
      await latest.createOrUpdate({
        mood: 'soft',
        note: null,
        isPrivate: false,
        checkInDate: '2026-05-02',
      });
      await flush();
    });

    expect(txCalls.updates[0].payload).not.toHaveProperty('energy');
    expect(txCalls.links[0].payload).toEqual({ couple: 'couple-1', author: 'user-1' });
    act(() => renderer.unmount());
  });

  it('can bound the source query to one local check-in date for first-screen reads', async () => {
    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { renderer } = await renderHookValue(() => useCheckIns({ checkInDate: '2026-05-24' } as any));

    expect(dbMock.useQuery).toHaveBeenCalledWith({
      checkIns: {
        $: {
          where: {
            checkInDate: '2026-05-24',
            or: [{ 'couple.id': 'solo-1' }, { 'couple.id': 'couple-1' }],
          },
        },
        author: {},
        couple: {},
      },
    });

    act(() => renderer.unmount());
  });

  it('writes private check-ins to the permanent solo space', async () => {
    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    await act(async () => {
      await latest.createOrUpdate({
        mood: 'quiet',
        note: 'mine',
        isPrivate: true,
        checkInDate: '2026-05-02',
      });
      await flush();
    });

    expect(txCalls.links[0].payload).toEqual({ couple: 'solo-1', author: 'user-1' });
    act(() => renderer.unmount());
  });

  it('stores fallback solo check-ins as private and skips shared push', async () => {
    sessionState.activeCouple = { couple: { id: 'solo-1' } };
    sessionState.sharedSpaceId = null as any;
    sessionState.space = { kind: 'solo' };
    const { notifySpaceMutation } = await import('@/src/lib/push');
    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    await act(async () => {
      await latest.createOrUpdate({
        mood: 'steady',
        note: null,
        isPrivate: false,
        checkInDate: '2026-05-02',
      });
      await flush();
    });

    expect(txCalls.updates[0]).toEqual({
      table: 'checkIns',
      id: 'new-check-in-id',
      payload: expect.objectContaining({
        mood: 'steady',
        isPrivate: true,
        checkInDate: '2026-05-02',
      }),
    });
    expect(txCalls.links[0]).toEqual({
      table: 'checkIns',
      id: 'new-check-in-id',
      payload: { couple: 'solo-1', author: 'user-1' },
    });
    expect(notifySpaceMutation).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('omits energy from update payloads', async () => {
    queryState.data = {
      checkIns: [
        {
          id: 'check-in-1',
          author: { id: 'user-1' },
          mood: 'soft',
          note: null,
          isPrivate: false,
          checkInDate: '2026-05-02',
          createdAt: 1,
        },
      ],
    };

    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    await act(async () => {
      await latest.createOrUpdate({
        mood: 'steady',
        note: null,
        isPrivate: false,
        checkInDate: '2026-05-02',
      });
      await flush();
    });

    expect(txCalls.updates[0].payload).not.toHaveProperty('energy');
    act(() => renderer.unmount());
  });

  it('updates an existing check-in in the same privacy scope', async () => {
    queryState.data = {
      checkIns: [
        {
          id: 'check-in-1',
          author: { id: 'user-1' },
          mood: 'soft',
          note: null,
          isPrivate: false,
          checkInDate: '2026-05-02',
          createdAt: 1,
        },
      ],
    };

    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    await act(async () => {
      await latest.createOrUpdate({
        mood: 'steady',
        note: null,
        isPrivate: false,
        checkInDate: '2026-05-02',
      });
      await flush();
    });

    expect(txCalls.links[0]).toEqual({
      table: 'checkIns',
      id: 'check-in-1',
      payload: { couple: 'couple-1' },
    });
    act(() => renderer.unmount());
  });

  it('updates a selected check-in by id without changing its date', async () => {
    queryState.data = {
      checkIns: [
        {
          id: 'historical-check-in',
          author: { id: 'user-1' },
          couple: { id: 'solo-1' },
          mood: 'low',
          note: null,
          isPrivate: true,
          checkInDate: '2026-05-02',
          createdAt: 1,
        },
      ],
    };

    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    await act(async () => {
      await latest.update('historical-check-in', {
        mood: 'great',
        note: null,
        isPrivate: true,
        checkInDate: '2026-05-02',
      });
      await flush();
    });

    expect(txCalls.updates[0]).toEqual({
      table: 'checkIns',
      id: 'historical-check-in',
      payload: expect.objectContaining({
        mood: 'great',
        note: null,
        isPrivate: true,
        checkInDate: '2026-05-02',
      }),
    });
    expect(txCalls.links[0]).toEqual({
      table: 'checkIns',
      id: 'historical-check-in',
      payload: { couple: 'solo-1' },
    });
    act(() => renderer.unmount());
  });

  it('preserves a same-day private check-in when creating a shared check-in', async () => {
    queryState.data = {
      checkIns: [
        {
          id: 'private-check-in',
          author: { id: 'user-1' },
          mood: 'quiet',
          note: null,
          isPrivate: true,
          checkInDate: '2026-05-02',
          createdAt: 1,
        },
      ],
    };

    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    await act(async () => {
      await latest.createOrUpdate({
        mood: 'bright',
        note: null,
        isPrivate: false,
        checkInDate: '2026-05-02',
      });
      await flush();
    });

    expect(txCalls.updates[0]).toEqual({
      table: 'checkIns',
      id: 'new-check-in-id',
      payload: expect.objectContaining({
        mood: 'bright',
        isPrivate: false,
        checkInDate: '2026-05-02',
      }),
    });
    expect(txCalls.links[0]).toEqual({
      table: 'checkIns',
      id: 'new-check-in-id',
      payload: { couple: 'couple-1', author: 'user-1' },
    });
    act(() => renderer.unmount());
  });

  it('preserves a same-day personal-space legacy check-in when creating a shared check-in', async () => {
    queryState.data = {
      checkIns: [
        {
          id: 'personal-legacy-check-in',
          author: { id: 'user-1' },
          couple: { id: 'solo-1' },
          mood: 'quiet',
          note: null,
          isPrivate: false,
          checkInDate: '2026-05-02',
          createdAt: 1,
        },
      ],
    };

    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    expect(latest.checkIns[0].isPrivate).toBe(true);

    await act(async () => {
      await latest.createOrUpdate({
        mood: 'bright',
        note: null,
        isPrivate: false,
        checkInDate: '2026-05-02',
      });
      await flush();
    });

    expect(txCalls.updates[0]).toEqual({
      table: 'checkIns',
      id: 'new-check-in-id',
      payload: expect.objectContaining({
        mood: 'bright',
        isPrivate: false,
        checkInDate: '2026-05-02',
      }),
    });
    expect(txCalls.links[0]).toEqual({
      table: 'checkIns',
      id: 'new-check-in-id',
      payload: { couple: 'couple-1', author: 'user-1' },
    });
    act(() => renderer.unmount());
  });

  it('normalizes malformed legacy check-in privacy flags from the owning space', async () => {
    queryState.data = {
      checkIns: [
        {
          id: 'shared-malformed-check-in',
          author: { id: 'user-1' },
          couple: { id: 'couple-1' },
          mood: 'bright',
          note: null,
          isPrivate: 'false',
          checkInDate: '2026-05-02',
          createdAt: 1,
        },
        {
          id: 'personal-malformed-check-in',
          author: { id: 'user-1' },
          couple: { id: 'solo-1' },
          mood: 'quiet',
          note: null,
          isPrivate: 'false',
          checkInDate: '2026-05-03',
          createdAt: 2,
        },
      ],
    };

    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    expect(latest.checkIns.find((checkIn) => checkIn.id === 'shared-malformed-check-in')?.isPrivate)
      .toBe(false);
    expect(latest.checkIns.find((checkIn) => checkIn.id === 'personal-malformed-check-in')?.isPrivate)
      .toBe(true);

    act(() => renderer.unmount());
  });

  it('does not expose partner-authored rows from the current user personal space', async () => {
    queryState.data = {
      checkIns: [
        {
          id: 'personal-partner-check-in',
          author: { id: 'partner-1' },
          couple: { id: 'solo-1' },
          mood: 'low',
          note: null,
          isPrivate: false,
          checkInDate: '2026-05-02',
          createdAt: 1,
        },
        {
          id: 'personal-self-check-in',
          author: { id: 'user-1' },
          couple: { id: 'solo-1' },
          mood: 'quiet',
          note: null,
          isPrivate: false,
          checkInDate: '2026-05-02',
          createdAt: 2,
        },
        {
          id: 'shared-partner-check-in',
          author: { id: 'partner-1' },
          couple: { id: 'couple-1' },
          mood: 'bright',
          note: null,
          isPrivate: false,
          checkInDate: '2026-05-02',
          createdAt: 3,
        },
      ],
    };

    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());
    const ids = latest.checkIns.map((checkIn) => checkIn.id);

    expect(ids).not.toContain('personal-partner-check-in');
    expect(ids).toContain('personal-self-check-in');
    expect(ids).toContain('shared-partner-check-in');
    expect(latest.checkIns.find((checkIn) => checkIn.id === 'personal-self-check-in')?.isPrivate).toBe(true);

    act(() => renderer.unmount());
  });

  it('fails closed instead of silently succeeding when create has no target space', async () => {
    sessionState.activeCouple = null as any;
    sessionState.personalSpaceId = null as any;
    sessionState.sharedSpaceId = null as any;
    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    await expect(latest.createOrUpdate({
      mood: 'okay',
      note: null,
      isPrivate: false,
      checkInDate: '2026-05-02',
    })).rejects.toThrow('No active space');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(pushState.notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of creating check-ins with malformed privacy metadata', async () => {
    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    await expect(latest.createOrUpdate({
      mood: 'okay',
      note: null,
      isPrivate: 'false' as any,
      checkInDate: '2026-05-02',
    })).rejects.toThrow('Invalid check-in privacy');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(encryptionState.encrypt).not.toHaveBeenCalled();
    expect(pushState.notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of creating malformed check-in dates', async () => {
    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    await expect(latest.createOrUpdate({
      mood: 'okay',
      note: null,
      isPrivate: false,
      checkInDate: '2030-02-31',
    })).rejects.toThrow('Invalid check-in date');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(encryptionState.encrypt).not.toHaveBeenCalled();
    expect(pushState.notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating malformed check-in dates', async () => {
    queryState.data = {
      checkIns: [
        {
          id: 'historical-check-in',
          author: { id: 'user-1' },
          couple: { id: 'solo-1' },
          mood: 'low',
          note: null,
          isPrivate: true,
          checkInDate: '2026-05-02',
          createdAt: 1,
        },
      ],
    };
    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    await expect(latest.update('historical-check-in', {
      mood: 'great',
      note: null,
      isPrivate: true,
      checkInDate: 'not-a-date',
    })).rejects.toThrow('Invalid check-in date');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(encryptionState.encrypt).not.toHaveBeenCalled();
    expect(pushState.notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating check-ins with malformed privacy metadata', async () => {
    queryState.data = {
      checkIns: [
        {
          id: 'historical-check-in',
          author: { id: 'user-1' },
          couple: { id: 'couple-1' },
          mood: 'low',
          note: null,
          isPrivate: false,
          checkInDate: '2026-05-02',
          createdAt: 1,
        },
      ],
    };
    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    await expect(latest.update('historical-check-in', {
      mood: 'great',
      note: null,
      isPrivate: 'false' as any,
      checkInDate: '2026-05-02',
    })).rejects.toThrow('Invalid check-in privacy');

    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(encryptionState.encrypt).not.toHaveBeenCalled();
    expect(pushState.notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('does not rewrite a malformed current check-in date when update omits the date', async () => {
    queryState.data = {
      checkIns: [
        {
          id: 'historical-check-in',
          author: { id: 'user-1' },
          couple: { id: 'solo-1' },
          mood: 'low',
          note: null,
          isPrivate: true,
          checkInDate: '2026-04-31',
          createdAt: 1,
        },
      ],
    };
    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    await act(async () => {
      await latest.update('historical-check-in', {
        mood: 'great',
        note: null,
        isPrivate: true,
      });
      await flush();
    });

    expect(txCalls.updates[0].payload).not.toHaveProperty('checkInDate');
    expect(JSON.stringify(txCalls.updates[0].payload)).not.toContain('2026-04-31');

    act(() => renderer.unmount());
  });

  it('deletes a check-in from the scoped result set', async () => {
    queryState.data = {
      checkIns: [
        {
          id: 'check-in-1',
          author: { id: 'user-1' },
          couple: { id: 'couple-1' },
          mood: 'soft',
          note: null,
          isPrivate: false,
          checkInDate: '2026-05-02',
          createdAt: 1,
        },
      ],
    };
    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    await act(async () => {
      await latest.remove('check-in-1');
      await flush();
    });

    expect(dbMock.transact).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('fails closed instead of deleting another member check-in', async () => {
    queryState.data = {
      checkIns: [
        {
          id: 'partner-check-in',
          author: { id: 'partner-1' },
          couple: { id: 'couple-1' },
          mood: 'soft',
          note: null,
          isPrivate: false,
          checkInDate: '2026-05-02',
          createdAt: 1,
        },
      ],
    };
    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    await expect(latest.remove('partner-check-in')).rejects.toThrow('Check-in not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of deleting a check-in outside the scoped result set', async () => {
    queryState.data = { checkIns: [] };
    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    await expect(latest.remove('missing-check-in')).rejects.toThrow('Check-in not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });
});
