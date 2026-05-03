import { useMemo } from 'react';
import { db } from '@/src/lib/instant';
import { planOf } from '@/src/lib/plan';
import { quotaCapForPlan } from '@/src/lib/memories/quota';

export function useMediaQuota(spaceId: string | null | undefined) {
  const { data } = db.useQuery(
    spaceId
      ? {
          spaces: {
            $: { where: { id: spaceId } },
            mediaQuota: {},
          },
        }
      : null,
  );

  return useMemo(() => {
    const space = data?.spaces?.[0];
    const bytesUsed = (space as any)?.mediaQuota?.bytesUsed ?? 0;
    const cap = quotaCapForPlan(planOf(space ?? null));
    const percent = cap === 0 ? 0 : Math.min(100, Math.round((bytesUsed / cap) * 100));
    return {
      bytesUsed,
      cap,
      percent,
      isOverThreshold: percent >= 80,
      isAtCap: bytesUsed >= cap,
    };
  }, [data]);
}
