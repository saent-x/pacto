import React from 'react';
import { Pressable } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WeekDay } from '@/src/lib/calendar/builders';
import type { TimelineItem } from '@/src/lib/home/types';

vi.hoisted(() => {
  (globalThis as any).__DEV__ = true;
  process.env.EXPO_OS = 'ios';
  (globalThis as any).expo = {
    EventEmitter: class {
      addListener() {
        return { remove: () => undefined };
      }
    },
  };
});

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(async () => undefined),
}));

vi.mock('expo-audio', () => ({
  useAudioPlayer: () => ({
    play: vi.fn(),
    pause: vi.fn(),
    seekTo: vi.fn(),
  }),
}));

vi.mock('expo-router', () => ({
  router: { push: vi.fn() },
  useRouter: () => ({ push: vi.fn() }),
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('react-native-gesture-handler/ReanimatedSwipeable', () => ({
  default: (props: any) => props.children,
}));

vi.mock('react-native-reanimated', () => {
  const Reactx = require('react');
  const MockView = (props: any) => Reactx.createElement('AnimatedView', props, props.children);
  MockView.displayName = 'AnimatedView';
  const MockScrollView = (props: any) =>
    Reactx.createElement('AnimatedScrollView', props, props.children);
  MockScrollView.displayName = 'AnimatedScrollView';
  const fadeChain: any = {
    duration: () => fadeChain,
    delay: () => fadeChain,
    springify: () => fadeChain,
  };
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
    FadeIn: fadeChain,
    Easing: { inOut: () => 0, out: (fn: any) => fn ?? 0, cubic: (v: any) => v, bezier: () => 0, ease: 0 },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (v: any) => v,
    withDelay: (_d: any, v: any) => v,
    useReducedMotion: () => false,
    useAnimatedProps: (fn: any) => fn(),
    interpolateColor: () => "#000000",
    withSpring: (v: any) => v,
    withRepeat: (v: any) => v,
    withSequence: (...args: any[]) => args[args.length - 1],
  };
});

const calendarState = vi.hoisted(() => ({
  isLoading: false,
  month: '2026-04',
  monthLabel: 'April 2026',
  selectedDate: '2026-04-17',
  today: '2026-04-17',
  week: [] as WeekDay[],
  agenda: [] as TimelineItem[],
  heroStats: { total: 0, shared: 0, upcoming: 0, nextInHours: null as number | null },
  tomorrow: null as any,
  selectDate: vi.fn(),
  goToPreviousMonth: vi.fn(),
  goToNextMonth: vi.fn(),
  goToToday: vi.fn(),
}));

vi.mock('@/src/lib/calendar/context', () => ({
  useCalendar: () => calendarState,
  CalendarProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => ({
    mode: 'pair',
    partner: { id: 'partner-1', displayName: 'Sam' },
    isFeatureEnabled: () => true,
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

const flush = () => new Promise((r) => setTimeout(r, 0));

async function renderCalendar() {
  const { default: Calendar } = await import('@/app/(tabs)/calendar');
  let renderer: any = null;
  await act(async () => {
    renderer = TestRenderer.create(<Calendar />);
    await flush();
  });
  return renderer;
}

const findByTestID = (renderer: any, id: string) =>
  renderer.root.findAll((node: any) => node.props?.testID === id);

function hasText(renderer: any, text: string) {
  return renderer.root.findAll((node: any) => node.children?.join?.('') === text).length > 0;
}

function timelineItem(
  id: string,
  type: TimelineItem['type'],
  occursAt: number,
  extra: Partial<TimelineItem> = {},
): TimelineItem {
  return {
    id,
    type,
    sourceId: id,
    sourceTable: type === 'event' ? 'events' : type + 's',
    title: `${type} title ${id}`,
    subtitle: null,
    occursAt,
    priority: 0,
    isPrivate: false,
    isOverdue: false,
    ...extra,
  };
}

function makeWeek(): WeekDay[] {
  const dates = ['2026-04-13', '2026-04-14', '2026-04-15', '2026-04-16', '2026-04-17', '2026-04-18', '2026-04-19'];
  return dates.map((date) => ({
    date,
    dayNum: Number(date.slice(8, 10)),
    hasEvent: false,
    isToday: date === '2026-04-17',
    isSelected: date === '2026-04-17',
  }));
}

describe('Calendar · event + state rendering', () => {
  beforeEach(() => {
    calendarState.isLoading = false;
    calendarState.selectedDate = '2026-04-17';
    calendarState.week = makeWeek();
    calendarState.agenda = [];
    calendarState.heroStats = { total: 0, shared: 0, upcoming: 0, nextInHours: null };
    calendarState.tomorrow = null;
  });

  it('keeps the empty agenda state visible while loading without cached agenda data', async () => {
    calendarState.isLoading = true;
    calendarState.week = makeWeek().map((d) => ({ ...d, hasEvent: false }));
    const renderer = await renderCalendar();
    expect(hasText(renderer, 'FRIDAY · 17 APR')).toBe(true);
    expect(hasText(renderer, 'Nothing on the books for this day.')).toBe(true);
    act(() => renderer.unmount());
  });

  it('shows empty-agenda card when no events on selected day', async () => {
    const renderer = await renderCalendar();
    expect(hasText(renderer, 'FRIDAY · 17 APR')).toBe(true);
    expect(hasText(renderer, 'Nothing on the books for this day.')).toBe(true);
    act(() => renderer.unmount());
  });

  it('renders one agenda row per timeline item title', async () => {
    calendarState.agenda = [
      timelineItem('e1', 'event', Date.parse('2026-04-17T18:00:00Z')),
      timelineItem('r1', 'reminder', Date.parse('2026-04-17T09:00:00Z')),
      timelineItem('t1', 'task', Date.parse('2026-04-17T14:00:00Z')),
    ];
    const renderer = await renderCalendar();
    expect(hasText(renderer, 'event title e1')).toBe(true);
    expect(hasText(renderer, 'reminder title r1')).toBe(true);
    expect(hasText(renderer, 'task title t1')).toBe(true);
    expect(hasText(renderer, 'Nothing on the books for this day.')).toBe(false);
    act(() => renderer.unmount());
  });

  it('buckets agenda rows by time of day', async () => {
    calendarState.agenda = [
      timelineItem('r1', 'reminder', Date.parse('2026-04-17T09:00:00Z')),
      timelineItem('t1', 'task', Date.parse('2026-04-17T14:00:00Z')),
      timelineItem('e1', 'event', Date.parse('2026-04-17T20:00:00Z')),
    ];
    const renderer = await renderCalendar();
    expect(hasText(renderer, 'Morning')).toBe(true);
    expect(hasText(renderer, 'Afternoon')).toBe(true);
    expect(hasText(renderer, 'Evening')).toBe(true);
    act(() => renderer.unmount());
  });

  it('renders all-day agenda rows without a timestamp', async () => {
    calendarState.agenda = [
      timelineItem('e1', 'event', 0),
    ];
    const renderer = await renderCalendar();
    expect(hasText(renderer, 'All day')).toBe(true);
    expect(hasText(renderer, 'all day')).toBe(true);
    act(() => renderer.unmount());
  });

  it('uses Today as the empty agenda title for the selected current date', async () => {
    calendarState.selectedDate = new Date().toISOString().slice(0, 10);
    const renderer = await renderCalendar();
    expect(hasText(renderer, 'Today')).toBe(true);
    act(() => renderer.unmount());
  });

  it('routes the empty agenda action to the reminder sheet', async () => {
    const { router } = await import('expo-router');
    (router.push as any).mockClear();
    const renderer = await renderCalendar();
    const addAction = renderer.root.findAll(
      (n: any) =>
        n.type === Pressable &&
        typeof n.props?.onPress === 'function' &&
        n.findAll((child: any) => child.children?.join?.('') === 'Add reminder').length > 0,
    );
    expect(addAction).toHaveLength(1);
    await act(async () => {
      addAction[0].props.onPress();
      await flush();
    });
    expect(router.push).toHaveBeenCalledWith('/sheets/new-reminder');
    act(() => renderer.unmount());
  });
});
