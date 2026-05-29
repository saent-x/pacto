import { useMemo } from 'react';
import { db } from '@/src/lib/instant';
import { safeInstantId } from '@/src/lib/instant-id';
import { PLAN_LIMITS, planOf } from '@/src/lib/plan';

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function useAiQuota(spaceId: string | null | undefined) {
  const monthKey = currentMonthKey();
  const query = useMemo(() => {
    const safeSpaceId = safeInstantId(spaceId);
    if (!safeSpaceId) return null;
    return {
      spaces: {
        $: { where: { id: safeSpaceId } },
        aiUsage: { $: { where: { monthKey } } },
      },
    };
  }, [spaceId, monthKey]);

  const { data } = db.useQuery(query);
  const space = (data as any)?.spaces?.[0];
  const used = usageTurns(space?.aiUsage);
  const cap = PLAN_LIMITS[planOf(space ?? null)].aiTurnsPerMonth;

  if (cap === 'unlimited') {
    return { used, cap: Infinity, remaining: Infinity, isExhausted: false };
  }
  return {
    used,
    cap,
    remaining: Math.max(0, cap - used),
    isExhausted: used >= cap,
  };
}

function usageTurns(aiUsage: unknown): number {
  const rows = Array.isArray(aiUsage) ? aiUsage : aiUsage ? [aiUsage] : [];
  return rows.reduce((max, row: any) => {
    const turns = row?.turns;
    return typeof turns === 'number' && Number.isFinite(turns) && turns > 0
      ? Math.max(max, turns)
      : max;
  }, 0);
}
