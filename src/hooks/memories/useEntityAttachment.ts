import { useMemo } from 'react';
import { db } from '@/src/lib/instant';
import { useSession } from '@/src/hooks/useSession';

export type AttachableEntity = 'milestone' | 'plan' | 'checkIn' | 'expense' | 'wishlistItem';

const ENTITY_KEYS: Record<AttachableEntity, string> = {
  milestone: 'milestones',
  plan: 'plans',
  checkIn: 'checkIns',
  expense: 'expenses',
  wishlistItem: 'wishlistItems',
};

export function useEntityAttachment(type: AttachableEntity) {
  const { activeCouple } = useSession() as any;
  const spaceId = activeCouple?.couple?.id;

  const query = useMemo(() => {
    if (!spaceId) return null;
    return {
      [ENTITY_KEYS[type]]: {
        $: { where: { 'couple.id': spaceId }, order: { createdAt: 'desc' as const }, limit: 30 },
      },
    };
  }, [type, spaceId]);

  const { data, isLoading } = db.useQuery(query as any);
  return {
    entities: ((data as any)?.[ENTITY_KEYS[type]] as any[] | undefined) ?? [],
    isLoading,
  };
}
