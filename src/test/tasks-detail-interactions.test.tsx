import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-router', () => ({
  router: { push: vi.fn(), back: vi.fn() },
  useLocalSearchParams: () => ({ listId: 'l1' }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(async () => undefined),
  selectionAsync: vi.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

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

vi.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => <>{children}</>,
  GestureDetector: ({ children }: any) => <>{children}</>,
  Gesture: {
    Pan: () => ({
      enabled: () => ({
        activeOffsetY: () => ({ onStart: () => ({ onUpdate: () => ({ onEnd: () => ({}) }) }) }),
      }),
    }),
  },
}));

vi.mock('react-native-gesture-handler/ReanimatedSwipeable', () => ({
  __esModule: true,
  default: ({ children, onSwipeableOpen, renderLeftActions, renderRightActions }: any) => {
    const Reactx = require('react');
    return Reactx.createElement(
      'Swipeable',
      {
        triggerLeft: () => onSwipeableOpen?.('left'),
        triggerRight: () => onSwipeableOpen?.('right'),
      },
      [renderLeftActions?.(), renderRightActions?.(), children],
    );
  },
}));

const taskState = vi.hoisted(() => ({
  tasks: [] as any[],
  isLoading: false,
  toggle: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined),
  reorder: vi.fn(async () => undefined),
}));

const listState = vi.hoisted(() => ({
  lists: [] as any[],
  isLoading: false,
  error: null as any,
}));

vi.mock('@/src/hooks/useTaskLists', () => ({
  useTaskLists: () => listState,
}));

vi.mock('@/src/hooks/useTasks', () => ({
  useTaskItems: () => ({
    tasks: taskState.tasks,
    isLoading: taskState.isLoading,
    toggleComplete: taskState.toggle,
    remove: taskState.remove,
    reorder: taskState.reorder,
  }),
}));

import TaskListDetail from '@/app/(tabs)/tasks/[listId]';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

const flush = () => new Promise((r) => setTimeout(r, 0));

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function makeTask(over: any = {}) {
  return {
    id: 't1',
    couple_id: 'c',
    title: 'Pack bags',
    notes: null,
    category: null,
    is_completed: false,
    completed_at: null,
    completed_by: null,
    assigned_to: null,
    due_date: todayIso(),
    priority: 2,
    sort_order: 0,
    created_by: 'u',
    created_at: '2026-04-22T00:00:00Z',
    updated_at: '2026-04-22T00:00:00Z',
    ...over,
  };
}

describe('Task list detail interactions', () => {
  beforeEach(() => {
    listState.lists = [
      { id: 'l1', name: 'Venice', icon: 'mapPin', colorKey: 'peach', category: 'Travel', done: 0, total: 1, createdAt: 1 },
    ];
    taskState.tasks = [makeTask()];
    taskState.toggle.mockClear();
    taskState.remove.mockClear();
    taskState.reorder.mockClear();
  });

  it('renders the list header with name + task title', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TaskListDetail />); await flush(); });
    const labels = renderer.root
      .findAll((n: any) => typeof n.children?.[0] === 'string')
      .map((n: any) => n.children.join(''));
    expect(labels).toContain('Venice');
    expect(labels).toContain('Pack bags');
    act(() => renderer.unmount());
  });

  it('toggles complete when the checkbox is tapped', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TaskListDetail />); await flush(); });
    const checkbox = renderer.root.findAll(
      (n: any) => n.props?.testID === 'task-row-t1-checkbox',
    )[0];
    await act(async () => { checkbox.props.onPress(); await flush(); });
    expect(taskState.toggle).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('toggles complete on left-swipe open', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TaskListDetail />); await flush(); });
    const swipeable = renderer.root.findAll((n: any) => n.type === 'Swipeable')[0];
    await act(async () => { swipeable.props.triggerLeft(); await flush(); });
    expect(taskState.toggle).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('deletes on right-swipe open', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TaskListDetail />); await flush(); });
    const swipeable = renderer.root.findAll((n: any) => n.type === 'Swipeable')[0];
    await act(async () => { swipeable.props.triggerRight(); await flush(); });
    expect(taskState.remove).toHaveBeenCalledWith('t1');
    act(() => renderer.unmount());
  });

  it('shows the empty state when there are no tasks', async () => {
    taskState.tasks = [];
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TaskListDetail />); await flush(); });
    const labels = renderer.root
      .findAll((n: any) => typeof n.children?.[0] === 'string')
      .map((n: any) => n.children.join(''));
    expect(labels).toContain('All clear.');
    act(() => renderer.unmount());
  });

  it('enters reorder mode on long-press and persists the new order on Done', async () => {
    taskState.tasks = [makeTask({ id: 't1', title: 'A' }), makeTask({ id: 't2', title: 'B' })];
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TaskListDetail />); await flush(); });

    const rowA = renderer.root.findAll(
      (n: any) => n.props?.testID === 'task-row-t1',
    )[0];
    // The long-press is wired onto the inner Pressable; walk down to it.
    const rowAPressable = renderer.root.findAll(
      (n: any) => typeof n.props?.onLongPress === 'function'
        && n.findAll((c: any) => c.props?.testID === 'task-row-t1-checkbox').length,
    )[0];
    await act(async () => { rowAPressable.props.onLongPress(); await flush(); });

    // In reorder mode, the move-down on t1 should swap with t2.
    const moveDown = renderer.root.findAll(
      (n: any) => n.props?.testID === 'task-row-t1-move-down',
    )[0];
    await act(async () => { moveDown.props.onPress(); await flush(); });

    // Press Done (section label is 'TODAY' after upper-casing).
    const doneBtn = renderer.root.findAll(
      (n: any) => typeof n.props?.testID === 'string' && n.props.testID.startsWith('task-reorder-done-'),
    )[0];
    await act(async () => { doneBtn.props.onPress(); await flush(); });

    expect(taskState.reorder).toHaveBeenCalledTimes(1);
    const arg = (taskState.reorder as any).mock.calls[0][0];
    expect(arg[0]).toBe('t2');
    expect(arg[1]).toBe('t1');

    act(() => renderer.unmount());
  });
});
