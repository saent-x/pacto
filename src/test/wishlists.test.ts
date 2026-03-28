import { describe, expect, it, vi } from 'vitest';

vi.mock('convex/server', () => ({
  makeFunctionReference: vi.fn((name: string) => name),
}));

vi.mock('convex/react', () => ({
  useConvex: vi.fn(),
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: vi.fn(() => ({ activeCouple: null })),
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

  it('module uses makeFunctionReference for Convex bindings', async () => {
    const { makeFunctionReference } = await import('convex/server');
    await import('@/src/hooks/useWishlists');
    expect(makeFunctionReference).toHaveBeenCalledWith('wishlists:listWishlists');
    expect(makeFunctionReference).toHaveBeenCalledWith('wishlists:createWishlist');
    expect(makeFunctionReference).toHaveBeenCalledWith('wishlists:deleteWishlist');
    expect(makeFunctionReference).toHaveBeenCalledWith('wishlists:getWishlistItems');
    expect(makeFunctionReference).toHaveBeenCalledWith('wishlists:addWishlistItem');
    expect(makeFunctionReference).toHaveBeenCalledWith('wishlists:updateWishlistItem');
    expect(makeFunctionReference).toHaveBeenCalledWith('wishlists:toggleWishlistItemPurchased');
    expect(makeFunctionReference).toHaveBeenCalledWith('wishlists:deleteWishlistItem');
  });
});
