import { useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { db, id } from '@/src/lib/instant';
import { useSession } from './useSession';

type MilestoneInput = {
  title: string;
  date: string;
  description?: string | null;
  icon?: string;
};

export function useMilestones() {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? { milestones: { $: { where: { 'couple.id': coupleId } } } }
      : null,
  );

  const milestones = useMemo(() => data?.milestones ?? [], [data?.milestones]);

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
      if (input.description !== undefined) updates.description = input.description ?? undefined;
      if (input.icon !== undefined) updates.icon = input.icon;
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
