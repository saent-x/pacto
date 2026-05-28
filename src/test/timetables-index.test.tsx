import React from 'react';
import { StyleSheet } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { pastels } from '@/src/lib/tokens';

vi.mock('expo-router', () => ({
  router: { back: vi.fn(), push: vi.fn() },
  Stack: { Screen: ({ options }: any) => <>{options?.headerTitle?.()}</> },
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('@/src/components/features/FeatureRouteGuard', () => ({
  FeatureRouteGuard: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/src/components/ui/Icon', () => ({
  Icon: (props: any) => React.createElement('Icon', props),
}));

vi.mock('@/src/components/ui/PressScale', () => ({
  PressScale: ({ children, onPress, style, accessibilityLabel }: any) =>
    React.createElement('PressScale', { onPress, style, accessibilityLabel }, children),
}));

vi.mock('@/src/components/ui/pacto', () => {
  const Reactx = require('react');
  return {
    ActionEmptyState: ({ title }: any) =>
      Reactx.createElement('ActionEmptyState', null, title),
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
    HeaderBrand: ({ eyebrow, title }: any) =>
      Reactx.createElement('HeaderBrand', null, `${eyebrow} ${title}`),
    PulsingDot: ({ color }: any) => Reactx.createElement('PulsingDot', { color }),
    SegmentedTabs: () => Reactx.createElement('SegmentedTabs'),
    StatBar: ({ primary, microVis }: any) =>
      Reactx.createElement('StatBar', null, primary, microVis),
    SwipeableRow: ({ children }: any) =>
      Reactx.createElement('SwipeableRow', null, children),
  };
});

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => ({
    mode: 'solo',
    user: { id: 'u-me', displayName: 'Me' },
    activeCouple: { couple: { id: 'space-1' } },
    isFeatureEnabled: () => true,
  }),
}));

vi.mock('@/src/lib/theme', async () => {
  const tokens =
    await vi.importActual<typeof import('@/src/lib/tokens')>('@/src/lib/tokens');
  return {
    useTheme: () => ({
      mode: 'light' as const,
      C: tokens.getTokens('light'),
      F: tokens.fonts,
    }),
  };
});

const timetableState = vi.hoisted(() => ({
  remove: vi.fn(async () => undefined),
  timetables: [
    {
      id: 'routine-1',
      title: 'Ritual',
      template: 'routine',
      share: 'solo',
      itemsCount: 0,
      dayCounts: [1, 2, 1, 1, 0, 1, 1],
      updatedAt: Date.parse('2026-05-21T10:00:00Z'),
    },
    {
      id: 'custom-1',
      title: 'Test Plan',
      template: 'custom',
      share: 'solo',
      itemsCount: 0,
      dayCounts: [0, 0, 0, 0, 0, 0, 0],
      updatedAt: Date.parse('2026-05-21T09:00:00Z'),
    },
    {
      id: 'meal-1',
      title: 'Meal plan',
      template: 'custom',
      share: 'solo',
      itemsCount: 7,
      dayCounts: [1, 1, 1, 1, 1, 1, 1],
      updatedAt: Date.parse('2026-04-23T09:00:00Z'),
    },
  ],
}));

vi.mock('@/src/hooks/useTimetables', () => ({
  useTimetables: () => ({
    timetables: timetableState.timetables,
    remove: timetableState.remove,
  }),
}));

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

describe('timetables index', () => {
  it('renders timetable rows with the template icon and color from the creation sheet', async () => {
    const { default: TimetablesIndex } = await import('@/app/(tabs)/us/timetables');
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<TimetablesIndex />);
    });

    const routineIcon = renderer.root.findByProps({ testID: 'timetable-row-icon-routine-1' });
    const customIcon = renderer.root.findByProps({ testID: 'timetable-row-icon-custom-1' });
    const mealsIcon = renderer.root.findByProps({ testID: 'timetable-row-icon-meal-1' });
    const routineTile = renderer.root.findByProps({ testID: 'timetable-row-icon-tile-routine-1' });
    const customTile = renderer.root.findByProps({ testID: 'timetable-row-icon-tile-custom-1' });

    expect(routineIcon.props.name).toBe('sun');
    expect(routineIcon.props.color).toBe(pastels.butterInk);
    expect(customIcon.props.name).toBe('grid');
    expect(customIcon.props.color).toBe(pastels.roseInk);
    expect(mealsIcon.props.name).toBe('coffee');
    expect(mealsIcon.props.color).toBe(pastels.peachInk);
    expect(StyleSheet.flatten(routineTile.props.style)).toMatchObject({
      backgroundColor: pastels.butter,
    });
    expect(StyleSheet.flatten(customTile.props.style)).toMatchObject({
      backgroundColor: pastels.rose,
    });

    act(() => renderer.unmount());
  });
});
