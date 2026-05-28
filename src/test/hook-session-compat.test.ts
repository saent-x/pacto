import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/lib/session', () => ({
  useSession: vi.fn(),
}));

import { buildHookSession } from '@/src/hooks/useSession';
import type { Session } from '@/src/lib/session';

const isFeatureEnabled = () => true;

function baseSession(overrides: Partial<Session> = {}): Session {
  return {
    status: 'ready',
    user: { id: 'me', email: 'me@pacto.app', displayName: 'Me', avatarUrl: null },
    space: {
      id: 'space-1',
      kind: 'pair',
      kindRaw: 'pair',
      name: null,
      inviteCode: null,
      plan: null,
      enabledFeatures: ['tasks'],
    },
    membership: { id: 'membership-1', role: 'owner', lastNotificationsReadAt: null },
    soloSpace: {
      id: 'solo-1',
      kind: 'solo',
      kindRaw: 'solo',
      name: null,
      inviteCode: null,
      plan: null,
      enabledFeatures: ['tasks'],
    },
    soloMembership: { id: 'solo-membership-1', role: 'owner', lastNotificationsReadAt: null },
    sharedSpace: null,
    sharedMembership: null,
    personalSpaceId: 'solo-1',
    sharedSpaceId: null,
    partner: null,
    members: [],
    mode: 'pair',
    enabledFeatures: ['tasks'],
    isFeatureEnabled,
    isSolo: false,
    isPair: true,
    isCrew: false,
    isCouple: true,
    ...overrides,
  };
}

describe('hook session compatibility adapter', () => {
  it('derives crew member count from every non-self member plus the current user', () => {
    const session = buildHookSession(
      baseSession({
        space: {
          id: 'crew-1',
          kind: 'crew',
          kindRaw: 'crew',
          name: 'Studio',
          inviteCode: null,
          plan: null,
          enabledFeatures: ['tasks'],
        },
        partner: { id: 'm1', email: 'm1@pacto.app', displayName: 'Mina', avatarUrl: null },
        members: [
          { id: 'm1', email: 'm1@pacto.app', displayName: 'Mina', avatarUrl: null },
          { id: 'm2', email: 'm2@pacto.app', displayName: 'Noor', avatarUrl: null },
          { id: 'm3', email: 'm3@pacto.app', displayName: 'Ren', avatarUrl: null },
        ],
        mode: 'crew',
        isPair: false,
        isCrew: true,
        isCouple: false,
      }),
    );

    expect(session.activeCouple?.couple.id).toBe('crew-1');
    expect(session.activeCouple?.couple.kind).toBe('crew');
    expect(session.activeCouple?.memberCount).toBe(4);
    expect(session.activeCouple?.partner?.displayName).toBe('Mina');
  });

  it('keeps solo spaces at one member with no legacy partner', () => {
    const session = buildHookSession(
      baseSession({
        space: {
          id: 'solo-1',
          kind: 'solo',
          kindRaw: 'solo',
          name: null,
          inviteCode: null,
          plan: null,
          enabledFeatures: ['tasks'],
        },
        mode: 'solo',
        isSolo: true,
        isPair: false,
        isCouple: false,
      }),
    );

    expect(session.activeCouple?.memberCount).toBe(1);
    expect(session.activeCouple?.partner).toBeNull();
  });
});
