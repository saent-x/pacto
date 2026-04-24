import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-router', () => ({
  router: { push: vi.fn(), back: vi.fn() },
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  Stack: { Screen: () => null },
  Link: ({ children }: any) => <>{children}</>,
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('react-native-reanimated', () => {
  const Reactx = require('react');
  const MockView = (props: any) => Reactx.createElement('AnimatedView', props, props.children);
  const MockScrollView = (props: any) => Reactx.createElement('AnimatedScrollView', props, props.children);
  const chainable: any = {
    duration: () => chainable,
    delay: () => chainable,
    springify: () => chainable,
    damping: () => chainable,
    stiffness: () => chainable,
  };
  return {
    __esModule: true,
    default: { View: MockView, ScrollView: MockScrollView, createAnimatedComponent: (C: any) => C },
    View: MockView,
    ScrollView: MockScrollView,
    createAnimatedComponent: (C: any) => C,
    FadeIn: chainable,
    FadeInDown: chainable,
    LinearTransition: chainable,
    ZoomIn: chainable,
    Easing: { inOut: () => 0, out: (fn: any) => fn ?? 0, cubic: (v: any) => v, bezier: () => 0, ease: 0 },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (v: any) => v,
    withDelay: (_d: any, v: any) => v,
    useReducedMotion: () => false,
    useAnimatedProps: (fn: any) => fn(),
    interpolateColor: () => "#000000",
    withSpring: (v: any) => v,
    runOnJS: (fn: any) => fn,
  };
});

const state = vi.hoisted(() => ({
  lists: [] as any[],
  isLoading: false,
  error: null as any,
}));

vi.mock('@/src/hooks/useTaskLists', () => ({
  useTaskLists: () => state,
}));

import TasksList from '@/app/(tabs)/tasks/index';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

const flush = () => new Promise((r) => setTimeout(r, 0));

function readText(root: any) {
  return root
    .findAll((n: any) => typeof n.children?.[0] === 'string')
    .map((n: any) => n.children.join(''));
}

describe('TasksList index', () => {
  beforeEach(() => {
    state.lists = [];
    state.isLoading = false;
    state.error = null;
  });

  it('renders empty state when there are no lists', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TasksList />); await flush(); });
    expect(readText(renderer.root)).toContain('No lists yet');
    act(() => renderer.unmount());
  });

  it('renders a grid card per list and filters by category', async () => {
    state.lists = [
      { id: 'l1', name: 'Venice', icon: 'mapPin', colorKey: 'peach', category: 'Travel', done: 2, total: 5, createdAt: 1 },
      { id: 'l2', name: 'Apartment', icon: 'home', colorKey: 'mint', category: 'Home', done: 0, total: 3, createdAt: 2 },
    ];
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TasksList />); await flush(); });

    expect(readText(renderer.root)).toContain('Venice');
    expect(readText(renderer.root)).toContain('Apartment');

    const homePill = renderer.root.findAll(
      (n: any) => n.props?.testID === 'task-filter-Home',
    )[0];
    await act(async () => { homePill.props.onPress(); await flush(); });

    const labels = readText(renderer.root);
    expect(labels).toContain('Apartment');
    expect(labels).not.toContain('Venice');

    act(() => renderer.unmount());
  });

  it('renders an error card when the hook reports an error, dismissable on retry', async () => {
    state.error = new Error('boom');
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TasksList />); await flush(); });
    expect(readText(renderer.root)).toContain("Couldn't load tasks");

    const retry = renderer.root.findAll(
      (n: any) => n.props?.testID === 'tasks-error-retry',
    )[0];
    await act(async () => { retry.props.onPress(); await flush(); });
    expect(readText(renderer.root)).not.toContain("Couldn't load tasks");

    act(() => renderer.unmount());
  });
});
