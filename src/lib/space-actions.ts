import { id, lookup, tx } from '@instantdb/react-native';
import { db } from './db';
import type { SpaceKindWire, SpaceMode } from './session';
import { type FeatureId, sanitizeFeatureIds } from '@/src/lib/features/registry';
import { generateInviteCode } from './invite-code';
import {
  resolveCreateSpaceFeatureIds,
  resolveUpgradeSoloToCoupleFeatureIds,
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
  anniversary?: string;
  enabledFeatures?: FeatureId[];
}): Promise<{ spaceId: string; inviteCode: string | null }> {
  const spaceId = id();
  const membershipId = id();
  const inviteCode =
    params.kind === 'couple' || params.kind === 'pair' ? generateInviteCode() : null;
  const ts = now();

  const spaceFields: Record<string, unknown> = {
    kind: params.kind,
    enabledFeatures: resolveCreateSpaceFeatureIds(params),
    createdAt: ts,
    updatedAt: ts,
  };
  if (params.name) spaceFields.name = params.name;
  if (params.anniversary) spaceFields.anniversary = params.anniversary;
  if (inviteCode) spaceFields.inviteCode = inviteCode;

  try {
    await db.transact([
      tx.spaces[spaceId].update(spaceFields).link({ createdBy: params.userId }),
      tx.memberships[membershipId]
        .update({ role: 'owner', joinedAt: ts })
        .link({ user: params.userId, space: spaceId }),
    ]);
  } catch (err) {
    console.error('[createSpace] transact failed', err);
    throw err;
  }

  return { spaceId, inviteCode };
}

export async function updateSpaceFeatures(params: {
  spaceId: string;
  enabledFeatures: FeatureId[];
  mode: SpaceMode;
}): Promise<void> {
  await db.transact([
    tx.spaces[params.spaceId].update({
      enabledFeatures: sanitizeFeatureIds(params.enabledFeatures, params.mode),
      updatedAt: now(),
    }),
  ]);
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
      enabledFeatures: resolveUpgradeSoloToCoupleFeatureIds(),
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

// No-op placeholder. Auth auto-creates $users. Profile fields will move to
// a dedicated `profiles` entity in a later phase.
export async function ensureUserRow(_params: {
  userId: string;
  email: string;
  avatarUrl?: string | null;
}): Promise<void> {
  if (!_params.avatarUrl) return;
  await updateUserAvatar({
    userId: _params.userId,
    avatarUrl: _params.avatarUrl,
  });
}

export async function updateUserAvatar(params: {
  userId: string;
  avatarUrl: string;
}): Promise<void> {
  await db.transact([
    (tx as any).$users[params.userId].update({
      avatarUrl: params.avatarUrl,
    }),
  ]);
}
