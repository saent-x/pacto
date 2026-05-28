import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  useQuery: vi.fn(),
}));

const queryState = vi.hoisted(() => ({
  data: { memories: [] as any[] },
  isLoading: false,
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
}));

import { useMemoryTopics } from '@/src/hooks/memories/useMemoryTopics';

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

describe('useMemoryTopics space scope', () => {
  beforeEach(() => {
    queryState.data = { memories: [] };
    queryState.isLoading = false;
    dbMock.useQuery.mockReset();
    dbMock.useQuery.mockImplementation(() => ({
      data: queryState.data,
      isLoading: queryState.isLoading,
    }));
  });

  it('does not count personal-space legacy private memories as Just us', async () => {
    queryState.data = {
      memories: [
        {
          id: 'personal-legacy',
          kind: 'post',
          author: null,
          isPrivate: false,
          space: { id: 'solo-1' },
          tags: ['private'],
        },
        {
          id: 'shared-former-member',
          kind: 'post',
          author: null,
          isPrivate: false,
          space: { id: 'shared-1' },
          tags: ['shared'],
        },
        {
          id: 'mine',
          kind: 'post',
          author: { id: 'me' },
          space: { id: 'solo-1' },
        },
      ],
    };

    const { latest, renderer } = await renderHookValue(() =>
      useMemoryTopics(['solo-1', 'shared-1'], 'me', 'solo-1' as any),
    );

    expect(dbMock.useQuery.mock.calls.at(-1)?.[0].memories.space).toEqual({});
    expect(latest.topics.find((topic) => topic.id === 'us')?.count).toBe(1);
    expect(latest.topics.find((topic) => topic.id === 'mine')?.count).toBe(1);

    act(() => renderer.unmount());
  });

  it('orders the bounded topic source query by newest memories first', async () => {
    const { renderer } = await renderHookValue(() =>
      useMemoryTopics(['solo-1', 'shared-1'], 'me', 'solo-1' as any),
    );

    expect(dbMock.useQuery.mock.calls.at(-1)?.[0].memories.$).toMatchObject({
      where: {
        or: [{ 'space.id': 'solo-1' }, { 'space.id': 'shared-1' }],
      },
      order: { createdAt: 'desc' },
      limit: 500,
    });

    act(() => renderer.unmount());
  });

  it('does not count partner-authored memories from the current user personal space', async () => {
    queryState.data = {
      memories: [
        {
          id: 'personal-partner-memory',
          kind: 'post',
          author: { id: 'partner-1' },
          isPrivate: false,
          space: { id: 'solo-1' },
          tags: ['private-leak'],
        },
        {
          id: 'personal-self-memory',
          kind: 'post',
          author: { id: 'me' },
          isPrivate: false,
          space: { id: 'solo-1' },
          tags: ['self'],
        },
        {
          id: 'shared-partner-memory',
          kind: 'post',
          author: { id: 'partner-1' },
          isPrivate: false,
          space: { id: 'shared-1' },
          tags: ['shared'],
        },
      ],
    };

    const { latest, renderer } = await renderHookValue(() =>
      useMemoryTopics(['solo-1', 'shared-1'], 'me', 'solo-1' as any),
    );

    expect(latest.topics.find((topic) => topic.id === 'us')?.count).toBe(1);
    expect(latest.topics.find((topic) => topic.id === 'mine')?.count).toBe(1);
    expect(latest.topics.some((topic) => topic.id === 'private-leak')).toBe(false);

    act(() => renderer.unmount());
  });
});
