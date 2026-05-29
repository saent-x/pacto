import { id, lookup, tx } from '@instantdb/react-native';
import { db } from './db';
import type { SpaceKindWire, SpaceMode } from './session';
import type { FeatureId } from '@/src/lib/features/registry';
import { generateInviteCode } from './invite-code';
import { relationWhere, uniqueSpaceIds } from './space-scope';
import {
  isCreateSpaceInviteEligible,
  resolveCreateSpaceFeatureIds,
  resolveCreateSpaceKind,
} from './space-features';

export type SpaceKind = SpaceKindWire;

function now() {
  return Date.now();
}

// Create a space and create the current user's owner membership in one transaction.
export async function createSpace(params: {
  userId: string;
  kind: SpaceKind;
  mode?: SpaceMode;
  name?: string;
  enabledFeatures?: FeatureId[];
}): Promise<{ spaceId: string; inviteCode: string | null }> {
  const spaceId = id();
  const membershipId = id();
  const quotaId = id();
  const inviteCode = isCreateSpaceInviteEligible(params) ? generateInviteCode() : null;
  const ts = now();

  const spaceFields: Record<string, unknown> = {
    kind: resolveCreateSpaceKind(params),
    enabledFeatures: resolveCreateSpaceFeatureIds(params),
    createdAt: ts,
    updatedAt: ts,
  };
  if (params.name) spaceFields.name = params.name;
  if (inviteCode) spaceFields.inviteCode = inviteCode;

  try {
    await db.transact([
      tx.spaces[spaceId].update(spaceFields).link({ createdBy: params.userId }),
      tx.memberships[membershipId]
        .update({ role: 'owner', joinedAt: ts })
        .link({ user: params.userId, space: spaceId }),
      tx.mediaQuotaUsage[quotaId]
        .update({ bytesUsed: 0, updatedAt: ts })
        .link({ space: spaceId }),
    ]);
  } catch (err) {
    console.error('[createSpace] transact failed', err);
    throw err;
  }

  return { spaceId, inviteCode };
}

// Join a space by invite code. Non-members can create a membership, but they
// cannot update the target space until that membership exists, so code cleanup
// happens after the join transaction succeeds.
export async function joinSpaceByCode(params: {
  userId: string;
  code: string;
  currentSoloMembershipId?: string | null;
  currentSoloSpaceId?: string | null;
}): Promise<void> {
  const ts = now();
  const membershipId = id();
  await ensureSoloSpaceForUser({ userId: params.userId });
  const inviteSpace = await queryInviteSpace(params.code, params.userId);

  if (!inviteSpace) {
    throw new Error('Invite code not found.');
  }
  if (inviteSpace.kind === 'solo') {
    throw new Error('This invite code is no longer valid. Ask the owner to generate a pact invite.');
  }
  if (inviteSpace.isCurrentUserMember) {
    throw new Error('You are already a member of this pact.');
  }
  if (isFullPairInvite(inviteSpace)) {
    throw new Error('This pair is already full. Ask the owner to generate a fresh crew invite.');
  }

  await db.transact([
    tx.memberships[membershipId]
      .update({ role: 'partner', joinedAt: ts })
      .link({
        user: params.userId,
        space: lookup('inviteCode', params.code),
      }),
  ]);

  const cleanupFields = inviteCleanupFields(inviteSpace, ts);

  try {
    await db.transact([
      tx.spaces[lookup('inviteCode', params.code)].update(cleanupFields),
    ]);
  } catch (err) {
    console.warn('[joinSpaceByCode] invite-code cleanup failed', err);
  }
}

function isFullPairInvite(inviteSpace: { kind?: string; memberCount: number }) {
  return (inviteSpace.kind === 'pair' || inviteSpace.kind === 'couple') && inviteSpace.memberCount >= 2;
}

function inviteCleanupFields(
  inviteSpace: { kind?: string; memberCount: number },
  ts: number,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    inviteCode: null,
    updatedAt: ts,
  };
  if ((inviteSpace.kind === 'pair' || inviteSpace.kind === 'couple') && inviteSpace.memberCount >= 2) {
    fields.kind = 'crew';
    fields.enabledFeatures = resolveCreateSpaceFeatureIds({ kind: 'crew', mode: 'crew' });
  }
  return fields;
}

export async function createSharedPactInvite(params: {
  userId: string;
  mode?: Extract<SpaceMode, 'pair' | 'crew'>;
}): Promise<string> {
  await ensureSoloSpaceForUser({ userId: params.userId });
  const pending = await queryPendingSharedInvite(params.userId, params.mode ?? 'pair');
  if (pending?.inviteCode) return pending.inviteCode;
  if (pending?.id) {
    const inviteCode = generateInviteCode();
    await db.transact([
      tx.spaces[pending.id].update({ inviteCode, updatedAt: now() }),
    ]);
    return inviteCode;
  }
  const result = await createSpace({
    userId: params.userId,
    kind: params.mode === 'crew' ? 'crew' : 'couple',
    mode: params.mode ?? 'pair',
  });
  if (!result.inviteCode) throw new Error('Could not create invite code');
  return result.inviteCode;
}

// Legacy export retained for older call sites. New code should use createSharedPactInvite.
export async function upgradeSoloToCouple(_params: { spaceId: string }): Promise<string> {
  throw new Error('upgradeSoloToCouple is retired. Use createSharedPactInvite({ userId }) instead.');
}

// Regenerate invite code (invalidates the old one).
export async function regenerateInviteCode(params: {
  spaceId: string;
  userId: string;
  promoteToCrew?: boolean;
}): Promise<string> {
  const membership = await queryUserSpaceMembershipForInvite({
    userId: params.userId,
    spaceId: params.spaceId,
  });
  if (!membership) throw new Error('Space not found');

  const inviteCode = generateInviteCode();
  const fields: Record<string, unknown> = {
    inviteCode,
    updatedAt: now(),
  };
  if (params.promoteToCrew) {
    fields.kind = 'crew';
    fields.enabledFeatures = resolveCreateSpaceFeatureIds({ kind: 'crew', mode: 'crew' });
  }
  await db.transact([
    tx.spaces[params.spaceId].update(fields),
  ]);
  return inviteCode;
}

