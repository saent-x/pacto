import { useMemo } from 'react';
import { db } from '@/src/lib/instant';
import { useSession } from '@/src/hooks/useSession';
import { relationWhere, uniqueSpaceIds } from '@/src/lib/space-scope';

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

const OWNER_LINKS: Record<AttachableEntity, 'createdBy' | 'author'> = {
  task: 'createdBy',
  reminder: 'createdBy',
  plan: 'createdBy',
  checkIn: 'author',
  timetable: 'createdBy',
  journal: 'author',
};

const OWNERLESS_PERSONAL_VISIBLE = new Set<AttachableEntity>(['task', 'plan', 'timetable']);

export function useEntityAttachment(
  type: AttachableEntity,
  options?: { targetSpaceId?: string | null },
) {
  const session = useSession() as any;
  const fallbackSpaceId = session?.space?.id ?? session?.activeCouple?.couple?.id;
  const personalSpaceId = session?.personalSpaceId ?? null;
  const userId = session?.user?.id ?? null;
  const targetSpaceId = options?.targetSpaceId ?? null;
  const spaceIds = useMemo(
    () =>
      targetSpaceId
        ? uniqueSpaceIds([targetSpaceId])
        : uniqueSpaceIds([
            session?.personalSpaceId ?? fallbackSpaceId,
            session?.sharedSpaceId ?? fallbackSpaceId,
          ]),
    [fallbackSpaceId, session?.personalSpaceId, session?.sharedSpaceId, targetSpaceId],
  );

  const query = useMemo(() => {
    if (spaceIds.length === 0) return null;
    return {
      [ENTITY_KEYS[type]]: {
        $: {
          where: relationWhere('couple', spaceIds),
          order: { createdAt: 'desc' as const },
          limit: 30,
        },
        couple: {},
        [OWNER_LINKS[type]]: {},
        ...(type === 'task' ? { list: { couple: {} } } : {}),
      },
    };
  }, [type, spaceIds]);

  const { data, isLoading } = db.useQuery(query as any);
  const rawEntities = ((data as any)?.[ENTITY_KEYS[type]] as any[] | undefined) ?? [];
  const entities = useMemo(
    () =>
      rawEntities
        .filter((entity) => type !== 'task' || taskBelongsToListSpace(entity))
        .filter((entity) => entityVisibleForPersonalSpace(type, entity, personalSpaceId, userId)),
    [personalSpaceId, rawEntities, type, userId],
  );
  return {
    entities,
    isLoading,
  };
}

function firstRel(value: any): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function taskBelongsToListSpace(task: any) {
  const taskSpaceId = firstRel(task?.couple)?.id ?? null;
  const listSpaceId = firstRel(firstRel(task?.list)?.couple)?.id ?? null;
  return Boolean(listSpaceId && (!taskSpaceId || taskSpaceId === listSpaceId));
}

function entityVisibleForPersonalSpace(
  type: AttachableEntity,
  entity: any,
  personalSpaceId: string | null | undefined,
  userId: string | null | undefined,
) {
  const owningSpaceId = entityOwningSpaceId(type, entity);
  if (!personalSpaceId || owningSpaceId !== personalSpaceId) return true;
  const ownerId = firstRel(entity?.[OWNER_LINKS[type]])?.id ?? null;
  if (ownerId === userId) return true;
  return !ownerId && !!userId && OWNERLESS_PERSONAL_VISIBLE.has(type);
}

function entityOwningSpaceId(type: AttachableEntity, entity: any) {
  return (
    firstRel(entity?.couple)?.id ??
    (type === 'task' ? firstRel(firstRel(entity?.list)?.couple)?.id : null) ??
    null
  );
}
