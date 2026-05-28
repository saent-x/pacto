import { useCallback, useMemo } from 'react';
import { db, id } from '@/src/lib/instant';
import { useSession } from './useSession';
import { personalOrSharedSpaceId, relationWhere, uniqueSpaceIds } from '@/src/lib/space-scope';

export type PastelKey = 'peach' | 'mint' | 'butter' | 'rose' | 'sky' | 'lavender' | 'gold' | 'journal';

export type ListRow = {
  id: string;
  name: string;
  colorKey: PastelKey;
  category: string | null;
  done: number;
  total: number;
  createdAt: number;
  scope?: 'personal' | 'shared';
};

export type RawTaskListNode = {
  id: string;
  name: string;
  colorKey: string | null | undefined;
  category: string | null | undefined;
  createdAt: number;
  couple?: { id?: string | null } | Array<{ id?: string | null }> | null;
  createdBy?: { id?: string | null } | Array<{ id?: string | null }> | null;
  tasks?: {
    id: string;
    isCompleted?: boolean | null;
    couple?: { id?: string | null } | Array<{ id?: string | null }> | null;
    createdBy?: { id?: string | null } | Array<{ id?: string | null }> | null;
    assignedTo?: { id?: string | null } | Array<{ id?: string | null }> | null;
    completedBy?: { id?: string | null } | Array<{ id?: string | null }> | null;
  }[];
};
type RawTaskListTaskNode = NonNullable<RawTaskListNode['tasks']>[number];

const DEFAULT_COLOR: PastelKey = 'peach';
const VALID_COLORS: PastelKey[] = ['peach', 'mint', 'butter', 'rose', 'sky', 'lavender', 'gold', 'journal'];

function isPastelKey(value: unknown): value is PastelKey {
  return typeof value === 'string' && VALID_COLORS.includes(value as PastelKey);
}

function assertValidTaskListColor(value: unknown): asserts value is PastelKey {
  if (!isPastelKey(value)) throw new Error('Invalid task list color');
}

function assertValidTaskListScope(value: unknown): asserts value is NonNullable<CreateListInput['scope']> {
  if (value !== 'personal' && value !== 'shared') throw new Error('Invalid task list scope');
}

export function toListRows(
  nodes: RawTaskListNode[],
  options: { personalSpaceId?: string | null; userId?: string | null } = {},
): ListRow[] {
  return nodes.map((n) => {
    const ownerSpaceId = firstRel(n.couple)?.id ?? null;
    const tasks = (n.tasks ?? []).filter((task) => {
      const taskSpaceId = firstRel(task.couple)?.id ?? null;
      if (ownerSpaceId && taskSpaceId && taskSpaceId !== ownerSpaceId) return false;
      const creatorId = firstRel(task.createdBy)?.id ?? null;
      const isPersonalSpaceTask = Boolean(
        options.personalSpaceId && ownerSpaceId === options.personalSpaceId,
      );
      return !(isPersonalSpaceTask && creatorId && creatorId !== options.userId);
    });
    const done = tasks.filter((t) => t.isCompleted === true).length;
    const colorKey = isPastelKey(n.colorKey) ? n.colorKey : DEFAULT_COLOR;
    const scope = ownerSpaceId && options.personalSpaceId
      ? ownerSpaceId === options.personalSpaceId ? 'personal' : 'shared'
      : undefined;
    return {
      id: n.id,
      name: n.name,
      colorKey,
      category: n.category ?? null,
      done,
      total: tasks.length,
      createdAt: n.createdAt,
      ...(scope ? { scope } : {}),
    };
  });
}

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function childTaskMatchesListSpace(task: RawTaskListTaskNode, ownerSpaceId: string | null) {
  const taskSpaceId = firstRel(task.couple)?.id ?? null;
  return !ownerSpaceId || !taskSpaceId || taskSpaceId === ownerSpaceId;
}

export type CreateListInput = {
  name: string;
  colorKey?: PastelKey;
  category?: string | null;
  scope?: 'personal' | 'shared';
};

