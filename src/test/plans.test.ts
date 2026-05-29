import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/src/lib/instant';

const txCalls = vi.hoisted(() => ({
  updates: [] as Array<{ table: string; id: string; payload: any }>,
  links: [] as Array<{ table: string; id: string; payload: any }>,
}));

const queryState = vi.hoisted(() => ({
  data: { plans: [] as any[] },
}));

const pushState = vi.hoisted(() => ({
  notifySpaceMutation: vi.fn(async () => undefined),
}));

vi.mock('@/src/lib/instant', () => ({
  db: {
    useQuery: vi.fn(() => ({ data: queryState.data, isLoading: false })),
    transact: vi.fn(async (op: any) => op),
    tx: new Proxy({}, {
      get: (_target, table: string) =>
        new Proxy({}, {
          get: (_rows, id: string) => ({
            update: vi.fn((updatePayload: any) => {
              txCalls.updates.push({ table, id, payload: updatePayload });
              return {
                link: vi.fn((payload: any) => {
                  txCalls.links.push({ table, id, payload });
                  return { table, id, payload };
                }),
              };
            }),
            delete: vi.fn(),
          }),
        }),
    }),
  },
  id: vi.fn(() => 'mock-id'),
}));

const sessionState = vi.hoisted(() => ({
  activeCouple: { couple: { id: 'couple-1' } },
  personalSpaceId: 'solo-1',
  sharedSpaceId: 'couple-1',
  user: { id: 'user-1', displayName: 'Tor' },
  space: { kind: 'pair' },
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: vi.fn(() => sessionState),
}));