async function queryUserSpaceMembershipForInvite(params: {
  userId: string;
  spaceId: string;
}): Promise<any | null> {
  const { data } = await (db as any).queryOnce({
    memberships: {
      $: { where: { 'user.id': params.userId } },
      space: {},
    },
  });
  const memberships = Array.isArray(data?.memberships) ? data.memberships : [];
  return (
    memberships.find((membership: any) => firstRel(membership?.space)?.id === params.spaceId) ??
    null
  );
}

// Leave space. Deletes my membership. If I'm the last member, deletes the space too.
export async function leaveSpace(params: {
  userId: string;
  spaceId: string;
  membershipId: string;
  isLastMember: boolean;
  remainingMemberCount?: number;
  personalSpaceId?: string | null;
}): Promise<void> {
  const ops: any[] = [];
  const isLeavingPersonalSolo = params.personalSpaceId === params.spaceId;
  const membership = await queryUserSpaceMembershipForLeave({
    userId: params.userId,
    spaceId: params.spaceId,
    membershipId: params.membershipId,
  });

  if (!membership) throw new Error('Space not found');
  if (isLeavingPersonalSolo || membership.spaceKind === 'solo') {
    throw new Error('Cannot leave personal solo space');
  }
  const memberCount = resolveLeaveMemberCount(membership, params);
  const remainingMemberCount = Math.max(memberCount - 1, 0);
  const isLastMember = remainingMemberCount === 0;

  const shouldPreservePrivateRows = !isLeavingPersonalSolo;
  const personalSpaceId =
    shouldPreservePrivateRows && params.personalSpaceId
      ? params.personalSpaceId
      : shouldPreservePrivateRows
        ? (await ensureSoloSpaceForUser({ userId: params.userId })).spaceId
        : null;

  if (personalSpaceId) {
    const privateRows = await queryPrivateRowsForLeave({
      spaceId: params.spaceId,
      userId: params.userId,
    });
    ops.push(...relinkPrivateRowsToSpace(privateRows, personalSpaceId));
  }

  if (!isLastMember && !isLeavingPersonalSolo) {
    const sharedRows = await querySharedRowsForLeave({
      spaceId: params.spaceId,
      userId: params.userId,
    });
    ops.push(...deleteFormerMemberSharedRows(sharedRows));
    ops.push(...unlinkFormerMemberLinksFromSharedRows(sharedRows, params.userId));
  }

  if (isLastMember) {
    ops.push(tx.memberships[params.membershipId].delete());
    if (!isLeavingPersonalSolo) {
      ops.push(tx.spaces[params.spaceId].delete());
    }
  } else {
    ops.push(tx.memberships[params.membershipId].delete());
  }
  await db.transact(ops);
}

async function queryUserSpaceMembershipForLeave(params: {
  userId: string;
  spaceId: string;
  membershipId: string;
}): Promise<{ spaceKind?: string; memberCount?: number | null } | null> {
  const { data } = await (db as any).queryOnce({
    memberships: {
      $: { where: { 'user.id': params.userId } },
      space: { memberships: { user: {} } },
    },
  });
  const memberships = Array.isArray(data?.memberships) ? data.memberships : [];
  const membership = memberships.find((row: any) => {
    const space = firstRel(row?.space);
    return row?.id === params.membershipId && space?.id === params.spaceId;
  });
  if (!membership) return null;
  const space = firstRel(membership.space);
  return {
    spaceKind: space?.kind,
    memberCount: leaveMemberCountFromRelation(space?.memberships),
  };
}

function resolveLeaveMemberCount(
  membership: { memberCount?: number | null },
  params: { isLastMember: boolean; remainingMemberCount?: number },
) {
  if (typeof membership.memberCount === 'number' && membership.memberCount > 0) {
    return membership.memberCount;
  }
  if (typeof params.remainingMemberCount === 'number' && params.remainingMemberCount >= 0) {
    return params.remainingMemberCount + 1;
  }
  return params.isLastMember ? 1 : 2;
}

function leaveMemberCountFromRelation(value: any): number | null {
  if (!Array.isArray(value)) return null;
  const ids = new Set<string>();
  let rowsWithoutId = 0;
  for (const row of value) {
    if (typeof row?.id === 'string') {
      ids.add(row.id);
    } else {
      rowsWithoutId += 1;
    }
  }
  return ids.size + rowsWithoutId;
}

type LeavePrivateDataTable = {
  table: string;
  userLink: string;
  spaceLink: 'couple' | 'space';
  where: Record<string, unknown>;
};

const LEAVE_PRIVATE_DATA_TABLES: LeavePrivateDataTable[] = [
  { table: 'events', userLink: 'createdBy', spaceLink: 'couple', where: { isPrivate: true } },
  { table: 'plans', userLink: 'createdBy', spaceLink: 'couple', where: { isPrivate: true } },
  { table: 'rituals', userLink: 'createdBy', spaceLink: 'couple', where: { isPrivate: true } },
  { table: 'checkIns', userLink: 'author', spaceLink: 'couple', where: { isPrivate: true } },
  { table: 'journalEntries', userLink: 'author', spaceLink: 'couple', where: { isPrivate: true } },
  { table: 'loveNotes', userLink: 'author', spaceLink: 'couple', where: { isPrivate: true } },
  { table: 'memories', userLink: 'author', spaceLink: 'space', where: { isPrivate: true } },
  { table: 'timetables', userLink: 'createdBy', spaceLink: 'couple', where: { share: 'solo' } },
];

