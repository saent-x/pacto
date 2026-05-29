import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: {}, isLoading: false, error: null })),
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => ({
    user: { id: 'user-1' },
    personalSpaceId: 'solo-1',
    sharedSpaceId: 'shared-1',
  }),
}));

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

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

describe('memory route id guards', () => {
  beforeEach(() => {
    dbMock.useQuery.mockClear();
    dbMock.useQuery.mockReturnValue({ data: {}, isLoading: false, error: null });
  });

  const validMemoryId = '55555555-5555-4555-8555-555555555555';

  it('does not pass malformed memory ids into Instant queries', async () => {
    const { useMemory } = await import('@/src/hooks/memories/useMemory');
    const { renderer } = await renderHookValue(() => useMemory('not-a-uuid'));

    expect(dbMock.useQuery).toHaveBeenCalledWith(null);

    act(() => renderer.unmount());
  });

  it('fails closed when a direct memory route has no current space scope', async () => {
    const { useMemory } = await import('@/src/hooks/memories/useMemory');
    const { renderer } = await renderHookValue(() => useMemory(validMemoryId, []));

    expect(dbMock.useQuery).toHaveBeenCalledWith(null);

    act(() => renderer.unmount());
  });

  it('passes current space scopes into direct memory route queries', async () => {
    const { useMemory } = await import('@/src/hooks/memories/useMemory');
    const { renderer } = await renderHookValue(() => useMemory(validMemoryId, ['solo-1', 'shared-1']));

    const query = dbMock.useQuery.mock.calls.at(-1)?.[0] as any;
    expect(query.memories.$.where).toEqual({
      and: [
        { id: validMemoryId },
        {
          or: [
            { 'space.id': 'solo-1' },
            { 'space.id': 'shared-1' },
          ],
        },
      ],
    });

    act(() => renderer.unmount());
  });

  it('does not resolve explicit partner-authored memories from the current user personal space', async () => {
    dbMock.useQuery.mockReturnValue({
      data: {
        memories: [
          {
            id: validMemoryId,
            kind: 'post',
            isPrivate: false,
            space: { id: 'solo-1' },
            author: { id: 'partner-1' },
            replies: [],
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    const { useMemory } = await import('@/src/hooks/memories/useMemory');
    const { latest, renderer } = await renderHookValue(() =>
      useMemory(validMemoryId, ['solo-1', 'shared-1'], 'solo-1', 'user-1'),
    );

    expect(latest.memory).toBe(null);

    act(() => renderer.unmount());
  });

  it('does not pass malformed member profile ids into Instant queries', async () => {
    const { useMemberProfile } = await import('@/src/hooks/memories/useMemberProfile');
    const { renderer } = await renderHookValue(() => useMemberProfile('not-a-uuid', ['solo-1', 'shared-1']));

    expect(dbMock.useQuery).toHaveBeenCalledWith(null);

    act(() => renderer.unmount());
  });

  it('does not pass malformed attached entity ids into Instant queries', async () => {
    const { useEntityRef } = await import('@/src/hooks/memories/useEntityRef');
    const { renderer } = await renderHookValue(() => useEntityRef('task', 'not-a-uuid'));

    expect(dbMock.useQuery).toHaveBeenCalledWith(null);

    act(() => renderer.unmount());
  });
});
