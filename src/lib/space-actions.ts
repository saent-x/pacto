import { id, lookup, tx } from '@instantdb/react-native';
import { db } from './db';
import { generateInviteCode } from './invite-code';

export type SpaceKind = 'solo' | 'couple';

function now() {
  return Date.now();
}

// Create a space and create the current user's owner membership in one transaction.
export async function createSpace(params: {
  userId: string;
  kind: SpaceKind;
  name?: string;
  anniversary?: string;
}): Promise<{ spaceId: string; inviteCode: string | null }> {
  const spaceId = id();
  const membershipId = id();
  const inviteCode = params.kind === 'couple' ? generateInviteCode() : null;
  const ts = now();

  await db.transact([
    tx.spaces[spaceId]
      .update({
        kind: params.kind,
        name: params.name,
        inviteCode: inviteCode ?? undefined,
        createdAt: ts,
        updatedAt: ts,
      })
      .link({ createdBy: params.userId }),
    tx.memberships[membershipId]
      .update({ role: 'owner', joinedAt: ts })
      .link({ user: params.userId, space: spaceId }),
  ]);

  return { spaceId, inviteCode };
}

// Join a space by invite code. Atomic: looks up by code, creates membership,
// nulls the code. If the code has already been nulled by a concurrent join,
// transact fails.
export async function joinSpaceByCode(params: {
  userId: string;
  code: string;
}): Promise<void> {
  const ts = now();
  const membershipId = id();

  await db.transact([
    tx.spaces[lookup('inviteCode', params.code)].update({
      inviteCode: undefined,
      updatedAt: ts,
    }),
    tx.memberships[membershipId]
      .update({ role: 'partner', joinedAt: ts })
      .link({
        user: params.userId,
        space: lookup('inviteCode', params.code),
      }),
  ]);
}

// Upgrade solo space → couple. Adds kind + generates invite code.
export async function upgradeSoloToCouple(params: { spaceId: string }): Promise<string> {
  const inviteCode = generateInviteCode();
  await db.transact([
    tx.spaces[params.spaceId].update({
      kind: 'couple',
      inviteCode,
      updatedAt: now(),
    }),
  ]);
  return inviteCode;
}

// Regenerate invite code (invalidates the old one).
export async function regenerateInviteCode(params: { spaceId: string }): Promise<string> {
  const inviteCode = generateInviteCode();
  await db.transact([
    tx.spaces[params.spaceId].update({ inviteCode, updatedAt: now() }),
  ]);
  return inviteCode;
}

// Leave space. Deletes my membership. If I'm the last member, deletes the space too.
export async function leaveSpace(params: {
  spaceId: string;
  membershipId: string;
  isLastMember: boolean;
}): Promise<void> {
  const ops = [tx.memberships[params.membershipId].delete()];
  if (params.isLastMember) {
    ops.push(tx.spaces[params.spaceId].delete());
  }
  await db.transact(ops);
}

// InstantDB auth auto-creates the $users row. This upsert touches only email
// so later updates (displayName etc.) can go through the same helper.
export async function ensureUserRow(params: {
  userId: string;
  email: string;
}): Promise<void> {
  await db.transact([
    tx.$users[params.userId].update({ email: params.email }),
  ]);
}