type LeaveSharedLinkTable = {
  table: string;
  spaceLink: 'couple' | 'space';
  userLinks: string[];
};

type LeaveSharedDeleteTable = {
  table: string;
  userPath: string;
  spacePath: string;
};

const LEAVE_SHARED_LINK_TABLES: LeaveSharedLinkTable[] = [
  { table: 'events', spaceLink: 'couple', userLinks: ['createdBy'] },
  { table: 'plans', spaceLink: 'couple', userLinks: ['createdBy'] },
  { table: 'rituals', spaceLink: 'couple', userLinks: ['createdBy'] },
  { table: 'checkIns', spaceLink: 'couple', userLinks: ['author'] },
  { table: 'journalEntries', spaceLink: 'couple', userLinks: ['author'] },
  { table: 'loveNotes', spaceLink: 'couple', userLinks: ['author'] },
  { table: 'memories', spaceLink: 'space', userLinks: ['author'] },
  { table: 'reminders', spaceLink: 'couple', userLinks: ['createdBy', 'assignedTo', 'completedBy'] },
  { table: 'tasks', spaceLink: 'couple', userLinks: ['createdBy', 'assignedTo', 'completedBy'] },
  { table: 'taskLists', spaceLink: 'couple', userLinks: ['createdBy'] },
  { table: 'milestones', spaceLink: 'couple', userLinks: ['createdBy'] },
  { table: 'wishlists', spaceLink: 'couple', userLinks: ['createdBy'] },
  { table: 'wishlistItems', spaceLink: 'couple', userLinks: ['addedBy', 'purchasedBy'] },
  { table: 'timetables', spaceLink: 'couple', userLinks: ['createdBy'] },
];

const LEAVE_SHARED_DELETE_TABLES: LeaveSharedDeleteTable[] = [
  { table: 'memoryReactions', userPath: 'user.id', spacePath: 'memory.space.id' },
  { table: 'memoryPollVotes', userPath: 'user.id', spacePath: 'option.poll.memory.space.id' },
];

async function queryPrivateRowsForLeave(params: { spaceId: string; userId: string }) {
  const query: Record<string, unknown> = {};
  for (const table of LEAVE_PRIVATE_DATA_TABLES) {
    query[table.table] = {
      $: {
        where: {
          [`${table.userLink}.id`]: params.userId,
          [`${table.spaceLink}.id`]: params.spaceId,
          ...table.where,
        },
      },
      ...(table.table === 'timetables' ? { items: { couple: {} }, couple: {} } : {}),
      ...(table.table === 'memories' ? { attachments: {} } : {}),
    };
  }
  const { data } = await (db as any).queryOnce(query);
  return data ?? {};
}

async function querySharedRowsForLeave(params: { spaceId: string; userId: string }) {
  const query: Record<string, unknown> = {};
  for (const table of LEAVE_SHARED_LINK_TABLES) {
    query[table.table] = {
      $: {
        where: {
          [`${table.spaceLink}.id`]: params.spaceId,
        },
      },
      ...Object.fromEntries(table.userLinks.map((link) => [link, {}])),
    };
  }
  for (const table of LEAVE_SHARED_DELETE_TABLES) {
    query[table.table] = {
      $: {
        where: {
          [table.userPath]: params.userId,
          [table.spacePath]: params.spaceId,
        },
      },
    };
  }
  const { data } = await (db as any).queryOnce(query);
  return data ?? {};
}

function relinkPrivateRowsToSpace(data: Record<string, unknown>, soloSpaceId: string) {
  const ops: any[] = [];
  for (const table of LEAVE_PRIVATE_DATA_TABLES) {
    const rows = data?.[table.table];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (typeof row?.id !== 'string') continue;
      ops.push((tx as any)[table.table][row.id].link({ [table.spaceLink]: soloSpaceId }));
      if (table.table === 'memories') {
        const attachments = Array.isArray(row.attachments) ? row.attachments : [];
        for (const attachment of attachments) {
          if (typeof attachment?.id !== 'string') continue;
          ops.push((tx as any).memoryAttachments[attachment.id].update({ spaceId: soloSpaceId }));
        }
      }
      if (table.table === 'timetables') {
        const currentSpaceId = firstRel(row?.[table.spaceLink])?.id ?? null;
        const items = Array.isArray(row.items) ? row.items : [];
        for (const item of items) {
          if (typeof item?.id !== 'string') continue;
          if (!childRowBelongsToSpace(item, currentSpaceId)) continue;
          ops.push((tx as any).timetableItems[item.id].link({ couple: soloSpaceId }));
        }
      }
    }
  }
  return ops;
}

function deleteFormerMemberSharedRows(data: Record<string, unknown>) {
  const ops: any[] = [];
  for (const table of LEAVE_SHARED_DELETE_TABLES) {
    const rows = data?.[table.table];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (typeof row?.id !== 'string') continue;
      ops.push((tx as any)[table.table][row.id].delete());
    }
  }
  return ops;
}

function unlinkFormerMemberLinksFromSharedRows(data: Record<string, unknown>, userId: string) {
  const ops: any[] = [];
  for (const table of LEAVE_SHARED_LINK_TABLES) {
    const rows = data?.[table.table];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (typeof row?.id !== 'string') continue;
      if (!isSharedRowRemainingAfterLeave(table.table, row)) continue;
      for (const link of table.userLinks) {
        if (firstRel(row?.[link])?.id === userId) {
          ops.push((tx as any)[table.table][row.id].unlink({ [link]: userId }));
        }
      }
    }
  }
  return ops;
}

function isSharedRowRemainingAfterLeave(table: string, row: any) {
  if (table === 'timetables') return row?.share !== 'solo';
  return row?.isPrivate !== true;
}

