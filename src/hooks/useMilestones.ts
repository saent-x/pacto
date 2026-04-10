import { useCallback, useMemo } from 'react';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { makeFunctionReference } from 'convex/server';
import { format } from 'date-fns';

import { useSession } from './useSession';

type MilestoneDoc = {
  _id: string;
  coupleId: string;
  title: string;
  date: string;
  description: string | null;
  icon: string;
  createdBy: string;
  createdAt: number;
  _creationTime?: number;
};

type MilestoneInput = {
  title: string;
  date: string;
  description?: string | null;
  icon?: string;
};

const listMilestonesQuery = makeFunctionReference<'query', {}, MilestoneDoc[]>(
  'milestones:listMilestones',
);
const createMilestoneMutation = makeFunctionReference<
  'mutation',
  {
    title: string;
    date: string;
    description?: string | null;
    icon?: string;
  },
  MilestoneDoc
>('milestones:createMilestone');
const updateMilestoneMutation = makeFunctionReference<
  'mutation',
  {
    milestoneId: string;
    title?: string;
    date?: string;
    description?: string | null;
    icon?: string;
  },
  MilestoneDoc
>('milestones:updateMilestone');
const deleteMilestoneMutation = makeFunctionReference<
  'mutation',
  { milestoneId: string },
  null
>('milestones:deleteMilestone');

export function useMilestones() {
  const { activeCouple } = useSession();
  const convex = useConvex();
  const rows = useQuery(listMilestonesQuery, activeCouple ? {} : 'skip');
  const createMilestone = useMutation(createMilestoneMutation);
  const updateMilestoneFn = useMutation(updateMilestoneMutation);
  const deleteMilestone = useMutation(deleteMilestoneMutation);

  const milestones = useMemo(() => rows ?? [], [rows]);

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
    async (data: MilestoneInput) => {
      await createMilestone({
        title: data.title,
        date: data.date,
        description: data.description ?? null,
        icon: data.icon,
      });
    },
    [createMilestone],
  );

  const update = useCallback(
    async (id: string, data: Partial<MilestoneInput>) => {
      await updateMilestoneFn({
        milestoneId: id,
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.date !== undefined ? { date: data.date } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
      });
    },
    [updateMilestoneFn],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteMilestone({ milestoneId: id });
    },
    [deleteMilestone],
  );

  return {
    milestones,
    upcoming,
    past,
    isLoading: !!activeCouple && rows === undefined,
    create,
    update,
    remove,
    refetch: async () => {
      if (!activeCouple) return;
      await convex.query(listMilestonesQuery, {});
    },
  };
}
