import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as any).__DEV__ = true;
  (globalThis as any).expo = {
    EventEmitter: class {
      addListener() {
        return { remove: () => undefined };
      }
    },
  };
});

vi.mock('expo-router', () => ({
  router: { push: vi.fn(), back: vi.fn() },
  useLocalSearchParams: () => ({ listId: 'l1' }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  Stack: {
    Screen: ({ options }: any) =>
      typeof options?.header === 'function' ? options.header() : null,
  },
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(async () => undefined),
  selectionAsync: vi.fn(async () => undefined),
  impactAsync: vi.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

vi.mock('@/src/components/ui/pacto/HeroPactoBadge', () => {
  const Reactx = require('react');
  return {
    HeroPactoBadge: (props: any) =>
      Reactx.createElement('MockHeroPactoBadge', props),
  };
});

vi.mock('@/src/components/ui/pacto/Checkbox', () => {
  const Reactx = require('react');
  return {
    Checkbox: (props: any) =>
      Reactx.createElement('MockCheckbox', {
        ...props,
        onPress: () => props.onChange?.(!props.checked),
      }),
  };
});

vi.mock('@/src/components/ui/pacto/SwipeableRow', () => {
  const Reactx = require('react');
  return {
    SwipeableRow: (props: any) =>
      Reactx.createElement('MockSwipeableRow', props, props.children),
  };
});

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
    withRepeat: (v: any) => v,
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

vi.mock('@react-native-menu/menu', () => {
  const Reactx = require('react');
  return {
    MenuView: (props: any) =>
      Reactx.createElement('MockMenuView', props, props.children),
  };
});

const taskState = vi.hoisted(() => ({
  tasks: [] as any[],
  isLoading: false,
  toggle: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined),
  reorder: vi.fn(async () => undefined),
  update: vi.fn(async () => undefined),
  create: vi.fn(async () => undefined),
}));

const listState = vi.hoisted(() => ({
  lists: [] as any[],
  isLoading: false,
  error: null as any,
}));

vi.mock('@/src/hooks/useTaskLists', () => ({
  useTaskLists: () => listState,
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => ({
    user: { id: 'u1' },
    partner: { id: 'u2', displayName: 'Sam' },
    mode: 'pair',
    isFeatureEnabled: () => true,
  }),
}));

vi.mock('@/src/hooks/useTasks', () => ({
  useTaskItems: () => ({
    tasks: taskState.tasks,
    isLoading: taskState.isLoading,
    toggleComplete: taskState.toggle,
    remove: taskState.remove,
    reorder: taskState.reorder,
    update: taskState.update,
    create: taskState.create,
  }),
}));

import TaskListDetail from '@/app/(tabs)/us/tasks/[listId]';
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

function findMenuFor(root: any, predicate: (n: any) => boolean) {
  const menus = root.findAll((n: any) => n.type === 'MockSwipeableRow');
  return menus.find((m: any) => m.findAll(predicate).length > 0);
}

function findRowMenu(root: any, taskId: string) {
  const menu = findMenuFor(
    root,
    (n: any) => typeof n.children?.[0] === 'string' && n.children.join('') === (taskId === 't1' ? 'Pack bags' : 'Other'),
  );
  if (!menu) throw new Error(`MockSwipeableRow for task ${taskId} not found`);
  return menu;
}

function findByTestID(root: any, testID: string) {
  return root.findAll((n: any) => n.props?.testID === testID)[0];
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
    taskState.create.mockClear();
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

  it('renders due dates as human-readable labels instead of raw ISO dates', async () => {
    taskState.tasks = [makeTask({ due_date: '2099-05-21' })];
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TaskListDetail />); await flush(); });
    const labels = renderer.root
      .findAll((n: any) => typeof n.children?.[0] === 'string')
      .map((n: any) => n.children.join(''));
    expect(labels).toContain('MAY 21');
    expect(labels).not.toContain('2099-05-21');
    act(() => renderer.unmount());
  });

  it('labels unassigned tasks in a personal list as mine instead of shared', async () => {
    listState.lists = [
      {
        id: 'l1',
        name: 'Private errands',
        icon: 'lock',
        colorKey: 'peach',
        category: 'Personal',
        done: 0,
        total: 1,
        createdAt: 1,
        scope: 'personal',
      },
    ];
    taskState.tasks = [makeTask({ assigned_to: null })];
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TaskListDetail />); await flush(); });
    const labels = renderer.root
      .findAll((n: any) => typeof n.children?.[0] === 'string')
      .map((n: any) => n.children.join(''));
    expect(labels).toContain('mine');
    expect(labels).not.toContain('shared');
    act(() => renderer.unmount());
  });

  it('toggles complete when the checkbox is tapped', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TaskListDetail />); await flush(); });
    const checkbox = renderer.root.findAll((n: any) => n.type === 'MockCheckbox')[0];
    await act(async () => { checkbox.props.onPress(); await flush(); });
    expect(taskState.toggle).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('mounts swipe actions on each task row with edit/delete', async () => {
    taskState.tasks = [makeTask({ id: 't1' }), makeTask({ id: 't2', title: 'Other' })];
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TaskListDetail />); await flush(); });
    const menu = findRowMenu(renderer.root, 't1');
    expect(menu.props.onEdit).toEqual(expect.any(Function));
    expect(menu.props.onDelete).toEqual(expect.any(Function));
    expect(menu.props.deleteTitle).toBe('Delete task?');
    act(() => renderer.unmount());
  });

  it('routes Edit to /sheets/new-task with id and listId', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TaskListDetail />); await flush(); });
    const menu = findRowMenu(renderer.root, 't1');
    await act(async () => { await menu.props.onEdit(); await flush(); });
    expect(router.push).toHaveBeenCalledWith('/sheets/new-task?listId=l1&id=t1');
    act(() => renderer.unmount());
  });

  it('deletes through the row delete action', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TaskListDetail />); await flush(); });
    const menu = findRowMenu(renderer.root, 't1');
    await act(async () => { await menu.props.onDelete(); await flush(); });
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
    expect(labels).toContain('Nothing on this list');
    act(() => renderer.unmount());
  });

  it('hides add controls when the task list route does not resolve', async () => {
    listState.lists = [];
    taskState.tasks = [];
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TaskListDetail />); await flush(); });
    const labels = renderer.root
      .findAll((n: any) => typeof n.children?.[0] === 'string')
      .map((n: any) => n.children.join(''));
    expect(labels).toContain('List not found');
    expect(labels).not.toContain('Nothing on this list');
    expect(renderer.root.findAll((n: any) => n.props?.accessibilityLabel === 'Add task')).toHaveLength(0);
    act(() => renderer.unmount());
  });

  it('does not render the old bottom quick-add composer', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<TaskListDetail />); await flush(); });
    expect(findByTestID(renderer.root, 'task-detail-quickadd-input')).toBeUndefined();
    expect(findByTestID(renderer.root, 'task-detail-quickadd-send')).toBeUndefined();
    act(() => renderer.unmount());
  });
});