function childRowBelongsToSpace(child: any, parentSpaceId: string | null | undefined) {
  const childSpaceId = firstRel(child?.couple)?.id ?? null;
  return !parentSpaceId || !childSpaceId || childSpaceId === parentSpaceId;
}

async function queryInviteSpace(
  code: string,
  userId?: string,
): Promise<{ id: string; kind?: string; memberCount: number; isCurrentUserMember: boolean } | null> {
  const { data } = await (db as any).queryOnce({
    spaces: {
      $: { where: { inviteCode: code } },
      memberships: { user: {} },
    },
  });
  const space = data?.spaces?.[0];
  if (!space?.id) return null;
  return {
    id: space.id,
    kind: space.kind,
    memberCount: Array.isArray(space.memberships) ? space.memberships.length : 0,
    isCurrentUserMember: Boolean(
      userId &&
        Array.isArray(space.memberships) &&
        space.memberships.some((membership: any) => firstRel(membership?.user)?.id === userId),
    ),
  };
}

async function queryPendingSharedInvite(
  userId: string,
  mode: Extract<SpaceMode, 'pair' | 'crew'>,
): Promise<{ id: string; inviteCode?: string | null } | null> {
  const { data } = await (db as any).queryOnce({
    memberships: {
      $: { where: { 'user.id': userId } },
      space: {
        memberships: { user: {} },
      },
    },
  });
  const memberships = Array.isArray(data?.memberships) ? data.memberships : [];
  const pending = memberships
    .map((membership: any) => firstRel(membership?.space))
    .find((space: any) => {
      if (!space?.id || space.kind === 'solo') return false;
      if (!spaceKindMatchesMode(space.kind, mode)) return false;
      return Array.isArray(space.memberships) && space.memberships.length <= 1;
    });
  return pending ? { id: pending.id, inviteCode: pending.inviteCode ?? null } : null;
}

function spaceKindMatchesMode(kind: string | undefined, mode: Extract<SpaceMode, 'pair' | 'crew'>) {
  if (mode === 'crew') return kind === 'crew';
  return kind === 'pair' || kind === 'couple';
}

type AccountDeletionParams = {
  userId: string;
  membershipId?: string | null;
  spaceId?: string | null;
  isLastMember: boolean;
  personalMembershipId?: string | null;
  personalSpaceId?: string | null;
  sharedMembershipId?: string | null;
  sharedSpaceId?: string | null;
  sharedIsLastMember?: boolean;
};

type AccountDeletionLinkedTable = {
  table: string;
  userLink?: string;
  spaceLink?: 'couple' | 'space';
  membershipLink?: string;
};

type AccountDeletionMembershipTarget = {
  membershipId: string;
  spaceId: string | null;
  deleteSpace: boolean;
};

type AccountDeletionRemainingLinkCleanup = {
  ownerLink: string;
  unlinkLinks: string[];
  preserveSharedOwnerRows?: boolean;
};

const SHARED_ACCOUNT_DELETION_TABLES: AccountDeletionLinkedTable[] = [
  { table: 'events', userLink: 'createdBy', spaceLink: 'couple' },
  { table: 'plans', userLink: 'createdBy', spaceLink: 'couple' },
  { table: 'rituals', userLink: 'createdBy', spaceLink: 'couple' },
  { table: 'checkIns', userLink: 'author', spaceLink: 'couple' },
  { table: 'reminders', userLink: 'createdBy', spaceLink: 'couple' },
  { table: 'tasks', userLink: 'createdBy', spaceLink: 'couple' },
  { table: 'taskLists', userLink: 'createdBy', spaceLink: 'couple' },
  { table: 'milestones', userLink: 'createdBy', spaceLink: 'couple' },
  { table: 'journalEntries', userLink: 'author', spaceLink: 'couple' },
  { table: 'loveNotes', userLink: 'author', spaceLink: 'couple' },
  { table: 'wishlists', userLink: 'createdBy', spaceLink: 'couple' },
  { table: 'wishlistItems', userLink: 'addedBy', spaceLink: 'couple' },
  { table: 'timetables', userLink: 'createdBy', spaceLink: 'couple' },
  { table: 'memories', userLink: 'author', spaceLink: 'space' },
  { table: 'memoryReactions', userLink: 'user' },
  { table: 'memoryPollVotes', userLink: 'user' },
  { table: 'ringsHistory', membershipLink: 'membership' },
];

const ACCOUNT_DELETION_REMAINING_LINK_CLEANUP: Record<string, AccountDeletionRemainingLinkCleanup> = {
  reminders: { ownerLink: 'createdBy', unlinkLinks: ['assignedTo', 'completedBy'], preserveSharedOwnerRows: false },
  tasks: { ownerLink: 'createdBy', unlinkLinks: ['assignedTo', 'completedBy'], preserveSharedOwnerRows: false },
  wishlistItems: { ownerLink: 'addedBy', unlinkLinks: ['purchasedBy'], preserveSharedOwnerRows: false },
};
const ACCOUNT_DELETION_PRESERVE_CONTAINER_OWNER = new Set(['taskLists', 'timetables']);

