import { useCallback, useMemo } from 'react';
import { db, id } from '@/src/lib/instant';
import { useSession } from './useSession';

export type PlanInput = {
  title: string;
  description?: string | null;
  category?: string | null;
  targetDate?: string | null;
  budget?: number | null;
  status?: string;
  priority?: number;
  isPrivate?: boolean;
  icon?: string;
  color?: string;
  bucket?: string;
};

export function usePlans(statuses?: string[]) {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? { plans: { $: { where: { 'couple.id': coupleId } } } }
      : null,
  );

  const plans = useMemo(() => {
    const raw = data?.plans ?? [];
    if (!statuses || statuses.length === 0) return raw;
    return raw.filter((p) => p.status != null && statuses.includes(p.status));
  }, [data?.plans, statuses]);

  const create = useCallback(
    async (input: PlanInput) => {
      if (!coupleId || !user) return;
      const planId = id();
      const now = Date.now();
      await db.transact(
        db.tx.plans[planId]
          .update({
            title: input.title,
            description: input.description ?? undefined,
            category: input.category ?? undefined,
            targetDate: input.targetDate ?? undefined,
            budget: input.budget ?? undefined,
            status: input.status ?? 'active',
            priority: input.priority ?? 0,
            isPrivate: input.isPrivate ?? false,
            icon: input.icon ?? undefined,
            color: input.color ?? undefined,
            bucket: input.bucket ?? undefined,
            createdAt: now,
            updatedAt: now,
          })
          .link({ couple: coupleId, createdBy: user.id }),
      );
    },
    [coupleId, user],
  );

  const update = useCallback(
    async (planId: string, input: Partial<PlanInput>) => {
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description ?? null;
      if (input.category !== undefined) updates.category = input.category ?? null;
      if (input.targetDate !== undefined) updates.targetDate = input.targetDate ?? null;
      if (input.budget !== undefined) updates.budget = input.budget ?? null;
      if (input.status !== undefined) updates.status = input.status;
      if (input.priority !== undefined) updates.priority = input.priority;
      if (input.isPrivate !== undefined) updates.isPrivate = input.isPrivate;
      if (input.icon !== undefined) updates.icon = input.icon;
      if (input.color !== undefined) updates.color = input.color;
      if (input.bucket !== undefined) updates.bucket = input.bucket;
      await db.transact(db.tx.plans[planId].update(updates));
    },
    [],
  );

  const remove = useCallback(async (planId: string) => {
    await db.transact(db.tx.plans[planId].delete());
  }, []);

  return {
    plans,
    isLoading: !!coupleId && queryLoading,
    create,
    update,
    remove,
    refetch: async () => {},
  };
}
