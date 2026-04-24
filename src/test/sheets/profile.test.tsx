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
  Link: ({ children }: any) => <>{children}</>,
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

vi.mock('react-native-reanimated', () => {
  const Reactx = require('react');
  const MockView = (props: any) =>
    Reactx.createElement('AnimatedView', props, props.children);
  const createAnimatedComponent = (Comp: any) => (props: any) =>
    Reactx.createElement(Comp, props, props.children);
  return {
    __esModule: true,
    default: {
      View: MockView,
      createAnimatedComponent,
    },
    View: MockView,
    createAnimatedComponent,
    Easing: { inOut: () => 0, out: (fn: any) => fn ?? 0, cubic: (v: any) => v, bezier: () => 0, ease: 0 },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedProps: (fn: any) => fn?.() ?? {},
    useAnimatedStyle: (fn: any) => fn?.() ?? {},
    useReducedMotion: () => false,
    withDelay: (_d: number, v: any) => v,
    withTiming: (v: any) => v,
    withDelay: (_d: any, v: any) => v,
    useReducedMotion: () => false,
    useAnimatedProps: (fn: any) => fn(),
    interpolateColor: () => "#000000",
    withRepeat: (v: any) => v,
    interpolate: () => 0,
  };
});

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
      ...actual.useTheme?.(),
      C: {
        bone: '#F5EEE3', mist: '#B3A89A', fog: '#80746A', ash: '#3A3A3A',
        ink: '#0E0B0A', coal: '#161210', card: '#1D1815', cardHi: '#262019',
        line: '#2B241E', gold: '#E4B24A', goldSoft: 'rgba(228,178,74,0.14)',
        peach: '#F4A68C', peachInk: '#3A1F14', lavender: '#B8A8E8',
        butter: '#F2D86A', rose: '#D89BA8', error: '#E07A68',
      },
      F: {
        display: 'Display',
        displayBold: 'DisplayBold',
        body: 'Body',
        bodyBold: 'BodyBold',
      },
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
    kind: 'couple' as 'couple' | 'solo',
    name: null,
    anniversary: '2023-12-22',
    inviteCode: 'BREAD-SILK-42',
  } as any,
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

const journalState = vi.hoisted(() => ({
  allEntries: [{ id: 'j1' }, { id: 'j2' }, { id: 'j3' }] as any[],
  isLoading: false,
}));
vi.mock('@/src/hooks/useJournal', () => ({
  useJournal: () => journalState,
}));

const milestonesState = vi.hoisted(() => ({
  milestones: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }] as any[],
  isLoading: false,
}));
vi.mock('@/src/hooks/useMilestones', () => ({
  useMilestones: () => milestonesState,
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
  upgradeSoloToCouple: vi.fn(async () => 'UPGRADE-CODE'),
}));
vi.mock('@/src/lib/space-actions', () => spaceActions);

import ProfileSheet from '@/app/sheets/profile';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];

describe('profile sheet', () => {
  beforeEach(() => {
    (Haptics.notificationAsync as any).mockClear();
    (Clipboard.setStringAsync as any).mockClear();
    dbSpy.signOut.mockClear();
    spaceActions.leaveSpace.mockClear();
    spaceActions.regenerateInviteCode.mockClear();
    spaceActions.upgradeSoloToCouple.mockClear();
    themeState.setMode.mockClear();
    themeState.mode = 'dark';
    alertSpy.mockClear();
    routerSpy.back.mockClear();
    routerSpy.push.mockClear();
    routerSpy.replace.mockClear();
    // reset session defaults
    sessionState.status = 'ready';
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
      kind: 'couple',
      name: null,
      anniversary: '2023-12-22',
      inviteCode: 'BREAD-SILK-42',
    };
    journalState.isLoading = false;
    journalState.allEntries = [{ id: 'j1' }, { id: 'j2' }, { id: 'j3' }];
    milestonesState.isLoading = false;
    milestonesState.milestones = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }];
  });

  it('hero renders coupleName, invite code, entries & milestones counts', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });
    const name = findByTestID(renderer.root, 'profile-hero-name');
    const code = findByTestID(renderer.root, 'profile-hero-code');
    const meta = findByTestID(renderer.root, 'profile-hero-meta');
    const entriesVal = findByTestID(renderer.root, 'profile-stat-entries-value');
    const milestonesVal = findByTestID(renderer.root, 'profile-stat-milestones-value');
    const daysVal = findByTestID(renderer.root, 'profile-stat-days-value');
    expect(name.props.children).toBe('Mattia & Sofia');
    expect(code.props.children).toBe('coupl code: BREAD-SILK-42');
    expect(String(meta.props.children)).toContain('DAYS TOGETHER · SINCE DEC 22, 2023');
    expect(entriesVal.props.children).toBe('3');
    expect(milestonesVal.props.children).toBe('5');
    expect(typeof daysVal.props.children).toBe('string');
    expect(Number(daysVal.props.children)).toBeGreaterThan(0);
    act(() => renderer.unmount());
  });

  it('solo session hides Partner row and shows Upgrade pressable', async () => {
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
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });
    expect(findByTestID(renderer.root, 'profile-row-heart')).toBeUndefined();
    expect(findByTestID(renderer.root, 'profile-upgrade')).toBeDefined();
    act(() => renderer.unmount());
  });

  it('copy-code calls Clipboard + success haptic', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'profile-copy-code').props.onPress();
      await flush();
    });
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('BREAD-SILK-42');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    act(() => renderer.unmount());
  });

  it('copy-code no-op when inviteCode absent', async () => {
    sessionState.space = { ...sessionState.space, inviteCode: null };
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'profile-copy-code').props.onPress();
      await flush();
    });
    expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
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
    const [title, _msg, buttons] = alertSpy.mock.calls[0];
    expect(title).toBe('Sign out?');
    const destructive = buttons.find((b: any) => b.style === 'destructive');
    await act(async () => {
      await destructive.onPress();
      await flush();
    });
    expect(dbSpy.signOut).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('theme pills: tapping light calls setMode("light")', async () => {
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

  it('journal/milestones loading → stats show —', async () => {
    journalState.isLoading = true;
    milestonesState.isLoading = true;
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ProfileSheet />);
      await flush();
    });
    const entriesVal = findByTestID(renderer.root, 'profile-stat-entries-value');
    const milestonesVal = findByTestID(renderer.root, 'profile-stat-milestones-value');
    expect(entriesVal.props.children).toBe('—');
    expect(milestonesVal.props.children).toBe('—');
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
