import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TimetableItem } from '@/src/lib/timetables-data';

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

const routerPush = vi.hoisted(() => vi.fn());

vi.mock('expo-router', () => ({
  router: { back: vi.fn(), push: routerPush },
  Stack: {
    Screen: ({ options }: any) => (
      <>
        {options?.headerLeft?.()}
        {options?.headerTitle?.()}
        {options?.headerRight?.()}
      </>
    ),
  },
  useLocalSearchParams: () => ({ id: 'tt-1' }),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('react-native', async () => {
  const actual: any = await vi.importActual('react-native');
  return {
    ...actual,
    useWindowDimensions: () => ({
      width: 397,
      height: 962,
      scale: 2,
      fontScale: 1,
    }),
  };
});

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn(async () => undefined),
  notificationAsync: vi.fn(async () => undefined),
  selectionAsync: vi.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => ({
    mode: 'pair',
    user: { id: 'u-me', displayName: 'Avery' },
    partner: { id: 'u-partner', displayName: 'River' },
    isFeatureEnabled: () => true,
  }),
}));

vi.mock('@/src/components/ui/Icon', () => {
  const Reactx = require('react');
  return {
    Icon: (props: any) => Reactx.createElement('Icon', props),
  };
});

vi.mock('@/src/components/ui/PressScale', () => {
  const Reactx = require('react');
  return {
    PressScale: ({ children, onPress, ...props }: any) =>
      Reactx.createElement('PressScale', { ...props, onPress }, children),
  };
});

vi.mock('@/src/components/ui/pacto', () => {
  const Reactx = require('react');
  return {
    ActionEmptyState: ({ icon, title, body, actionLabel, onAction }: any) =>
      Reactx.createElement(
        'ActionEmptyState',
        { icon },
        Reactx.createElement('Text', null, title),
        body ? Reactx.createElement('Text', null, body) : null,
        actionLabel
          ? Reactx.createElement('PressScale', { onPress: onAction }, actionLabel)
          : null,
      ),
    BucketedList: ({ buckets, rowKey, renderRow }: any) =>
      Reactx.createElement(
        'BucketedList',
        null,
        buckets.flatMap((bucket: any) =>
          bucket.rows.map((row: any) =>
            Reactx.createElement(Reactx.Fragment, { key: rowKey(row) }, renderRow(row)),
          ),
        ),
      ),
    SwipeableRow: (props: any) =>
      Reactx.createElement('MockSwipeableRow', props, props.children),
    HeaderBrand: ({ eyebrow, title }: any) =>
      Reactx.createElement('HeaderBrand', null, `${eyebrow} ${title}`),
    SegmentedTabs: ({ options, onChange }: any) =>
      Reactx.createElement(
        'SegmentedTabs',
        null,
        options.map((option: any) =>
          Reactx.createElement('PressScale', { key: option.key, onPress: () => onChange(option.key) }, option.key),
        ),
      ),
  };
});

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

function pressablesWithText(renderer: any, text: string | RegExp) {
  return renderer.root.findAll((node: any) => {
    if (node.type !== 'PressScale') return false;
    if (typeof node.props?.onPress !== 'function') return false;
    const rendered = nodeText(node);
    return typeof text === 'string' ? rendered.includes(text) : text.test(rendered);
  });
}

const findByTestID = (renderer: any, id: string) =>
  renderer.root.findAll(
    (node: any) => typeof node.type !== 'function' && node.props?.testID === id,
  );

function nodeText(node: any): string {
  return node.children
    .map((child: any) => {
      if (typeof child === 'string') return child;
      if (child && typeof child === 'object') return nodeText(child);
      return '';
    })
    .join('');
}

describe('Timetable detail rendering', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-28T12:00:00Z'));
    routerPush.mockClear();
    timetableState.remove.mockClear();
    timetableState.timetable = {
      id: 'tt-1',
      title: 'Our meals this week',
      template: 'meals',
      share: 'shared',
    };
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

  it('renders only the header add route trigger for a populated grid timetable', async () => {
    const renderer = await renderTimetable();

    expect(pressablesWithText(renderer, /^Add to /)).toHaveLength(0);

    const addRouteTriggers = renderer.root.findAll(
      (node: any) =>
        node.type === 'PressScale' &&
        typeof node.props?.onPress === 'function' &&
        node.findAll((child: any) => child.props?.name === 'plus').length > 0,
    );
    expect(addRouteTriggers).toHaveLength(1);

    await act(async () => {
      addRouteTriggers[0].props.onPress();
      await flush();
    });

    expect(routerPush).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledWith('/sheets/new-timetable-item?timetableId=tt-1');
    act(() => renderer.unmount());
  });

  it('keeps the empty timetable Add block action', async () => {
    timetableState.items = [];
    const renderer = await renderTimetable();

    const emptyAddActions = pressablesWithText(renderer, 'Add block');
    expect(emptyAddActions).toHaveLength(1);

    await act(async () => {
      emptyAddActions[0].props.onPress();
      await flush();
    });

    expect(routerPush).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledWith('/sheets/new-timetable-item?timetableId=tt-1');
    act(() => renderer.unmount());
  });

  it('hides timetable controls and add actions when the timetable is missing', async () => {
    timetableState.timetable = null as any;
    timetableState.items = [];
    const renderer = await renderTimetable();

    expect(nodeText(renderer.root)).toContain('Timetable not found');
    expect(pressablesWithText(renderer, 'grid')).toHaveLength(0);
    expect(pressablesWithText(renderer, 'list')).toHaveLength(0);

    const addRouteTriggers = renderer.root.findAll(
      (node: any) =>
        node.type === 'PressScale' &&
        typeof node.props?.onPress === 'function' &&
        node.findAll((child: any) => child.props?.name === 'plus').length > 0,
    );
    expect(addRouteTriggers).toHaveLength(0);

    act(() => renderer.unmount());
  });

  it('adds edit and delete swipe actions to timetable detail items', async () => {
    const renderer = await renderTimetable();

    const rows = renderer.root.findAll((node: any) => node.type === 'MockSwipeableRow');
    expect(rows.length).toBeGreaterThan(0);

    const lunchRow = rows.find((row: any) => nodeText(row).includes('Caprese sandwich'));
    expect(lunchRow?.props.onEdit).toEqual(expect.any(Function));
    expect(lunchRow?.props.onDelete).toEqual(expect.any(Function));

    await act(async () => {
      lunchRow.props.onEdit();
      await flush();
    });
    expect(routerPush).toHaveBeenCalledWith(
      '/sheets/new-timetable-item?timetableId=tt-1&id=tue-lunch',
    );

    let deleteResult: Promise<void> | undefined;
    await act(async () => {
      deleteResult = lunchRow.props.onDelete();
      await deleteResult;
      await flush();
    });
    expect(deleteResult).toEqual(expect.any(Promise));
    expect(timetableState.remove).toHaveBeenCalledWith('tue-lunch');
    act(() => renderer.unmount());
  });

});