export async function deleteAccountData(params: AccountDeletionParams): Promise<void> {
  const targets = normalizeAccountDeletionTargets(params);
  const { data } = await (db as any).queryOnce(buildAccountDeletionQuery(params));
  const ops = [
    ...fileDeleteOpsForAccountDeletion(data, params.userId),
    ...deleteOpsForRows('profiles', data?.profiles),
    ...deleteOpsForRows('devices', data?.devices),
  ];

  for (const table of SHARED_ACCOUNT_DELETION_TABLES) {
    const linkCleanup = ACCOUNT_DELETION_REMAINING_LINK_CLEANUP[table.table];
    if (linkCleanup) {
      if (linkCleanup.preserveSharedOwnerRows) {
        ops.push(
          ...cleanupDeletedUserFromPreservedLinkRows(
            table.table,
            data?.[table.table],
            linkCleanup,
            params.userId,
          ),
        );
      } else {
        ops.push(
          ...deleteOpsForRows(
            table.table,
            accountDeletionOwnedRows(data?.[table.table], linkCleanup.ownerLink, params.userId),
          ),
        );
        ops.push(
          ...unlinkDeletedUserFromRemainingRows(
            table.table,
            data?.[table.table],
            linkCleanup,
            params.userId,
          ),
        );
      }
    } else if (table.userLink && ACCOUNT_DELETION_PRESERVE_CONTAINER_OWNER.has(table.table)) {
      ops.push(
        ...cleanupDeletedUserOwnedContainerRows(
          table.table,
          data?.[table.table],
          table.userLink,
          params.userId,
        ),
      );
    } else {
      ops.push(...deleteOpsForRows(table.table, data?.[table.table]));
    }
  }

  const deletedMemberships = new Set<string>();
  const deletedSpaces = new Set<string>();
  for (const target of accountDeletionMembershipTargets(data, params.userId, targets)) {
    if (target.membershipId && !target.deleteSpace && !deletedMemberships.has(target.membershipId)) {
      ops.push(tx.memberships[target.membershipId].delete());
      deletedMemberships.add(target.membershipId);
    }
    if (target.deleteSpace && target.spaceId && !deletedSpaces.has(target.spaceId)) {
      ops.push(tx.spaces[target.spaceId].delete());
      deletedSpaces.add(target.spaceId);
    }
  }

  if (ops.length > 0) {
    await db.transact(ops);
  }
}

function normalizeAccountDeletionTargets(params: AccountDeletionParams) {
  const explicitPersonalSpaceId = params.personalSpaceId ?? null;
  const explicitSharedSpaceId = params.sharedSpaceId ?? null;
  const fallbackSpaceId = params.spaceId ?? null;
  const personalSpaceId =
    explicitPersonalSpaceId ??
    (params.isLastMember && !explicitSharedSpaceId ? fallbackSpaceId : null);
  const sharedSpaceId =
    explicitSharedSpaceId ??
    (personalSpaceId && fallbackSpaceId === personalSpaceId ? null : fallbackSpaceId);
  const personalMembershipId =
    params.personalMembershipId ??
    (personalSpaceId && fallbackSpaceId === personalSpaceId ? params.membershipId ?? null : null);
  const sharedMembershipId =
    params.sharedMembershipId ??
    (sharedSpaceId && fallbackSpaceId === sharedSpaceId ? params.membershipId ?? null : null);
  const sharedIsLastMember = sharedSpaceId ? (params.sharedIsLastMember ?? params.isLastMember) : false;

  return {
    personalSpaceId,
    personalMembershipId,
    sharedSpaceId,
    sharedMembershipId,
    sharedIsLastMember,
  };
}

function buildAccountDeletionQuery(
  params: AccountDeletionParams,
) {
  const query: Record<string, unknown> = {
    $users: { $: { where: { id: params.userId } } },
    profiles: { $: { where: { 'user.id': params.userId } } },
    devices: { $: { where: { 'user.id': params.userId } } },
    memberships: {
      $: { where: { 'user.id': params.userId } },
      space: { memberships: { user: {} } },
    },
  };

  for (const table of SHARED_ACCOUNT_DELETION_TABLES) {
    if (table.table === 'memories') {
      query.memories = {
        $: { where: { 'author.id': params.userId } },
        attachments: {},
      };
    } else if (table.table === 'journalEntries') {
      query.journalEntries = {
        $: { where: { 'author.id': params.userId } },
      };
    } else if (ACCOUNT_DELETION_REMAINING_LINK_CLEANUP[table.table] && table.userLink) {
      const linkCleanup = ACCOUNT_DELETION_REMAINING_LINK_CLEANUP[table.table];
      query[table.table] = {
        $: {
          where: {
            or: [table.userLink, ...linkCleanup.unlinkLinks].map((link) => ({
              [`${link}.id`]: params.userId,
            })),
          },
        },
        [table.userLink]: {},
        ...Object.fromEntries(linkCleanup.unlinkLinks.map((link) => [link, {}])),
        couple: {},
      };
    } else if (table.userLink) {
      query[table.table] = {
        $: { where: { [`${table.userLink}.id`]: params.userId } },
        ...(ACCOUNT_DELETION_PRESERVE_CONTAINER_OWNER.has(table.table) ? { couple: {} } : {}),
      };
    } else if (table.membershipLink) {
      query[table.table] = {
        $: { where: { [`${table.membershipLink}.user.id`]: params.userId } },
      };
    }
  }

  return query;
}

function accountDeletionMembershipTargets(
  data: any,
  userId: string,
  fallbackTargets: ReturnType<typeof normalizeAccountDeletionTargets>,
): AccountDeletionMembershipTarget[] {
  const memberships = Array.isArray(data?.memberships) ? data.memberships : [];
  if (memberships.length > 0) {
    const queriedTargets = memberships
      .map((membership: any) => accountDeletionMembershipTarget(membership, userId))
      .filter((target: AccountDeletionMembershipTarget | null): target is AccountDeletionMembershipTarget =>
        Boolean(target?.membershipId),
      );
    return preserveExplicitDeletionTargets(queriedTargets, fallbackTargets);
  }

  const fallback: AccountDeletionMembershipTarget[] = [];
  if (fallbackTargets.sharedMembershipId) {
    fallback.push({
      membershipId: fallbackTargets.sharedMembershipId,
      spaceId: fallbackTargets.sharedSpaceId,
      deleteSpace: Boolean(fallbackTargets.sharedIsLastMember && fallbackTargets.sharedSpaceId),
    });
  }
  if (
    fallbackTargets.personalMembershipId &&
    fallbackTargets.personalMembershipId !== fallbackTargets.sharedMembershipId
  ) {
    fallback.push({
      membershipId: fallbackTargets.personalMembershipId,
      spaceId: fallbackTargets.personalSpaceId,
      deleteSpace: Boolean(fallbackTargets.personalSpaceId),
    });
  }
  return fallback;
}

