import { useCallback, useMemo } from 'react';
import { db, id } from '@/src/lib/instant';
import { notifySpaceMutation } from '@/src/lib/push';
import { useSession } from './useSession';
import { assertValidPriority, normalizePriority } from '@/src/lib/priority';
import { TARGET_COLOR_KEYS, type TargetColorKey } from '@/src/lib/color-cycle';
import { personalOrSharedSpaceId, relationWhere, uniqueSpaceIds } from '@/src/lib/space-scope';

export type PlanInput = {
  title: string;
  description?: string | null;
  category?: string | null;
  targetDate?: string | null;
  budget?: number | null;
  status?: PlanStatus;
  priority?: number;
  isPrivate?: boolean;
  color?: string;
  colorKey?: TargetColorKey;
  bucket?: string;
};

type PlanStatus = 'active' | 'planning' | 'done' | 'paused';

type UsePlansOptions = {
  enabled?: boolean;
};

function isPersonalTarget(
  targetSpaceId: string | null | undefined,
  personalSpaceId: string | null | undefined,
) {
  return Boolean(targetSpaceId && personalSpaceId && targetSpaceId === personalSpaceId);
}

function isValidDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateTargetDate(value: string | null | undefined): string | null | undefined {
  if (value == null) return value;
  if (!isValidDateKey(value)) throw new Error('Invalid plan target date');
  return value;
}

function assertValidPlanPrivacy(value: unknown): asserts value is boolean | undefined {
  if (value !== undefined && typeof value !== 'boolean') {
    throw new Error('Invalid plan privacy');
  }
}

function assertValidPlanStatus(value: unknown): asserts value is PlanStatus | undefined {
  if (
    value !== undefined &&
    value !== 'active' &&
    value !== 'planning' &&
    value !== 'done' &&
    value !== 'paused'
  ) {
    throw new Error('Invalid plan status');
  }
}

function assertValidPlanColorKey(value: unknown): asserts value is TargetColorKey | undefined {
  if (value !== undefined && !TARGET_COLOR_KEYS.includes(value as TargetColorKey)) {
    throw new Error('Invalid plan color');
  }
}

