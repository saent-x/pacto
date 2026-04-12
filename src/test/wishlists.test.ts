import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/lib/instant', () => ({
  db: {
    useQuery: vi.fn(() => ({ data: null, isLoading: false })),
    transact: vi.fn(),
  },
  id: vi.fn(() => 'mock-id'),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: vi.fn(() => ({ activeCouple: null, user: null })),
}));

describe('useWishlists', () => {
  it('exports the useWishlists hook as a function', async () => {
    const { useWishlists } = await import('@/src/hooks/useWishlists');
    expect(useWishlists).toBeTypeOf('function');
  });

  it('exports the useWishlistItems hook as a function', async () => {
    const { useWishlistItems } = await import('@/src/hooks/useWishlists');
    expect(useWishlistItems).toBeTypeOf('function');
  });
});
