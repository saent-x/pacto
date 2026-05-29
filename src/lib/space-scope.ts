export function uniqueSpaceIds(ids: Array<string | null | undefined>): string[] {
  return Array.from(new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0)));
}

export function relationWhere(relation: string, ids: Array<string | null | undefined>): any {
  const spaceIds = uniqueSpaceIds(ids);
  if (spaceIds.length === 0) return undefined;
  if (spaceIds.length === 1) return { [`${relation}.id`]: spaceIds[0] };
  return {
    or: spaceIds.map((id) => ({ [`${relation}.id`]: id })),
  };
}

export function firstRelation<T>(relation: T[] | T | null | undefined): T | undefined {
  if (!relation) return undefined;
  return Array.isArray(relation) ? relation[0] : relation;
}

export function childRowMatchesParentSpace(
  row: any,
  parentRelation: string,
  spaceRelation = 'couple',
): boolean {
  const rowSpaceId = firstRelation(row?.[spaceRelation])?.id ?? null;
  const parent = firstRelation(row?.[parentRelation]);
  const parentSpaceId = firstRelation(parent?.[spaceRelation])?.id ?? null;
  if (!parentSpaceId) return false;
  return !rowSpaceId || rowSpaceId === parentSpaceId;
}

export function personalOrSharedSpaceId(params: {
  isPrivate?: boolean | null;
  share?: string | null;
  personalSpaceId?: string | null;
  sharedSpaceId?: string | null;
  fallbackSpaceId?: string | null;
}) {
  const wantsPersonal = params.isPrivate === true || params.share === 'solo';
  if (wantsPersonal) {
    if (params.personalSpaceId) return params.personalSpaceId;
    if (params.sharedSpaceId) return null;
    return params.fallbackSpaceId ?? null;
  }
  return params.sharedSpaceId ?? params.fallbackSpaceId ?? params.personalSpaceId ?? null;
}
