import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: null })),
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
}));

import { useAiQuota } from '@/src/hooks/useAiQuota';
import { usePlan } from '@/src/hooks/usePlan';
import { useMediaQuota } from '@/src/hooks/memories/useMediaQuota';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function renderHookValue<T>(useValue: () => T) {
  let latest: T | undefined;

  function Probe() {
    latest = useValue();
    return null;
  }

  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(<Probe />);
    await flush();
  });

  return { latest: latest!, renderer };
}

describe('space id guard hooks', () => {
  beforeEach(() => {
    dbMock.useQuery.mockClear();
    dbMock.useQuery.mockReturnValue({ data: null });
  });

  it('does not pass malformed space ids into Instant plan and quota queries', async () => {
    const hooks = [
      () => usePlan('not-a-uuid'),
      () => useAiQuota('not-a-uuid'),
      () => useMediaQuota('not-a-uuid'),
    ];

    for (const useValue of hooks) {
      const { renderer } = await renderHookValue(useValue);
      act(() => renderer.unmount());
    }

    expect(dbMock.useQuery.mock.calls.map((call) => call[0])).toEqual([null, null, null]);
  });

  it('passes valid Instant space ids into plan and quota queries', async () => {
    const spaceId = '11111111-1111-4111-8111-111111111111';
    const hooks = [
      () => usePlan(spaceId),
      () => useAiQuota(spaceId),
      () => useMediaQuota(spaceId),
    ];

    for (const useValue of hooks) {
      const { renderer } = await renderHookValue(useValue);
      act(() => renderer.unmount());
    }

    const queries = dbMock.useQuery.mock.calls.map((call) => call[0]);
    expect(queries[0]).toMatchObject({ spaces: { $: { where: { id: spaceId } } } });
    expect(queries[1]).toMatchObject({ spaces: { $: { where: { id: spaceId } } } });
    expect(queries[2]).toMatchObject({ spaces: { $: { where: { id: spaceId } } } });
  });

  it('uses the highest valid AI usage row for quota accounting', async () => {
    dbMock.useQuery.mockReturnValue({
      data: {
        spaces: [
          {
            plan: 'free',
            aiUsage: [
              { turns: 1 },
              { turns: 25 },
              { turns: -8 },
              { turns: Number.POSITIVE_INFINITY },
            ],
          },
        ],
      },
    });

    const { latest, renderer } = await renderHookValue(() =>
      useAiQuota('11111111-1111-4111-8111-111111111111'),
    );
    act(() => renderer.unmount());

    expect(latest).toEqual({
      used: 25,
      cap: 20,
      remaining: 0,
      isExhausted: true,
    });
  });
});
