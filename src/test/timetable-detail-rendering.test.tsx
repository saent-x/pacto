import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TimetableItem } from '@/src/lib/timetables-data';

(globalThis as any).__DEV__ = true;

vi.mock('expo-router', () => ({
  router: { back: vi.fn(), push: vi.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: 'tt-1' }),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('react-native-gesture-handler/ReanimatedSwipeable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const timetableState = vi.hoisted(() => ({
  remove: vi.fn(async () => undefined),
  timetable: {
    id: 'tt-1',
    title: 'Our meals this week',
    template: 'meals',
    share: 'shared',
  },
  items: [] as TimetableItem[],
}));

vi.mock('@/src/hooks/useTimetables', () => ({
  useTimetable: () => ({
    timetable: timetableState.timetable,
    items: timetableState.items,
    isLoading: false,
    remove: timetableState.remove,
  }),
}));

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => Promise.resolve();

const findByTestID = (renderer: any, id: string) =>
  renderer.root.findAll((node: any) => node.props?.testID === id)[0];

async function renderTimetable() {
  const { default: TimetableDetail } = await import('@/app/(tabs)/us/timetables/[id]');
  let renderer: any = null;
  await act(async () => {
    renderer = TestRenderer.create(<TimetableDetail />);
    await flush();
  });
  return renderer;
}

function item(id: string, day: number, start: number, dur: number, title: string): TimetableItem {
  return {
    id,
    day,
    start,
    dur,
    title,
    icon: 'coffee',
    color: '#F4A68C',
    ink: '#3A1F14',
    cat: 'Breakfast',
    who: 'both',
  };
}

describe('Timetable detail rendering', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-28T12:00:00Z'));
    timetableState.remove.mockClear();
    timetableState.items = [
      item('mon-breakfast', 1, 7, 1, 'Oat porridge'),
      item('tue-lunch', 2, 12.5, 1, 'Caprese sandwich'),
      item('tue-dinner', 2, 19.5, 1.5, 'Miso salmon'),
      item('fri-dinner', 5, 20, 2, 'Pizza night'),
    ];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to the day-first mobile timetable workspace', async () => {
    const renderer = await renderTimetable();

    expect(findByTestID(renderer, 'timetable-detail-body')).toBeDefined();
    expect(findByTestID(renderer, 'timetable-mode-row')).toBeDefined();
    expect(findByTestID(renderer, 'timetable-day-workspace')).toBeDefined();
    expect(findByTestID(renderer, 'timetable-day-time-7')).toBeDefined();
    expect(findByTestID(renderer, 'timetable-day-time-19')).toBeDefined();
    expect(findByTestID(renderer, 'timetable-day-block-tue-lunch')).toBeDefined();
    expect(findByTestID(renderer, 'timetable-day-block-tue-dinner')).toBeDefined();
    act(() => renderer.unmount());
  });

  it('renders week mode as a phone-width horizontal timetable, not a compressed seven-column board', async () => {
    const renderer = await renderTimetable();

    await act(async () => {
      findByTestID(renderer, 'timetable-mode-week').props.onPress();
      await flush();
    });

    const weekScroll = findByTestID(renderer, 'timetable-week-scroll');
    expect(weekScroll.props.horizontal).toBe(true);
    expect(weekScroll.props.showsHorizontalScrollIndicator).toBe(false);

    const columns = renderer.root.findAll(
      (node: any) =>
        typeof node.props?.testID === 'string' &&
        node.props.testID.startsWith('timetable-week-day-'),
    );
    expect(columns).toHaveLength(7);
    for (const column of columns) {
      expect(column.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ width: expect.any(Number) })]),
      );
    }

    expect(findByTestID(renderer, 'timetable-week-block-tue-lunch')).toBeDefined();
    act(() => renderer.unmount());
  });

  it('renders matrix mode as meal periods crossed with weekdays', async () => {
    const renderer = await renderTimetable();

    await act(async () => {
      findByTestID(renderer, 'timetable-mode-matrix').props.onPress();
      await flush();
    });

    expect(findByTestID(renderer, 'timetable-matrix-workspace')).toBeDefined();
    expect(findByTestID(renderer, 'timetable-matrix-row-breakfast')).toBeDefined();
    expect(findByTestID(renderer, 'timetable-matrix-row-lunch')).toBeDefined();
    expect(findByTestID(renderer, 'timetable-matrix-cell-lunch-1')).toBeDefined();
    expect(findByTestID(renderer, 'timetable-matrix-item-tue-lunch')).toBeDefined();
    act(() => renderer.unmount());
  });
});
