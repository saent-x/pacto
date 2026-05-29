#!/usr/bin/env node
import { init } from '@instantdb/admin';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RAW_ARGS = process.argv.slice(2);
const COMMANDS = new Set(['describe', 'validate', 'apply', 'verify']);
const command = RAW_ARGS.find((arg) => COMMANDS.has(arg)) ?? 'describe';
const runId = optionValue('--run-id') ?? `manual-${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}`;
const writeEvidence = RAW_ARGS.includes('--write-evidence');
const fixture = buildFixture(runId);

process.on('unhandledRejection', handleFatal);
process.on('uncaughtException', handleFatal);

if (command === 'describe') {
  printJson({
    mode: 'describe',
    safety: safetyText(),
    counts: countFixture(fixture),
    fixture,
  });
} else if (command === 'validate') {
  const validation = validateFixture(fixture);
  printJson({
    mode: 'validate',
    runId,
    counts: countFixture(fixture),
    validation,
  });
  if (!validation.ok) process.exit(1);
} else if (command === 'apply') {
  await withStagingDb(async (db, env) => {
    const validation = validateFixture(fixture);
    if (!validation.ok) {
      printJson({ mode: 'apply', runId, validation });
      process.exit(1);
    }
    const ops = buildApplyOps(db, fixture);
    const result = {
      mode: 'apply',
      runId,
      appId: env.appId,
      counts: countFixture(fixture),
      opCount: ops.length,
      validation,
    };
    if (ops.length > 0) {
      const txResult = await db.transact(ops);
      result.txId = txResult?.['tx-id'] ?? null;
    }
    writeEvidenceFile('spaces-staging-apply', runId, result);
    printJson(result);
  });
} else if (command === 'verify') {
  await withStagingDb(async (db, env) => {
    const remote = await fetchRemoteFixture(db, fixture);
    const validation = validateRemoteFixture(fixture, remote);
    const result = {
      mode: 'verify',
      runId,
      appId: env.appId,
      expected: countFixture(fixture),
      actual: countRemote(remote),
      validation,
    };
    writeEvidenceFile('spaces-staging-verify', runId, result);
    printJson(result);
    if (!validation.ok) process.exit(1);
  });
}

