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
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
  Link: ({ children }: any) => <>{children}</>,
}));

vi.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Swipeable: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  PanGestureHandler: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('expo-constants', () => ({
  default: { statusBarHeight: 44 },
}));

vi.mock('react-native-svg', () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return {
    __esModule: true,
    default: Stub,
    Svg: Stub,
    Circle: Stub,
    Line: Stub,
    Path: Stub,
    Polygon: Stub,
    Polyline: Stub,
    Rect: Stub,
    Defs: Stub,
    LinearGradient: Stub,
    Stop: Stub,
  };
});

vi.mock('react-native-reanimated', () => {
  const Reactx = require('react');
  const MockView = (props: any) =>
    Reactx.createElement('AnimatedView', props, props.children);
  MockView.displayName = 'AnimatedView';
  const MockScrollView = (props: any) =>
    Reactx.createElement('AnimatedScrollView', props, props.children);
  MockScrollView.displayName = 'AnimatedScrollView';
  const chainable: any = () =>
    new Proxy(
      { value: 0 },
      {
        get: () => chainable,
      },
    );
  const fadeInDown: any = {
    duration: () => fadeInDown,
    delay: () => fadeInDown,
    springify: () => fadeInDown,
    damping: () => fadeInDown,
  };
  return {
    __esModule: true,
    default: { View: MockView, ScrollView: MockScrollView },
    View: MockView,
    ScrollView: MockScrollView,
    FadeInDown: fadeInDown,
    FadeIn: fadeInDown,
    Easing: { inOut: () => 0, out: (fn: any) => fn ?? 0, cubic: (v: any) => v, bezier: () => 0, ease: 0 },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: any) => fn(),
    withRepeat: (v: any) => v,
    withTiming: (v: any) => v,
    withDelay: (_d: any, v: any) => v,
    useReducedMotion: () => false,
    useAnimatedProps: (fn: any) => fn(),
    interpolateColor: () => "#000000",
    interpolate: () => 0,
  };
});

const sessionState = vi.hoisted(() => ({
  activeCouple: null as any,
  isSolo: false,
  isCouple: true,
  space: null as any,
  partner: null as any,
  user: null as any,
  profile: null as any,
  status: 'ready',
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => sessionState,
}));

const homeState = vi.hoisted(() => ({
  timeline: [] as any[],
  todaySummary: { plans: { done: 0, total: 0 }, focus: { done: 0, total: 0 } },
  dailyVerse: {
    text: 'Love each other deeply',
    reference: '1 Peter 4:8',
    translation: 'NIV',
    source: 'fallback' as const,
    dateKey: '2026-04-22',
  },
  hero: null,
  milestones: [],
  memories: [],
  memoryPreview: null,
  presence: null,
  isLoading: false,
  error: null,
  refetch: vi.fn(async () => undefined),
}));

vi.mock('@/src/hooks/useHomeTimeline', () => ({
  useHomeTimeline: () => homeState,
}));

const checkInsState = vi.hoisted(() => ({
  today: '2026-04-22',
  checkIns: [],
  todayCheckIns: [],
  myTodayCheckIn: null as any,
  partnerTodayCheckIn: null as any,
  createOrUpdate: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined),
  isLoading: false,
  isSubmitting: false,
  refetch: vi.fn(async () => undefined),
}));

