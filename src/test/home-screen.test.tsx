import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as any).__DEV__ = false;

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

vi.mock('@/src/components/ui/pacto', () => {
  const Reactx = require('react');
  return {
    Card: ({ children, onPress, style }: any) =>
      onPress
        ? Reactx.createElement('MockPressable', { onPress, style }, children)
        : Reactx.createElement('MockView', { style }, children),
    ActivityHeatmap: (props: any) => Reactx.createElement('MockView', { ...props, testID: 'activity-heatmap' }),
    HeroPactoBadge: (props: any) => Reactx.createElement('MockView', props),
    SectionHead: ({ children }: any) => Reactx.createElement('MockText', null, children),
  };
});

vi.mock('expo-constants', () => ({
  default: { statusBarHeight: 44 },
}));

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(async () => undefined),
  impactAsync: vi.fn(async () => undefined),
  notificationAsync: vi.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Warning: 'warning', Success: 'success' },
}));

vi.mock('expo-audio', () => ({
  useAudioPlayer: () => ({
    seekTo: vi.fn(async () => undefined),
    play: vi.fn(),
  }),
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
    G: Stub,
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
    default: { View: MockView, ScrollView: MockScrollView, createAnimatedComponent: (Component: any) => Component },
    View: MockView,
    ScrollView: MockScrollView,
    createAnimatedComponent: (Component: any) => Component,
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
  isFeatureEnabled: vi.fn(() => true),
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

const checkInsHook = vi.hoisted(() => vi.fn(() => checkInsState));

vi.mock('@/src/hooks/useCheckIns', () => ({
  useCheckIns: checkInsHook,
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

const allText = (renderer: any) =>
  renderer.root
    .findAll((node: any) => typeof node.children?.[0] === 'string')
    .map((node: any) => node.children.join(''));

const localDayAt = (offsetDays: number, hour = 12) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, 0, 0, 0);
  return date.getTime();
};

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
    sessionState.isFeatureEnabled = vi.fn(() => true);
    homeState.timeline = [];
    homeState.todaySummary = { plans: { done: 0, total: 0 }, focus: { done: 0, total: 0 } };
    homeState.isLoading = false;
    homeState.error = null;
    checkInsState.myTodayCheckIn = null;
    checkInsState.partnerTodayCheckIn = null;
    checkInsHook.mockClear();
    checkInsHook.mockReturnValue(checkInsState);
  });

  it('does not render demo personalized home content with empty live data', async () => {
    const renderer = await renderHome();
    const texts = allText(renderer);
    const text = texts.join('\n');

    expect(text).not.toContain('Brooklyn');
    expect(text).not.toContain('Pay electricity bill');
    expect(text).not.toContain('Sheet-pan salmon');
    expect(text).not.toContain('Picnic at Buttermilk');
    expect(text).not.toContain('Cloudy, mild');
    expect(text).not.toContain('Yoga class');

    act(() => renderer.unmount());
  });

  it('labels milestone data as memory dates and renders the summary below activity', async () => {
    homeState.timeline = [
      {
        id: 'task:next',
        type: 'task',
        sourceId: 'next',
        sourceTable: 'tasks',
        title: 'Book dinner',
        subtitle: null,
        occursAt: localDayAt(2, 19),
        priority: 0,
        isPrivate: false,
        isOverdue: false,
      },
    ];
    homeState.milestones = [
      {
        id: 'milestone:anniversary',
        type: 'milestone',
        title: 'Anniversary',
        subtitle: null,
        date: '2026-06-10',
        daysUntil: 39,
      },
    ];

    const renderer = await renderHome();
    const texts = allText(renderer);
    const text = texts.join('\n');

    expect(text).toContain('MEMORY DATES');
    expect(text).toContain('MEMORY DATE');
    expect(text).toContain('Enabled timeline items and memory dates due in the next 30 days.');
    expect(text).not.toContain('MILESTONES');
    expect(texts.indexOf('RECENT ACTIVITY')).toBeGreaterThanOrEqual(0);
    expect(texts.indexOf('NEXT ITEM')).toBeGreaterThan(texts.indexOf('RECENT ACTIVITY'));

    act(() => renderer.unmount());
  });

  it('renders only current local date items under Today', async () => {
    homeState.timeline = [
      {
        id: 'task:today',
        type: 'task',
        sourceId: 'today',
        sourceTable: 'tasks',
        title: 'Today task',
        subtitle: null,
        occursAt: localDayAt(0, 10),
        priority: 0,
        isPrivate: false,
        isOverdue: false,
      },
      {
        id: 'task:tomorrow',
        type: 'task',
        sourceId: 'tomorrow',
        sourceTable: 'tasks',
        title: 'Tomorrow task',
        subtitle: null,
        occursAt: localDayAt(1, 10),
        priority: 0,
        isPrivate: false,
        isOverdue: false,
      },
    ];

    const renderer = await renderHome();
    const texts = allText(renderer);

    expect(texts).toContain('Today task');
    expect(texts).not.toContain('Tomorrow task');
    expect(findByTestID(renderer, 'home-timeline-task-today')[0]).toBeDefined();
    expect(findByTestID(renderer, 'home-timeline-task-tomorrow')).toHaveLength(0);

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

  it('does not navigate to plan routes from empty Today or Coming Up All when goals are disabled', async () => {
    sessionState.isFeatureEnabled = vi.fn((featureId: string) => featureId !== 'goals');
    const renderer = await renderHome();

    const empty = findByTestID(renderer, 'home-timeline-empty')[0];
    expect(empty).toBeDefined();
    expect(empty.props.onPress).toBeUndefined();
    expect(findByTestID(renderer, 'home-coming-all')).toHaveLength(0);
    const text = allText(renderer).join('\n');
    expect(text).not.toContain('Add a plan');
    expect(text).not.toContain('Add a plan or milestone');
    expect(text).not.toContain('Add a task or calendar item');

    const pressables = renderer.root.findAll((node: any) => typeof node.props?.onPress === 'function');
    for (const pressable of pressables) {
      await act(async () => {
        await pressable.props.onPress();
      });
    }

    expect(routerSpy.push).not.toHaveBeenCalledWith('/sheets/new-plan');
    expect(routerSpy.push).not.toHaveBeenCalledWith('/(tabs)/us/plans');

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

  it('routes love-note memory rows to a memories destination when journal is disabled', async () => {
    sessionState.isFeatureEnabled = vi.fn((featureId: string) => featureId !== 'journal');
    const occursAt = new Date();
    occursAt.setHours(11, 0, 0, 0);
    homeState.timeline = [
      {
        id: 'memory:love-note-1',
        type: 'memory',
        sourceId: 'love-note-1',
        sourceTable: 'loveNotes',
        title: 'Love note',
        subtitle: 'You made the morning easier.',
        occursAt: occursAt.getTime(),
        priority: -1,
        isPrivate: false,
        isOverdue: false,
      },
    ];

    const renderer = await renderHome();
    const btn = findByTestID(renderer, 'home-timeline-memory-love-note-1')[0];
    expect(btn).toBeDefined();
    await act(async () => {
      await btn.props.onPress();
    });

    expect(routerSpy.push).toHaveBeenCalledWith('/(tabs)/us/notes');
    expect(routerSpy.push).not.toHaveBeenCalledWith('/(tabs)/us/journal');
    act(() => renderer.unmount());
  });

  it('filters shortcuts through enabled features', async () => {
    sessionState.isFeatureEnabled = vi.fn((featureId: string) => featureId === 'tasks');
    const renderer = await renderHome();
    const texts = allText(renderer);

    expect(texts).toContain('Task');
    expect(texts).not.toContain('Note');
    expect(texts).not.toContain('Check in');
    expect(texts).not.toContain('Calendar');

    act(() => renderer.unmount());
  });

  it('omits check-in controls and cannot navigate to new check-in when checkins are disabled', async () => {
    sessionState.isFeatureEnabled = vi.fn((featureId: string) => featureId !== 'checkins');
    const renderer = await renderHome();
    const texts = allText(renderer);

    expect(texts).not.toContain("Right now you're");
    expect(texts).not.toContain('tap to update');
    expect(texts).not.toContain("TODAY'S ARC");
    expect(texts).not.toContain('Check in');
    expect(checkInsHook).toHaveBeenCalledWith({ enabled: false });

    const pressables = renderer.root.findAll((node: any) => typeof node.props?.onPress === 'function');
    for (const pressable of pressables) {
      await act(async () => {
        await pressable.props.onPress();
      });
    }

    expect(routerSpy.push).not.toHaveBeenCalledWith('/sheets/new-checkin');

    act(() => renderer.unmount());
  });
});
