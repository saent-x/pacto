import { useCallback, useMemo } from 'react';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { makeFunctionReference } from 'convex/server';

import { useSession } from './useSession';

type WishlistDoc = {
  _id: string;
  coupleId: string;
  name: string;
  createdBy: string;
  createdAt: number;
};

type WishlistItemDoc = {
  _id: string;
  wishlistId: string;
  coupleId: string;
  title: string;
  description: string | null;
  url: string | null;
  price: number | null;
  isPurchased: boolean;
  purchasedBy: string | null;
  priority: number;
  sortOrder: number;
  addedBy: string;
  createdAt: number;
};

type WishlistItemInput = {
  title: string;
  description?: string | null;
  url?: string | null;
  price?: number | null;
  priority?: number;
};

const listWishlistsQuery = makeFunctionReference<'query', {}, WishlistDoc[]>(
  'wishlists:listWishlists',
);
const createWishlistMutation = makeFunctionReference<
  'mutation',
  { name: string },
  WishlistDoc
>('wishlists:createWishlist');
const updateWishlistMutation = makeFunctionReference<
  'mutation',
  { wishlistId: string; name?: string },
  WishlistDoc
>('wishlists:updateWishlist');
const deleteWishlistMutation = makeFunctionReference<
  'mutation',
  { wishlistId: string },
  null
>('wishlists:deleteWishlist');

const getWishlistItemsQuery = makeFunctionReference<
  'query',
  { wishlistId: string },
  WishlistItemDoc[]
>('wishlists:getWishlistItems');
const addWishlistItemMutation = makeFunctionReference<
  'mutation',
  {
    wishlistId: string;
    title: string;
    description?: string | null;
    url?: string | null;
    price?: number | null;
    priority?: number;
  },
  WishlistItemDoc
>('wishlists:addWishlistItem');
const updateWishlistItemMutation = makeFunctionReference<
  'mutation',
  {
    itemId: string;
    title?: string;
    description?: string | null;
    url?: string | null;
    price?: number | null;
    priority?: number;
  },
  WishlistItemDoc
>('wishlists:updateWishlistItem');
const toggleWishlistItemPurchasedMutation = makeFunctionReference<
  'mutation',
  { itemId: string },
  WishlistItemDoc
>('wishlists:toggleWishlistItemPurchased');
const deleteWishlistItemMutation = makeFunctionReference<
  'mutation',
  { itemId: string },
  null
>('wishlists:deleteWishlistItem');

export function useWishlists() {
  const { activeCouple } = useSession();
  const convex = useConvex();
  const rows = useQuery(listWishlistsQuery, activeCouple ? {} : 'skip');
  const createWishlist = useMutation(createWishlistMutation);
  const updateWishlist = useMutation(updateWishlistMutation);
  const deleteWishlistFn = useMutation(deleteWishlistMutation);

  const wishlists = useMemo(() => rows ?? [], [rows]);

  const create = useCallback(
    async (name: string) => {
      await createWishlist({ name });
    },
    [createWishlist],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteWishlistFn({ wishlistId: id });
    },
    [deleteWishlistFn],
  );

  const update = useCallback(
    async (id: string, name: string) => {
      await updateWishlist({ wishlistId: id, name });
    },
    [updateWishlist],
  );

  return {
    wishlists,
    isLoading: !!activeCouple && rows === undefined,
    create,
    update,
    remove,
    refetch: async () => {
      if (!activeCouple) return;
      await convex.query(listWishlistsQuery, {});
    },
  };
}

export function useWishlistItems(wishlistId: string | null) {
  const { activeCouple } = useSession();
  const convex = useConvex();
  const rows = useQuery(
    getWishlistItemsQuery,
    activeCouple && wishlistId ? { wishlistId } : 'skip',
  );
  const addItem = useMutation(addWishlistItemMutation);
  const updateItemFn = useMutation(updateWishlistItemMutation);
  const togglePurchasedFn = useMutation(toggleWishlistItemPurchasedMutation);
  const deleteItemFn = useMutation(deleteWishlistItemMutation);

  const items = useMemo(() => rows ?? [], [rows]);

  const add = useCallback(
    async (data: WishlistItemInput) => {
      if (!wishlistId) return;
      await addItem({
        wishlistId,
        title: data.title,
        description: data.description ?? null,
        url: data.url ?? null,
        price: data.price ?? null,
        priority: data.priority,
      });
    },
    [addItem, wishlistId],
  );

  const update = useCallback(
    async (itemId: string, data: Partial<WishlistItemInput>) => {
      await updateItemFn({
        itemId,
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.url !== undefined ? { url: data.url ?? null } : {}),
        ...(data.price !== undefined ? { price: data.price ?? null } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
      });
    },
    [updateItemFn],
  );

  const togglePurchased = useCallback(
    async (itemId: string) => {
      await togglePurchasedFn({ itemId });
    },
    [togglePurchasedFn],
  );

  const remove = useCallback(
    async (itemId: string) => {
      await deleteItemFn({ itemId });
    },
    [deleteItemFn],
  );

  return {
    items,
    isLoading: !!activeCouple && !!wishlistId && rows === undefined,
    add,
    update,
    togglePurchased,
    remove,
    refetch: async () => {
      if (!activeCouple || !wishlistId) return;
      await convex.query(getWishlistItemsQuery, { wishlistId });
    },
  };
}