function buildFixture(runIdValue) {
  const safeRunId = normalizeRunId(runIdValue);
  const now = 1_766_000_000_000;
  const dateKey = '2026-05-24';
  const dueAt = now + 86_400_000;
  const features = {
    solo: ['tasks', 'calendar', 'memoryFeed', 'journal', 'checkins', 'recurring', 'timetable', 'goals'],
    pair: ['tasks', 'calendar', 'memoryFeed', 'journal', 'checkins', 'recurring', 'timetable', 'goals'],
    crew: ['tasks', 'calendar', 'memoryFeed', 'recurring', 'timetable', 'goals'],
  };

  const users = Object.fromEntries(
    [
      'solo_owner',
      'pair_owner',
      'pair_member',
      'crew_owner',
      'crew_member_a',
      'crew_member_b',
      'outsider',
    ].map((label) => [
      label,
      {
        id: qaId(safeRunId, 'user', label),
        email: `${label}+${safeRunId}@qa.pacto.local`,
        displayName: label.replaceAll('_', ' '),
        createdAt: now,
      },
    ]),
  );

  const spaces = {
    solo_owner_base: soloSpace(safeRunId, 'solo_owner_base', users.solo_owner.id, now, features.solo),
    pair_owner_base: soloSpace(safeRunId, 'pair_owner_base', users.pair_owner.id, now, features.solo),
    pair_member_base: soloSpace(safeRunId, 'pair_member_base', users.pair_member.id, now, features.solo),
    crew_owner_base: soloSpace(safeRunId, 'crew_owner_base', users.crew_owner.id, now, features.solo),
    crew_member_a_base: soloSpace(safeRunId, 'crew_member_a_base', users.crew_member_a.id, now, features.solo),
    crew_member_b_base: soloSpace(safeRunId, 'crew_member_b_base', users.crew_member_b.id, now, features.solo),
    outsider_base: soloSpace(safeRunId, 'outsider_base', users.outsider.id, now, features.solo),
    pending_pair_invite: sharedSpace(safeRunId, 'pending_pair_invite', 'pair', users.solo_owner.id, now, features.pair, inviteCode(safeRunId, 'PEND')),
    pair_shared: sharedSpace(safeRunId, 'pair_shared', 'pair', users.pair_owner.id, now, features.pair, null),
    crew_shared: sharedSpace(safeRunId, 'crew_shared', 'crew', users.crew_owner.id, now, features.crew, null),
  };

  const baseSpaceByUser = {
    solo_owner: 'solo_owner_base',
    pair_owner: 'pair_owner_base',
    pair_member: 'pair_member_base',
    crew_owner: 'crew_owner_base',
    crew_member_a: 'crew_member_a_base',
    crew_member_b: 'crew_member_b_base',
    outsider: 'outsider_base',
  };

  const memberships = [
    membership(safeRunId, 'solo_owner_base', users.solo_owner.id, spaces.solo_owner_base.id, 'owner', now),
    membership(safeRunId, 'pair_owner_base', users.pair_owner.id, spaces.pair_owner_base.id, 'owner', now),
    membership(safeRunId, 'pair_member_base', users.pair_member.id, spaces.pair_member_base.id, 'owner', now),
    membership(safeRunId, 'crew_owner_base', users.crew_owner.id, spaces.crew_owner_base.id, 'owner', now),
    membership(safeRunId, 'crew_member_a_base', users.crew_member_a.id, spaces.crew_member_a_base.id, 'owner', now),
    membership(safeRunId, 'crew_member_b_base', users.crew_member_b.id, spaces.crew_member_b_base.id, 'owner', now),
    membership(safeRunId, 'outsider_base', users.outsider.id, spaces.outsider_base.id, 'owner', now),
    membership(safeRunId, 'pending_pair_owner', users.solo_owner.id, spaces.pending_pair_invite.id, 'owner', now),
    membership(safeRunId, 'pair_owner_shared', users.pair_owner.id, spaces.pair_shared.id, 'owner', now),
    membership(safeRunId, 'pair_member_shared', users.pair_member.id, spaces.pair_shared.id, 'partner', now),
    membership(safeRunId, 'crew_owner_shared', users.crew_owner.id, spaces.crew_shared.id, 'owner', now),
    membership(safeRunId, 'crew_member_a_shared', users.crew_member_a.id, spaces.crew_shared.id, 'partner', now),
    membership(safeRunId, 'crew_member_b_shared', users.crew_member_b.id, spaces.crew_shared.id, 'partner', now),
  ];

  function scopedFeatureRows(userKey, sharedSpaceKey = null) {
    const user = users[userKey];
    const baseSpace = spaces[baseSpaceByUser[userKey]];
    const sharedSpace = sharedSpaceKey ? spaces[sharedSpaceKey] : null;
    const sharedMemberLinks =
      sharedSpaceKey === 'pair_shared'
        ? { assignedTo: users.pair_member.id, completedBy: users.pair_member.id }
        : sharedSpaceKey === 'crew_shared'
          ? { assignedTo: users.crew_member_a.id, completedBy: users.crew_member_b.id }
          : {};
    const rowsForUser = [
      row(safeRunId, 'plans', `${userKey}_private_plan`, { title: `QA ${userKey} private plan`, status: 'active', isPrivate: true, createdAt: now, updatedAt: now }, { couple: baseSpace.id, createdBy: user.id }, { scope: 'private', owner: user.id }),
      row(safeRunId, 'journalEntries', `${userKey}_private_journal`, { body: `QA ${userKey} private journal`, isPrivate: true, entryDate: dateKey, tags: [], createdAt: now, updatedAt: now }, { couple: baseSpace.id, author: user.id }, { scope: 'private', owner: user.id }),
      row(safeRunId, 'checkIns', `${userKey}_private_checkin`, { mood: 'calm', note: `QA ${userKey} private check-in`, isPrivate: true, checkInDate: dateKey, createdAt: now, updatedAt: now }, { couple: baseSpace.id, author: user.id }, { scope: 'private', owner: user.id }),
      row(safeRunId, 'reminders', `${userKey}_private_reminder`, { title: `QA ${userKey} private reminder`, dueAt, isCompleted: false, priority: 1, createdAt: now, updatedAt: now }, { couple: baseSpace.id, createdBy: user.id, assignedTo: user.id }, { scope: 'private', owner: user.id }),
      row(safeRunId, 'taskLists', `${userKey}_private_task_list`, { name: `QA ${userKey} private list`, colorKey: 'sky', createdAt: now, updatedAt: now }, { couple: baseSpace.id, createdBy: user.id }, { scope: 'private', owner: user.id }),
      row(safeRunId, 'tasks', `${userKey}_private_task`, { title: `QA ${userKey} private task`, isCompleted: false, dueDate: dateKey, priority: 1, createdAt: now, updatedAt: now }, { couple: baseSpace.id, createdBy: user.id, assignedTo: user.id, list: qaId(safeRunId, 'taskLists', `${userKey}_private_task_list`) }, { scope: 'private', owner: user.id }),
      row(safeRunId, 'events', `${userKey}_private_event`, { title: `QA ${userKey} private event`, startsAt: dueAt, isPrivate: true, createdAt: now, updatedAt: now }, { couple: baseSpace.id, createdBy: user.id }, { scope: 'private', owner: user.id }),
      row(safeRunId, 'timetables', `${userKey}_solo_timetable`, { title: `QA ${userKey} solo timetable`, template: 'routine', share: 'solo', createdAt: now, updatedAt: now }, { couple: baseSpace.id, createdBy: user.id }, { scope: 'private', owner: user.id }),
      row(safeRunId, 'timetableItems', `${userKey}_solo_timetable_item`, timetableItemPayload(`${userKey} solo routine`, now), { couple: baseSpace.id, timetable: qaId(safeRunId, 'timetables', `${userKey}_solo_timetable`) }, { scope: 'private', owner: user.id, spaceId: baseSpace.id }),
      row(safeRunId, 'memories', `${userKey}_private_memory`, { body: `QA ${userKey} private memory`, kind: 'post', isPrivate: true, notifyMembers: false, tags: [], createdAt: now, updatedAt: now }, { space: baseSpace.id, author: user.id }, { scope: 'private', owner: user.id }),
      row(safeRunId, 'memoryAttachments', `${userKey}_private_memory_attachment`, mediaAttachmentPayload(user.id, baseSpace.id, `${userKey}-private`), { memory: qaId(safeRunId, 'memories', `${userKey}_private_memory`) }, { scope: 'private', owner: user.id, spaceId: baseSpace.id }),
    ];

    if (!sharedSpace) return rowsForUser;

    rowsForUser.push(
      row(safeRunId, 'plans', `${userKey}_shared_plan`, { title: `QA ${userKey} shared plan`, status: 'active', isPrivate: false, createdAt: now, updatedAt: now }, { couple: sharedSpace.id, createdBy: user.id }, { scope: 'shared', owner: user.id }),
      row(safeRunId, 'journalEntries', `${userKey}_shared_journal`, { body: `QA ${userKey} shared journal`, isPrivate: false, entryDate: dateKey, tags: [], createdAt: now, updatedAt: now }, { couple: sharedSpace.id, author: user.id }, { scope: 'shared', owner: user.id }),
      row(safeRunId, 'checkIns', `${userKey}_shared_checkin`, { mood: 'bright', note: `QA ${userKey} shared check-in`, isPrivate: false, checkInDate: dateKey, createdAt: now, updatedAt: now }, { couple: sharedSpace.id, author: user.id }, { scope: 'shared', owner: user.id }),
      row(safeRunId, 'timetables', `${userKey}_shared_timetable`, { title: `QA ${userKey} shared timetable`, template: 'routine', share: 'shared', createdAt: now, updatedAt: now }, { couple: sharedSpace.id, createdBy: user.id }, { scope: 'shared', owner: user.id }),
      row(safeRunId, 'timetableItems', `${userKey}_shared_timetable_item`, timetableItemPayload(`${userKey} shared routine`, now), { couple: sharedSpace.id, timetable: qaId(safeRunId, 'timetables', `${userKey}_shared_timetable`) }, { scope: 'shared', owner: user.id, spaceId: sharedSpace.id }),
      row(safeRunId, 'memories', `${userKey}_shared_memory`, { body: `QA ${userKey} shared memory`, kind: 'post', isPrivate: false, notifyMembers: true, tags: [], createdAt: now, updatedAt: now }, { space: sharedSpace.id, author: user.id }, { scope: 'shared', owner: user.id }),
      row(safeRunId, 'memoryAttachments', `${userKey}_shared_memory_attachment`, mediaAttachmentPayload(user.id, sharedSpace.id, `${userKey}-shared`), { memory: qaId(safeRunId, 'memories', `${userKey}_shared_memory`) }, { scope: 'shared', owner: user.id, spaceId: sharedSpace.id }),
      row(safeRunId, 'taskLists', `${sharedSpaceKey}_task_list`, { name: `QA ${sharedSpaceKey} list`, colorKey: 'blue', createdAt: now, updatedAt: now }, { couple: sharedSpace.id, createdBy: user.id }, { scope: 'shared', owner: user.id }),
      row(safeRunId, 'tasks', `${sharedSpaceKey}_task`, { title: `QA ${sharedSpaceKey} task`, isCompleted: true, completedAt: now, dueDate: dateKey, priority: 1, createdAt: now, updatedAt: now }, { couple: sharedSpace.id, createdBy: user.id, ...sharedMemberLinks, list: qaId(safeRunId, 'taskLists', `${sharedSpaceKey}_task_list`) }, { scope: 'shared', owner: user.id }),
      row(safeRunId, 'reminders', `${sharedSpaceKey}_reminder`, { title: `QA ${sharedSpaceKey} reminder`, dueAt, isCompleted: true, completedAt: now, priority: 1, createdAt: now, updatedAt: now }, { couple: sharedSpace.id, createdBy: user.id, ...sharedMemberLinks }, { scope: 'shared', owner: user.id }),
      row(safeRunId, 'events', `${sharedSpaceKey}_event`, { title: `QA ${sharedSpaceKey} event`, startsAt: dueAt, isPrivate: false, createdAt: now, updatedAt: now }, { couple: sharedSpace.id, createdBy: user.id }, { scope: 'shared', owner: user.id }),
    );

    return rowsForUser;
  }

  const featureRows = [
    ...scopedFeatureRows('solo_owner'),
    ...scopedFeatureRows('pair_owner', 'pair_shared'),
    ...scopedFeatureRows('crew_owner', 'crew_shared'),
  ];

  const rows = [
    ...featureRows,
    ...mediaQuotaRows(safeRunId, spaces, featureRows, now),
    ...deviceRows(safeRunId, users, now),
  ];

  return {
    runId: safeRunId,
    users,
    spaces,
    baseSpaceByUser,
    memberships,
    rows,
    expected: {
      pendingInviteCode: spaces.pending_pair_invite.inviteCode,
      pairSharedSpaceId: spaces.pair_shared.id,
      crewSharedSpaceId: spaces.crew_shared.id,
    },
  };
}

