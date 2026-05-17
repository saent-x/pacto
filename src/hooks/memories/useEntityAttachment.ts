import { useMemo } from 'react';
import { db } from '@/src/lib/instant';
import { useSession } from '@/src/hooks/useSession';

export type AttachableEntity =
  | 'task'
  | 'reminder'
  | 'plan'
  | 'checkIn'
  | 'timetable'
  | 'journal';

const ENTITY_KEYS: Record<AttachableEntity, string> = {
  task: 'tasks',
  reminder: 'reminders',
  plan: 'plans',
  checkIn: 'checkIns',
  timetable: 'timetables',
  journal: 'journalEntries',
};

export function useEntityAttachment(type: AttachableEntity) {
  const session = useSession() as any;
  const spaceId = session?.space?.id ?? session?.activeCouple?.couple?.id;

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
