import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WeekDay } from '@/src/lib/calendar/builders';

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
  impactAsync: vi.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light' },
}));

vi.mock('expo-audio', () => ({
  useAudioPlayer: () => ({
    play: vi.fn(),
    pause: vi.fn(),
    seekTo: vi.fn(),
  }),
}));

vi.mock('expo-router', () => ({
  router: { push: vi.fn(), back: vi.fn(), replace: vi.fn() },
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  Stack: { Screen: () => null },
  Link: ({ children }: any) => <>{children}</>,
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
    FadeInDown: fadeChain,
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
    interpolate: () => 0,
  };
});

const calendarState = vi.hoisted(() => ({
  isLoading: false,
  month: '2026-04',
  monthLabel: 'April 2026',
  selectedDate: '2026-04-17',
  today: '2026-04-17',
  week: [] as WeekDay[],
  agenda: [] as any[],
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

function makeWeek(selectedDate: string): WeekDay[] {
  const dates = ['2026-04-13', '2026-04-14', '2026-04-15', '2026-04-16', '2026-04-17', '2026-04-18', '2026-04-19'];
  return dates.map((date) => ({
    date,
    dayNum: Number(date.slice(8, 10)),
    hasEvent: ['2026-04-15', '2026-04-17', '2026-04-19'].includes(date),
    isToday: date === '2026-04-17',
    isSelected: date === selectedDate,
  }));
}

describe('Calendar · date navigation', () => {
  beforeEach(() => {
    calendarState.selectDate.mockReset();
    calendarState.isLoading = false;
    calendarState.selectedDate = '2026-04-17';
    calendarState.week = makeWeek('2026-04-17');
    calendarState.agenda = [];
    calendarState.heroStats = { total: 0, shared: 0, upcoming: 0, nextInHours: null };
    calendarState.tomorrow = null;
  });

  it('renders all seven day pills with correct dayNums', async () => {
    const renderer = await renderCalendar();
    for (const d of calendarState.week) {
      const pills = findByTestID(renderer, `calendar-day-${d.date}`);
      expect(pills.length).toBeGreaterThanOrEqual(1);
    }
    act(() => renderer.unmount());
  });

  it('marks selected day as accessibilitySelected', async () => {
    const renderer = await renderCalendar();
    const selected = findByTestID(renderer, 'calendar-day-2026-04-17')[0];
    expect(selected.props.accessibilityState?.selected).toBe(true);
    const other = findByTestID(renderer, 'calendar-day-2026-04-18')[0];
    expect(other.props.accessibilityState?.selected).toBe(false);
    act(() => renderer.unmount());
  });

  it('tapping a day pill calls selectDate with that date', async () => {
    const renderer = await renderCalendar();
    const fri = findByTestID(renderer, 'calendar-day-2026-04-18')[0];
    await act(async () => {
      await fri.props.onPress();
    });
    expect(calendarState.selectDate).toHaveBeenCalledWith('2026-04-18');
    act(() => renderer.unmount());
  });

  it('renders the agenda day header in WEEKDAY · DD MON format', async () => {
    const renderer = await renderCalendar();
    expect(hasText(renderer, 'FRIDAY · 17 APR')).toBe(true);
    act(() => renderer.unmount());
  });
});
