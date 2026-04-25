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
      ? { wishlists: { $: { where: { 'couple.id': coupleId } }, createdBy: {} } }
      : null,
  );

  const wishlists = useMemo(
    () => (data?.wishlists ?? []).map((w) => ({
      ...w,
      createdBy: (w.createdBy as any)?.[0]?.id ?? (w.createdBy as any)?.id ?? '',
    })),
    [data?.wishlists],
  );

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

export type QuickAddWishInput = {
  title: string;
  price?: number | null;
  currency?: string;
  tag?: string | null;
  url?: string | null;
};

export function useQuickAddWishItem() {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;

  const { data } = db.useQuery(
    coupleId ? { wishlists: { $: { where: { 'couple.id': coupleId } } } } : null,
  );
  const existingId = (data?.wishlists ?? [])[0]?.id as string | undefined;

  const add = useCallback(
    async (input: QuickAddWishInput) => {
      if (!coupleId || !user) return;
      let wlId = existingId;
      if (!wlId) {
        wlId = id();
        await db.transact(
          db.tx.wishlists[wlId]
            .update({ name: 'Our wishes', createdAt: Date.now() })
            .link({ couple: coupleId, createdBy: user.id }),
        );
      }
      const itId = id();
      await db.transact(
        db.tx.wishlistItems[itId]
          .update({
            title: input.title,
            price: input.price ?? undefined,
            currency: input.currency ?? 'EUR',
            tag: input.tag ?? undefined,
            url: input.url ?? undefined,
            isPurchased: false,
            priority: 0,
            sortOrder: 0,
            createdAt: Date.now(),
          })
          .link({ wishlist: wlId, couple: coupleId, addedBy: user.id }),
      );
    },
    [coupleId, user, existingId],
  );

  const update = useCallback(
    async (itemId: string, input: Partial<QuickAddWishInput>) => {
      const updates: Record<string, unknown> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.price !== undefined) updates.price = input.price ?? null;
      if (input.currency !== undefined) updates.currency = input.currency;
      if (input.tag !== undefined) updates.tag = input.tag ?? null;
      if (input.url !== undefined) updates.url = input.url ?? null;
      await db.transact(db.tx.wishlistItems[itemId].update(updates));
    },
    [],
  );

  const remove = useCallback(async (itemId: string) => {
    await db.transact(db.tx.wishlistItems[itemId].delete());
  }, []);

  return { add, update, remove };
}

export function useAllWishlistItems() {
  const { activeCouple } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? {
          wishlistItems: {
            $: { where: { 'couple.id': coupleId } },
            addedBy: {},
            wishlist: {},
          },
        }
      : null,
  );

  const items = useMemo(
    () =>
      (data?.wishlistItems ?? []).map((i) => ({
        ...i,
        addedBy: (i.addedBy as any)?.[0]?.id ?? (i.addedBy as any)?.id ?? '',
        wishlistId: (i.wishlist as any)?.[0]?.id ?? (i.wishlist as any)?.id ?? '',
        wishlistName: (i.wishlist as any)?.[0]?.name ?? (i.wishlist as any)?.name ?? null,
      })),
    [data?.wishlistItems],
  );

  return {
    items,
    isLoading: !!coupleId && queryLoading,
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
      if (input.description !== undefined) updates.description = input.description ?? null;
      if (input.url !== undefined) updates.url = input.url ?? null;
      if (input.price !== undefined) updates.price = input.price ?? null;
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
