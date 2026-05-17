import { useMemo } from 'react';
import { db } from '@/src/lib/instant';
import { planOf, type Plan } from '@/src/lib/plan';

export function usePlan(spaceId: string | null | undefined): Plan {
  const query = useMemo(() => {
    if (!spaceId) return null;
    return { spaces: { $: { where: { id: spaceId } } } };
  }, [spaceId]);

  const { data } = db.useQuery(query);
  return planOf((data as any)?.spaces?.[0] ?? null);
}