export function useTaskLists() {
  const { activeCouple, user, personalSpaceId, sharedSpaceId } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const readableSpaceIds = uniqueSpaceIds([personalSpaceId ?? coupleId, sharedSpaceId ?? coupleId]);
  const userId = user?.id ?? null;

  const { data, isLoading: queryLoading, error } = db.useQuery(
    readableSpaceIds.length > 0
      ? {
          taskLists: {
            $: { where: relationWhere('couple', readableSpaceIds), order: { createdAt: 'asc' } },
            couple: {},
            createdBy: {},
            tasks: { couple: {}, createdBy: {}, assignedTo: {}, completedBy: {} },
          },
        }
      : null,
  );

  const visibleListNodes = useMemo(() => {
    return ((data?.taskLists ?? []) as RawTaskListNode[]).filter((list) => {
      const ownerSpaceId = firstRel(list.couple)?.id ?? null;
      const creatorId = firstRel(list.createdBy)?.id ?? null;
      const isPersonalSpaceRow = Boolean(personalSpaceId && ownerSpaceId === personalSpaceId);
      return !(isPersonalSpaceRow && creatorId && creatorId !== userId);
    });
  }, [data?.taskLists, personalSpaceId, userId]);
  const lists = useMemo(
    () => toListRows(visibleListNodes, { personalSpaceId, userId }),
    [personalSpaceId, userId, visibleListNodes],
  );
  const listById = useMemo(() => new Map(lists.map((list) => [list.id, list])), [lists]);
  const listNodeById = useMemo(
    () => new Map(visibleListNodes.map((list) => [list.id, list])),
    [visibleListNodes],
  );

  const create = useCallback(
    async (input: CreateListInput) => {
      if (input.scope !== undefined) assertValidTaskListScope(input.scope);
      const colorKey = input.colorKey ?? DEFAULT_COLOR;
      assertValidTaskListColor(colorKey);
      const targetSpaceId = personalOrSharedSpaceId({
        share: input.scope === 'personal' ? 'solo' : 'shared',
        personalSpaceId,
        sharedSpaceId,
        fallbackSpaceId: coupleId,
      });
      if (!targetSpaceId) throw new Error('No active space');
      if (!userId) throw new Error('No current user');
      const listId = id();
      const now = Date.now();
      await db.transact(
        db.tx.taskLists[listId]
          .update({
            name: input.name,
            colorKey,
            category: input.category ?? undefined,
            createdAt: now,
            updatedAt: now,
          })
          .link({ couple: targetSpaceId, createdBy: userId }),
      );
      return listId;
    },
    [coupleId, personalSpaceId, sharedSpaceId, userId],
  );

  const update = useCallback(
    async (listId: string, patch: Partial<CreateListInput>) => {
      const current = listNodeById.get(listId);
      if (!current) throw new Error('Task list not found');
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (patch.name !== undefined) updates.name = patch.name;
      if (patch.colorKey !== undefined) {
        assertValidTaskListColor(patch.colorKey);
        updates.colorKey = patch.colorKey;
      }
      if (patch.category !== undefined) updates.category = patch.category ?? null;
      let targetSpaceId: string | null = null;
      if (patch.scope !== undefined) {
        assertValidTaskListScope(patch.scope);
        targetSpaceId = personalOrSharedSpaceId({
          share: patch.scope === 'personal' ? 'solo' : 'shared',
          personalSpaceId,
          sharedSpaceId,
          fallbackSpaceId: coupleId,
        });
        if (!targetSpaceId) throw new Error('No active space');
        if (personalSpaceId && targetSpaceId === personalSpaceId) {
          const creatorId = firstRel(current.createdBy)?.id ?? null;
          if (creatorId && creatorId !== userId) {
            throw new Error('Cannot move another member task list to personal');
          }
          const currentSpaceId = firstRel(current.couple)?.id ?? null;
          for (const task of current.tasks ?? []) {
            if (typeof task?.id !== 'string' || !childTaskMatchesListSpace(task, currentSpaceId)) {
              continue;
            }
            const taskCreatorId = firstRel(task.createdBy)?.id ?? null;
            if (taskCreatorId && taskCreatorId !== userId) {
              throw new Error('Cannot move another member task to personal');
            }
          }
        }
      }
      let listOperation: any = db.tx.taskLists[listId].update(updates);
      const txns: any[] = [];
      if (targetSpaceId) {
        listOperation = listOperation.link({ couple: targetSpaceId });
      }
      txns.push(listOperation);
      if (targetSpaceId) {
        const currentSpaceId = firstRel(current.couple)?.id ?? null;
        for (const task of current.tasks ?? []) {
          if (typeof task?.id !== 'string' || !childTaskMatchesListSpace(task, currentSpaceId)) {
            continue;
          }
          txns.push((db.tx as any).tasks[task.id].link({ couple: targetSpaceId }));
          if (personalSpaceId && targetSpaceId === personalSpaceId) {
            const assignedTo = firstRel(task.assignedTo)?.id ?? null;
            const completedBy = firstRel(task.completedBy)?.id ?? null;
            if (assignedTo && assignedTo !== userId) {
              txns.push((db.tx as any).tasks[task.id].unlink({ assignedTo }));
            }
            if (completedBy && completedBy !== userId) {
              txns.push((db.tx as any).tasks[task.id].unlink({ completedBy }));
            }
          }
        }
      }
      await db.transact(txns.length === 1 ? txns[0] : txns);
    },
    [coupleId, listNodeById, personalSpaceId, sharedSpaceId, userId],
  );

  const remove = useCallback(async (listId: string) => {
    if (!listById.has(listId)) throw new Error('Task list not found');
    await db.transact(db.tx.taskLists[listId].delete());
  }, [listById]);

  return {
    lists,
    isLoading: readableSpaceIds.length > 0 && queryLoading,
    error,
    create,
    update,
    remove,
  };
}
