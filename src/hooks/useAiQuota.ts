import { useMemo } from 'react';
import { db } from '@/src/lib/instant';
import { PLAN_LIMITS, planOf } from '@/src/lib/plan';

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function useAiQuota(spaceId: string | null | undefined) {
  const monthKey = currentMonthKey();
  const query = useMemo(() => {
    if (!spaceId) return null;
    return {
      spaces: {
        $: { where: { id: spaceId } },
        aiUsage: { $: { where: { monthKey } } },
      },
    };
  }, [spaceId, monthKey]);

  const { data } = db.useQuery(query);
  const space = (data as any)?.spaces?.[0];
  const used = space?.aiUsage?.[0]?.turns ?? 0;
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
