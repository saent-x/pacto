import { describe, expect, it } from 'vitest';

import { planBaseSoloBackfill } from '@/src/lib/base-solo-backfill';

describe('base solo backfill planner', () => {
  it('creates and links a canonical solo space when a user has no solo base', () => {
    const plan = planBaseSoloBackfill({
      users: [{ id: 'user-1', email: 'me@pacto.app' }],
      memberships: [
        {
          id: 'shared-membership',
          user: { id: 'user-1' },
          space: { id: 'shared-1', kind: 'pair' },
        },
      ],
      privateRowsByUser: { 'user-1': {} },
      makeId: () => 'new-id',
      now: 123,
    });

    expect(plan.summary).toMatchObject({
      usersScanned: 1,
      soloSpacesCreated: 1,
      mediaQuotaRowsCreated: 1,
      baseLinksCreated: 1,
      membershipsCreated: 1,
      privateRowsRelinked: 0,
    });
    expect(plan.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: 'spaces', entityId: 'new-id', action: 'createSolo' }),
        expect.objectContaining({ table: 'mediaQuotaUsage', action: 'createMediaQuotaUsage' }),
        expect.objectContaining({ table: 'memberships', entityId: 'new-id', action: 'createSoloMembership' }),
        { table: '$users', entityId: 'user-1', action: 'linkBaseSoloSpace', links: { baseSoloSpace: 'new-id' } },
      ]),
    );
  });

  it('uses an existing owned solo membership and relinks private shared rows idempotently', () => {
    const plan = planBaseSoloBackfill({
      users: [{ id: 'user-1', email: 'me@pacto.app' }],
      memberships: [
        {
          id: 'solo-membership',
          role: 'owner',
          user: { id: 'user-1' },
          space: { id: 'solo-1', kind: 'solo' },
        },
        {
          id: 'shared-membership',
          user: { id: 'user-1' },
          space: { id: 'shared-1', kind: 'pair' },
        },
      ],
      privateRowsByUser: {
        'user-1': {
          journalEntries: [{ id: 'journal-1', couple: { id: 'shared-1' } }],
          memories: [{ id: 'memory-1', space: { id: 'shared-1' } }],
          plans: [{ id: 'already-solo', couple: { id: 'solo-1' } }],
        },
      },
      makeId: () => 'unused',
      now: 123,
    });

    expect(plan.summary).toMatchObject({
      soloSpacesCreated: 0,
      baseLinksCreated: 1,
      membershipsCreated: 0,
      privateRowsRelinked: 2,
    });
    expect(plan.ops).toEqual(
      expect.arrayContaining([
        { table: '$users', entityId: 'user-1', action: 'linkBaseSoloSpace', links: { baseSoloSpace: 'solo-1' } },
        { table: 'journalEntries', entityId: 'journal-1', action: 'relinkPrivateRow', links: { couple: 'solo-1' } },
        { table: 'memories', entityId: 'memory-1', action: 'relinkPrivateRow', links: { space: 'solo-1' } },
      ]),
    );
    expect(plan.ops).not.toContainEqual(
      expect.objectContaining({ table: 'plans', entityId: 'already-solo' }),
    );
  });

  it('repairs a baseSoloSpace link that points at a shared space', () => {
    const plan = planBaseSoloBackfill({
      users: [
        {
          id: 'user-1',
          email: 'me@pacto.app',
          baseSoloSpace: { id: 'shared-1' },
        },
      ],
      memberships: [
        {
          id: 'shared-membership',
          user: { id: 'user-1' },
          space: { id: 'shared-1', kind: 'pair' },
        },
        {
          id: 'solo-membership',
          role: 'owner',
          user: { id: 'user-1' },
          space: { id: 'solo-1', kind: 'solo' },
        },
      ],
      privateRowsByUser: {
        'user-1': {
          journalEntries: [{ id: 'journal-1', couple: { id: 'shared-1' } }],
          memories: [{ id: 'memory-1', space: { id: 'shared-1' } }],
        },
      },
      makeId: () => 'unused',
      now: 123,
    });

    expect(plan.summary).toMatchObject({
      soloSpacesCreated: 0,
      baseLinksCreated: 1,
      membershipsCreated: 0,
      privateRowsRelinked: 2,
    });
    expect(plan.ops).toEqual(
      expect.arrayContaining([
        { table: '$users', entityId: 'user-1', action: 'linkBaseSoloSpace', links: { baseSoloSpace: 'solo-1' } },
        { table: 'journalEntries', entityId: 'journal-1', action: 'relinkPrivateRow', links: { couple: 'solo-1' } },
        { table: 'memories', entityId: 'memory-1', action: 'relinkPrivateRow', links: { space: 'solo-1' } },
      ]),
    );
  });
});
