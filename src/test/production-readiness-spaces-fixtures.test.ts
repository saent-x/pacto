import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isValidInviteCode } from '@/src/lib/invite-code';

function runFixtureScript(args: string[]) {
  const output = execFileSync(
    process.execPath,
    ['scripts/qa/spaces-fixtures.mjs', ...args],
    { encoding: 'utf8' },
  );
  return JSON.parse(output);
}

describe('production readiness Spaces fixtures', () => {
  it('validates the Solo, Pair, Crew, invite, and scoped-data matrix', () => {
    const result = runFixtureScript(['validate', '--run-id', 'test']);

    expect(result.validation).toEqual({ ok: true, errors: [] });
    expect(result.counts).toEqual({
      users: 7,
      spaces: 10,
      memberships: 13,
      rows: 70,
    });
  });

  it('seeds scoped app-data rows across Solo, Pair, and Crew accounts', () => {
    const result = runFixtureScript(['describe', '--run-id', 'test']);
    const rows = result.fixture.rows as Array<{
      table: string;
      label: string;
      payload: Record<string, unknown>;
      links: Record<string, string>;
      meta: { scope?: string };
    }>;
    const spaces = result.fixture.spaces;
    const users = result.fixture.users;
    const byLabel = new Map(rows.map((row) => [`${row.table}.${row.label}`, row]));

    const labelFor = (prefix: string, scope: 'private' | 'shared', key: string) => {
      if (key === 'timetable') return scope === 'private' ? `${prefix}_solo_timetable` : `${prefix}_shared_timetable`;
      return `${prefix}_${scope}_${key}`;
    };

    const scopedTables = [
      ['plans', 'plan'],
      ['journalEntries', 'journal'],
      ['checkIns', 'checkin'],
      ['timetables', 'timetable'],
      ['memories', 'memory'],
    ] as const;

    for (const [table, key] of scopedTables) {
      const soloPrivate = byLabel.get(`${table}.${labelFor('solo_owner', 'private', key)}`);
      expect(soloPrivate?.links.couple ?? soloPrivate?.links.space).toBe(spaces.solo_owner_base.id);
      expect(soloPrivate?.meta.scope).toBe('private');
      expect(byLabel.has(`${table}.${labelFor('solo_owner', 'shared', key)}`)).toBe(false);

      const pairPrivate = byLabel.get(`${table}.${labelFor('pair_owner', 'private', key)}`);
      expect(pairPrivate?.links.couple ?? pairPrivate?.links.space).toBe(spaces.pair_owner_base.id);
      expect(pairPrivate?.meta.scope).toBe('private');
      const pairShared = byLabel.get(`${table}.${labelFor('pair_owner', 'shared', key)}`);
      expect(pairShared?.links.couple ?? pairShared?.links.space).toBe(spaces.pair_shared.id);
      expect(pairShared?.meta.scope).toBe('shared');

      const crewPrivate = byLabel.get(`${table}.${labelFor('crew_owner', 'private', key)}`);
      expect(crewPrivate?.links.couple ?? crewPrivate?.links.space).toBe(spaces.crew_owner_base.id);
      expect(crewPrivate?.meta.scope).toBe('private');
      const crewShared = byLabel.get(`${table}.${labelFor('crew_owner', 'shared', key)}`);
      expect(crewShared?.links.couple ?? crewShared?.links.space).toBe(spaces.crew_shared.id);
      expect(crewShared?.meta.scope).toBe('shared');
    }

    expect(byLabel.get('taskLists.solo_owner_private_task_list')?.links.couple).toBe(spaces.solo_owner_base.id);
    expect(byLabel.get('tasks.solo_owner_private_task')?.links.couple).toBe(spaces.solo_owner_base.id);
    expect(byLabel.get('events.solo_owner_private_event')?.links.couple).toBe(spaces.solo_owner_base.id);
    expect(byLabel.get('taskLists.pair_owner_private_task_list')?.links.couple).toBe(spaces.pair_owner_base.id);
    expect(byLabel.get('tasks.pair_owner_private_task')?.links.couple).toBe(spaces.pair_owner_base.id);
    expect(byLabel.get('events.pair_owner_private_event')?.links.couple).toBe(spaces.pair_owner_base.id);
    expect(byLabel.get('taskLists.crew_owner_private_task_list')?.links.couple).toBe(spaces.crew_owner_base.id);
    expect(byLabel.get('tasks.crew_owner_private_task')?.links.couple).toBe(spaces.crew_owner_base.id);
    expect(byLabel.get('events.crew_owner_private_event')?.links.couple).toBe(spaces.crew_owner_base.id);
    expect(byLabel.get('taskLists.crew_shared_task_list')?.links.couple).toBe(spaces.crew_shared.id);
    expect(byLabel.get('tasks.crew_shared_task')?.links.couple).toBe(spaces.crew_shared.id);
    expect(byLabel.get('tasks.pair_shared_task')?.links).toMatchObject({
      couple: spaces.pair_shared.id,
      createdBy: users.pair_owner.id,
      assignedTo: users.pair_member.id,
      completedBy: users.pair_member.id,
    });
    expect(byLabel.get('tasks.pair_shared_task')?.payload.isCompleted).toBe(true);
    expect(byLabel.get('tasks.crew_shared_task')?.links).toMatchObject({
      couple: spaces.crew_shared.id,
      createdBy: users.crew_owner.id,
      assignedTo: users.crew_member_a.id,
      completedBy: users.crew_member_b.id,
    });
    expect(byLabel.get('tasks.crew_shared_task')?.payload.isCompleted).toBe(true);
    expect(byLabel.get('timetableItems.solo_owner_solo_timetable_item')?.links).toMatchObject({
      couple: spaces.solo_owner_base.id,
      timetable: byLabel.get('timetables.solo_owner_solo_timetable')?.id,
    });
    expect(byLabel.get('timetableItems.pair_owner_solo_timetable_item')?.links).toMatchObject({
      couple: spaces.pair_owner_base.id,
      timetable: byLabel.get('timetables.pair_owner_solo_timetable')?.id,
    });
    expect(byLabel.get('timetableItems.pair_owner_shared_timetable_item')?.links).toMatchObject({
      couple: spaces.pair_shared.id,
      timetable: byLabel.get('timetables.pair_owner_shared_timetable')?.id,
    });
    expect(byLabel.get('timetableItems.crew_owner_solo_timetable_item')?.links).toMatchObject({
      couple: spaces.crew_owner_base.id,
      timetable: byLabel.get('timetables.crew_owner_solo_timetable')?.id,
    });
    expect(byLabel.get('timetableItems.crew_owner_shared_timetable_item')?.links).toMatchObject({
      couple: spaces.crew_shared.id,
      timetable: byLabel.get('timetables.crew_owner_shared_timetable')?.id,
    });
    expect(byLabel.get('reminders.solo_owner_private_reminder')?.links.couple).toBe(spaces.solo_owner_base.id);
    expect(byLabel.get('reminders.solo_owner_private_reminder')?.meta.scope).toBe('private');
    expect(byLabel.get('reminders.pair_owner_private_reminder')?.links.couple).toBe(spaces.pair_owner_base.id);
    expect(byLabel.get('reminders.pair_owner_private_reminder')?.meta.scope).toBe('private');
    expect(byLabel.get('reminders.crew_owner_private_reminder')?.links.couple).toBe(spaces.crew_owner_base.id);
    expect(byLabel.get('reminders.crew_owner_private_reminder')?.meta.scope).toBe('private');
    expect(byLabel.get('reminders.pair_shared_reminder')?.links).toMatchObject({
      couple: spaces.pair_shared.id,
      createdBy: users.pair_owner.id,
      assignedTo: users.pair_member.id,
      completedBy: users.pair_member.id,
    });
    expect(byLabel.get('reminders.pair_shared_reminder')?.payload.isCompleted).toBe(true);
    expect(byLabel.get('reminders.crew_shared_reminder')?.links.couple).toBe(spaces.crew_shared.id);
    expect(byLabel.get('reminders.crew_shared_reminder')?.links).toMatchObject({
      couple: spaces.crew_shared.id,
      createdBy: users.crew_owner.id,
      assignedTo: users.crew_member_a.id,
      completedBy: users.crew_member_b.id,
    });
    expect(byLabel.get('reminders.crew_shared_reminder')?.payload.isCompleted).toBe(true);
    expect(byLabel.get('events.crew_shared_event')?.links.couple).toBe(spaces.crew_shared.id);
  });

  it('seeds media quota rows for every space and matches attachment bytes by space', () => {
    const result = runFixtureScript(['describe', '--run-id', 'test']);
    const rows = result.fixture.rows as Array<{
      table: string;
      label: string;
      payload: { bytesUsed?: number; mediaSize?: number };
      links: Record<string, string>;
      meta: { spaceId?: string };
    }>;
    const spaceIds = new Set(
      Object.values(result.fixture.spaces as Record<string, { id: string }>).map((space) => space.id),
    );
    const quotaRows = rows.filter((row) => row.table === 'mediaQuotaUsage');
    const attachmentBytesBySpace = new Map([...spaceIds].map((spaceId) => [spaceId, 0]));

    for (const row of rows) {
      if (row.table !== 'memoryAttachments') continue;
      const spaceId = row.meta.spaceId;
      expect(spaceId).toBeTruthy();
      attachmentBytesBySpace.set(
        spaceId!,
        (attachmentBytesBySpace.get(spaceId!) ?? 0) + (row.payload.mediaSize ?? 0),
      );
    }

    expect(quotaRows).toHaveLength(spaceIds.size);
    for (const quotaRow of quotaRows) {
      const spaceId = quotaRow.links.space;
      expect(spaceIds.has(spaceId)).toBe(true);
      expect(quotaRow.payload.bytesUsed).toBe(attachmentBytesBySpace.get(spaceId) ?? 0);
    }
  });

  it('seeds push device rows for every shared-space member used by native notification QA', () => {
    const result = runFixtureScript(['describe', '--run-id', 'test']);
    const rows = result.fixture.rows as Array<{
      table: string;
      label: string;
      payload: { expoPushToken?: string; platform?: string };
      links: Record<string, string>;
    }>;
    const users = result.fixture.users;
    const deviceRows = rows.filter((row) => row.table === 'devices');
    const devicesByOwner = new Map(deviceRows.map((row) => [row.links.user, row]));

    for (const userKey of [
      'pair_owner',
      'pair_member',
      'crew_owner',
      'crew_member_a',
      'crew_member_b',
    ] as const) {
      const device = devicesByOwner.get(users[userKey].id);
      expect(device, `${userKey} should have a QA push device`).toBeTruthy();
      expect(device?.payload.expoPushToken).toMatch(/^ExponentPushToken\[qa-test/);
      expect(['ios', 'android']).toContain(device?.payload.platform);
    }
  });

  it('defaults to a non-writing fixture description with staging safeguards', () => {
    const result = runFixtureScript(['describe', '--run-id', 'test']);

    expect(result.mode).toBe('describe');
    expect(result.safety.join('\n')).toContain('COUPL_QA_ENV=staging');
    expect(result.safety.join('\n')).toContain('COUPL_QA_ALLOW_STAGING_WRITES=1');
    expect(isValidInviteCode(result.fixture.spaces.pending_pair_invite.inviteCode)).toBe(true);
    expect(result.fixture.spaces.pair_shared.inviteCode).toBeNull();
  });

  it('generates pending invite codes that the app invite screen accepts', () => {
    const result = runFixtureScript(['describe', '--run-id', 'ci']);
    const code = result.fixture.spaces.pending_pair_invite.inviteCode;

    expect(code).toHaveLength(6);
    expect(isValidInviteCode(code)).toBe(true);
  });

  it('compares remote staging payloads, not just row ids and links', () => {
    const source = readFileSync('scripts/qa/spaces-fixtures.mjs', 'utf8');

    expect(source).toContain('function comparePayloadFields(');
    expect(source).toMatch(/comparePayloadFields\(\s*errors,\s*`\$users\.\$\{label\}`/);
    expect(source).toMatch(/comparePayloadFields\(\s*errors,\s*`spaces\.\$\{label\}`/);
    expect(source).toMatch(/comparePayloadFields\(\s*errors,\s*`memberships\.\$\{membershipValue\.id\}`/);
    expect(source).toContain('comparePayloadFields(errors, `${rowValue.table}.${rowValue.label}`');
  });
});
