import React from 'react';
import { StyleSheet } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-router', () => ({
  router: { push: vi.fn(), back: vi.fn() },
  Stack: { Screen: () => null },
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('@/src/components/features/FeatureRouteGuard', () => ({
  FeatureRouteGuard: ({ children }: any) => <>{children}</>,
}));

const planState = vi.hoisted(() => ({
  plans: [] as any[],
  remove: vi.fn(async () => undefined),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => ({
    mode: 'pair',
    isFeatureEnabled: () => true,
  }),
}));

vi.mock('@/src/hooks/usePlans', () => ({
  usePlans: () => ({
    plans: planState.plans,
    remove: planState.remove,
  }),
}));

import PlansScreen from '@/app/(tabs)/us/plans';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));

function readText(root: any) {
  return root
    .findAll((n: any) => typeof n.children?.[0] === 'string')
    .flatMap((n: any) => n.children.filter((c: any) => typeof c === 'string'));
}

function descendantText(node: any): string[] {
  return node.children.flatMap((child: any) =>
    typeof child === 'string' ? [child] : descendantText(child),
  );
}

describe('Plans screen priority display', () => {
  beforeEach(() => {
    planState.plans = [];
    planState.remove.mockClear();
  });

  it('shows a visible priority badge on target rows', async () => {
    planState.plans = [
      {
        id: 'plan-high',
        title: 'Venice trip',
        description: '3 days holiday',
        category: 'This month',
        targetDate: null,
        budget: null,
        status: 'active',
        priority: 3,
        icon: 'compass',
      },
    ];

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<PlansScreen />);
      await flush();
    });

    const labels = readText(renderer.root);
    expect(labels).toContain('Venice trip');
    expect(labels).toContain('HIGH');

    act(() => renderer.unmount());
  });

  it('marks personal and shared targets in the mixed Spaces view', async () => {
    planState.plans = [
      {
        id: 'plan-personal',
        title: 'Solo target',
        description: null,
        category: 'This month',
        targetDate: null,
        budget: null,
        status: 'active',
        priority: 2,
        isPrivate: true,
      },
      {
        id: 'plan-shared',
        title: 'Shared target',
        description: null,
        category: 'This month',
        targetDate: null,
        budget: null,
        status: 'active',
        priority: 2,
        isPrivate: false,
      },
    ];

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<PlansScreen />);
      await flush();
    });

    const labels = readText(renderer.root);
    expect(labels).toContain('mine');
    expect(labels).toContain('shared');

    act(() => renderer.unmount());
  });

  it('uses a compact left status dot instead of the old row color bar', async () => {
    planState.plans = [
      {
        id: 'plan-active',
        title: 'Venice trip',
        category: 'This month',
        status: 'active',
        priority: 2,
        color: '#99C3DC',
      },
      {
        id: 'plan-planning',
        title: 'Run a Business',
        category: 'This month',
        status: 'planning',
        priority: 2,
        color: '#DE6A52',
      },
    ];

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<PlansScreen />);
      await flush();
    });

    const activeDot = renderer.root.findByProps({ testID: 'target-status-dot-plan-active' });
    const planningDot = renderer.root.findByProps({ testID: 'target-status-dot-plan-planning' });
    const activeStyle = StyleSheet.flatten(activeDot.props.style);
    const planningStyle = StyleSheet.flatten(planningDot.props.style);

    expect(activeStyle).toMatchObject({
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 7,
    });
    expect(activeStyle.alignSelf).not.toBe('stretch');
    expect(activeStyle.backgroundColor).toBeDefined();
    expect(planningStyle.backgroundColor).toBeDefined();
    expect(activeStyle.backgroundColor).not.toBe(planningStyle.backgroundColor);

    act(() => renderer.unmount());
  });

  it('keeps target description and bucket metadata on the same line', async () => {
    planState.plans = [
      {
        id: 'plan-venice',
        title: 'Venice trip',
        description: '3 days holiday',
        category: 'This month',
        targetDate: null,
        budget: null,
        status: 'active',
        priority: 2,
        color: '#C97891',
      },
    ];

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<PlansScreen />);
      await flush();
    });

    const metaRows = renderer.root.findAll((n: any) => {
      const style = StyleSheet.flatten(n.props?.style);
      const labels = descendantText(n).join('');
      return (
        style?.flexDirection === 'row' &&
        style?.alignItems === 'center' &&
        labels.includes('3 days holiday') &&
        labels.includes('· THIS MONTH')
      );
    });

    expect(metaRows).toHaveLength(1);
    expect(StyleSheet.flatten(metaRows[0].props.style)).toMatchObject({
      flexDirection: 'row',
      alignItems: 'center',
    });

    const bucketLabel = metaRows[0].findAll((n: any) => {
      const style = StyleSheet.flatten(n.props?.style);
      return (
        style?.textTransform === 'uppercase' &&
        descendantText(n).join('').includes('· THIS MONTH')
      );
    })[0];
    expect(StyleSheet.flatten(bucketLabel.props.style)).toMatchObject({
      lineHeight: 18,
      textAlignVertical: 'center',
    });

    act(() => renderer.unmount());
  });

  it('does not show the metadata separator when only the bucket is available', async () => {
    planState.plans = [
      {
        id: 'plan-business',
        title: 'Run a Business',
        description: '',
        category: 'This month',
        targetDate: null,
        budget: null,
        status: 'active',
        priority: 2,
        color: '#99C3DC',
      },
    ];

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<PlansScreen />);
      await flush();
    });

    const bucketLabel = renderer.root.findAll((n: any) => {
      const style = StyleSheet.flatten(n.props?.style);
      return (
        style?.textTransform === 'uppercase' &&
        descendantText(n).join('').includes('THIS MONTH')
      );
    })[0];

    expect(descendantText(bucketLabel).join('')).toBe('THIS MONTH');

    act(() => renderer.unmount());
  });

  it('does not crash when a legacy target date is malformed', async () => {
    planState.plans = [
      {
        id: 'plan-imported',
        title: 'Imported target',
        description: 'Date needs cleanup',
        category: 'Legacy',
        targetDate: 'not-a-date',
        budget: null,
        status: 'active',
        priority: 1,
        color: '#99C3DC',
      },
    ];

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<PlansScreen />);
      await flush();
    });

    const labels = readText(renderer.root);
    const text = labels.join(' ');
    expect(labels).toContain('Imported target');
    expect(labels).toContain('Date needs cleanup');
    expect(text).toContain('LEGACY');

    act(() => renderer.unmount());
  });
});