function preserveExplicitDeletionTargets(
  targets: AccountDeletionMembershipTarget[],
  fallbackTargets: ReturnType<typeof normalizeAccountDeletionTargets>,
): AccountDeletionMembershipTarget[] {
  return preserveExplicitSharedDeletionTarget(
    preserveExplicitPersonalDeletionTarget(targets, fallbackTargets),
    fallbackTargets,
  );
}

function preserveExplicitPersonalDeletionTarget(
  targets: AccountDeletionMembershipTarget[],
  fallbackTargets: ReturnType<typeof normalizeAccountDeletionTargets>,
) {
  return preserveExplicitDeletionTarget(targets, {
    membershipId: fallbackTargets.personalMembershipId,
    spaceId: fallbackTargets.personalSpaceId,
    deleteSpace: Boolean(fallbackTargets.personalSpaceId),
  });
}

function preserveExplicitSharedDeletionTarget(
  targets: AccountDeletionMembershipTarget[],
  fallbackTargets: ReturnType<typeof normalizeAccountDeletionTargets>,
) {
  return preserveExplicitDeletionTarget(targets, {
    membershipId: fallbackTargets.sharedMembershipId,
    spaceId: fallbackTargets.sharedSpaceId,
    deleteSpace: Boolean(fallbackTargets.sharedIsLastMember && fallbackTargets.sharedSpaceId),
    addMissingMembership: true,
  });
}

function preserveExplicitDeletionTarget(
  targets: AccountDeletionMembershipTarget[],
  fallbackTarget: {
    membershipId: string | null;
    spaceId: string | null;
    deleteSpace: boolean;
    addMissingMembership?: boolean;
  },
) {
  if (!fallbackTarget.spaceId && !fallbackTarget.membershipId) return targets;
  if (!fallbackTarget.deleteSpace && !fallbackTarget.addMissingMembership) return targets;

  const existingTarget = targets.find((target) =>
    target.spaceId === fallbackTarget.spaceId ||
    (Boolean(fallbackTarget.membershipId) &&
      target.membershipId === fallbackTarget.membershipId),
  );

  if (!existingTarget) {
    if (!fallbackTarget.membershipId) return targets;
    return [
      ...targets,
      {
        membershipId: fallbackTarget.membershipId,
        spaceId: fallbackTarget.spaceId,
        deleteSpace: fallbackTarget.deleteSpace,
      },
    ];
  }

  if (existingTarget.spaceId && fallbackTarget.spaceId && existingTarget.spaceId !== fallbackTarget.spaceId) {
    return targets;
  }

  if (!fallbackTarget.deleteSpace) return targets;

  return targets.map((target) =>
    target === existingTarget
      ? { ...target, spaceId: fallbackTarget.spaceId, deleteSpace: true }
      : target,
  );
}

function accountDeletionMembershipTarget(
  membership: any,
  userId: string,
): AccountDeletionMembershipTarget | null {
  if (typeof membership?.id !== 'string') return null;
  const space = firstRel(membership.space);
  const spaceMemberships = Array.isArray(space?.memberships) ? space.memberships : [];
  const remainingMembers = spaceMemberships.filter(
    (spaceMembership: any) => firstRel(spaceMembership?.user)?.id !== userId,
  );
  return {
    membershipId: membership.id,
    spaceId: typeof space?.id === 'string' ? space.id : null,
    deleteSpace: Boolean(space?.id && spaceMemberships.length > 0 && remainingMembers.length === 0),
  };
}

function fileDeleteOpsForAccountDeletion(data: any, userId: string) {
  const paths = [
    ...collectOwnedAvatarPaths(data?.$users, userId),
    ...collectOwnedMemoryMediaPaths(data?.memories, userId),
    ...collectOwnedJournalMediaPaths(data?.journalEntries, userId),
  ];
  return paths.map((path) =>
    (tx as any).$files[lookup('path', path)].delete(),
  );
}

function toEntityRows(value: unknown) {
  if (Array.isArray(value)) return value;
  if (value) return [value];
  return [];
}

function accountDeletionOwnedRows(rows: unknown, ownerLink: string, userId: string) {
  if (!Array.isArray(rows)) return [];
  return rows.filter((row: any) => firstRel(row?.[ownerLink])?.id === userId);
}

function unlinkDeletedUserFromRemainingRows(
  table: string,
  rows: unknown,
  linkCleanup: AccountDeletionRemainingLinkCleanup,
  userId: string,
) {
  if (!Array.isArray(rows)) return [];
  const ops: any[] = [];
  for (const row of rows) {
    if (typeof row?.id !== 'string') continue;
    if (firstRel(row?.[linkCleanup.ownerLink])?.id === userId) continue;
    for (const link of linkCleanup.unlinkLinks) {
      if (firstRel(row?.[link])?.id === userId) {
        ops.push((tx as any)[table][row.id].unlink({ [link]: userId }));
      }
    }
  }
  return ops;
}

function cleanupDeletedUserFromPreservedLinkRows(
  table: string,
  rows: unknown,
  linkCleanup: AccountDeletionRemainingLinkCleanup,
  userId: string,
) {
  if (!Array.isArray(rows)) return [];
  const ops: any[] = [];
  const links = [linkCleanup.ownerLink, ...linkCleanup.unlinkLinks];
  for (const row of rows) {
    if (typeof row?.id !== 'string') continue;
    const ownerIsDeletedUser = firstRel(row?.[linkCleanup.ownerLink])?.id === userId;
    if (ownerIsDeletedUser && shouldDeleteDeletedUserOwnedLinkRow(table, row, linkCleanup, userId)) {
      ops.push((tx as any)[table][row.id].delete());
      continue;
    }
    for (const link of links) {
      if (firstRel(row?.[link])?.id === userId) {
        ops.push((tx as any)[table][row.id].unlink({ [link]: userId }));
      }
    }
  }
  return ops;
}

