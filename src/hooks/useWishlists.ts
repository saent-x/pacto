import { useCallback, useMemo } from 'react';
import { db, id } from '@/src/lib/instant';
import { useSession } from './useSession';

type WishlistItemInput = {
  title: string;
  description?: string | null;
  url?: string | null;
  price?: number | null;
  priority?: number;
};

export function useWishlists() {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? { wishlists: { $: { where: { 'couple.id': coupleId } } } }
      : null,
  );

  const wishlists = useMemo(() => data?.wishlists ?? [], [data?.wishlists]);

  const create = useCallback(
    async (name: string) => {
      if (!coupleId || !user) return;
      const wishlistId = id();
      await db.transact(
        db.tx.wishlists[wishlistId]
          .update({ name, createdAt: Date.now() })
          .link({ couple: coupleId, createdBy: user.id }),
      );
    },
    [coupleId, user],
  );

  const update = useCallback(async (wishlistId: string, name: string) => {
    await db.transact(db.tx.wishlists[wishlistId].update({ name }));
  }, []);

  const remove = useCallback(async (wishlistId: string) => {
    await db.transact(db.tx.wishlists[wishlistId].delete());
  }, []);

  return {
    wishlists,
    isLoading: !!coupleId && queryLoading,
    create,
    update,
    remove,
    refetch: async () => {},
  };
}

export function useWishlistItems(wishlistId: string | null) {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId && wishlistId
      ? { wishlistItems: { $: { where: { 'wishlist.id': wishlistId } } } }
      : null,
  );

  const items = useMemo(() => data?.wishlistItems ?? [], [data?.wishlistItems]);

  const add = useCallback(
    async (input: WishlistItemInput) => {
      if (!wishlistId || !coupleId || !user) return;
      const itemId = id();
      await db.transact(
        db.tx.wishlistItems[itemId]
          .update({
            title: input.title,
            description: input.description ?? undefined,
            url: input.url ?? undefined,
            price: input.price ?? undefined,
            isPurchased: false,
            priority: input.priority ?? 0,
            sortOrder: items.length,
            createdAt: Date.now(),
          })
          .link({ wishlist: wishlistId, couple: coupleId, addedBy: user.id }),
      );
    },
    [wishlistId, coupleId, user, items.length],
  );

  const update = useCallback(
    async (itemId: string, input: Partial<WishlistItemInput>) => {
      const updates: Record<string, unknown> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description ?? undefined;
      if (input.url !== undefined) updates.url = input.url ?? undefined;
      if (input.price !== undefined) updates.price = input.price ?? undefined;
      if (input.priority !== undefined) updates.priority = input.priority;
      await db.transact(db.tx.wishlistItems[itemId].update(updates));
    },
    [],
  );

  const togglePurchased = useCallback(
    async (itemId: string) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;
      const isNowPurchased = !item.isPurchased;
      const txns: any[] = [
        db.tx.wishlistItems[itemId].update({ isPurchased: isNowPurchased }),
      ];
      if (isNowPurchased && user) {
        txns.push(db.tx.wishlistItems[itemId].link({ purchasedBy: user.id }));
      }
      await db.transact(txns);
    },
    [items, user],
  );

  const remove = useCallback(async (itemId: string) => {
    await db.transact(db.tx.wishlistItems[itemId].delete());
  }, []);

  return {
    items,
    isLoading: !!coupleId && !!wishlistId && queryLoading,
    add,
    update,
    togglePurchased,
    remove,
    refetch: async () => {},
  };
}
