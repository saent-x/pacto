import { useCallback, useMemo } from 'react';
import { db, id } from '@/src/lib/instant';
import type { IconName } from '@/src/components/ui/Icon';
import { useSession } from './useSession';

export type PastelKey = 'peach' | 'mint' | 'butter' | 'rose' | 'sky' | 'lavender';

export type ListRow = {
  id: string;
  name: string;
  icon: IconName;
  colorKey: PastelKey;
  category: string | null;
  done: number;
  total: number;
  createdAt: number;
};

export type RawTaskListNode = {
  id: string;
  name: string;
  icon: string | null | undefined;
  colorKey: string | null | undefined;
  category: string | null | undefined;
  createdAt: number;
  tasks?: { id: string; isCompleted?: boolean | null }[];
};

const DEFAULT_ICON: IconName = 'shoppingBag';
const DEFAULT_COLOR: PastelKey = 'peach';
const VALID_COLORS: PastelKey[] = ['peach', 'mint', 'butter', 'rose', 'sky', 'lavender'];

export function toListRows(nodes: RawTaskListNode[]): ListRow[] {
  return nodes.map((n) => {
    const tasks = n.tasks ?? [];
    const done = tasks.filter((t) => t.isCompleted === true).length;
    const colorKey = VALID_COLORS.includes(n.colorKey as PastelKey)
      ? (n.colorKey as PastelKey)
      : DEFAULT_COLOR;
    // icon is trusted: values are always written through create/update which
    // type input.icon as IconName. Persisted values may still be arbitrary
    // strings, so consumers should treat this as IconName | string.
    const icon = (n.icon as IconName | null | undefined) ?? DEFAULT_ICON;
    return {
      id: n.id,
      name: n.name,
      icon,
      colorKey,
      category: n.category ?? null,
      done,
      total: tasks.length,
      createdAt: n.createdAt,
    };
  });
}

export type CreateListInput = {
  name: string;
  icon?: IconName;
  colorKey?: PastelKey;
  category?: string | null;
};

export function useTaskLists() {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const userId = user?.id ?? null;

  const { data, isLoading: queryLoading, error } = db.useQuery(
    coupleId
      ? {
          taskLists: {
            $: { where: { 'couple.id': coupleId }, order: { createdAt: 'asc' } },
            tasks: {},
          },
        }
      : null,
  );

  const lists = useMemo(
    () => toListRows((data?.taskLists ?? []) as RawTaskListNode[]),
    [data?.taskLists],
  );

  const create = useCallback(
    async (input: CreateListInput) => {
      if (!coupleId || !userId) return;
      const listId = id();
      const now = Date.now();
      await db.transact(
        db.tx.taskLists[listId]
          .update({
            name: input.name,
            icon: input.icon ?? DEFAULT_ICON,
            colorKey: input.colorKey ?? DEFAULT_COLOR,
            category: input.category ?? undefined,
            createdAt: now,
            updatedAt: now,
          })
          .link({ couple: coupleId, createdBy: userId }),
      );
      return listId;
    },
    [coupleId, userId],
  );

  const update = useCallback(
    async (listId: string, patch: Partial<CreateListInput>) => {
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (patch.name !== undefined) updates.name = patch.name;
      if (patch.icon !== undefined) updates.icon = patch.icon;
      if (patch.colorKey !== undefined) updates.colorKey = patch.colorKey;
      if (patch.category !== undefined) updates.category = patch.category ?? null;
      await db.transact(db.tx.taskLists[listId].update(updates));
    },
    [],
  );

  const remove = useCallback(async (listId: string) => {
    await db.transact(db.tx.taskLists[listId].delete());
  }, []);

  return {
    lists,
    isLoading: !!coupleId && queryLoading,
    error,
    create,
    update,
    remove,
  };
}
