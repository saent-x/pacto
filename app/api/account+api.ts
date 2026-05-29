import { lookup } from '@instantdb/admin';
import { getAdminDb, readJsonBody } from '@/src/lib/server/request-guards';

const ACCOUNT_DELETION_OPS_BATCH_SIZE = 200;

type AccountBody = {
  // Kept for compatibility with legacy clients. NOTE: every other field a
  // client might send (membershipId/spaceId/isLastMember/personal*/shared*) is
  // IGNORED — see SEC-4 below. We keep the type loose so old clients that still
  // send those fields don't break, but we never read them.
  userId?: string;
};

type AccountDeletionTable = {
  table: string;
  userLink?: string;
  spaceLink?: 'couple' | 'space';
  userPath?: string;
  spacePath?: string;
  membershipLink?: string;
};

type AccountDeletionRemainingLinkCleanup = {
  ownerLink: string;
  unlinkLinks: string[];
  preserveSharedOwnerRows: boolean;
};

type AccountDeletionMembershipTarget = {
  membershipId: string;
  spaceId: string | null;
  deleteSpace: boolean;
};

const SHARED_ACCOUNT_DELETION_TABLES: AccountDeletionTable[] = [
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
  reminders: {
    ownerLink: 'createdBy',
    unlinkLinks: ['assignedTo', 'completedBy'],
    preserveSharedOwnerRows: false,
  },
  tasks: {
    ownerLink: 'createdBy',
    unlinkLinks: ['assignedTo', 'completedBy'],
    preserveSharedOwnerRows: false,
  },
  wishlistItems: {
    ownerLink: 'addedBy',
    unlinkLinks: ['purchasedBy'],
    preserveSharedOwnerRows: false,
  },
};

const ACCOUNT_DELETION_PRESERVE_CONTAINER_OWNER = new Set(['taskLists', 'timetables']);

