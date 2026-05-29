#!/usr/bin/env node
import { init, id } from '@instantdb/admin';
import { existsSync, readFileSync } from 'node:fs';
import { assertStagingWriteAllowed } from './lib/staging-write-guard.mjs';

loadDotEnv();

const apply = process.argv.includes('--apply');
const appId = process.env.EXPO_PUBLIC_INSTANT_APP_ID;
const adminToken = process.env.INSTANT_ADMIN_TOKEN;

if (!appId || !adminToken) {
  console.error('Missing EXPO_PUBLIC_INSTANT_APP_ID or INSTANT_ADMIN_TOKEN.');
  process.exit(1);
}

if (apply) {
  assertStagingWriteAllowed({ appId, operation: 'base solo backfill' });
}

const db = init({ appId, adminToken });

const privateTables = [
  { table: 'events', userLink: 'createdBy', spaceLink: 'couple', where: { isPrivate: true } },
  { table: 'plans', userLink: 'createdBy', spaceLink: 'couple', where: { isPrivate: true } },
  { table: 'rituals', userLink: 'createdBy', spaceLink: 'couple', where: { isPrivate: true } },
  { table: 'checkIns', userLink: 'author', spaceLink: 'couple', where: { isPrivate: true } },
  { table: 'journalEntries', userLink: 'author', spaceLink: 'couple', where: { isPrivate: true } },
  { table: 'loveNotes', userLink: 'author', spaceLink: 'couple', where: { isPrivate: true } },
  { table: 'memories', userLink: 'author', spaceLink: 'space', where: { isPrivate: true } },
  { table: 'timetables', userLink: 'createdBy', spaceLink: 'couple', where: { share: 'solo' } },
];

const data = await db.query({
  $users: { baseSoloSpace: {} },
  memberships: { user: {}, space: {} },
  ...Object.fromEntries(
    privateTables.map((entry) => [
      entry.table,
      {
        $: { where: entry.where },
        [entry.userLink]: {},
        [entry.spaceLink]: {},
      },
    ]),
  ),
});

const now = Date.now();
const privateRowsByUser = {};
for (const entry of privateTables) {
  for (const row of data[entry.table] ?? []) {
    const userId = firstRel(row[entry.userLink])?.id;
    if (!userId) continue;
    privateRowsByUser[userId] ??= {};
    privateRowsByUser[userId][entry.table] ??= [];
    privateRowsByUser[userId][entry.table].push(row);
  }
}

const ops = [];
const summary = {
  usersScanned: data.$users?.length ?? 0,
  soloSpacesCreated: 0,
  mediaQuotaRowsCreated: 0,
  membershipsCreated: 0,
  baseLinksCreated: 0,
  privateRowsRelinked: 0,
};

for (const user of data.$users ?? []) {
  const linkedBase = firstRel(user.baseSoloSpace);
  const linkedBaseId = linkedBase?.id;
  const userMemberships = (data.memberships ?? []).filter(
    (membership) => firstRel(membership.user)?.id === user.id,
  );
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
  const soloSpaceId = linkedBaseIsSolo ? linkedBaseId : existingSoloSpace?.id ?? id();

  if (!linkedBaseIsSolo && !existingSoloSpace) {
    summary.soloSpacesCreated += 1;
    ops.push(
      db.tx.spaces[soloSpaceId]
        .update({ kind: 'solo', createdAt: now, updatedAt: now })
        .link({ createdBy: user.id }),
    );
    summary.mediaQuotaRowsCreated += 1;
    ops.push(
      db.tx.mediaQuotaUsage[id()]
        .update({ bytesUsed: 0, updatedAt: now })
        .link({ space: soloSpaceId }),
    );
  }

  if (!existingSoloMembership) {
    summary.membershipsCreated += 1;
    ops.push(
      db.tx.memberships[id()]
        .update({ role: 'owner', joinedAt: now })
        .link({ user: user.id, space: soloSpaceId }),
    );
  }

  if (linkedBaseId !== soloSpaceId) {
    summary.baseLinksCreated += 1;
    ops.push(db.tx.$users[user.id].link({ baseSoloSpace: soloSpaceId }));
  }

  const rowsByTable = privateRowsByUser[user.id] ?? {};
  for (const entry of privateTables) {
    for (const row of rowsByTable[entry.table] ?? []) {
      const currentSpaceId = firstRel(row[entry.spaceLink])?.id;
      if (!row.id || currentSpaceId === soloSpaceId) continue;
      summary.privateRowsRelinked += 1;
      ops.push(db.tx[entry.table][row.id].link({ [entry.spaceLink]: soloSpaceId }));
    }
  }
}

console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', summary, opCount: ops.length }, null, 2));

if (apply && ops.length > 0) {
  await db.transact(ops);
  console.log(`Applied ${ops.length} operations.`);
} else if (!apply) {
  console.log('Dry run only. Re-run with --apply to write changes.');
}

function firstRel(value) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function loadDotEnv() {
  if (!existsSync('.env')) return;
  const text = readFileSync('.env', 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