export function usePlans(statuses?: string[], options: UsePlansOptions = {}) {
  const enabled = options.enabled ?? true;
  const { activeCouple, user, space, personalSpaceId, sharedSpaceId } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const readableSpaceIds = uniqueSpaceIds([personalSpaceId ?? coupleId, sharedSpaceId ?? coupleId]);
  const userId = user?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    enabled && readableSpaceIds.length > 0
      ? { plans: { $: { where: relationWhere('couple', readableSpaceIds) }, couple: {}, createdBy: {} } }
      : null,
  );

  const plans = useMemo(() => {
    const raw = data?.plans ?? [];
    const normalized = personalSpaceId
      ? raw.flatMap((p: any) => {
          const owningSpaceId = firstRel(p.couple)?.id ?? null;
          const creatorId = firstRel(p.createdBy)?.id ?? null;
          const isPersonalSpaceRow = owningSpaceId === personalSpaceId;
          if (isPersonalSpaceRow && creatorId && creatorId !== userId) return [];
          return [normalizePlanRow(p, { isPersonalSpaceRow })];
        })
      : raw.map((p: any) => normalizePlanRow(p));
    if (!statuses || statuses.length === 0) return normalized;
    return normalized.filter((p: any) => p.status != null && statuses.includes(p.status));
  }, [data?.plans, personalSpaceId, statuses, userId]);
  const planById = useMemo(() => new Map(plans.map((plan: any) => [plan.id, plan])), [plans]);

  const create = useCallback(
    async (input: PlanInput) => {
      assertValidPlanPrivacy(input.isPrivate);
      assertValidPlanStatus(input.status);
      assertValidPriority(input.priority);
      assertValidPlanColorKey(input.colorKey);
      const targetDate = validateTargetDate(input.targetDate);
      const targetSpaceId = personalOrSharedSpaceId({
        isPrivate: input.isPrivate,
        personalSpaceId,
        sharedSpaceId,
        fallbackSpaceId: coupleId,
      });
      if (!targetSpaceId) throw new Error('No active space');
      if (!user) throw new Error('No current user');
      const isPrivate = Boolean(input.isPrivate || isPersonalTarget(targetSpaceId, personalSpaceId));
      const planId = id();
      const now = Date.now();
      await db.transact(
        db.tx.plans[planId]
          .update({
            title: input.title,
            description: input.description ?? undefined,
            category: input.category ?? undefined,
            targetDate: targetDate ?? undefined,
            budget: input.budget ?? undefined,
            status: input.status ?? 'active',
            priority: input.priority ?? 0,
            isPrivate,
            color: input.color ?? undefined,
            colorKey: input.colorKey ?? undefined,
            bucket: input.bucket ?? undefined,
            createdAt: now,
            updatedAt: now,
          })
          .link({ couple: targetSpaceId, createdBy: user.id }),
      );
      if (!isPrivate) {
        await notifySpaceMutation({
          spaceId: targetSpaceId,
          spaceKind: space?.kind ?? null,
          excludeUserId: user.id,
          title: user.displayName ?? 'Someone',
          body: `added a plan: ${input.title}`,
          eventKind: 'planCreated',
          entityId: planId,
          entityTitle: input.title,
          route: '/(tabs)/us/plans',
        });
      }
    },
    [coupleId, personalSpaceId, sharedSpaceId, user, space?.kind],
  );

  const update = useCallback(
    async (planId: string, input: Partial<PlanInput>) => {
      const current = planById.get(planId) as any;
      if (!current) throw new Error('Plan not found');
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description ?? null;
      if (input.category !== undefined) updates.category = input.category ?? null;
      if (input.targetDate !== undefined) updates.targetDate = validateTargetDate(input.targetDate) ?? null;
      if (input.budget !== undefined) updates.budget = input.budget ?? null;
      if (input.status !== undefined) {
        assertValidPlanStatus(input.status);
        updates.status = input.status;
      }
      if (input.priority !== undefined) {
        assertValidPriority(input.priority);
        updates.priority = input.priority;
      }
      if (input.color !== undefined) updates.color = input.color;
      if (input.colorKey !== undefined) {
        assertValidPlanColorKey(input.colorKey);
        updates.colorKey = input.colorKey;
      }
      if (input.bucket !== undefined) updates.bucket = input.bucket;
      let targetSpaceId: string | null = null;
      if (input.isPrivate !== undefined) {
        assertValidPlanPrivacy(input.isPrivate);
        targetSpaceId = personalOrSharedSpaceId({
          isPrivate: input.isPrivate,
          personalSpaceId,
          sharedSpaceId,
          fallbackSpaceId: coupleId,
        });
        if (!targetSpaceId) throw new Error('No active space');
        if (
          personalSpaceId &&
          targetSpaceId === personalSpaceId &&
          firstRel(current.createdBy)?.id !== userId
        ) {
          throw new Error('Cannot move another member plan into personal space');
        }
        updates.isPrivate = Boolean(input.isPrivate || isPersonalTarget(targetSpaceId, personalSpaceId));
      }
      let operation: any = db.tx.plans[planId].update(updates);
      if (targetSpaceId) {
        operation = operation.link({ couple: targetSpaceId });
      }
      await db.transact(operation);
    },
    [coupleId, personalSpaceId, planById, sharedSpaceId, userId],
  );

  const remove = useCallback(async (planId: string) => {
    if (!planById.has(planId)) throw new Error('Plan not found');
    await db.transact(db.tx.plans[planId].delete());
  }, [planById]);

  return {
    plans,
    isLoading: enabled && readableSpaceIds.length > 0 && queryLoading,
    create,
    update,
    remove,
    refetch: async () => {},
  };
}

function normalizePlanRow(
  plan: any,
  options: { isPersonalSpaceRow?: boolean } = {},
) {
  return {
    ...plan,
    isPrivate: plan.isPrivate === true || options.isPersonalSpaceRow === true,
    priority: normalizePriority(plan.priority),
  };
}

function firstRel(value: any): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