// SECURITY TODO: rate limiting requires shared infra (KV/Redis); not implemented here.
export async function DELETE(request: Request) {
  const token = bearerToken(request);
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appId = process.env.EXPO_PUBLIC_INSTANT_APP_ID;
  const adminToken = process.env.INSTANT_ADMIN_TOKEN;
  if (!appId || !adminToken) {
    return Response.json({ error: 'Account API is not configured.' }, { status: 503 });
  }

  const db = getAdminDb(appId, adminToken);
  const user = await db.auth.verifyToken(token).catch(() => null);
  if (!user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // SEC-5: enforce JSON Content-Type (415) and body size cap (413) before parsing.
  // The body is read but its contents are (intentionally) almost entirely
  // ignored; see SEC-4.
  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;
  const payload = parsedBody.body as AccountBody;

  // SEC-4: The deletion target is ALWAYS the authenticated user. We accept a
  // legacy `userId` field only to reject a mismatch (defense in depth); a caller
  // can never delete another user, and — critically — can no longer influence
  // WHICH memberships/spaces are deleted. The membership/space targets are
  // derived entirely server-side below from the token's user id (see
  // `buildAccountDeletionQuery` + `accountDeletionMembershipTargets`). Any
  // client-supplied membershipId/spaceId/isLastMember hints are ignored, so a
  // caller cannot trick the admin SDK (which bypasses `instant.perms.ts`) into
  // deleting a shared space or membership that isn't theirs to remove.
  const requestedUserId = typeof payload?.userId === 'string' ? payload.userId.trim() : null;
  if (requestedUserId && requestedUserId.length > 0 && requestedUserId !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const targetUserId = user.id;

  try {
    const queryResult = await db.query(buildAccountDeletionQuery(targetUserId));
    const data = (queryResult as any)?.data ?? queryResult;
    const ops = buildAccountDeletionOps((db as any).tx, data, targetUserId);
    if (ops.length > 0) {
      for (let offset = 0; offset < ops.length; offset += ACCOUNT_DELETION_OPS_BATCH_SIZE) {
        const opBatch = ops.slice(offset, offset + ACCOUNT_DELETION_OPS_BATCH_SIZE);
        await db.transact(opBatch);
      }
    }
    await db.auth.deleteUser({ id: targetUserId });
  } catch {
    return Response.json({ error: 'Could not delete account.' }, { status: 500 });
  }

  return Response.json({ ok: true });
}

function buildAccountDeletionQuery(userId: string) {
  const query: Record<string, unknown> = {
    $users: { $: { where: { id: userId } } },
    profiles: { $: { where: { 'user.id': userId } } },
    devices: { $: { where: { 'user.id': userId } } },
    memberships: {
      $: { where: { 'user.id': userId } },
      space: { memberships: { user: {} } },
    },
  };

  for (const table of SHARED_ACCOUNT_DELETION_TABLES) {
    if (table.table === 'memories') {
      query.memories = {
        $: { where: { 'author.id': userId } },
        attachments: {},
      };
    } else if (table.table === 'journalEntries') {
      query.journalEntries = {
        $: { where: { 'author.id': userId } },
      };
    } else if (ACCOUNT_DELETION_REMAINING_LINK_CLEANUP[table.table] && table.userLink) {
      const linkCleanup = ACCOUNT_DELETION_REMAINING_LINK_CLEANUP[table.table];
      query[table.table] = {
        $: {
          where: {
            or: [table.userLink, ...linkCleanup.unlinkLinks].map((link) => ({
              [`${link}.id`]: userId,
            })),
          },
        },
        [table.userLink]: {},
        ...Object.fromEntries(linkCleanup.unlinkLinks.map((link) => [link, {}])),
        couple: {},
      };
    } else if (table.userLink) {
      query[table.table] = {
        $: { where: { [`${table.userLink}.id`]: userId } },
        ...(ACCOUNT_DELETION_PRESERVE_CONTAINER_OWNER.has(table.table) ? { couple: {} } : {}),
      };
    } else if (table.membershipLink) {
      query[table.table] = {
        $: { where: { [`${table.membershipLink}.user.id`]: userId } },
      };
    }
  }

  return query as any;
}

function buildAccountDeletionOps(
  tx: any,
  data: any,
  userId: string,
) {
  const ops: any[] = [
    ...fileDeleteOpsForAccountDeletion(tx, data, userId),
    ...deleteOpsForRows(tx, 'profiles', data?.profiles),
    ...deleteOpsForRows(tx, 'devices', data?.devices),
  ];

  for (const table of SHARED_ACCOUNT_DELETION_TABLES) {
    const linkCleanup = ACCOUNT_DELETION_REMAINING_LINK_CLEANUP[table.table];
    if (linkCleanup) {
      if (linkCleanup.preserveSharedOwnerRows) {
        ops.push(
          ...cleanupDeletedUserFromPreservedLinkRows(
            tx,
            table.table,
            data?.[table.table],
            linkCleanup,
            userId,
          ),
        );
      } else {
        ops.push(
          ...deleteOpsForRows(
            tx,
            table.table,
            accountDeletionOwnedRows(data?.[table.table], linkCleanup.ownerLink, userId),
          ),
        );
        ops.push(
          ...unlinkDeletedUserFromRemainingRows(
            tx,
            table.table,
            data?.[table.table],
            linkCleanup,
            userId,
          ),
        );
      }
    } else if (table.userLink && ACCOUNT_DELETION_PRESERVE_CONTAINER_OWNER.has(table.table)) {
      ops.push(
        ...cleanupDeletedUserOwnedContainerRows(
          tx,
          table.table,
          data?.[table.table],
          table.userLink,
          userId,
        ),
      );
    } else if (table.userLink || table.membershipLink) {
      ops.push(...deleteOpsForRows(tx, table.table, data?.[table.table]));
    }
  }

  const deletedMemberships = new Set<string>();
  const deletedSpaces = new Set<string>();
  for (const target of accountDeletionMembershipTargets(data, userId)) {
    if (target.membershipId && !target.deleteSpace && !deletedMemberships.has(target.membershipId)) {
      ops.push(tx.memberships[target.membershipId].delete());
      deletedMemberships.add(target.membershipId);
    }
    if (target.deleteSpace && target.spaceId && !deletedSpaces.has(target.spaceId)) {
      ops.push(tx.spaces[target.spaceId].delete());
      deletedSpaces.add(target.spaceId);
    }
  }

  ops.push(...deleteOpsForRows(tx, '$users', data?.$users));
  return ops;
}

/**
 * SEC-4: Derive the deletion targets PURELY from the server-queried memberships
 * of the authenticated user. Each membership is the user's own row (the query
 * filters on `user.id == userId`), and `deleteSpace` is computed from the actual
 * remaining members of that space — never from client-supplied hints. The
 * previous implementation merged client-provided membership/space ids and an
 * `isLastMember` flag into these targets, which (because the admin SDK bypasses
 * `instant.perms.ts`) let a caller delete spaces/memberships that weren't theirs.
 */
function accountDeletionMembershipTargets(
  data: any,
  userId: string,
): AccountDeletionMembershipTarget[] {
  const memberships = Array.isArray(data?.memberships) ? data.memberships : [];
  return memberships
    .map((membership: any) => accountDeletionMembershipTarget(membership, userId))
    .filter(
      (target: AccountDeletionMembershipTarget | null): target is AccountDeletionMembershipTarget =>
        Boolean(target?.membershipId),
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
    deleteSpace: Boolean(
      space?.id && spaceMemberships.length > 0 && remainingMembers.length === 0,
    ),
  };
}

function fileDeleteOpsForAccountDeletion(tx: any, data: any, userId: string) {
  const paths = [
    ...collectOwnedAvatarPaths(data?.$users, userId),
    ...collectOwnedMemoryMediaPaths(data?.memories, userId),
    ...collectOwnedJournalMediaPaths(data?.journalEntries, userId),
  ];
  return paths.map((path) => tx.$files[lookup('path', path)].delete());
}

function deleteOpsForRows(tx: any, table: string, rows: unknown) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row: any) => (typeof row?.id === 'string' ? tx[table][row.id].delete() : null))
    .filter(Boolean);
}

function accountDeletionOwnedRows(rows: unknown, ownerLink: string, userId: string) {
  if (!Array.isArray(rows)) return [];
  return rows.filter((row: any) => firstRel(row?.[ownerLink])?.id === userId);
}

function unlinkDeletedUserFromRemainingRows(
  tx: any,
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
        ops.push(tx[table][row.id].unlink({ [link]: userId }));
      }
    }
  }
  return ops;
}

function cleanupDeletedUserFromPreservedLinkRows(
  tx: any,
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
      ops.push(tx[table][row.id].delete());
      continue;
    }
    for (const link of links) {
      if (firstRel(row?.[link])?.id === userId) {
        ops.push(tx[table][row.id].unlink({ [link]: userId }));
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
  tx: any,
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
      ops.push(tx[table][row.id].delete());
    } else if (table === 'timetables' && !isSharedRowRemainingAfterLeave(table, row)) {
      ops.push(tx[table][row.id].delete());
    } else {
      ops.push(tx[table][row.id].unlink({ [ownerLink]: userId }));
    }
  }
  return ops;
}

function isSharedRowRemainingAfterLeave(table: string, row: any) {
  if (table === 'timetables') return row?.share !== 'solo';
  return row?.isPrivate !== true;
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

function firstRel(value: any): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function bearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  return match?.[1]?.trim() || null;
}
