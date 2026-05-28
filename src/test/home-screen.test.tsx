import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as any).__DEV__ = false;

const routerSpy = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
}));

const locationMock = vi.hoisted(() => ({
  getForegroundPermissionsAsync: vi.fn(async () => ({ status: 'undetermined', granted: false })),
  requestForegroundPermissionsAsync: vi.fn(async () => ({ status: 'granted', granted: true })),
  getCurrentPositionAsync: vi.fn(async () => ({
    coords: { latitude: 40.7128, longitude: -74.006 },
  })),
  Accuracy: { Balanced: 3 },
}));

vi.mock('expo-router', () => ({
  router: routerSpy,
  useRouter: () => routerSpy,
  useLocalSearchParams: () => ({}),
  Stack: {
    Screen: ({ options }: any) => {
      const Reactx = require('react');
      return Reactx.createElement(
        Reactx.Fragment,
        null,
        typeof options?.headerTitle === 'function' ? options.headerTitle() : null,
      );
    },
  },
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
    Avatar: (props: any) => Reactx.createElement('MockView', props),
    CardHalo: ({ children, style }: any) => Reactx.createElement('MockView', { style }, children),
    ColorTile: ({ children, onPress, testID, style, title, stat, statLabel }: any) => {
      const body = Reactx.createElement(
        Reactx.Fragment,
        null,
        title != null ? Reactx.createElement('MockText', null, String(title)) : null,
        stat != null ? Reactx.createElement('MockText', null, String(stat)) : null,
        statLabel != null ? Reactx.createElement('MockText', null, String(statLabel)) : null,
        children,
      );
      return (
      onPress
        ? Reactx.createElement('MockPressable', { onPress, testID, style }, body)
        : Reactx.createElement('MockView', { testID, style }, body)
      );
    },
    MonthlyHeatmap: (props: any) => Reactx.createElement('MockView', { ...props, testID: 'monthly-heatmap' }),
    PriorityPill: (props: any) => Reactx.createElement('MockView', { ...props, testID: 'priority-pill' }),
    priorityLevelFromNumber: (p: number | null | undefined) => {
      const n = Number(p ?? 0);
      if (n >= 3) return 'high';
      if (n === 2) return 'med';
      if (n === 1) return 'low';
      return 'none';
    },
  };
});

vi.mock('@/src/components/ui/pacto/rhythm-variants', () => {
  const Reactx = require('react');
  return {
    RhythmHybrid: (props: any) => Reactx.createElement('MockView', { ...props, testID: 'rhythm-hybrid' }),
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

vi.mock('expo-location', () => locationMock);

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
    Extrapolation: { CLAMP: 'clamp' },
    Easing: { inOut: () => 0, out: (fn: any) => fn ?? 0, cubic: (v: any) => v, bezier: () => 0, ease: 0 },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedScrollHandler: (handlers: any) => handlers,
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
  memories: [],
  memoryPreview: null,
  activity: [] as any[],
  presence: null,
  isLoading: false,
  error: null,
  refetch: vi.fn(async () => undefined),
}));

vi.mock('@/src/hooks/useHomeTimeline', () => ({
  useHomeTimeline: () => homeState,
}));

const taskHookState = vi.hoisted(() => ({
  allTasks: [] as any[],
  toggleTask: vi.fn(async () => undefined),
}));

vi.mock('@/src/hooks/useTasks', () => ({
  useTasks: () => taskHookState,
}));

const reminderHookState = vi.hoisted(() => ({
  reminders: [] as any[],
  toggleComplete: vi.fn(async () => undefined),
}));

