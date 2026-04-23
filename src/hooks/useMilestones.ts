import { useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { db, id } from '@/src/lib/instant';
import { useSession } from './useSession';

type MilestoneInput = {
  title: string;
  date: string;
  description?: string | null;
  icon?: string;
  color?: string;
  repeatYearly?: boolean;
  quote?: string;
};

export function useMilestones() {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? { milestones: { $: { where: { 'couple.id': coupleId } }, createdBy: {} } }
      : null,
  );

  const milestones = useMemo(
    () => (data?.milestones ?? []).map((m) => ({
      ...m,
      createdBy: (m.createdBy as any)?.[0]?.id ?? (m.createdBy as any)?.id ?? '',
    })),
    [data?.milestones],
  );

  const today = format(new Date(), 'yyyy-MM-dd');
  const upcoming = useMemo(
    () => milestones.filter((m) => m.date >= today),
    [milestones, today],
  );
  const past = useMemo(
    () => milestones.filter((m) => m.date < today),
    [milestones, today],
  );

  const create = useCallback(
    async (input: MilestoneInput) => {
      if (!coupleId || !user) return;
      const milestoneId = id();
      await db.transact(
        db.tx.milestones[milestoneId]
          .update({
            title: input.title,
            date: input.date,
            description: input.description ?? undefined,
            icon: input.icon ?? '🎉',
            color: input.color ?? undefined,
            repeatYearly: input.repeatYearly ?? undefined,
            quote: input.quote ?? undefined,
            createdAt: Date.now(),
          })
          .link({ couple: coupleId, createdBy: user.id }),
      );
    },
    [coupleId, user],
  );

  const update = useCallback(
    async (milestoneId: string, input: Partial<MilestoneInput>) => {
      const updates: Record<string, unknown> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.date !== undefined) updates.date = input.date;
      if (input.description !== undefined) updates.description = input.description ?? null;
      if (input.icon !== undefined) updates.icon = input.icon;
      if (input.color !== undefined) updates.color = input.color;
      if (input.repeatYearly !== undefined) updates.repeatYearly = input.repeatYearly;
      if (input.quote !== undefined) updates.quote = input.quote;
      await db.transact(db.tx.milestones[milestoneId].update(updates));
    },
    [],
  );

  const remove = useCallback(async (milestoneId: string) => {
    await db.transact(db.tx.milestones[milestoneId].delete());
  }, []);

  return {
    milestones,
    upcoming,
    past,
    isLoading: !!coupleId && queryLoading,
    create,
    update,
    remove,
    refetch: async () => {},
  };
}
