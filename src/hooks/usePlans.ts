import { useCallback, useMemo } from 'react';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { makeFunctionReference } from 'convex/server';

import { useSession } from './useSession';

type PlanDoc = {
  _id: string;
  coupleId: string;
  createdBy: string;
  title: string;
  description: string | null;
  category: string | null;
  targetDate: string | null;
  status: string;
  notes: string | null;
  coverImageUrl: string | null;
  budget: number | null;
  priority: number;
  isPrivate: boolean;
  createdAt: number;
  updatedAt: number;
};

export type PlanInput = {
  title: string;
  description?: string | null;
  category?: string | null;
  targetDate?: string | null;
  budget?: number | null;
  status?: string;
  priority?: number;
  isPrivate?: boolean;
};

const listPlansQuery = makeFunctionReference<'query', { statuses?: string[] }, PlanDoc[]>(
  'plans:listPlans',
);
const createPlanMutation = makeFunctionReference<
  'mutation',
  {
    title: string;
    description?: string | null;
    category?: string | null;
    targetDate?: string | null;
    budget?: number | null;
    status?: string;
    priority?: number;
    isPrivate?: boolean;
  },
  PlanDoc
>('plans:createPlan');
const updatePlanMutation = makeFunctionReference<
  'mutation',
  {
    planId: string;
    title?: string;
    description?: string | null;
    category?: string | null;
    targetDate?: string | null;
    budget?: number | null;
    status?: string;
    priority?: number;
    isPrivate?: boolean;
  },
  PlanDoc
>('plans:updatePlan');
const deletePlanMutation = makeFunctionReference<
  'mutation',
  { planId: string },
  null
>('plans:deletePlan');

export function usePlans(statuses?: string[]) {
  const { activeCouple } = useSession();
  const convex = useConvex();
  const rows = useQuery(listPlansQuery, activeCouple ? { ...(statuses ? { statuses } : {}) } : 'skip');
  const createPlan = useMutation(createPlanMutation);
  const updatePlan = useMutation(updatePlanMutation);
  const deletePlan = useMutation(deletePlanMutation);

  const plans = useMemo(() => rows ?? [], [rows]);

  const create = useCallback(
    async (data: PlanInput) => {
      await createPlan({
        title: data.title,
        description: data.description ?? null,
        category: data.category ?? null,
        targetDate: data.targetDate ?? null,
        budget: data.budget ?? null,
        status: data.status,
        priority: data.priority,
        isPrivate: data.isPrivate,
      });
    },
    [createPlan],
  );

  const update = useCallback(
    async (planId: string, data: Partial<PlanInput>) => {
      await updatePlan({
        planId,
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.category !== undefined ? { category: data.category ?? null } : {}),
        ...(data.targetDate !== undefined ? { targetDate: data.targetDate ?? null } : {}),
        ...(data.budget !== undefined ? { budget: data.budget ?? null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.isPrivate !== undefined ? { isPrivate: data.isPrivate } : {}),
      });
    },
    [updatePlan],
  );

  const remove = useCallback(
    async (planId: string) => {
      await deletePlan({ planId });
    },
    [deletePlan],
  );

  return {
    plans,
    isLoading: !!activeCouple && rows === undefined,
    create,
    update,
    remove,
    refetch: async () => {
      if (!activeCouple) return;
      await convex.query(listPlansQuery, { ...(statuses ? { statuses } : {}) });
    },
  };
}
