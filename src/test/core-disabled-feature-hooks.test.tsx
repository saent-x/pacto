import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  transact: vi.fn(async (op: unknown) => op),
  tx: new Proxy({}, {
    get: () => new Proxy({}, {
      get: () => ({
        update: vi.fn(() => ({ link: vi.fn() })),
        link: vi.fn(),
        unlink: vi.fn(),
        delete: vi.fn(),
      }),
    }),
  }),
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
  id: vi.fn(() => 'mock-id'),
  lookup: vi.fn((field: string, value: string) => `lookup:${field}:${value}`),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => ({
    activeCouple: { couple: { id: 'shared-1' } },
    personalSpaceId: 'solo-1',
    sharedSpaceId: 'shared-1',
    user: { id: 'user-1', displayName: 'Tor' },
    space: { id: 'shared-1', kind: 'pair' },
  }),
}));

vi.mock('@/src/hooks/useEncryption', () => ({
  useEncryption: () => ({
    encrypt: vi.fn(async (value: string) => value),
    decrypt: vi.fn(async (value: string) => value),
    hasKey: false,
  }),
}));

vi.mock('@/src/lib/notifications', () => ({
  cancelReminderNotification: vi.fn(async () => undefined),
  scheduleReminderNotification: vi.fn(async () => undefined),
}));

vi.mock('@/src/lib/push', () => ({
  notifySpaceMutation: vi.fn(async () => undefined),
}));

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function renderHookValue<T>(useValue: () => T) {
  function Probe() {
    useValue();
    return null;
  }

  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Probe));
    await flush();
  });
  return renderer;
}

describe('disabled core feature data hooks', () => {
  beforeEach(() => {
    dbMock.useQuery.mockClear();
  });

  it('does not issue Instant queries when disabled', async () => {
    const { useTasks } = await import('@/src/hooks/useTasks');
    const { useReminders } = await import('@/src/hooks/useReminders');
    const { usePlans } = await import('@/src/hooks/usePlans');
    const { useJournal } = await import('@/src/hooks/useJournal');
    const { useCheckIns } = await import('@/src/hooks/useCheckIns');
    const { useTimetables } = await import('@/src/hooks/useTimetables');

    const renderers = [
      await renderHookValue(() => useTasks({ enabled: false })),
      await renderHookValue(() => useReminders({ enabled: false })),
      await renderHookValue(() => usePlans(undefined, { enabled: false })),
      await renderHookValue(() => useJournal({ enabled: false })),
      await renderHookValue(() => useCheckIns({ enabled: false })),
      await renderHookValue(() => useTimetables({ enabled: false })),
    ];

    expect(dbMock.useQuery).toHaveBeenCalled();
    expect(dbMock.useQuery.mock.calls.every(([query]) => query === null)).toBe(true);

    for (const renderer of renderers) {
      act(() => renderer.unmount());
    }
  });
});
