import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  useQuery: vi.fn(),
}));

const queryState = vi.hoisted(() => ({
  data: { $users: [], memberships: [], memories: [] as any[] },
  isLoading: false,
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
}));

import { useMemberProfile } from '@/src/hooks/memories/useMemberProfile';

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

describe('useMemberProfile memory scope', () => {
  beforeEach(() => {
    queryState.data = { $users: [], memberships: [], memories: [] };
    queryState.isLoading = false;
    dbMock.useQuery.mockReset();
    dbMock.useQuery.mockImplementation(() => ({
      data: queryState.data,
      isLoading: queryState.isLoading,
    }));
  });

  it('excludes explicit partner-authored memories from the current user personal space', async () => {
    queryState.data = {
      $users: [{ id: 'partner-1' }],
      memberships: [{ id: 'membership-1' }],
      memories: [
        {
          id: 'personal-partner-memory',
          kind: 'post',
          author: { id: 'partner-1' },
          isPrivate: false,
          space: { id: 'solo-1' },
        },
        {
          id: 'shared-partner-memory',
          kind: 'post',
          author: { id: 'partner-1' },
          isPrivate: false,
          space: { id: 'shared-1' },
        },
      ],
    };

    const { latest, renderer } = await renderHookValue(() =>
      useMemberProfile('partner-1', ['solo-1', 'shared-1'], 'solo-1', 'me'),
    );

    expect(latest.memories.map((memory: any) => memory.id)).toEqual(['shared-partner-memory']);

    act(() => renderer.unmount());
  });
});
