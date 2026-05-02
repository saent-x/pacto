import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryState = vi.hoisted(() => ({
  data: null as any,
}));

const sessionState = vi.hoisted(() => ({
  activeCouple: { couple: { id: 'couple-1' } },
  user: { id: 'user-1' },
}));

const dbMock = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: queryState.data, isLoading: false })),
  transact: vi.fn(),
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
  id: vi.fn(() => 'mock-id'),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: vi.fn(() => sessionState),
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

describe('useWishlists', () => {
  beforeEach(() => {
    queryState.data = null;
    dbMock.useQuery.mockClear();
    dbMock.transact.mockClear();
  });

  it('exports the useWishlists hook as a function', async () => {
    const { useWishlists } = await import('@/src/hooks/useWishlists');
    expect(useWishlists).toBeTypeOf('function');
  });

  it('exports the useWishlistItems hook as a function', async () => {
    const { useWishlistItems } = await import('@/src/hooks/useWishlists');
    expect(useWishlistItems).toBeTypeOf('function');
  });

  it('maps all wishlist items with persisted scope and defaults missing scope to mine', async () => {
    queryState.data = {
      wishlistItems: [
        {
          id: 'wish-1',
          title: 'Lamp',
          addedBy: { id: 'user-1' },
          wishlist: { id: 'list-1', name: 'Home' },
        },
        {
          id: 'wish-2',
          title: 'Trip',
          scope: 'shared',
          addedBy: { id: 'partner-1' },
          wishlist: { id: 'list-1', name: 'Home' },
        },
      ],
    };

    const { useAllWishlistItems } = await import('@/src/hooks/useWishlists');
    const { latest, renderer } = await renderHookValue(() => useAllWishlistItems());

    expect(latest.items.map((item: any) => item.scope)).toEqual(['mine', 'shared']);
    act(() => renderer.unmount());
  });

  it('maps per-list wishlist items with persisted scope and defaults missing scope to mine', async () => {
    queryState.data = {
      wishlistItems: [
        { id: 'wish-1', title: 'Lamp' },
        { id: 'wish-2', title: 'Watch', scope: 'partner' },
      ],
    };

    const { useWishlistItems } = await import('@/src/hooks/useWishlists');
    const { latest, renderer } = await renderHookValue(() => useWishlistItems('list-1'));

    expect(latest.items.map((item: any) => item.scope)).toEqual(['mine', 'partner']);
    act(() => renderer.unmount());
  });
});