vi.mock('@/src/hooks/useCheckIns', () => ({
  useCheckIns: () => checkInsState,
  getLocalDateKey: () => new Date().toISOString().slice(0, 10),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

const flush = () => new Promise((r) => setTimeout(r, 0));

async function renderHome() {
  const { default: HomeRoute } = await import('@/app/(tabs)/home');
  let renderer: any = null;
  await act(async () => {
    renderer = TestRenderer.create(<HomeRoute />);
    await flush();
  });
  return renderer;
}

const findByTestID = (renderer: any, id: string) =>
  renderer.root.findAll((node: any) => node.props?.testID === id);

describe('HomeRoute', () => {
  beforeEach(() => {
    routerSpy.push.mockReset();
    checkInsState.createOrUpdate.mockReset();
    checkInsState.createOrUpdate.mockResolvedValue(undefined);
    checkInsState.refetch.mockReset();
    checkInsState.refetch.mockResolvedValue(undefined);
    homeState.refetch.mockReset();
    homeState.refetch.mockResolvedValue(undefined);
    sessionState.activeCouple = null;
    sessionState.isSolo = false;
    sessionState.isCouple = true;
    sessionState.space = { id: 'sp1', kind: 'couple', name: null, anniversary: null, inviteCode: null };
    sessionState.partner = null;
    sessionState.user = { id: 'me', email: 'a@b', displayName: 'Mattia', avatarUrl: null };
    sessionState.profile = { id: 'me', displayName: 'Mattia', avatarUrl: null };
    homeState.timeline = [];
    homeState.todaySummary = { plans: { done: 0, total: 0 }, focus: { done: 0, total: 0 } };
    homeState.isLoading = false;
    homeState.error = null;
    checkInsState.myTodayCheckIn = null;
    checkInsState.partnerTodayCheckIn = null;
  });

  it('renders skeletons while loading with no cached data', async () => {
    homeState.isLoading = true;
    const renderer = await renderHome();
    expect(findByTestID(renderer, 'home-hero-skeleton').length).toBe(1);
    expect(findByTestID(renderer, 'home-timeline-skeleton').length).toBeGreaterThanOrEqual(4);
    act(() => renderer.unmount());
  });

  it('shows rings empty state when no activity', async () => {
    const renderer = await renderHome();
    expect(findByTestID(renderer, 'home-rings-empty').length).toBe(1);
    act(() => renderer.unmount());
  });

  it('empty timeline press navigates to /sheets/new-plan', async () => {
    const renderer = await renderHome();
    const empty = findByTestID(renderer, 'home-timeline-empty')[0];
    expect(empty).toBeDefined();
    await act(async () => {
      await empty.props.onPress();
    });
    expect(routerSpy.push).toHaveBeenCalledWith('/sheets/new-plan');
    act(() => renderer.unmount());
  });

  it('mood press calls createOrUpdate with chosen mood', async () => {
    const renderer = await renderHome();
    const btn = findByTestID(renderer, 'home-mood-good')[0];
    await act(async () => {
      await btn.props.onPress();
    });
    expect(checkInsState.createOrUpdate).toHaveBeenCalledWith({
      mood: 'good',
      note: null,
      isPrivate: false,
    });
    act(() => renderer.unmount());
  });

  it('tapping selected mood clears selection', async () => {
    checkInsState.myTodayCheckIn = {
      id: 'x',
      authorId: 'me',
      mood: 'good',
      note: null,
      isPrivate: false,
      checkInDate: '2026-04-22',
      createdAt: 0,
    };
    const renderer = await renderHome();
    const btn = findByTestID(renderer, 'home-mood-good')[0];
    await act(async () => {
      await btn.props.onPress();
    });
    expect(checkInsState.createOrUpdate).toHaveBeenCalledWith({
      mood: null,
      note: null,
      isPrivate: false,
    });
    act(() => renderer.unmount());
  });

  it('hero press navigates to /sheets/rings-history', async () => {
    const renderer = await renderHome();
    const hero = findByTestID(renderer, 'home-hero')[0];
    expect(hero).toBeDefined();
    await act(async () => {
      await hero.props.onPress();
    });
    expect(routerSpy.push).toHaveBeenCalledWith('/sheets/rings-history');
    act(() => renderer.unmount());
  });

  it('timeline task item routes to /(tabs)/tasks', async () => {
    const occursAt = new Date();
    occursAt.setHours(12, 0, 0, 0);
    homeState.timeline = [
      {
        id: 'task:1',
        type: 'task',
        sourceId: '1',
        sourceTable: 'tasks',
        title: 'Buy milk',
        subtitle: null,
        occursAt: occursAt.getTime(),
        priority: 0,
        isPrivate: false,
        isOverdue: false,
      },
    ];
    const renderer = await renderHome();
    const btn = findByTestID(renderer, 'home-timeline-task-1')[0];
    expect(btn).toBeDefined();
    await act(async () => {
      await btn.props.onPress();
    });
    expect(routerSpy.push).toHaveBeenCalledWith('/(tabs)/tasks');
    act(() => renderer.unmount());
  });

  it('timeline plan item routes to /(tabs)/us/plans', async () => {
    const occursAt = new Date();
    occursAt.setHours(14, 30, 0, 0);
    homeState.timeline = [
      {
        id: 'plan:7',
        type: 'plan',
        sourceId: '7',
        sourceTable: 'plans',
        title: 'Lunch with Sofia',
        subtitle: null,
        occursAt: occursAt.getTime(),
        priority: 0,
        isPrivate: false,
        isOverdue: false,
      },
    ];
    const renderer = await renderHome();
    const btn = findByTestID(renderer, 'home-timeline-plan-7')[0];
    await act(async () => {
      await btn.props.onPress();
    });
    expect(routerSpy.push).toHaveBeenCalledWith('/(tabs)/us/plans');
    act(() => renderer.unmount());
  });

  it('timeline reminder item routes to /(tabs)/reminders', async () => {
    const occursAt = new Date();
    occursAt.setHours(9, 0, 0, 0);
    homeState.timeline = [
      {
        id: 'reminder:3',
        type: 'reminder',
        sourceId: '3',
        sourceTable: 'reminders',
        title: 'Call mom',
        subtitle: null,
        occursAt: occursAt.getTime(),
        priority: 0,
        isPrivate: false,
        isOverdue: false,
      },
    ];
    const renderer = await renderHome();
    const btn = findByTestID(renderer, 'home-timeline-reminder-3')[0];
    await act(async () => {
      await btn.props.onPress();
    });
    expect(routerSpy.push).toHaveBeenCalledWith('/(tabs)/reminders');
    act(() => renderer.unmount());
  });

  it('explore "Us" chip navigates to /us', async () => {
    const renderer = await renderHome();
    const btn = findByTestID(renderer, 'home-explore-us')[0];
    expect(btn).toBeDefined();
    await act(async () => {
      await btn.props.onPress();
    });
    expect(routerSpy.push).toHaveBeenCalledWith('/us');
    act(() => renderer.unmount());
  });

  it('derived ring counts reflect todaySummary in solo mode', async () => {
    homeState.todaySummary = {
      plans: { done: 1, total: 3 },
      focus: { done: 2, total: 4 },
    };
    checkInsState.myTodayCheckIn = {
      id: 'x',
      authorId: 'me',
      mood: 'good',
      note: null,
      isPrivate: false,
      checkInDate: '2026-04-22',
      createdAt: 0,
    };
    sessionState.isSolo = true;
    sessionState.isCouple = false;
    const renderer = await renderHome();
    const texts = renderer.root
      .findAll((node: any) => typeof node.children?.[0] === 'string')
      .map((node: any) => node.children.join(''));
    expect(texts).toContain('1/3');
    expect(texts).toContain('2/4');
    expect(texts).toContain('1/1');
    act(() => renderer.unmount());
  });

  it('pull-to-refresh invokes both refetchHome and refetchCheckIns', async () => {
    const renderer = await renderHome();
    const withRC = renderer.root.findAll((node: any) => node.props?.refreshControl);
    expect(withRC.length).toBeGreaterThan(0);
    const rc = withRC[0].props.refreshControl;
    await act(async () => {
      await rc.props.onRefresh();
    });
    expect(homeState.refetch).toHaveBeenCalled();
    expect(checkInsState.refetch).toHaveBeenCalled();
    act(() => renderer.unmount());
  });
});
