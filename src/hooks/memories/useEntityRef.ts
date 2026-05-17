import { useMemo } from 'react';
import { db } from '@/src/lib/instant';

export type EntityRefKind =
  | 'task'
  | 'reminder'
  | 'plan'
  | 'milestone'
  | 'checkIn'
  | 'wishlistItem'
  | 'timetable'
  | 'journal';

const KEY: Record<EntityRefKind, string> = {
  task: 'tasks',
  reminder: 'reminders',
  plan: 'plans',
  milestone: 'milestones',
  checkIn: 'checkIns',
  wishlistItem: 'wishlistItems',
  timetable: 'timetables',
  journal: 'journalEntries',
};

/**
 * Resolve a single entity by type + id so embed cards can render real
 * titles / meta without each surface plumbing its own join. Pure read,
 * no mutations.
 */
export function useEntityRef(type: EntityRefKind | null | undefined, refId: string | null | undefined) {
  const query = useMemo(() => {
    if (!type || !refId) return null;
    const collection = KEY[type];
    const relations = type === 'task' ? { list: {} } : {};
    return {
      [collection]: { $: { where: { id: refId }, limit: 1 }, ...relations },
    };
  }, [type, refId]);

  const { data, isLoading } = db.useQuery(query as any);
  const collection = type ? KEY[type] : null;
  const entity = collection ? ((data as any)?.[collection] ?? [])[0] : null;
  return { entity, isLoading };
}
