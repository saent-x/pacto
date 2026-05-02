import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routerSpy = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('expo-router', () => ({
  useRouter: () => routerSpy,
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(async () => undefined),
  impactAsync: vi.fn(async () => undefined),
  notificationAsync: vi.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('@/src/components/ui/SheetShell', () => ({
  SheetShell: ({ children }: any) => {
    const Reactx = require('react');
    return Reactx.createElement('View', null, children);
  },
}));

vi.mock('@/src/components/ui/pacto', () => {
  const Reactx = require('react');
  return {
    Avatar: () => null,
    AvatarPair: () => null,
    CrewStack: () => null,
    Pill: ({ children }: any) => Reactx.createElement('Text', null, children),
    Card: ({ children, testID, style }: any) =>
      Reactx.createElement('View', { testID, style }, children),
  };
});

vi.mock('@/src/components/ui/Icon', () => ({
  Icon: ({ name }: any) => {
    const Reactx = require('react');
    return Reactx.createElement('Text', null, name);
  },
}));

const alertSpy = vi.hoisted(() => vi.fn());
vi.mock('react-native', async () => {
  const actual: any = await vi.importActual('react-native');
  return { ...actual, Alert: { alert: alertSpy } };
});

const themeState = vi.hoisted(() => ({
  mode: 'dark' as 'dark' | 'light',
  setMode: vi.fn(),
}));

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    mode: themeState.mode,
    setMode: themeState.setMode,
    C: {
      accent: '#E4B24A',
      accent2: '#F4A68C',
      accent3: '#B8A8E8',
      bgCard: '#1D1815',
      bgSoft: '#262019',
      inkColor: '#F5EEE3',
      ink2: '#B3A89A',
      ink3: '#80746A',
      lineColor: '#2B241E',
      error: '#E07A68',
    },
  }),
}));

const sessionState = vi.hoisted(() => ({
  status: 'ready' as const,
  user: {
    id: 'u1',
    email: 'mattia@coupl.app',
    displayName: 'Mattia',
    avatarUrl: null,
  } as any,
  space: {
    id: 's1',
    kind: 'pair' as 'solo' | 'pair' | 'crew',
    name: null,
    anniversary: '2023-12-22',
    inviteCode: 'BREAD-SILK-42',
    enabledFeatures: ['tasks', 'calendar', 'wishlist'] as string[],
  } as any,
  membership: { id: 'm1', role: 'owner' } as any,
  partner: {
    id: 'u2',
    email: 'sofia@coupl.app',
    displayName: 'Sofia',
    avatarUrl: null,
  } as any,
  members: [] as any[],
  mode: 'pair' as 'solo' | 'pair' | 'crew',
  enabledFeatures: ['tasks', 'calendar', 'wishlist'] as string[],
  isFeatureEnabled: (id: string) => sessionState.enabledFeatures.includes(id),
  isSolo: false,
  isPair: true,
  isCrew: false,
  isCouple: true,
}));

vi.mock('@/src/lib/session', () => ({
  useSession: () => sessionState,
}));

const dbSpy = vi.hoisted(() => ({
  signOut: vi.fn(async () => undefined),
}));

vi.mock('@/src/lib/db', () => ({
  db: { auth: { signOut: dbSpy.signOut } },
}));

const spaceActions = vi.hoisted(() => ({
  leaveSpace: vi.fn(async () => undefined),
  regenerateInviteCode: vi.fn(async () => 'NEW-CODE-99'),
  updateUserAvatar: vi.fn(async () => undefined),
  updateSpaceFeatures: vi.fn(async () => undefined),
}));

vi.mock('@/src/lib/space-actions', () => spaceActions);

import ProfileSheet from '@/app/sheets/profile';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const findByTestID = (root: any, id: string) =>
  root.findAll((node: any) => node.props?.testID === id)[0];

const findAllByTestID = (root: any, id: string) =>
  root.findAll((node: any) => node.props?.testID === id);