function soloSpace(runIdValue, label, createdBy, now, enabledFeatures) {
  return sharedSpace(runIdValue, label, 'solo', createdBy, now, enabledFeatures, null);
}

function sharedSpace(runIdValue, label, kind, createdBy, now, enabledFeatures, inviteCodeValue) {
  return {
    id: qaId(runIdValue, 'space', label),
    label,
    kind,
    name: `QA ${label.replaceAll('_', ' ')}`,
    enabledFeatures,
    inviteCode: inviteCodeValue,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

function membership(runIdValue, label, userId, spaceId, role, now) {
  return {
    id: qaId(runIdValue, 'membership', label),
    userId,
    spaceId,
    role,
    joinedAt: now,
  };
}

function row(runIdValue, table, label, payload, links, meta) {
  return {
    id: qaId(runIdValue, table, label),
    table,
    label,
    payload,
    links,
    meta,
  };
}

function mediaAttachmentPayload(userId, spaceId, label) {
  const mediaPath = `users/${userId}/spaces/${spaceId}/memories/qa-${label}.jpg`;
  return {
    type: 'image',
    mediaUrl: `https://qa.pacto.local/${mediaPath}`,
    mediaPath,
    mediaSize: 1024,
    mediaWidth: 1200,
    mediaHeight: 900,
    sortOrder: 0,
    createdAt: 1_766_000_000_000,
  };
}

function timetableItemPayload(title, now) {
  return {
    title,
    category: 'routine',
    icon: 'calendar',
    color: '#8FB7D8',
    ink: '#153047',
    day: 1,
    startHour: 9,
    duration: 60,
    who: 'me',
    repeat: 'weekly',
    star: false,
    createdAt: now,
    updatedAt: now,
  };
}

function mediaQuotaRows(runIdValue, spaces, rows, now) {
  const bytesBySpace = mediaAttachmentBytesBySpace(spaces, rows);
  return Object.values(spaces).map((space) =>
    row(
      runIdValue,
      'mediaQuotaUsage',
      `${space.label}_quota`,
      { bytesUsed: bytesBySpace.get(space.id) ?? 0, updatedAt: now },
      { space: space.id },
      {
        scope: space.kind === 'solo' ? 'private' : 'shared',
        owner: space.createdBy,
        spaceId: space.id,
      },
    ),
  );
}

function deviceRows(runIdValue, users, now) {
  const sharedNotificationUsers = [
    ['pair_owner_ios_device', users.pair_owner.id, 'ios'],
    ['pair_member_android_device', users.pair_member.id, 'android'],
    ['crew_owner_ios_device', users.crew_owner.id, 'ios'],
    ['crew_member_a_android_device', users.crew_member_a.id, 'android'],
    ['crew_member_b_ios_device', users.crew_member_b.id, 'ios'],
  ];
  return sharedNotificationUsers.map(([label, userId, platform]) =>
    row(
      runIdValue,
      'devices',
      label,
      {
        expoPushToken: `ExponentPushToken[qa-${normalizeRunId(runIdValue)}-${label}]`,
        platform,
        appVersion: 'qa',
        lastSeenAt: now,
        createdAt: now,
      },
      { user: userId },
      { scope: 'private', owner: userId },
    ),
  );
}

function buildApplyOps(db, fixtureValue) {
  const ops = [];
  for (const [label, user] of Object.entries(fixtureValue.users)) {
    const baseSpaceKey = fixtureValue.baseSpaceByUser[label];
    ops.push(
      db.tx.$users[user.id]
        .update({
          email: user.email,
          displayName: user.displayName,
          createdAt: user.createdAt,
        })
        .link({ baseSoloSpace: fixtureValue.spaces[baseSpaceKey].id }),
    );
  }
  for (const space of Object.values(fixtureValue.spaces)) {
    ops.push(
      db.tx.spaces[space.id]
        .update({
          kind: space.kind,
          name: space.name,
          enabledFeatures: space.enabledFeatures,
          inviteCode: space.inviteCode ?? null,
          createdAt: space.createdAt,
          updatedAt: space.updatedAt,
        })
        .link({ createdBy: space.createdBy }),
    );
  }
  for (const membershipValue of fixtureValue.memberships) {
    ops.push(
      db.tx.memberships[membershipValue.id]
        .update({
          role: membershipValue.role,
          joinedAt: membershipValue.joinedAt,
        })
        .link({ user: membershipValue.userId, space: membershipValue.spaceId }),
    );
  }
  for (const rowValue of fixtureValue.rows) {
    ops.push(db.tx[rowValue.table][rowValue.id].update(rowValue.payload).link(rowValue.links));
  }
  return ops;
}

async function fetchRemoteFixture(db, fixtureValue) {
  const idsByTable = idsForFixture(fixtureValue);
  const query = {
    $users: {
      $: { where: idWhere(idsByTable.$users) },
      baseSoloSpace: {},
    },
    spaces: {
      $: { where: idWhere(idsByTable.spaces) },
      createdBy: {},
      memberships: { user: {} },
    },
    memberships: {
      $: { where: idWhere(idsByTable.memberships) },
      user: {},
      space: {},
    },
  };
  for (const [table, ids] of Object.entries(idsByTable)) {
    if (['$users', 'spaces', 'memberships'].includes(table)) continue;
    query[table] = remoteTableQuery(table, ids);
  }
  return db.query(query);
}

function remoteTableQuery(table, ids) {
  const query = { $: { where: idWhere(ids) } };
  if (['plans', 'events', 'reminders', 'tasks', 'taskLists', 'timetables'].includes(table)) {
    query.couple = {};
    query.createdBy = {};
  }
  if (table === 'tasks') query.list = {};
  if (table === 'tasks' || table === 'reminders') {
    query.assignedTo = {};
    query.completedBy = {};
  }
  if (table === 'timetableItems') {
    query.couple = {};
    query.timetable = {};
  }
  if (['journalEntries', 'checkIns'].includes(table)) {
    query.couple = {};
    query.author = {};
  }
  if (table === 'memories') {
    query.space = {};
    query.author = {};
  }
  if (table === 'memoryAttachments') query.memory = {};
  if (table === 'mediaQuotaUsage') query.space = {};
  if (table === 'devices') query.user = {};
  return query;
}

function idsForFixture(fixtureValue) {
  const ids = {
    $users: Object.values(fixtureValue.users).map((item) => item.id),
    spaces: Object.values(fixtureValue.spaces).map((item) => item.id),
    memberships: fixtureValue.memberships.map((item) => item.id),
  };
  for (const item of fixtureValue.rows) {
    ids[item.table] ??= [];
    ids[item.table].push(item.id);
  }
  return ids;
}

function idWhere(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return { id: '__none__' };
  if (ids.length === 1) return { id: ids[0] };
  return { or: ids.map((idValue) => ({ id: idValue })) };
}

function validateFixture(fixtureValue) {
  const errors = [];
  const users = Object.entries(fixtureValue.users);
  const spaces = Object.values(fixtureValue.spaces);

  for (const [label, userValue] of users) {
    const baseSpaceKey = fixtureValue.baseSpaceByUser[label];
    const baseSpace = fixtureValue.spaces[baseSpaceKey];
    if (!baseSpace) errors.push(`${label} has no base solo space mapping`);
    if (baseSpace?.kind !== 'solo') errors.push(`${label} base space is not solo`);
    const baseMembership = fixtureValue.memberships.find(
      (item) => item.userId === userValue.id && item.spaceId === baseSpace?.id && item.role === 'owner',
    );
    if (!baseMembership) errors.push(`${label} has no owner membership in base solo space`);
  }

  assertMembershipCount(fixtureValue, 'pending_pair_invite', 1, errors);
  assertMembershipCount(fixtureValue, 'pair_shared', 2, errors);
  assertMembershipCount(fixtureValue, 'crew_shared', 3, errors);
  if (!fixtureValue.spaces.pending_pair_invite.inviteCode) {
    errors.push('pending pair invite has no invite code');
  }
  if (fixtureValue.spaces.pair_shared.inviteCode !== null) {
    errors.push('joined pair fixture should have consumed inviteCode');
  }
  if (fixtureValue.spaces.crew_shared.kind !== 'crew') {
    errors.push('crew fixture is not crew kind');
  }

  for (const rowValue of fixtureValue.rows) {
    const owner = rowValue.meta?.owner;
    if (rowValue.meta?.scope === 'private' && owner) {
      const baseSpace = fixtureValue.spaces[fixtureValue.baseSpaceByUser[userLabelForId(fixtureValue, owner)]];
      const linkedSpace = rowValue.links.couple ?? rowValue.links.space ?? rowValue.meta?.spaceId;
      if (linkedSpace && linkedSpace !== baseSpace?.id) {
        errors.push(`${rowValue.table}.${rowValue.label} is private but not linked to owner's base solo space`);
      }
    }
    if (rowValue.meta?.scope === 'shared') {
      const linkedSpace = rowValue.links.couple ?? rowValue.links.space ?? rowValue.meta?.spaceId;
      if (linkedSpace && !sharedSpaceIds(fixtureValue).has(linkedSpace)) {
        errors.push(`${rowValue.table}.${rowValue.label} is shared but not linked to a shared space`);
      }
    }
    if (rowValue.table === 'memories' && rowValue.payload.isPrivate && rowValue.payload.notifyMembers !== false) {
      errors.push(`${rowValue.label} is private memory but notifyMembers is not false`);
    }
    if (rowValue.table === 'memoryAttachments') {
      const expectedPrefix = `users/${rowValue.meta.owner}/spaces/${rowValue.meta.spaceId}/`;
      if (!rowValue.payload.mediaPath?.startsWith(expectedPrefix)) {
        errors.push(`${rowValue.label} mediaPath is not owner/space scoped`);
      }
    }
  }
  validateChildSpaceLinks(fixtureValue, errors);
  validateLinkedUserSpaceLinks(fixtureValue, errors);
  validateDeviceRows(fixtureValue, errors);

  if (spaces.some((space) => space.kind === 'solo' && space.inviteCode)) {
    errors.push('solo spaces must not have invite codes');
  }
  validateMediaQuotaRows(fixtureValue, errors);

  return { ok: errors.length === 0, errors };
}

function validateChildSpaceLinks(fixtureValue, errors) {
  const rowsById = new Map(fixtureValue.rows.map((rowValue) => [rowValue.id, rowValue]));
  for (const rowValue of fixtureValue.rows) {
    if (rowValue.table === 'tasks' && rowValue.links.list) {
      const list = rowsById.get(rowValue.links.list);
      if (!list) {
        errors.push(`${rowValue.table}.${rowValue.label} links missing task list`);
      } else if (list.links.couple !== rowValue.links.couple) {
        errors.push(`${rowValue.table}.${rowValue.label} list space mismatch`);
      }
    }
    if (rowValue.table === 'timetableItems') {
      const timetable = rowsById.get(rowValue.links.timetable);
      if (!timetable) {
        errors.push(`${rowValue.table}.${rowValue.label} links missing timetable`);
      } else if (timetable.links.couple !== rowValue.links.couple) {
        errors.push(`${rowValue.table}.${rowValue.label} timetable space mismatch`);
      }
    }
  }
}

function validateLinkedUserSpaceLinks(fixtureValue, errors) {
  const membershipSpacesByUser = new Map();
  for (const membershipValue of fixtureValue.memberships) {
    if (!membershipSpacesByUser.has(membershipValue.userId)) {
      membershipSpacesByUser.set(membershipValue.userId, new Set());
    }
    membershipSpacesByUser.get(membershipValue.userId).add(membershipValue.spaceId);
  }

  for (const rowValue of fixtureValue.rows) {
    const spaceId = rowValue.links.couple ?? rowValue.links.space ?? rowValue.meta?.spaceId;
    if (!spaceId) continue;
    for (const link of ['createdBy', 'author', 'addedBy', 'assignedTo', 'completedBy']) {
      const userId = rowValue.links[link];
      if (!userId) continue;
      if (!membershipSpacesByUser.get(userId)?.has(spaceId)) {
        errors.push(`${rowValue.table}.${rowValue.label}.${link} is not a member of the linked space`);
      }
    }
  }
}

function validateMediaQuotaRows(fixtureValue, errors) {
  const quotaRows = fixtureValue.rows.filter((rowValue) => rowValue.table === 'mediaQuotaUsage');
  const quotaRowsBySpace = new Map();
  for (const quotaRow of quotaRows) {
    const spaceId = quotaRow.links.space;
    if (!spaceId) {
      errors.push(`${quotaRow.label} quota row has no space link`);
      continue;
    }
    if (quotaRowsBySpace.has(spaceId)) {
      errors.push(`${spaceId} has duplicate media quota rows`);
      continue;
    }
    quotaRowsBySpace.set(spaceId, quotaRow);
  }

  const expectedBytesBySpace = mediaAttachmentBytesBySpace(fixtureValue.spaces, fixtureValue.rows);
  for (const space of Object.values(fixtureValue.spaces)) {
    const quotaRow = quotaRowsBySpace.get(space.id);
    if (!quotaRow) {
      errors.push(`${space.label} has no media quota row`);
      continue;
    }
    const expectedBytes = expectedBytesBySpace.get(space.id) ?? 0;
    if (quotaRow.payload.bytesUsed !== expectedBytes) {
      errors.push(`${quotaRow.label} quota bytes mismatch: expected ${expectedBytes}, got ${quotaRow.payload.bytesUsed}`);
    }
  }
}

function validateDeviceRows(fixtureValue, errors) {
  const validPlatforms = new Set(['ios', 'android']);
  const devicesByUser = new Map();
  for (const rowValue of fixtureValue.rows) {
    if (rowValue.table !== 'devices') continue;
    const userId = rowValue.links.user;
    if (!userId) {
      errors.push(`${rowValue.label} device has no user link`);
      continue;
    }
    if (rowValue.meta?.owner !== userId) {
      errors.push(`${rowValue.label} device owner metadata does not match linked user`);
    }
    if (typeof rowValue.payload.expoPushToken !== 'string' || !rowValue.payload.expoPushToken.startsWith('ExponentPushToken[')) {
      errors.push(`${rowValue.label} device has invalid Expo push token`);
    }
    if (!validPlatforms.has(rowValue.payload.platform)) {
      errors.push(`${rowValue.label} device has invalid platform`);
    }
    devicesByUser.set(userId, rowValue);
  }

  for (const spaceKey of ['pair_shared', 'crew_shared']) {
    const spaceId = fixtureValue.spaces[spaceKey]?.id;
    const members = fixtureValue.memberships.filter((membershipValue) => membershipValue.spaceId === spaceId);
    for (const membershipValue of members) {
      if (!devicesByUser.has(membershipValue.userId)) {
        errors.push(`${spaceKey} member ${membershipValue.userId} has no device row`);
      }
    }
  }
}

function mediaAttachmentBytesBySpace(spaces, rows) {
  const result = new Map(Object.values(spaces).map((space) => [space.id, 0]));
  for (const rowValue of rows) {
    if (rowValue.table !== 'memoryAttachments') continue;
    const spaceId = rowValue.meta?.spaceId;
    if (!spaceId) continue;
    result.set(spaceId, (result.get(spaceId) ?? 0) + (rowValue.payload.mediaSize ?? 0));
  }
  return result;
}

function validateRemoteFixture(expected, remote) {
  const errors = [];
  const expectedIds = idsForFixture(expected);

  for (const [table, ids] of Object.entries(expectedIds)) {
    const rows = remote?.[table] ?? [];
    const actualIds = new Set(rows.map((item) => item.id));
    for (const idValue of ids) {
      if (!actualIds.has(idValue)) errors.push(`missing ${table}.${idValue}`);
    }
  }

  for (const [label, userValue] of Object.entries(expected.users)) {
    const actual = remote?.$users?.find((item) => item.id === userValue.id);
    if (actual) {
      comparePayloadFields(
        errors,
        `$users.${label}`,
        {
          email: userValue.email,
          displayName: userValue.displayName,
          createdAt: userValue.createdAt,
        },
        actual,
      );
    }
    const expectedBaseId = expected.spaces[expected.baseSpaceByUser[label]]?.id;
    const actualBaseId = firstRel(actual?.baseSoloSpace)?.id;
    if (actualBaseId !== expectedBaseId) {
      errors.push(`${label} baseSoloSpace mismatch: expected ${expectedBaseId}, got ${actualBaseId}`);
    }
  }

  for (const [label, spaceValue] of Object.entries(expected.spaces)) {
    const actual = remote?.spaces?.find((item) => item.id === spaceValue.id);
    if (!actual) continue;
    comparePayloadFields(
      errors,
      `spaces.${label}`,
      {
        kind: spaceValue.kind,
        name: spaceValue.name,
        enabledFeatures: spaceValue.enabledFeatures,
        inviteCode: spaceValue.inviteCode ?? null,
        createdAt: spaceValue.createdAt,
        updatedAt: spaceValue.updatedAt,
      },
      actual,
    );
    const actualCreatedById = firstRel(actual.createdBy)?.id;
    if (actualCreatedById !== spaceValue.createdBy) {
      errors.push(`spaces.${label}.createdBy mismatch: expected ${spaceValue.createdBy}, got ${actualCreatedById}`);
    }
  }

  for (const membershipValue of expected.memberships) {
    const actual = remote?.memberships?.find((item) => item.id === membershipValue.id);
    if (!actual) continue;
    comparePayloadFields(
      errors,
      `memberships.${membershipValue.id}`,
      {
        role: membershipValue.role,
        joinedAt: membershipValue.joinedAt,
      },
      actual,
    );
    for (const [link, expectedId] of Object.entries({ user: membershipValue.userId, space: membershipValue.spaceId })) {
      const actualId = firstRel(actual[link])?.id;
      if (actualId !== expectedId) {
        errors.push(`memberships.${membershipValue.id}.${link} mismatch: expected ${expectedId}, got ${actualId}`);
      }
    }
  }

  for (const rowValue of expected.rows) {
    const actual = remote?.[rowValue.table]?.find((item) => item.id === rowValue.id);
    if (!actual) continue;
    comparePayloadFields(errors, `${rowValue.table}.${rowValue.label}`, rowValue.payload, actual);
    if (rowValue.table === 'mediaQuotaUsage') {
      if (!Array.isArray(actual.space) || actual.space.length === 0) {
        errors.push(`mediaQuotaUsage.${rowValue.label}.space not returned from fixture query`);
      }
      continue;
    }
    for (const [link, expectedId] of Object.entries(rowValue.links)) {
      const actualId = firstRel(actual[link])?.id;
      if (actualId !== expectedId) {
        errors.push(`${rowValue.table}.${rowValue.label}.${link} mismatch: expected ${expectedId}, got ${actualId}`);
      }
    }
    if (rowValue.table === 'memoryAttachments' && actual.mediaPath !== rowValue.payload.mediaPath) {
      errors.push(`${rowValue.label} mediaPath mismatch`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function comparePayloadFields(errors, label, expectedPayload, actualPayload) {
  for (const [field, expectedValue] of Object.entries(expectedPayload)) {
    const actualValue = actualPayload?.[field];
    if (payloadValuesEqual(actualValue, expectedValue)) continue;
    errors.push(
      `${label}.${field} mismatch: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`,
    );
  }
}

function payloadValuesEqual(actualValue, expectedValue) {
  if (Array.isArray(expectedValue) || (expectedValue && typeof expectedValue === 'object')) {
    return JSON.stringify(actualValue) === JSON.stringify(expectedValue);
  }
  return actualValue === expectedValue;
}

function assertMembershipCount(fixtureValue, spaceKey, expectedCount, errors) {
  const spaceId = fixtureValue.spaces[spaceKey]?.id;
  const count = fixtureValue.memberships.filter((item) => item.spaceId === spaceId).length;
  if (count !== expectedCount) errors.push(`${spaceKey} expected ${expectedCount} memberships, got ${count}`);
}

function sharedSpaceIds(fixtureValue) {
  return new Set(
    Object.values(fixtureValue.spaces)
      .filter((space) => space.kind === 'pair' || space.kind === 'couple' || space.kind === 'crew')
      .map((space) => space.id),
  );
}

function userLabelForId(fixtureValue, userId) {
  return Object.entries(fixtureValue.users).find(([, userValue]) => userValue.id === userId)?.[0] ?? null;
}

function countFixture(fixtureValue) {
  return {
    users: Object.keys(fixtureValue.users).length,
    spaces: Object.keys(fixtureValue.spaces).length,
    memberships: fixtureValue.memberships.length,
    rows: fixtureValue.rows.length,
  };
}

function countRemote(remote) {
  const result = {};
  for (const [key, value] of Object.entries(remote ?? {})) {
    result[key] = Array.isArray(value) ? value.length : 0;
  }
  return result;
}

async function withStagingDb(callback) {
  loadDotEnvFiles();
  const appId = process.env.EXPO_PUBLIC_INSTANT_APP_ID;
  const adminToken = process.env.INSTANT_ADMIN_TOKEN;
  const envName = process.env.PACTO_QA_ENV;
  const allowWrites = process.env.PACTO_QA_ALLOW_STAGING_WRITES;
  const confirmedAppId = process.env.PACTO_QA_CONFIRM_APP_ID;

  if (!appId || !adminToken) {
    throw new Error('Missing EXPO_PUBLIC_INSTANT_APP_ID or INSTANT_ADMIN_TOKEN.');
  }
  if (envName !== 'staging') {
    throw new Error('Refusing backend QA without PACTO_QA_ENV=staging.');
  }
  if (confirmedAppId !== appId) {
    throw new Error('Refusing backend QA unless PACTO_QA_CONFIRM_APP_ID exactly matches EXPO_PUBLIC_INSTANT_APP_ID.');
  }
  if (command === 'apply' && allowWrites !== '1') {
    throw new Error('Refusing staging writes without PACTO_QA_ALLOW_STAGING_WRITES=1.');
  }

  const db = init({ appId, adminToken });
  await callback(db, { appId });
}

function writeEvidenceFile(prefix, runIdValue, result) {
  if (!writeEvidence) return;
  const dir = join(process.cwd(), 'docs/qa/evidence');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${prefix}-${runIdValue}.json`), `${JSON.stringify(result, null, 2)}\n`);
}

function safetyText() {
  return [
    'Default describe/validate modes do not touch InstantDB.',
    'Backend verify/apply require PACTO_QA_ENV=staging and PACTO_QA_CONFIRM_APP_ID matching EXPO_PUBLIC_INSTANT_APP_ID.',
    'Apply additionally requires PACTO_QA_ALLOW_STAGING_WRITES=1.',
  ];
}

function qaId(runIdValue, table, label) {
  const seed = `${normalizeRunId(runIdValue)}:${table}:${label}`;
  const hash = createHash('sha256').update(seed).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function inviteCode(runIdValue, prefix) {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const input = `${prefix}:${normalizeRunId(runIdValue)}`;
  let hash = 2166136261;
  for (const char of input) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[hash % alphabet.length];
    hash = Math.imul(hash >>> 1, 2246822519) >>> 0;
  }
  return code;
}

function normalizeRunId(value) {
  return String(value ?? 'manual')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
}

function optionValue(name) {
  const index = RAW_ARGS.indexOf(name);
  if (index === -1) return null;
  return RAW_ARGS[index + 1] ?? null;
}

function firstRel(value) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function loadDotEnvFiles() {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, 'utf8');
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
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function handleFatal(error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
