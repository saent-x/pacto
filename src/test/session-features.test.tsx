import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/lib/db', () => ({
  db: {
    useAuth: vi.fn(),
    useQuery: vi.fn(),
  },
}));

import {
  buildSessionFeatureState,
  buildSessionFromQueryResult,
  normalizeMode,
} from '@/src/lib/session';

describe('session feature state', () => {
  it('treats stale couple rows with no other members as solo', () => {
    expect(normalizeMode('couple', 0)).toBe('solo');
    expect(normalizeMode('pair', 0)).toBe('solo');
  });

  it('derives shared mode from remaining member count for stale rows', () => {
    expect(normalizeMode('couple', 1)).toBe('pair');
    expect(normalizeMode('crew', 1)).toBe('pair');
    expect(normalizeMode('crew', 2)).toBe('crew');
  });

  it('uses every supported feature when stored features are missing', () => {
    expect(buildSessionFeatureState(undefined, 'solo').enabledFeatures).toEqual([
      'tasks',
      'calendar',
      'memoryFeed',
      'journal',
      'checkins',
      'recurring',
      'timetable',
      'goals',
    ]);
    expect(buildSessionFeatureState(null, 'pair').enabledFeatures).toEqual([
      'tasks',
      'calendar',
      'memoryFeed',
      'journal',
      'checkins',
      'recurring',
      'timetable',
      'goals',
    ]);
    expect(buildSessionFeatureState(undefined, 'crew').enabledFeatures).toEqual([
      'tasks',
      'calendar',
      'memoryFeed',
      'recurring',
      'timetable',
      'goals',
    ]);
  });

  it('ignores legacy stored subsets and enables every supported feature', () => {
    const state = buildSessionFeatureState(
      ['vision', 'tasks', 'unknown', 'tasks', 42, 'calendar', 'legacyWishlist'],
      'crew',
    );

    expect(state.enabledFeatures).toEqual([
      'tasks',
      'calendar',
      'memoryFeed',
      'recurring',
      'timetable',
      'goals',
    ]);
  });

  it('still excludes features unsupported by the current mode', () => {
    const state = buildSessionFeatureState(
      ['journal', 'checkins', 'tasks', 'calendar', 'recurring'],
      'crew',
    );

    expect(state.enabledFeatures).toEqual([
      'tasks',
      'calendar',
      'memoryFeed',
      'recurring',
      'timetable',
      'goals',
    ]);
  });

  it('does not preserve explicitly empty legacy arrays', () => {
    const state = buildSessionFeatureState([], 'pair');

    expect(state.enabledFeatures).toEqual([
      'tasks',
      'calendar',
      'memoryFeed',
      'journal',
      'checkins',
      'recurring',
      'timetable',
      'goals',
    ]);
  });

  it('reports whether mode-supported features are enabled', () => {
    const state = buildSessionFeatureState(['calendar', 'journal', 'unknown'], 'solo');

    expect(state.isFeatureEnabled('calendar')).toBe(true);
    expect(state.isFeatureEnabled('journal')).toBe(true);
    expect(state.isFeatureEnabled('tasks')).toBe(true);
    expect(state.isFeatureEnabled('memoryFeed')).toBe(true);
  });

  it('keeps a linked solo space as the personal base while selecting the newest shared pact', () => {
    const session = buildSessionFromQueryResult({
      authLoading: false,
      queryLoading: false,
      authUser: { id: 'user-1', email: 'me@pacto.app' },
      data: {
        $users: [
          {
            id: 'user-1',
            email: 'me@pacto.app',
            displayName: 'Me',
            baseSoloSpace: [{ id: 'solo-space' }],
          },
        ],
        memberships: [
          membership('solo-membership', 'owner', 1, {
            id: 'solo-space',
            kind: 'solo',
            memberships: [{ id: 'solo-membership', user: { id: 'user-1' } }],
          }),
          membership('old-shared-membership', 'partner', 2, {
            id: 'pair-old',
            kind: 'pair',
            memberships: [{ id: 'old-shared-membership', user: { id: 'user-1' } }],
          }),
          membership('new-shared-membership', 'partner', 3, {
            id: 'crew-new',
            kind: 'crew',
            memberships: [
              { id: 'new-shared-membership', user: { id: 'user-1' } },
              { id: 'crew-member-2', user: { id: 'user-2', displayName: 'Two' } },
              { id: 'crew-member-3', user: { id: 'user-3', displayName: 'Three' } },
            ],
          }),
        ],
      },
    });

    expect(session.status).toBe('ready');
    expect(session.soloSpace?.id).toBe('solo-space');
    expect(session.soloMembership?.id).toBe('solo-membership');
    expect(session.sharedSpace?.id).toBe('crew-new');
    expect(session.sharedMembership?.id).toBe('new-shared-membership');
    expect(session.space?.id).toBe('crew-new');
    expect(session.personalSpaceId).toBe('solo-space');
    expect(session.sharedSpaceId).toBe('crew-new');
    expect(session.mode).toBe('crew');
  });

  it('does not let malformed shared membership timestamps outrank valid shared spaces', () => {
    const session = buildSessionFromQueryResult({
      authLoading: false,
      queryLoading: false,
      authUser: { id: 'user-1', email: 'me@pacto.app' },
      data: {
        $users: [
          {
            id: 'user-1',
            email: 'me@pacto.app',
            displayName: 'Me',
            baseSoloSpace: [{ id: 'solo-space' }],
          },
        ],
        memberships: [
          membership('solo-membership', 'owner', 1, {
            id: 'solo-space',
            kind: 'solo',
            memberships: [{ id: 'solo-membership', user: { id: 'user-1' } }],
          }),
          membership('malformed-shared-membership', 'partner', 'not-a-number', {
            id: 'pair-malformed',
            kind: 'pair',
            memberships: [
              { id: 'malformed-shared-membership', user: { id: 'user-1' } },
              { id: 'malformed-member-2', user: { id: 'user-2', displayName: 'Two' } },
            ],
          }),
          membership('valid-shared-membership', 'partner', 10, {
            id: 'pair-valid',
            kind: 'pair',
            memberships: [
              { id: 'valid-shared-membership', user: { id: 'user-1' } },
              { id: 'valid-member-2', user: { id: 'user-2', displayName: 'Two' } },
            ],
          }),
        ],
      },
    });

    expect(session.status).toBe('ready');
    expect(session.sharedSpace?.id).toBe('pair-valid');
    expect(session.sharedMembership?.id).toBe('valid-shared-membership');
    expect(session.space?.id).toBe('pair-valid');
  });

  it('ignores a corrupt baseSoloSpace link that points at a shared pact', () => {
    const session = buildSessionFromQueryResult({
      authLoading: false,
      queryLoading: false,
      authUser: { id: 'user-1', email: 'me@pacto.app' },
      data: {
        $users: [
          {
            id: 'user-1',
            email: 'me@pacto.app',
            displayName: 'Me',
            baseSoloSpace: [{ id: 'pair-space', kind: 'pair' }],
          },
        ],
        memberships: [
          membership('pair-membership', 'owner', 2, {
            id: 'pair-space',
            kind: 'pair',
            memberships: [
              { id: 'pair-membership', user: { id: 'user-1' } },
              { id: 'member-2', user: { id: 'user-2', displayName: 'Two' } },
            ],
          }),
          membership('solo-membership', 'owner', 1, {
            id: 'solo-space',
            kind: 'solo',
            memberships: [{ id: 'solo-membership', user: { id: 'user-1' } }],
          }),
        ],
      },
    });

    expect(session.status).toBe('ready');
    expect(session.soloSpace?.id).toBe('solo-space');
    expect(session.soloMembership?.id).toBe('solo-membership');
    expect(session.sharedSpace?.id).toBe('pair-space');
    expect(session.space?.id).toBe('pair-space');
    expect(session.personalSpaceId).toBe('solo-space');
    expect(session.sharedSpaceId).toBe('pair-space');
    expect(session.mode).toBe('pair');
  });

  it('treats a user with only a base solo membership as ready', () => {
    const session = buildSessionFromQueryResult({
      authLoading: false,
      queryLoading: false,
      authUser: { id: 'user-1', email: 'me@pacto.app' },
      data: {
        $users: [{ id: 'user-1', email: 'me@pacto.app' }],
        memberships: [
          membership('solo-membership', 'owner', 1, {
            id: 'solo-space',
            kind: 'solo',
            memberships: [{ id: 'solo-membership', user: { id: 'user-1' } }],
          }),
        ],
      },
    });

    expect(session.status).toBe('ready');
    expect(session.space?.id).toBe('solo-space');
    expect(session.soloSpace?.id).toBe('solo-space');
    expect(session.sharedSpace).toBeNull();
    expect(session.personalSpaceId).toBe('solo-space');
    expect(session.sharedSpaceId).toBeNull();
    expect(session.mode).toBe('solo');
  });

  it('treats a signed-in user with no memberships as onboarding', () => {
    const session = buildSessionFromQueryResult({
      authLoading: false,
      queryLoading: false,
      authUser: { id: 'user-1', email: 'me@pacto.app' },
      data: {
        $users: [{ id: 'user-1', email: 'me@pacto.app' }],
        memberships: [],
      },
    });

    expect(session.status).toBe('onboarding');
    expect(session.user?.id).toBe('user-1');
    expect(session.space).toBeNull();
    expect(session.personalSpaceId).toBeNull();
  });

  it('waits for the base solo space before exposing a shared pact as ready', () => {
    const session = buildSessionFromQueryResult({
      authLoading: false,
      queryLoading: false,
      authUser: { id: 'user-1', email: 'me@pacto.app' },
      data: {
        $users: [{ id: 'user-1', email: 'me@pacto.app' }],
        memberships: [
          membership('pair-membership', 'partner', 2, {
            id: 'pair-space',
            kind: 'pair',
            memberships: [
              { id: 'pair-membership', user: { id: 'user-1' } },
              { id: 'member-2', user: { id: 'user-2', displayName: 'Two' } },
            ],
          }),
        ],
      },
    });

    expect(session.status).toBe('loading');
    expect(session.space).toBeNull();
    expect(session.personalSpaceId).toBeNull();
    expect(session.sharedSpaceId).toBeNull();
  });

  it('keeps a pending one-person shared invite from switching a solo account to pair', () => {
    const session = buildSessionFromQueryResult({
      authLoading: false,
      queryLoading: false,
      authUser: { id: 'user-1', email: 'me@pacto.app' },
      data: {
        $users: [
          {
            id: 'user-1',
            email: 'me@pacto.app',
            baseSoloSpace: [{ id: 'solo-space' }],
          },
        ],
        memberships: [
          membership('solo-membership', 'owner', 1, {
            id: 'solo-space',
            kind: 'solo',
            memberships: [{ id: 'solo-membership', user: { id: 'user-1' } }],
          }),
          membership('pending-shared-membership', 'owner', 2, {
            id: 'pending-pair',
            kind: 'pair',
            inviteCode: 'WAIT99',
            memberships: [{ id: 'pending-shared-membership', user: { id: 'user-1' } }],
          }),
        ],
      },
    });

    expect(session.status).toBe('ready');
    expect(session.space?.id).toBe('solo-space');
    expect(session.sharedSpace).toBeNull();
    expect(session.sharedMembership).toBeNull();
    expect(session.sharedSpaceId).toBeNull();
    expect(session.mode).toBe('solo');
  });

  it('automatically treats a pair space as crew after a third member joins', () => {
    const session = buildSessionFromQueryResult({
      authLoading: false,
      queryLoading: false,
      authUser: { id: 'user-1', email: 'me@pacto.app' },
      data: {
        $users: [{ id: 'user-1', email: 'me@pacto.app', baseSoloSpace: [{ id: 'solo-space' }] }],
        memberships: [
          membership('solo-membership', 'owner', 1, {
            id: 'solo-space',
            kind: 'solo',
            memberships: [{ id: 'solo-membership', user: { id: 'user-1' } }],
          }),
          membership('pair-membership', 'owner', 2, {
            id: 'pair-space',
            kind: 'pair',
            memberships: [
              { id: 'pair-membership', user: { id: 'user-1' } },
              { id: 'member-2', user: { id: 'user-2', displayName: 'Two' } },
              { id: 'member-3', user: { id: 'user-3', displayName: 'Three' } },
            ],
          }),
        ],
      },
    });

    expect(session.space?.id).toBe('pair-space');
    expect(session.mode).toBe('crew');
    expect(session.sharedSpaceId).toBe('pair-space');
    expect(session.members.map((member) => member.id)).toEqual(['user-2', 'user-3']);
  });
});

function membership(id: string, role: 'owner' | 'partner', joinedAt: unknown, space: any) {
  return {
    id,
    role,
    joinedAt,
    user: { id: 'user-1', email: 'me@pacto.app', displayName: 'Me' },
    space,
  };
}