async function renderProfile() {
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(<ProfileSheet />);
    await flush();
  });
  return renderer;
}

async function press(node: any) {
  await act(async () => {
    await node.props.onPress();
    await flush();
  });
}

function resetSession({
  mode = 'pair',
  enabledFeatures = ['tasks', 'calendar', 'wishlist'],
}: {
  mode?: 'solo' | 'pair' | 'crew';
  enabledFeatures?: string[];
} = {}) {
  sessionState.status = 'ready';
  sessionState.mode = mode;
  sessionState.enabledFeatures = enabledFeatures;
  sessionState.space = {
    id: 's1',
    kind: mode,
    name: mode === 'crew' ? 'Dinner crew' : null,
    anniversary: '2023-12-22',
    inviteCode: 'BREAD-SILK-42',
    enabledFeatures,
  };
  sessionState.partner = mode === 'solo' ? null : {
    id: 'u2',
    email: 'sofia@coupl.app',
    displayName: 'Sofia',
    avatarUrl: null,
  };
  sessionState.isSolo = mode === 'solo';
  sessionState.isPair = mode === 'pair';
  sessionState.isCrew = mode === 'crew';
  sessionState.isCouple = mode === 'pair';
}

describe('profile feature toggles', () => {
  beforeEach(() => {
    resetSession();
    routerSpy.push.mockClear();
    routerSpy.replace.mockClear();
    themeState.setMode.mockClear();
    alertSpy.mockClear();
    spaceActions.leaveSpace.mockClear();
    spaceActions.regenerateInviteCode.mockClear();
    spaceActions.updateUserAvatar.mockClear();
    spaceActions.updateSpaceFeatures.mockClear();
    spaceActions.updateSpaceFeatures.mockResolvedValue(undefined);
  });

  it('toggling an enabled supported feature off persists with that id removed', async () => {
    const renderer = await renderProfile();

    await press(findByTestID(renderer.root, 'profile-feature-wishlist'));

    expect(spaceActions.updateSpaceFeatures).toHaveBeenCalledWith({
      spaceId: 's1',
      enabledFeatures: ['tasks', 'calendar'],
      mode: 'pair',
    });
    expect(findByTestID(renderer.root, 'profile-feature-state-wishlist').props.children).toBe('Off');
    act(() => renderer.unmount());
  });

  it('toggling a disabled supported feature on persists sanitized ids in registry order', async () => {
    resetSession({ enabledFeatures: ['calendar', 'tasks'] });
    const renderer = await renderProfile();

    await press(findByTestID(renderer.root, 'profile-feature-checkins'));

    expect(spaceActions.updateSpaceFeatures).toHaveBeenCalledWith({
      spaceId: 's1',
      enabledFeatures: ['tasks', 'calendar', 'checkins'],
      mode: 'pair',
    });
    act(() => renderer.unmount());
  });

  it('does not render unsupported journal or check-ins features for crew mode', async () => {
    resetSession({
      mode: 'crew',
      enabledFeatures: ['tasks', 'calendar', 'wishlist', 'memories', 'recurring', 'timetable', 'vision', 'goals'],
    });
    const renderer = await renderProfile();

    expect(findAllByTestID(renderer.root, 'profile-feature-journal')).toHaveLength(0);
    expect(findAllByTestID(renderer.root, 'profile-feature-checkins')).toHaveLength(0);
    act(() => renderer.unmount());
  });

  it('rolls back state and alerts when persistence fails', async () => {
    spaceActions.updateSpaceFeatures.mockRejectedValueOnce(new Error('nope'));
    const renderer = await renderProfile();

    await press(findByTestID(renderer.root, 'profile-feature-wishlist'));

    expect(findByTestID(renderer.root, 'profile-feature-state-wishlist').props.children).toBe('On');
    expect(alertSpy).toHaveBeenCalledWith('Feature update failed', 'Try again.');
    act(() => renderer.unmount());
  });
});
