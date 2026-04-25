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
  impactAsync: vi.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
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
    withSequence: (...args: any[]) => args[args.length - 1],
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

const menuState = vi.hoisted(() => ({
  lastOpened: null as any,
}));

vi.mock('@/src/components/ui/ActionMenu', () => ({
  useActionMenu: () => ({
    open: (payload: any) => {
      menuState.lastOpened = payload;
    },
    close: () => undefined,
  }),
  ActionMenuProvider: ({ children }: any) => <>{children}</>,
}));

const taskState = vi.hoisted(() => ({
  tasks: [] as any[],
  isLoading: false,
  toggle: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined),
  reorder: vi.fn(async () => undefined),
  update: vi.fn(async () => undefined),
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
    update: taskState.update,
  }),
}));

import { Alert } from 'react-native';
import TaskListDetail from '@/app/(tabs)/tasks/[listId]';
import { router } from 'expo-router';

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

function pickAction(key: string) {
  const action = menuState.lastOpened?.actions.find((a: any) => a.key === key);
  if (!action) throw new Error(`Action "${key}" not found in menu`);
  return action.onPress();
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
    taskState.update.mockClear();
    menuState.lastOpened = null;
    (router.push as any).mockClear?.();
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

  it('opens the action menu on long-press with edit/reorder/delete', async () => {
    taskState.tasks = [makeTask({ id: 't1' }), makeTask({ id: 't2', title: 'Other' })];
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TaskListDetail />); await flush(); });
    const pressable = renderer.root.findAll(
      (n: any) => typeof n.props?.onLongPress === 'function'
        && n.findAll((c: any) => c.props?.testID === 'task-row-t1-checkbox').length,
    )[0];
    await act(async () => { pressable.props.onLongPress(); await flush(); });
    expect(menuState.lastOpened).toBeTruthy();
    const keys = menuState.lastOpened.actions.map((a: any) => a.key);
    expect(keys).toEqual(['edit', 'reorder', 'delete']);
    act(() => renderer.unmount());
  });

  it('routes Edit to /sheets/new-task with id and listId', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TaskListDetail />); await flush(); });
    const pressable = renderer.root.findAll(
      (n: any) => typeof n.props?.onLongPress === 'function'
        && n.findAll((c: any) => c.props?.testID === 'task-row-t1-checkbox').length,
    )[0];
    await act(async () => { pressable.props.onLongPress(); await flush(); });
    await act(async () => { pickAction('edit'); await flush(); });
    expect(router.push).toHaveBeenCalledWith('/sheets/new-task?listId=l1&id=t1');
    act(() => renderer.unmount());
  });

  it('confirms then deletes via native Alert', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons: any) => {
      const destructive = buttons?.find((b: any) => b.style === 'destructive');
      destructive?.onPress?.();
    });
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TaskListDetail />); await flush(); });
    const pressable = renderer.root.findAll(
      (n: any) => typeof n.props?.onLongPress === 'function'
        && n.findAll((c: any) => c.props?.testID === 'task-row-t1-checkbox').length,
    )[0];
    await act(async () => { pressable.props.onLongPress(); await flush(); });
    await act(async () => { pickAction('delete'); await flush(); });
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(taskState.remove).toHaveBeenCalledWith('t1');
    alertSpy.mockRestore();
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

  it('enters reorder mode via menu and persists the new order on Done', async () => {
    taskState.tasks = [makeTask({ id: 't1', title: 'A' }), makeTask({ id: 't2', title: 'B' })];
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TaskListDetail />); await flush(); });

    const rowAPressable = renderer.root.findAll(
      (n: any) => typeof n.props?.onLongPress === 'function'
        && n.findAll((c: any) => c.props?.testID === 'task-row-t1-checkbox').length,
    )[0];
    await act(async () => { rowAPressable.props.onLongPress(); await flush(); });
    await act(async () => { pickAction('reorder'); await flush(); });

    const moveDown = renderer.root.findAll(
      (n: any) => n.props?.testID === 'task-row-t1-move-down',
    )[0];
    await act(async () => { moveDown.props.onPress(); await flush(); });

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
