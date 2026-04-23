import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const routerSpy = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }));
vi.mock('expo-router', () => ({
  router: routerSpy,
  useRouter: () => routerSpy,
  Stack: { Screen: () => null },
}));

const hapticsSpy = vi.hoisted(() => ({ selectionAsync: vi.fn(async () => undefined) }));
vi.mock('expo-haptics', () => hapticsSpy);

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('react-native-reanimated', () => {
  const Reactx = require('react');
  const MockView = (props: any) =>
    Reactx.createElement('AnimatedView', props, props.children);
  const MockScrollView = (props: any) =>
    Reactx.createElement('AnimatedScrollView', props, props.children);
  const chainable = () => {
    const api: any = {};
    for (const m of ['duration', 'delay', 'springify', 'damping']) {
      api[m] = () => api;
    }
    return api;
  };
  const FadeIn = chainable();
  const FadeOut = chainable();
  const FadeInDown = chainable();
  return {
    __esModule: true,
    default: {
      View: MockView,
      ScrollView: MockScrollView,
      createAnimatedComponent: (C: any) => C,
    },
    View: MockView,
    ScrollView: MockScrollView,
    createAnimatedComponent: (C: any) => C,
    FadeIn,
    FadeOut,
    FadeInDown,
    Easing: { bezier: () => 0, ease: 0, inOut: () => 0 },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedProps: (fn: any) => fn?.() ?? {},
    useAnimatedStyle: (fn: any) => fn?.() ?? {},
    useReducedMotion: () => false,
    withDelay: (_d: number, v: any) => v,
    withTiming: (v: any) => v,
    withRepeat: (v: any) => v,
    interpolate: () => 0,
  };
});

type Item = {
  id: string;
  kind: string;
  icon: string;
  color: string;
  title: string;
  sub: string;
  createdAt: number;
  time: string;
  unread: boolean;
};

const notifState = vi.hoisted(() => ({
  buckets: [] as Array<{ label: string; items: Item[] }>,
  unreadCount: 0,
  isLoading: false,
  error: null as any,
  markAllRead: vi.fn(async () => undefined),
}));
vi.mock('@/src/hooks/useNotifications', () => ({
  useNotifications: () => notifState,
}));

import Notifications from '@/app/notifications';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];
const findAllByTestIDPrefix = (root: any, prefix: string) =>
  root.findAll((n: any) => typeof n.props?.testID === 'string' && n.props.testID.startsWith(prefix));

function itemFixture(partial: Partial<Item>): Item {
  return {
    id: 'x',
    kind: 'loveNote',
    icon: 'heart',
    color: '#D89BA8',
    title: 'A title',
    sub: 'A sub',
    createdAt: Date.now(),
    time: '7:14 AM',
    unread: false,
    ...partial,
  };
}

describe('notifications screen', () => {
  beforeEach(() => {
    notifState.buckets = [];
    notifState.unreadCount = 0;
    notifState.isLoading = false;
    notifState.error = null;
    notifState.markAllRead = vi.fn(async () => undefined);
    hapticsSpy.selectionAsync.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders loading stub when isLoading', async () => {
    notifState.isLoading = true;
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<Notifications />);
      await flush();
    });
    expect(findByTestID(renderer.root, 'notifications-loading')).toBeDefined();
    expect(findByTestID(renderer.root, 'notifications-empty')).toBeUndefined();
    act(() => renderer.unmount());
  });

  it('renders empty state when no buckets', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<Notifications />);
      await flush();
    });
    expect(findByTestID(renderer.root, 'notifications-empty')).toBeDefined();
    expect(findAllByTestIDPrefix(renderer.root, 'notifications-bucket-')).toHaveLength(0);
    act(() => renderer.unmount());
  });

  it('renders bucket labels and rows for each group', async () => {
    notifState.buckets = [
      {
        label: 'Today',
        items: [
          itemFixture({ id: 'loveNote:a', title: 'Sofia sent you a note', unread: true }),
          itemFixture({ id: 'checkIn:b', title: 'Check-in · bright', unread: true }),
        ],
      },
      {
        label: 'Earlier',
        items: [itemFixture({ id: 'expense:c', title: 'Sofia added €42', unread: false })],
      },
    ];
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<Notifications />);
      await flush();
    });
    expect(findByTestID(renderer.root, 'notifications-bucket-Today')).toBeDefined();
    expect(findByTestID(renderer.root, 'notifications-bucket-Earlier')).toBeDefined();
    expect(findByTestID(renderer.root, 'notification-row-loveNote:a')).toBeDefined();
    expect(findByTestID(renderer.root, 'notification-row-checkIn:b')).toBeDefined();
    expect(findByTestID(renderer.root, 'notification-row-expense:c')).toBeDefined();
    act(() => renderer.unmount());
  });

  it('shows unread dot for unread rows only', async () => {
    notifState.buckets = [
      {
        label: 'Today',
        items: [
          itemFixture({ id: 'a', unread: true }),
          itemFixture({ id: 'b', unread: false }),
        ],
      },
    ];
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<Notifications />);
      await flush();
    });
    const rowA = findByTestID(renderer.root, 'notification-row-a');
    const rowB = findByTestID(renderer.root, 'notification-row-b');
    const hasDot = (row: any) =>
      row.findAll((n: any) => n.props?.testID === 'notification-unread-dot').length > 0;
    expect(hasDot(rowA)).toBe(true);
    expect(hasDot(rowB)).toBe(false);
    act(() => renderer.unmount());
  });

  it('tapping unread row fires haptic and clears its dot', async () => {
    notifState.buckets = [
      {
        label: 'Today',
        items: [itemFixture({ id: 'a', unread: true })],
      },
    ];
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<Notifications />);
      await flush();
    });
    const rowBefore = findByTestID(renderer.root, 'notification-row-a');
    const hasDot = (row: any) =>
      row.findAll((n: any) => n.props?.testID === 'notification-unread-dot').length > 0;
    expect(hasDot(rowBefore)).toBe(true);

    const pressable = rowBefore.findAll(
      (n: any) => typeof n.props?.onPress === 'function',
    )[0];
    await act(async () => {
      pressable.props.onPress();
      await flush();
    });
    expect(hapticsSpy.selectionAsync).toHaveBeenCalledTimes(1);
    const rowAfter = findByTestID(renderer.root, 'notification-row-a');
    expect(hasDot(rowAfter)).toBe(false);
    act(() => renderer.unmount());
  });

  it('does not fire haptic when tapping an already-read row', async () => {
    notifState.buckets = [
      {
        label: 'Today',
        items: [itemFixture({ id: 'a', unread: false })],
      },
    ];
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<Notifications />);
      await flush();
    });
    const row = findByTestID(renderer.root, 'notification-row-a');
    const pressable = row.findAll(
      (n: any) => typeof n.props?.onPress === 'function',
    )[0];
    await act(async () => {
      pressable.props.onPress();
      await flush();
    });
    expect(hapticsSpy.selectionAsync).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('markAllRead fires on unmount', async () => {
    notifState.buckets = [
      { label: 'Today', items: [itemFixture({ id: 'a', unread: true })] },
    ];
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<Notifications />);
      await flush();
    });
    expect(notifState.markAllRead).not.toHaveBeenCalled();
    await act(async () => {
      renderer.unmount();
      await flush();
    });
    expect(notifState.markAllRead).toHaveBeenCalledTimes(1);
  });
});
