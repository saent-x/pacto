import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routerSpy = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('expo-router', () => ({
  router: routerSpy,
  useRouter: () => routerSpy,
  Stack: { Screen: () => null },
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(async () => undefined),
  selectionAsync: vi.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

vi.mock('expo-clipboard', () => ({
  setStringAsync: vi.fn(async () => true),
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const alertSpy = vi.hoisted(() => vi.fn());
vi.mock('react-native', async () => {
  const actual: any = await vi.importActual('react-native');
  return { ...actual, Alert: { alert: alertSpy } };
});

const themeState = vi.hoisted(() => ({
  mode: 'dark' as 'dark' | 'light',
  setMode: vi.fn((m: 'dark' | 'light') => {
    themeState.mode = m;
  }),
}));

vi.mock('@/src/lib/theme', async () => {
  const actual: any = await vi.importActual('@/src/lib/theme');
  return {
    ...actual,
    useTheme: () => ({
      ...actual.useTheme(),
      mode: themeState.mode,
      setMode: themeState.setMode,
    }),
  };
});

const sessionState = vi.hoisted(() => ({
  status: 'ready' as 'ready' | 'loading' | 'unauthed' | 'onboarding',
  user: {
    id: 'u1',
    email: 'mattia@coupl.app',
    displayName: 'Mattia',
    avatarUrl: null,
  } as any,
  space: {
    id: 's1',
    kind: 'pair' as 'pair' | 'solo' | 'crew',
    name: null,
    anniversary: '2023-12-22',
    inviteCode: 'BREAD-SILK-42',
  } as any,
  mode: 'pair' as 'pair' | 'solo' | 'crew',
  enabledFeatures: ['tasks', 'calendar', 'wishlist'] as string[],
  membership: { id: 'm1', role: 'owner' } as any,
  partner: {
    id: 'u2',
    email: 'sofia@coupl.app',
    displayName: 'Sofia',
    avatarUrl: null,
  } as any,
  isSolo: false,
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
  updateSpaceFeatures: vi.fn(async () => undefined),
  updateUserAvatar: vi.fn(async () => undefined),
}));
vi.mock('@/src/lib/space-actions', () => spaceActions);

import ProfileSheet from '@/app/sheets/profile';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];

function readText(root: any) {
  return root
    .findAll((n: any) => typeof n.children?.[0] === 'string')
    .map((n: any) => n.children.join(''));
}

describe('profile sheet', () => {
  beforeEach(() => {
    dbSpy.signOut.mockClear();
    spaceActions.leaveSpace.mockClear();
    spaceActions.regenerateInviteCode.mockClear();
    spaceActions.updateSpaceFeatures.mockClear();
    spaceActions.updateUserAvatar.mockClear();
    themeState.setMode.mockClear();
    themeState.mode = 'dark';
    alertSpy.mockClear();
    routerSpy.back.mockClear();
    routerSpy.push.mockClear();
    routerSpy.replace.mockClear();
    sessionState.status = 'ready';
    sessionState.mode = 'pair';
    sessionState.isSolo = false;
    sessionState.isCouple = true;
    sessionState.partner = {
      id: 'u2',
      email: 'sofia@coupl.app',
      displayName: 'Sofia',
      avatarUrl: null,
    };
    sessionState.space = {
      id: 's1',
      kind: 'pair',
      name: null,
      anniversary: '2023-12-22',
      inviteCode: 'BREAD-SILK-42',
    };
    sessionState.enabledFeatures = ['tasks', 'calendar', 'wishlist'];
  });

  it('renders identity, settings, and a dedicated features row', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    const labels = readText(renderer.root);
    expect(labels).toContain('Mattia');
    expect(labels).not.toContain('mattia@coupl.app');
    expect(findByTestID(renderer.root, 'profile-row-account')).toBeDefined();
    expect(findByTestID(renderer.root, 'profile-row-code')).toBeDefined();
    expect(findByTestID(renderer.root, 'profile-row-features')).toBeDefined();
    act(() => renderer.unmount());
  });

  it('opens the dedicated features sheet from profile', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    await act(async () => {
      findByTestID(renderer.root, 'profile-row-features').props.onPress();
      await flush();
    });

    expect(routerSpy.push).toHaveBeenCalledWith('/sheets/profile-features');
    expect(spaceActions.updateSpaceFeatures).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('solo session renders invite row and solo danger action', async () => {
    sessionState.mode = 'solo';
    sessionState.isSolo = true;
    sessionState.isCouple = false;
    sessionState.partner = null;
    sessionState.space = {
      id: 's1',
      kind: 'solo',
      name: null,
      anniversary: '2024-01-10',
      inviteCode: null,
    };
    sessionState.enabledFeatures = ['tasks', 'calendar'];
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });

    expect(findByTestID(renderer.root, 'profile-row-invite')).toBeDefined();
    expect(findByTestID(renderer.root, 'profile-signout')).toBeDefined();
    act(() => renderer.unmount());
  });

  it('sign-out prompts Alert then destructive press calls db.auth.signOut', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'profile-signout').props.onPress();
      await flush();
    });
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [, , buttons] = alertSpy.mock.calls[0];
    const destructive = buttons.find((b: any) => b.style === 'destructive');
    await act(async () => {
      await destructive.onPress();
      await flush();
    });
    expect(dbSpy.signOut).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('theme pills call setMode', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'profile-theme-light').props.onPress();
      await flush();
    });
    expect(themeState.setMode).toHaveBeenCalledWith('light');
    act(() => renderer.unmount());
  });

  it('unauthed status triggers router.replace to sign-in', async () => {
    sessionState.status = 'unauthed';
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });
    expect(routerSpy.replace).toHaveBeenCalledWith('/(auth)/sign-in');
    act(() => renderer.unmount());
  });
});