function shouldDeleteDeletedUserOwnedLinkRow(
  table: string,
  row: any,
  linkCleanup: AccountDeletionRemainingLinkCleanup,
  userId: string,
) {
  if (!isSharedRowRemainingAfterLeave(table, row)) return true;
  if (rowBelongsToSoloSpace(row)) return true;
  if (rowBelongsToSharedSpace(row)) return false;
  if (rowHasOtherUserLink(row, linkCleanup.unlinkLinks, userId)) return false;
  return true;
}

function rowHasOtherUserLink(row: any, links: string[], userId: string) {
  return links.some((link) => {
    const linkedUser = firstRel(row?.[link]);
    return typeof linkedUser?.id === 'string' && linkedUser.id !== userId;
  });
}

function cleanupDeletedUserOwnedContainerRows(
  table: string,
  rows: unknown,
  ownerLink: string,
  userId: string,
) {
  if (!Array.isArray(rows)) return [];
  const ops: any[] = [];
  for (const row of rows) {
    if (typeof row?.id !== 'string') continue;
    if (rowBelongsToSoloSpace(row)) {
      ops.push((tx as any)[table][row.id].delete());
    } else if (table === 'timetables' && !isSharedRowRemainingAfterLeave(table, row)) {
      ops.push((tx as any)[table][row.id].delete());
    } else {
      ops.push((tx as any)[table][row.id].unlink({ [ownerLink]: userId }));
    }
  }
  return ops;
}

function rowBelongsToSharedSpace(row: any) {
  const kind = firstRel(row?.couple)?.kind;
  return kind === 'pair' || kind === 'couple' || kind === 'crew';
}

function rowBelongsToSoloSpace(row: any) {
  return firstRel(row?.couple)?.kind === 'solo';
}

function collectOwnedAvatarPaths(users: unknown, userId: string): string[] {
  const userRows = Array.isArray(users) ? users : users ? [users] : [];
  const ownerPrefix = `avatars/${userId}/`;
  const seen = new Set<string>();
  for (const user of userRows) {
    const avatarPath = (user as { avatarPath?: unknown } | null)?.avatarPath;
    if (typeof avatarPath !== 'string') continue;
    if (!avatarPath.startsWith(ownerPrefix)) continue;
    seen.add(avatarPath);
  }
  return [...seen];
}

function collectOwnedMemoryMediaPaths(memories: unknown, userId: string): string[] {
  if (!Array.isArray(memories)) return [];
  const ownerPrefix = `users/${userId}/spaces/`;
  const seen = new Set<string>();
  for (const memory of memories) {
    const attachments = (memory as { attachments?: unknown } | null)?.attachments;
    if (!Array.isArray(attachments)) continue;
    for (const attachment of attachments) {
      const mediaPath = (attachment as { mediaPath?: unknown } | null)?.mediaPath;
      if (typeof mediaPath !== 'string') continue;
      if (!mediaPath.startsWith(ownerPrefix)) continue;
      seen.add(mediaPath);
    }
  }
  return [...seen];
}

function collectOwnedJournalMediaPaths(journalEntries: unknown, userId: string): string[] {
  if (!Array.isArray(journalEntries)) return [];
  const ownerPrefix = `users/${userId}/spaces/`;
  const seen = new Set<string>();
  for (const entry of journalEntries) {
    const mediaPaths = (entry as { mediaPaths?: unknown } | null)?.mediaPaths;
    if (!Array.isArray(mediaPaths)) continue;
    for (const path of mediaPaths) {
      if (typeof path !== 'string') continue;
      if (!path.startsWith(ownerPrefix)) continue;
      seen.add(path);
    }
  }
  return [...seen];
}

function deleteOpsForRows(table: string, rows: unknown) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row: any) => (typeof row?.id === 'string' ? (tx as any)[table][row.id].delete() : null))
    .filter(Boolean);
}

export async function ensureUserRow(_params: {
  userId: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}): Promise<void> {
  const updates = profileUpdates({
    displayName: _params.displayName ?? undefined,
    avatarUrl: _params.avatarUrl,
  });
  const ensure = await prepareEnsureSoloSpace(_params.userId);
  const ops = [
    ...(Object.keys(updates).length > 0 ? [(tx as any).$users[_params.userId].update(updates)] : []),
    ...ensure.ops,
  ];
  if (ops.length > 0) {
    await db.transact(ops);
  }
}

export async function ensureSoloSpaceForUser(params: {
  userId: string;
}): Promise<{ spaceId: string; membershipId: string | null }> {
  const ensure = await prepareEnsureSoloSpace(params.userId);
  if (ensure.ops.length > 0) {
    await db.transact(ensure.ops);
  }
  return { spaceId: ensure.spaceId, membershipId: ensure.membershipId };
}

export async function updateUserProfile(params: {
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  avatarPath?: string | null;
}): Promise<void> {
  const updates = profileUpdates(params);
  if (Object.keys(updates).length === 0) return;
  await db.transact([
    (tx as any).$users[params.userId].update(updates),
  ]);
}

function profileUpdates(params: {
  displayName?: string | null;
  avatarUrl?: string | null;
  avatarPath?: string | null;
}): Record<string, string | null> {
  const updates: Record<string, string | null> = {};
  if (params.displayName !== undefined) {
    const displayName = params.displayName?.trim() ?? '';
    updates.displayName = displayName || null;
  }
  if (params.avatarUrl !== undefined) {
    updates.avatarUrl = params.avatarUrl;
  }
  if (params.avatarPath !== undefined) {
    updates.avatarPath = params.avatarPath;
  }
  return updates;
}

