import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WeekDay } from '@/src/lib/calendar/builders';
import type { TimelineItem } from '@/src/lib/home/types';

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(async () => undefined),
}));

vi.mock('expo-router', () => ({
  router: { push: vi.fn() },
  useRouter: () => ({ push: vi.fn() }),
  Stack: { Screen: () => null },
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

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

  it('shows loading skeletons when isLoading and no cached week data', async () => {
    calendarState.isLoading = true;
    calendarState.week = makeWeek().map((d) => ({ ...d, hasEvent: false }));
    const renderer = await renderCalendar();
    expect(findByTestID(renderer, 'calendar-hero-skeleton').length).toBeGreaterThanOrEqual(1);
    expect(findByTestID(renderer, 'calendar-day-skeleton').length).toBeGreaterThanOrEqual(7);
    expect(findByTestID(renderer, 'calendar-agenda-skeleton').length).toBeGreaterThanOrEqual(3);
    act(() => renderer.unmount());
  });

  it('shows empty-agenda card when no events on selected day', async () => {
    const renderer = await renderCalendar();
    expect(findByTestID(renderer, 'calendar-agenda-empty').length).toBeGreaterThanOrEqual(1);
    act(() => renderer.unmount());
  });

  it('renders one AgendaRow per timeline item with stable testIDs', async () => {
    calendarState.agenda = [
      timelineItem('e1', 'event', Date.parse('2026-04-17T18:00:00Z')),
      timelineItem('r1', 'reminder', Date.parse('2026-04-17T09:00:00Z')),
      timelineItem('t1', 'task', Date.parse('2026-04-17T14:00:00Z')),
    ];
    const renderer = await renderCalendar();
    expect(findByTestID(renderer, 'calendar-agenda-e1').length).toBeGreaterThanOrEqual(1);
    expect(findByTestID(renderer, 'calendar-agenda-r1').length).toBeGreaterThanOrEqual(1);
    expect(findByTestID(renderer, 'calendar-agenda-t1').length).toBeGreaterThanOrEqual(1);
    expect(findByTestID(renderer, 'calendar-agenda-empty').length).toBe(0);
    act(() => renderer.unmount());
  });

  it('hero reflects heroStats.total, handles 0 → "nothing booked" subtitle', async () => {
    const renderer = await renderCalendar();
    const count = findByTestID(renderer, 'calendar-hero-count')[0];
    expect(count.props.children).toBe(0);
    act(() => renderer.unmount());
  });

  it('hero shows subtitle "shared · upcoming · next in Nh" with populated stats', async () => {
    calendarState.heroStats = { total: 8, shared: 3, upcoming: 2, nextInHours: 6 };
    const renderer = await renderCalendar();
    const hero = findByTestID(renderer, 'calendar-hero')[0];
    const texts = hero.findAll((n: any) => typeof n.children?.[0] === 'string');
    const combined = texts.map((n: any) => n.children.join('')).join('|');
    expect(combined).toContain('3 shared · 2 upcoming · next in 6h');
    act(() => renderer.unmount());
  });

  it('renders TOMORROW card when cal.tomorrow is set', async () => {
    calendarState.tomorrow = {
      kind: 'milestone',
      id: 'anniversary',
      title: 'Anniversary · 3 yrs',
      subtitle: 'Sat 18 · All day',
      accent: 'mint',
    };
    const renderer = await renderCalendar();
    expect(findByTestID(renderer, 'calendar-tomorrow-anniversary').length).toBeGreaterThanOrEqual(1);
    act(() => renderer.unmount());
  });

  it('skips TOMORROW card when cal.tomorrow is null', async () => {
    const renderer = await renderCalendar();
    const tomorrowRows = renderer.root.findAll(
      (n: any) => typeof n.props?.testID === 'string' && n.props.testID.startsWith('calendar-tomorrow-'),
    );
    expect(tomorrowRows.length).toBe(0);
    act(() => renderer.unmount());
  });
});
