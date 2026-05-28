import { useMemo } from 'react';
import { db } from '@/src/lib/instant';
import { safeInstantId } from '@/src/lib/instant-id';
import { relationWhere } from '@/src/lib/space-scope';
import { useSession } from '@/src/hooks/useSession';

export type EntityRefKind =
  | 'task'
  | 'reminder'
  | 'plan'
  | 'checkIn'
  | 'timetable'
  | 'journal';

const KEY: Record<EntityRefKind, string> = {
  task: 'tasks',
  reminder: 'reminders',
  plan: 'plans',
  checkIn: 'checkIns',
  timetable: 'timetables',
  journal: 'journalEntries',
};

const OWNER_LINKS: Record<EntityRefKind, 'createdBy' | 'author'> = {
  task: 'createdBy',
  reminder: 'createdBy',
  plan: 'createdBy',
  checkIn: 'author',
  timetable: 'createdBy',
  journal: 'author',
};

const OWNERLESS_PERSONAL_VISIBLE = new Set<EntityRefKind>(['task', 'plan', 'timetable']);

export function isEntityRefKind(type: unknown): type is EntityRefKind {
  return typeof type === 'string' && type in KEY;
}

export function resolveEntityRefScopeId(
  memorySpaceId: string | null | undefined,
  attachmentSpaceId: string | null | undefined,
): string | null {
  if (typeof memorySpaceId === 'string' && memorySpaceId.length > 0) return memorySpaceId;
  if (typeof attachmentSpaceId === 'string' && attachmentSpaceId.length > 0) return attachmentSpaceId;
  return null;
}

/**
 * Resolve a single entity by type + id so embed cards can render real
 * titles / meta without each surface plumbing its own join. Pure read,
 * no mutations.
 */
export function useEntityRef(
  type: EntityRefKind | null | undefined,
  refId: string | null | undefined,
  spaceId?: string | null,
) {
  const session = useSession() as any;
  const personalSpaceId = session?.personalSpaceId ?? null;
  const userId = session?.user?.id ?? null;
  const query = useMemo(() => {
    const safeRefId = safeInstantId(refId);
    if (!type || !safeRefId) return null;
    const collection = KEY[type];
    const relations = type === 'task' ? { list: { couple: {} } } : {};
    const spaceWhere = relationWhere('couple', [spaceId]) ?? {};
    return {
      [collection]: {
        $: { where: { id: safeRefId, ...spaceWhere }, limit: 1 },
        couple: {},
        [OWNER_LINKS[type]]: {},
        ...relations,
      },
    };
  }, [type, refId, spaceId]);

  const { data, isLoading } = db.useQuery(query as any);
  const collection = type ? KEY[type] : null;
  const rawEntity = collection ? ((data as any)?.[collection] ?? [])[0] : null;
  const entity = type === 'task' && rawEntity && !taskBelongsToListSpace(rawEntity)
    ? null
    : type && rawEntity && !entityVisibleForPersonalSpace(type, rawEntity, personalSpaceId, userId)
    ? null
    : rawEntity;
  return { entity, isLoading };
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
  type: EntityRefKind,
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

function entityOwningSpaceId(type: EntityRefKind, entity: any) {
  return (
    firstRel(entity?.couple)?.id ??
    (type === 'task' ? firstRel(firstRel(entity?.list)?.couple)?.id : null) ??
    null
  );
}