async function prepareEnsureSoloSpace(userId: string): Promise<{
  ops: any[];
  spaceId: string;
  membershipId: string | null;
}> {
  const { data } = await (db as any).queryOnce({
    $users: {
      $: { where: { id: userId } },
      baseSoloSpace: {},
    },
    memberships: {
      $: { where: { 'user.id': userId } },
      space: {},
    },
  });

  const memberships = Array.isArray(data?.memberships) ? data.memberships : [];
  const userRow = firstRel(data?.$users);
  const linkedBase = firstRel(userRow?.baseSoloSpace);
  const linkedBaseId = linkedBase?.id as string | undefined;
  const linkedMembership = linkedBaseId
    ? memberships.find((membership: any) => firstRel(membership?.space)?.id === linkedBaseId)
    : null;
  const linkedMembershipSpace = firstRel(linkedMembership?.space);
  const linkedBaseIsSolo = Boolean(
    linkedBaseId && (linkedBase?.kind === 'solo' || linkedMembershipSpace?.kind === 'solo'),
  );
  const existingSoloMembership =
    (linkedBaseIsSolo ? linkedMembership : null) ??
    memberships.find((membership: any) => firstRel(membership?.space)?.kind === 'solo') ??
    null;
  const existingSoloSpace = firstRel(existingSoloMembership?.space);
  const spaceId = linkedBaseIsSolo ? linkedBaseId : existingSoloSpace?.id ?? id();
  const membershipId = existingSoloMembership?.id ?? id();
  const ts = now();
  const ops: any[] = [];
  const createsSoloSpace = !linkedBaseIsSolo && !existingSoloSpace;

  if (createsSoloSpace) {
    ops.push(
      tx.spaces[spaceId]
        .update({
          kind: 'solo',
          enabledFeatures: resolveCreateSpaceFeatureIds({ kind: 'solo', mode: 'solo' }),
          createdAt: ts,
          updatedAt: ts,
        })
        .link({ createdBy: userId }),
    );
    ops.push(
      tx.mediaQuotaUsage[id()]
        .update({ bytesUsed: 0, updatedAt: ts })
        .link({ space: spaceId }),
    );
  }

  if (!existingSoloMembership) {
    ops.push(
      tx.memberships[membershipId]
        .update({ role: 'owner', joinedAt: ts })
        .link({ user: userId, space: spaceId }),
    );
  }

  if (linkedBaseId !== spaceId) {
    ops.push((tx as any).$users[userId].link({ baseSoloSpace: spaceId }));
  }

  return {
    ops,
    spaceId,
    membershipId: existingSoloMembership?.id ?? membershipId,
  };
}

function firstRel(value: any): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function updateUserAvatar(params: {
  userId: string;
  avatarUrl: string;
  avatarPath?: string | null;
}): Promise<void> {
  const nextAvatarPath = ownedAvatarPathOrNull(params.avatarPath ?? null, params.userId);
  const currentAvatarPath = await queryCurrentAvatarPath(params.userId);
  const staleAvatarPath =
    currentAvatarPath && currentAvatarPath !== nextAvatarPath
      ? ownedAvatarPathOrNull(currentAvatarPath, params.userId)
      : null;
  const ops = [
    ...(staleAvatarPath ? [(tx as any).$files[lookup('path', staleAvatarPath)].delete()] : []),
    (tx as any).$users[params.userId].update(
      profileUpdates({
        avatarUrl: params.avatarUrl,
        avatarPath: nextAvatarPath,
      }),
    ),
  ];
  await db.transact(ops);
}

export async function deleteUploadedAvatar(params: {
  userId: string;
  avatarPath: string | null | undefined;
}): Promise<void> {
  const avatarPath = ownedAvatarPathOrNull(params.avatarPath, params.userId);
  if (!avatarPath) return;
  await db.transact([
    (tx as any).$files[lookup('path', avatarPath)].delete(),
  ]);
}

/**
 * Upload a local image (file:// URI) to InstantDB storage and return its
 * public URL plus owner-scoped path. Used to persist user-picked avatars
 * across devices/sessions and clean the storage row later.
 */
export type UploadedAvatar = {
  avatarUrl: string;
  avatarPath: string;
};

export async function uploadAvatarFromUri(params: {
  userId: string;
  uri: string;
  contentType?: string;
}): Promise<UploadedAvatar> {
  const { userId, uri, contentType = 'image/jpeg' } = params;
  const ext = contentType.split('/')[1] ?? 'jpg';
  const path = `avatars/${userId}/${Date.now()}.${ext}`;

  const res = await fetch(uri);
  const blob = await res.blob();
  const file = new File([blob], path.split('/').pop()!, { type: contentType });

  await (db as any).storage.uploadFile(path, file, { contentType });

  // Pull the public URL back via a one-shot query.
  const result = await (db as any).queryOnce({
    $files: { $: { where: { path } } },
  });
  const url = result?.data?.$files?.[0]?.url as string | undefined;
  if (!url) throw new Error('upload succeeded but no URL returned');
  return { avatarUrl: url, avatarPath: path };
}

async function queryCurrentAvatarPath(userId: string): Promise<string | null> {
  const { data } = await (db as any).queryOnce({
    $users: { $: { where: { id: userId } } },
  });
  const user = firstRel(data?.$users);
  const avatarPath = user?.avatarPath;
  return typeof avatarPath === 'string' ? avatarPath : null;
}

function ownedAvatarPathOrNull(path: string | null | undefined, userId: string): string | null {
  if (typeof path !== 'string') return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith(`avatars/${userId}/`)) return null;
  return trimmed;
}
