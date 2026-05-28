import { useMemo } from 'react';
import { db } from '@/src/lib/instant';
import { safeInstantId } from '@/src/lib/instant-id';
import { planOf, type Plan } from '@/src/lib/plan';

export function usePlan(spaceId: string | null | undefined): Plan {
  const query = useMemo(() => {
    const safeSpaceId = safeInstantId(spaceId);
    if (!safeSpaceId) return null;
    return { spaces: { $: { where: { id: safeSpaceId } } } };
  }, [spaceId]);

  const { data } = db.useQuery(query);
  return planOf((data as any)?.spaces?.[0] ?? null);
}
