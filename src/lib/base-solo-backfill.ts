export type BackfillRow = {
  id: string;
  [key: string]: any;
};

export type BackfillMembership = {
  id: string;
  role?: string;
  user?: { id?: string } | Array<{ id?: string }>;
  space?: { id?: string; kind?: string } | Array<{ id?: string; kind?: string }>;
};

export type BackfillUser = {
  id: string;
  email?: string | null;
  baseSoloSpace?: { id?: string; kind?: string } | Array<{ id?: string; kind?: string }>;
};

export type BackfillOp = {
  table: string;
  entityId: string;
  action:
    | 'createSolo'
    | 'createSoloMembership'
    | 'createMediaQuotaUsage'
    | 'linkBaseSoloSpace'
    | 'relinkPrivateRow';
  payload?: Record<string, unknown>;
  links?: Record<string, string>;
};

type PrivateRowsByUser = Record<string, Record<string, BackfillRow[]>>;

const PRIVATE_ROW_TABLES: Array<{ table: string; link: 'couple' | 'space' }> = [
  { table: 'events', link: 'couple' },
  { table: 'plans', link: 'couple' },
  { table: 'rituals', link: 'couple' },
  { table: 'checkIns', link: 'couple' },
  { table: 'journalEntries', link: 'couple' },
  { table: 'loveNotes', link: 'couple' },
  { table: 'memories', link: 'space' },
  { table: 'timetables', link: 'couple' },
];

export function privateRowTablesForBaseSoloBackfill() {
  return PRIVATE_ROW_TABLES;
}

export function planBaseSoloBackfill(params: {
  users: BackfillUser[];
  memberships: BackfillMembership[];
  privateRowsByUser: PrivateRowsByUser;
  makeId: () => string;
  now: number;
}): {
  ops: BackfillOp[];
  summary: {
    usersScanned: number;
    soloSpacesCreated: number;
    mediaQuotaRowsCreated: number;
    membershipsCreated: number;
    baseLinksCreated: number;
    privateRowsRelinked: number;
  };
} {
  const ops: BackfillOp[] = [];
  const summary = {
    usersScanned: params.users.length,
    soloSpacesCreated: 0,
    mediaQuotaRowsCreated: 0,
    membershipsCreated: 0,
    baseLinksCreated: 0,
    privateRowsRelinked: 0,
  };

  for (const user of params.users) {
    const linkedBase = firstRel(user.baseSoloSpace);
    const linkedBaseId = linkedBase?.id;
    const userMemberships = params.memberships.filter((membership) => firstRel(membership.user)?.id === user.id);
    const linkedBaseMembership = linkedBaseId
      ? userMemberships.find((membership) => firstRel(membership.space)?.id === linkedBaseId)
      : null;
    const linkedBaseMembershipSpace = firstRel(linkedBaseMembership?.space);
    const linkedBaseIsSolo = Boolean(
      linkedBaseId && (linkedBase?.kind === 'solo' || linkedBaseMembershipSpace?.kind === 'solo'),
    );
    const existingSoloMembership =
      (linkedBaseIsSolo ? linkedBaseMembership : null) ??
      userMemberships.find((membership) => firstRel(membership.space)?.kind === 'solo') ??
      null;
    const existingSoloSpace = firstRel(existingSoloMembership?.space);
    const soloSpaceId = linkedBaseIsSolo ? linkedBaseId : existingSoloSpace?.id ?? params.makeId();

    if (!linkedBaseIsSolo && !existingSoloSpace) {
      summary.soloSpacesCreated += 1;
      ops.push({
        table: 'spaces',
        entityId: soloSpaceId,
        action: 'createSolo',
        payload: {
          kind: 'solo',
          createdAt: params.now,
          updatedAt: params.now,
        },
        links: { createdBy: user.id },
      });
      summary.mediaQuotaRowsCreated += 1;
      ops.push({
        table: 'mediaQuotaUsage',
        entityId: params.makeId(),
        action: 'createMediaQuotaUsage',
        payload: {
          bytesUsed: 0,
          updatedAt: params.now,
        },
        links: { space: soloSpaceId },
      });
    }

    if (!existingSoloMembership) {
      summary.membershipsCreated += 1;
      ops.push({
        table: 'memberships',
        entityId: params.makeId(),
        action: 'createSoloMembership',
        payload: {
          role: 'owner',
          joinedAt: params.now,
        },
        links: { user: user.id, space: soloSpaceId },
      });
    }

    if (linkedBaseId !== soloSpaceId) {
      summary.baseLinksCreated += 1;
      ops.push({
        table: '$users',
        entityId: user.id,
        action: 'linkBaseSoloSpace',
        links: { baseSoloSpace: soloSpaceId },
      });
    }

    const rowsByTable = params.privateRowsByUser[user.id] ?? {};
    for (const table of PRIVATE_ROW_TABLES) {
      const rows = rowsByTable[table.table] ?? [];
      for (const row of rows) {
        const currentSpaceId = firstRel(row[table.link])?.id;
        if (!row.id || currentSpaceId === soloSpaceId) continue;
        summary.privateRowsRelinked += 1;
        ops.push({
          table: table.table,
          entityId: row.id,
          action: 'relinkPrivateRow',
          links: { [table.link]: soloSpaceId },
        });
      }
    }
  }

  return { ops, summary };
}

function firstRel(value: any): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