vi.mock('@/src/hooks/useReminders', () => ({
  useReminders: () => reminderHookState,
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

const activateNode = async (node: any) => {
  if (typeof node.props?.onPress === 'function') {
    await node.props.onPress();
    return;
  }
  if (typeof node.props?.onResponderRelease === 'function') {
    node.props.onStartShouldSetResponder?.();
    await node.props.onResponderRelease();
  }
};

const flattenStyle = (style: any) => {
  const value = typeof style === 'function' ? style({ pressed: false }) : style;
  return Array.isArray(value) ? value.flat(Infinity).filter(Boolean) : [value].filter(Boolean);
};

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
    locationMock.getForegroundPermissionsAsync.mockReset();
    locationMock.getForegroundPermissionsAsync.mockResolvedValue({ status: 'undetermined', granted: false });
    locationMock.requestForegroundPermissionsAsync.mockReset();
    locationMock.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true });
    locationMock.getCurrentPositionAsync.mockReset();
    locationMock.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 40.7128, longitude: -74.006 },
    });
    (globalThis as any).fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        current: { temperature_2m: 18, weather_code: 2 },
      }),
    }));
    homeState.refetch.mockReset();
    homeState.refetch.mockResolvedValue(undefined);
    sessionState.activeCouple = null;
    sessionState.isSolo = false;
    sessionState.isCouple = true;
    sessionState.space = { id: 'sp1', kind: 'couple', name: null, inviteCode: null };
    sessionState.partner = null;
    sessionState.user = { id: 'me', email: 'a@b', displayName: 'Mattia', avatarUrl: null };
    sessionState.profile = { id: 'me', displayName: 'Mattia', avatarUrl: null };
    sessionState.isFeatureEnabled = vi.fn(() => true);
    homeState.timeline = [];
    homeState.memories = [];
    homeState.memoryPreview = null;
    homeState.activity = [
      { dateKey: '2026-04-20', count: 1, weight: 1 },
      { dateKey: '2026-04-21', count: 3, weight: 3 },
    ];
    homeState.presence = null;
    homeState.todaySummary = { plans: { done: 0, total: 0 }, focus: { done: 0, total: 0 } };
    homeState.isLoading = false;
    homeState.error = null;
    taskHookState.allTasks = [];
    taskHookState.toggleTask.mockClear();
    reminderHookState.reminders = [];
    reminderHookState.toggleComplete.mockClear();
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
    expect(text).toContain('Weather needs location');
    expect(text).not.toContain('WEATHER STATUS');

    act(() => renderer.unmount());
  });

  it('does not seed quick stats progress when there are no tasks or reminders', async () => {
    homeState.activity = [];
    homeState.timeline = [];
    homeState.todaySummary = { plans: { done: 0, total: 0 }, focus: { done: 0, total: 0 } };

    const renderer = await renderHome();
    const text = allText(renderer).join('\n');

    expect(text).toContain('Tasks this week');
    expect(text).toContain('NO TASKS');
    expect(text).toContain('0 done');
    expect(text).not.toContain('0/1');
    expect(text).not.toContain('+1% TRACKED');

    act(() => renderer.unmount());
  });

  it('uses the email username in the header when a new account has no display name', async () => {
    sessionState.user = {
      id: 'me',
      email: 'new.account@example.com',
      displayName: null,
      avatarUrl: null,
    };
    sessionState.profile = {
      id: 'me',
      displayName: null,
      avatarUrl: null,
    };

    const renderer = await renderHome();
    const texts = allText(renderer);

    expect(texts).toContain('new.account');
    expect(texts).not.toContain('there');

    act(() => renderer.unmount());
  });

  it('keeps weather compact and requests Expo location when tapped', async () => {
    const renderer = await renderHome();
    const weatherCard = findByTestID(renderer, 'home-weather-card')[0];

    expect(weatherCard).toBeDefined();
    expect(flattenStyle(weatherCard.props.style)).toEqual(
      expect.arrayContaining([expect.objectContaining({ minHeight: 101 })]),
    );

    await act(async () => {
      await weatherCard.props.onPress();
      await flush();
    });

    expect(locationMock.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(locationMock.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 3 });

    act(() => renderer.unmount());
  });

  it('keeps the current signal icon color distinct from the weather icon', async () => {
    checkInsState.myTodayCheckIn = {
      id: 'checkin-low',
      authorId: 'me',
      mood: 'low',
      note: null,
      energy: 2,
      isPrivate: false,
      checkInDate: checkInsState.today,
      createdAt: Date.now(),
    };

    const renderer = await renderHome();
    const signalIcon = findByTestID(renderer, 'home-checkin-signal-icon')[0];
    const weatherIcon = findByTestID(renderer, 'home-weather-icon')[0];

    expect(signalIcon.props.color).toBeDefined();
    expect(weatherIcon.props.color).toBeDefined();
    expect(signalIcon.props.color).not.toBe(weatherIcon.props.color);

    act(() => renderer.unmount());
  });

  it('loads weather automatically when location was already allowed', async () => {
    locationMock.getForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'granted', granted: true });

    const renderer = await renderHome();
    await act(async () => {
      await flush();
    });

    const text = allText(renderer).join('\n');
    expect(text).toContain('18°');
    expect(text).toContain('Partly cloudy');
    expect(locationMock.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(locationMock.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 3 });

    act(() => renderer.unmount());
  });

  it('does not surface retired memory-date cards in the redesigned home stack', async () => {
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

    const renderer = await renderHome();
    const texts = allText(renderer);
    const text = texts.join('\n');

    expect(text).not.toContain('MEMORY DATE');
    expect(text).not.toContain('Tasks, targets, reminders, and memory dates due in the next 30 days.');
    expect(text).not.toContain('MILESTONES');
    expect(texts.indexOf('QUICK STATS')).toBeGreaterThanOrEqual(0);
    expect(texts.indexOf('UP NEXT')).toBeGreaterThan(texts.indexOf('QUICK STATS'));
    expect(text).not.toContain('MOMENTS');
    expect(text).not.toContain('NOW PLAYING · FOCUS MIX');

    act(() => renderer.unmount());
  });

  it('replaces the old activity heatmap and fake lower sections with the richer home widgets', async () => {
    const renderer = await renderHome();
    const texts = allText(renderer);
    const text = texts.join('\n');

    expect(findByTestID(renderer, 'activity-heatmap')).toHaveLength(0);
    expect(texts).toContain('QUICK STATS');
    expect(texts).toContain('UP NEXT');
    expect(text).not.toContain('FOCUS SESSION · 25 MIN');
    expect(text).not.toContain('REMINDERS TODAY');
    expect(text).not.toContain('NOW PLAYING · FOCUS MIX');
    expect(text).not.toContain('MOMENTS');

    act(() => renderer.unmount());
  });

  it('renders timeline items in the up-next stack without the old coming-up cover', async () => {
    homeState.timeline = [
      {
        id: 'task:default-cover',
        type: 'task',
        sourceId: 'default-cover',
        sourceTable: 'tasks',
        title: 'Task without image',
        subtitle: null,
        occursAt: localDayAt(2, 19),
        priority: 0,
        isPrivate: false,
        isOverdue: false,
      },
    ];

    const fallbackRenderer = await renderHome();

    expect(allText(fallbackRenderer)).toContain('Task without image');
    expect(findByTestID(fallbackRenderer, 'home-timeline-task-default-cover').length).toBeGreaterThan(0);
    expect(findByTestID(fallbackRenderer, 'home-coming-cover-fallback')).toHaveLength(0);
    expect(findByTestID(fallbackRenderer, 'home-coming-cover-image')).toHaveLength(0);

    act(() => fallbackRenderer.unmount());

    homeState.timeline = [
      {
        id: 'event:image-cover',
        type: 'event',
        sourceId: 'image-cover',
        sourceTable: 'events',
        title: 'Dinner booking',
        subtitle: null,
        occursAt: localDayAt(3, 20),
        priority: 0,
        isPrivate: false,
        isOverdue: false,
        coverImageUrl: 'https://example.com/dinner.jpg',
      },
    ];

    const imageRenderer = await renderHome();

    expect(allText(imageRenderer)).toContain('Dinner booking');
    expect(findByTestID(imageRenderer, 'home-timeline-event-image-cover').length).toBeGreaterThan(0);
    expect(findByTestID(imageRenderer, 'home-coming-cover-image')).toHaveLength(0);
    expect(findByTestID(imageRenderer, 'home-coming-cover-fallback')).toHaveLength(0);

    act(() => imageRenderer.unmount());
  });

  it('renders up-next rows without a leading icon slot', async () => {
    homeState.timeline = [
      {
        id: 'task:no-leading-icon',
        type: 'task',
        sourceId: 'no-leading-icon',
        sourceTable: 'tasks',
        title: 'Task row without icon',
        subtitle: null,
        occursAt: localDayAt(1, 13),
        priority: 3,
        isPrivate: false,
        isOverdue: false,
      },
    ];

    const renderer = await renderHome();
    const row = findByTestID(renderer, 'home-timeline-task-no-leading-icon')[0];
    const iconImages = row.findAll((node: any) => node.props?.resizeMode === 'contain' && node.props?.tintColor);

    expect(iconImages).toHaveLength(0);
    expect(findByTestID(renderer, 'priority-pill')).toHaveLength(1);

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

  it('empty Today state explains there are no dated items and routes to the target sheet', async () => {
    const renderer = await renderHome();
    const empty = findByTestID(renderer, 'home-timeline-empty')[0];
    const text = allText(renderer).join('\n');

    expect(empty).toBeDefined();
    expect(text).toContain('No items dated today');
    expect(text).toContain('Schedule a target');
    expect(text).not.toContain('Add a plan');
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
    expect(text).not.toContain('Schedule a goal');
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

  it('timeline task item routes to the source task list when available', async () => {
    const occursAt = new Date();
    occursAt.setHours(12, 0, 0, 0);
    homeState.timeline = [
      {
        id: 'task:1',
        type: 'task',
        sourceId: '1',
        sourceParentId: 'list-1',
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
      await activateNode(btn);
    });
    expect(routerSpy.push).toHaveBeenCalledWith('/(tabs)/us/tasks/list-1?taskId=1');
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
      await activateNode(btn);
    });
    expect(routerSpy.push).toHaveBeenCalledWith('/(tabs)/us/plans');
    act(() => renderer.unmount());
  });

  it('timeline reminder item routes to /(tabs)/us/reminders', async () => {
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
      await activateNode(btn);
    });
    expect(routerSpy.push).toHaveBeenCalledWith('/(tabs)/us/reminders?reminderId=3');
    act(() => renderer.unmount());
  });

  it('timeline event item routes to Calendar with its selected date', async () => {
    const occursAt = new Date(2026, 3, 17, 18, 30, 0, 0);
    homeState.timeline = [
      {
        id: 'event:5',
        type: 'event',
        sourceId: '5',
        sourceTable: 'events',
        title: 'Dinner booking',
        subtitle: null,
        occursAt: occursAt.getTime(),
        priority: 0,
        isPrivate: false,
        isOverdue: false,
      },
    ];
    const renderer = await renderHome();
    const btn = findByTestID(renderer, 'home-timeline-event-5')[0];
    await act(async () => {
      await activateNode(btn);
    });
    expect(routerSpy.push).toHaveBeenCalledWith('/(tabs)/calendar?date=2026-04-17');
    act(() => renderer.unmount());
  });

  it('filters retired memory rows out of the home timeline', async () => {
    const occursAt = new Date();
    occursAt.setHours(11, 0, 0, 0);
    homeState.timeline = [
      {
        id: 'memory:love-note-1',
        type: 'memory',
        sourceId: 'love-note-1',
        sourceTable: 'retiredMemory',
        title: 'Love note',
        subtitle: 'You made the morning easier.',
        occursAt: occursAt.getTime(),
        priority: -1,
        isPrivate: false,
        isOverdue: false,
      },
    ];

    const renderer = await renderHome();
    expect(findByTestID(renderer, 'home-timeline-memory-love-note-1')).toHaveLength(0);
    expect(allText(renderer)).not.toContain('Love note');
    act(() => renderer.unmount());
  });

  it('filters shortcuts through enabled features', async () => {
    sessionState.isFeatureEnabled = vi.fn((featureId: string) => featureId === 'tasks');
    const renderer = await renderHome();
    const texts = allText(renderer);

    expect(texts).not.toContain('Note');
    expect(texts).not.toContain('Check in');

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
