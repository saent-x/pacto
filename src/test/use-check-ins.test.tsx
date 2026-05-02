import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryState = vi.hoisted(() => ({
  data: null as any,
}));

const sessionState = vi.hoisted(() => ({
  activeCouple: { couple: { id: 'couple-1' } },
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

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
  id: vi.fn(() => 'new-check-in-id'),
}));

vi.mock('@/src/lib/push', () => ({
  notifySpaceMutation: vi.fn(async () => undefined),
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
    queryState.data = null;
    txCalls.updates = [];
    txCalls.links = [];
    dbMock.useQuery.mockClear();
    dbMock.transact.mockClear();
    encryptionState.encrypt.mockClear();
    encryptionState.decrypt.mockClear();
  });

  it('maps numeric energy and sanitizes missing or invalid persisted energy to null', async () => {
    queryState.data = {
      checkIns: [
        {
          id: 'check-in-1',
          author: { id: 'user-1' },
          mood: 'soft',
          note: null,
          isPrivate: false,
          energy: 4,
          checkInDate: '2026-05-02',
          createdAt: 1,
        },
        {
          id: 'check-in-2',
          author: { id: 'partner-1' },
          mood: 'steady',
          note: null,
          isPrivate: false,
          energy: 'high',
          checkInDate: '2026-05-02',
          createdAt: 2,
        },
        {
          id: 'check-in-3',
          author: { id: 'partner-2' },
          mood: 'low',
          note: null,
          isPrivate: false,
          checkInDate: '2026-05-02',
          createdAt: 3,
        },
      ],
    };

    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    expect(latest.checkIns.map((item: any) => item.energy)).toEqual([4, null, null]);
    act(() => renderer.unmount());
  });

  it('persists energy when creating a check-in', async () => {
    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { latest, renderer } = await renderHookValue(() => useCheckIns());

    await act(async () => {
      await latest.createOrUpdate({
        mood: 'soft',
        note: null,
        isPrivate: false,
        energy: 5,
        checkInDate: '2026-05-02',
      });
      await flush();
    });

    expect(txCalls.updates[0].payload).toMatchObject({ energy: 5 });
    expect(txCalls.links[0].payload).toEqual({ couple: 'couple-1', author: 'user-1' });
    act(() => renderer.unmount());
  });

  it('persists energy when updating an existing check-in', async () => {
    queryState.data = {
      checkIns: [
        {
          id: 'check-in-1',
          author: { id: 'user-1' },
          mood: 'soft',
          note: null,
          isPrivate: false,
          energy: 3,
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
        note: 'better',
        isPrivate: false,
        energy: 2,
        checkInDate: '2026-05-02',
      });
      await flush();
    });

    expect(txCalls.updates[0]).toMatchObject({
      table: 'checkIns',
      id: 'check-in-1',
      payload: { mood: 'steady', note: 'encrypted:better', isPrivate: false, energy: 2 },
    });
    act(() => renderer.unmount());
  });

  it('leaves existing energy untouched when older callers update without energy', async () => {
    queryState.data = {
      checkIns: [
        {
          id: 'check-in-1',
          author: { id: 'user-1' },
          mood: 'soft',
          note: null,
          isPrivate: false,
          energy: 3,
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
});