vi.mock('@/src/lib/push', () => ({
  notifySpaceMutation: pushState.notifySpaceMutation,
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

describe('usePlans', () => {
  beforeEach(() => {
    sessionState.activeCouple = { couple: { id: 'couple-1' } };
    sessionState.personalSpaceId = 'solo-1';
    sessionState.sharedSpaceId = 'couple-1';
    sessionState.user = { id: 'user-1', displayName: 'Tor' };
    sessionState.space = { kind: 'pair' };
    pushState.notifySpaceMutation.mockClear();
    (db.transact as any).mockClear();
    txCalls.updates = [];
    txCalls.links = [];
    queryState.data = { plans: [] };
  });

  it('exports the usePlans hook as a function', async () => {
    const { usePlans } = await import('@/src/hooks/usePlans');
    expect(usePlans).toBeTypeOf('function');
  });

  it('loads the owning space relation needed to normalize personal legacy plans', async () => {
    const { usePlans } = await import('@/src/hooks/usePlans');
    const { renderer } = await renderHookValue(() => usePlans());

    expect((db.useQuery as any).mock.calls.at(-1)?.[0]).toEqual({
      plans: {
        $: {
          where: {
            or: [{ 'couple.id': 'solo-1' }, { 'couple.id': 'couple-1' }],
          },
        },
        couple: {},
        createdBy: {},
      },
    });

    act(() => renderer.unmount());
  });

  it('writes private plans to the permanent solo space', async () => {
    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    await act(async () => {
      await latest.create({ title: 'Private target', isPrivate: true });
      await flush();
    });

    expect(txCalls.links[0]).toEqual({
      table: 'plans',
      id: 'mock-id',
      payload: { couple: 'solo-1', createdBy: 'user-1' },
    });
    act(() => renderer.unmount());
  });

  it('stores fallback solo plan creates as private and skips shared push', async () => {
    sessionState.activeCouple = { couple: { id: 'solo-1' } };
    sessionState.sharedSpaceId = null as any;
    sessionState.space = { kind: 'solo' };
    const { notifySpaceMutation } = await import('@/src/lib/push');
    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    await act(async () => {
      await latest.create({ title: 'Solo default', isPrivate: false });
      await flush();
    });

    expect(txCalls.updates[0]).toEqual(
      expect.objectContaining({
        table: 'plans',
        id: 'mock-id',
        payload: expect.objectContaining({ isPrivate: true }),
      }),
    );
    expect(txCalls.links[0]).toEqual({
      table: 'plans',
      id: 'mock-id',
      payload: { couple: 'solo-1', createdBy: 'user-1' },
    });
    expect(notifySpaceMutation).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('relinks plans when privacy changes during edit', async () => {
    queryState.data = {
      plans: [
        {
          id: 'plan-1',
          title: 'Shared target',
          isPrivate: false,
          couple: { id: 'couple-1' },
          createdBy: { id: 'user-1' },
        },
      ],
    };
    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    await act(async () => {
      await latest.update('plan-1', { isPrivate: true });
      await flush();
    });

    expect(txCalls.links[0]).toEqual({
      table: 'plans',
      id: 'plan-1',
      payload: { couple: 'solo-1' },
    });
    act(() => renderer.unmount());
  });

  it('fails closed instead of moving another member plan into the personal space', async () => {
    queryState.data = {
      plans: [
        {
          id: 'partner-plan',
          title: 'Partner target',
          isPrivate: false,
          couple: { id: 'couple-1' },
          createdBy: { id: 'partner-1' },
        },
      ],
    };
    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    await expect(latest.update('partner-plan', { isPrivate: true }))
      .rejects.toThrow('Cannot move another member plan into personal space');

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(pushState.notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating a plan outside the scoped result set', async () => {
    queryState.data = { plans: [] };
    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    await expect(latest.update('missing-plan', { title: 'Wrong target' })).rejects.toThrow('Plan not found');

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of deleting a plan outside the scoped result set', async () => {
    queryState.data = { plans: [] };
    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    await expect(latest.remove('missing-plan')).rejects.toThrow('Plan not found');

    expect(db.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('classifies personal-space legacy plans as private even when the old flag is shared', async () => {
    queryState.data = {
      plans: [
        {
          id: 'personal-plan',
          title: 'Personal target',
          isPrivate: false,
          couple: { id: 'solo-1' },
        },
        {
          id: 'shared-plan',
          title: 'Shared target',
          isPrivate: false,
          couple: { id: 'couple-1' },
        },
      ],
    };

    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    expect(latest.plans).toEqual([
      expect.objectContaining({ id: 'personal-plan', isPrivate: true }),
      expect.objectContaining({ id: 'shared-plan', isPrivate: false }),
    ]);
    act(() => renderer.unmount());
  });

  it('normalizes malformed legacy plan privacy flags from the owning space', async () => {
    queryState.data = {
      plans: [
        {
          id: 'shared-malformed-plan',
          title: 'Shared malformed target',
          isPrivate: 'false',
          couple: { id: 'couple-1' },
          createdBy: { id: 'user-1' },
        },
        {
          id: 'personal-malformed-plan',
          title: 'Personal malformed target',
          isPrivate: 'false',
          couple: { id: 'solo-1' },
          createdBy: { id: 'user-1' },
        },
      ],
    };

    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    expect(latest.plans.find((plan: any) => plan.id === 'shared-malformed-plan')?.isPrivate)
      .toBe(false);
    expect(latest.plans.find((plan: any) => plan.id === 'personal-malformed-plan')?.isPrivate)
      .toBe(true);
    act(() => renderer.unmount());
  });

  it('excludes partner-authored rows from the current user personal space', async () => {
    queryState.data = {
      plans: [
        {
          id: 'personal-partner-plan',
          title: 'Partner private target',
          isPrivate: false,
          couple: { id: 'solo-1' },
          createdBy: { id: 'partner-1' },
        },
        {
          id: 'personal-self-plan',
          title: 'My private target',
          isPrivate: false,
          couple: { id: 'solo-1' },
          createdBy: { id: 'user-1' },
        },
        {
          id: 'shared-partner-plan',
          title: 'Shared target',
          isPrivate: false,
          couple: { id: 'couple-1' },
          createdBy: { id: 'partner-1' },
        },
      ],
    };

    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    expect(latest.plans.map((plan: any) => plan.id)).toEqual([
      'personal-self-plan',
      'shared-partner-plan',
    ]);
    expect(latest.plans[0]).toMatchObject({ id: 'personal-self-plan', isPrivate: true });

    act(() => renderer.unmount());
  });

  it('normalizes malformed legacy plan priorities before exposing scoped rows', async () => {
    queryState.data = {
      plans: [
        {
          id: 'legacy-malformed-priority-plan',
          title: 'Imported target',
          priority: Number.MAX_VALUE,
          isPrivate: false,
          couple: { id: 'couple-1' },
          createdBy: { id: 'user-1' },
        },
      ],
    };

    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    expect(latest.plans).toEqual([
      expect.objectContaining({
        id: 'legacy-malformed-priority-plan',
        priority: 0,
      }),
    ]);

    act(() => renderer.unmount());
  });

  it('fails closed instead of silently succeeding when create has no target space', async () => {
    sessionState.activeCouple = null as any;
    sessionState.personalSpaceId = null as any;
    sessionState.sharedSpaceId = null as any;
    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    await expect(latest.create({ title: 'Ghost plan' })).rejects.toThrow('No active space');

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);
    expect(pushState.notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of creating plans with malformed privacy metadata', async () => {
    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    await expect(
      latest.create({ title: 'Bad target', isPrivate: 'false' as any }),
    ).rejects.toThrow('Invalid plan privacy');

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(pushState.notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of creating malformed target dates', async () => {
    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    await expect(
      latest.create({ title: 'Bad target', targetDate: '2030-02-31' }),
    ).rejects.toThrow('Invalid plan target date');

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(pushState.notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of creating plans with malformed status metadata', async () => {
    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    await expect(
      latest.create({ title: 'Bad target', status: 'blocked' as any }),
    ).rejects.toThrow('Invalid plan status');

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(pushState.notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of creating plans with malformed priority metadata', async () => {
    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    await expect(
      latest.create({ title: 'Bad priority target', priority: 9 }),
    ).rejects.toThrow('Invalid priority');

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(pushState.notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of creating plans with malformed color metadata', async () => {
    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    await expect(
      latest.create({ title: 'Bad color target', colorKey: 'neon' as any }),
    ).rejects.toThrow('Invalid plan color');

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(pushState.notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating plans with malformed privacy metadata', async () => {
    queryState.data = {
      plans: [
        {
          id: 'plan-1',
          title: 'Existing target',
          isPrivate: false,
          couple: { id: 'couple-1' },
          createdBy: { id: 'user-1' },
        },
      ],
    };
    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    await expect(
      latest.update('plan-1', { isPrivate: 'false' as any }),
    ).rejects.toThrow('Invalid plan privacy');

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(pushState.notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating malformed target dates', async () => {
    queryState.data = {
      plans: [
        {
          id: 'plan-1',
          title: 'Existing target',
          targetDate: '2030-04-15',
          isPrivate: false,
          couple: { id: 'couple-1' },
          createdBy: { id: 'user-1' },
        },
      ],
    };
    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    await expect(
      latest.update('plan-1', { targetDate: 'not-a-date' }),
    ).rejects.toThrow('Invalid plan target date');

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(pushState.notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating plans with malformed priority metadata', async () => {
    queryState.data = {
      plans: [
        {
          id: 'plan-1',
          title: 'Existing target',
          priority: 2,
          isPrivate: false,
          couple: { id: 'couple-1' },
          createdBy: { id: 'user-1' },
        },
      ],
    };
    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    await expect(
      latest.update('plan-1', { priority: -1 }),
    ).rejects.toThrow('Invalid priority');

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(pushState.notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating plans with malformed color metadata', async () => {
    queryState.data = {
      plans: [
        {
          id: 'plan-1',
          title: 'Existing target',
          colorKey: 'sky',
          isPrivate: false,
          couple: { id: 'couple-1' },
          createdBy: { id: 'user-1' },
        },
      ],
    };
    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    await expect(
      latest.update('plan-1', { colorKey: 'neon' as any }),
    ).rejects.toThrow('Invalid plan color');

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(pushState.notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating plans with malformed status metadata', async () => {
    queryState.data = {
      plans: [
        {
          id: 'plan-1',
          title: 'Existing target',
          status: 'active',
          isPrivate: false,
          couple: { id: 'couple-1' },
          createdBy: { id: 'user-1' },
        },
      ],
    };
    const { usePlans } = await import('@/src/hooks/usePlans');
    const { latest, renderer } = await renderHookValue(() => usePlans());

    await expect(
      latest.update('plan-1', { status: 'blocked' as any }),
    ).rejects.toThrow('Invalid plan status');

    expect(db.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    expect(txCalls.links).toEqual([]);
    expect(pushState.notifySpaceMutation).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });
});
