import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-router', () => ({
  router: { push: vi.fn(), back: vi.fn() },
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  Stack: { Screen: () => null },
  Link: ({ children }: any) => <>{children}</>,
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

vi.mock('@/src/lib/notifications', () => ({
  scheduleReminderNotification: vi.fn(async () => 'mock-id'),
  cancelReminderNotification: vi.fn(async () => undefined),
  ensureNotificationPermission: vi.fn(async () => true),
}));

const sessionState = vi.hoisted(() => ({
  status: 'authenticated' as const,
  user: { id: 'u-me', email: 'me@x', displayName: 'Me', avatarUrl: null },
  profile: null as any,
  activeCouple: {
    couple: { id: 'c1', name: null, anniversary: null },
    memberCount: 2,
    partner: { id: 'u-sofia', displayName: 'Sofia', avatarUrl: null },
  },
  space: null as any,
  partner: null as any,
  isSolo: false,
  isCouple: true,
}));

const reminderState = vi.hoisted(() => ({
  reminders: [] as any[],
  upcoming: [] as any[],
  completed: [] as any[],
  isLoading: false,
  error: null as any,
  toggle: vi.fn(async () => undefined),
  snooze: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined),
  create: vi.fn(async () => undefined),
  update: vi.fn(async () => undefined),
}));

vi.mock('@/src/hooks/useSession', () => ({ useSession: () => sessionState }));
vi.mock('@/src/hooks/useReminders', () => ({
  useReminders: () => ({
    reminders: reminderState.reminders,
    upcoming: reminderState.upcoming,
    completed: reminderState.completed,
    isLoading: reminderState.isLoading,
    error: reminderState.error,
    toggleComplete: reminderState.toggle,
    snooze: reminderState.snooze,
    remove: reminderState.remove,
    create: reminderState.create,
    update: reminderState.update,
    refetch: async () => undefined,
  }),
}));

import RemindersScreen from '@/app/(tabs)/reminders/index';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

const flush = () => new Promise((r) => setTimeout(r, 0));

function readText(root: any) {
  return root
    .findAll((n: any) => typeof n.children?.[0] === 'string')
    .map((n: any) => n.children.join(''));
}

function makeReminder(over: any = {}) {
  return {
    id: 'r1',
    couple_id: 'c1',
    created_by: 'u-me',
    assigned_to: null,
    title: 'Call mom',
    description: null,
    due_at: new Date(Date.now() + 3600_000).toISOString(),
    recurrence: null,
    is_completed: false,
    completed_at: null,
    completed_by: null,
    priority: 2,
    category: 'General',
    created_at: '2026-04-23T00:00:00Z',
    updated_at: '2026-04-23T00:00:00Z',
    ...over,
  };
}

function resetState() {
  sessionState.isSolo = false;
  reminderState.reminders = [];
  reminderState.upcoming = [];
  reminderState.completed = [];
  reminderState.isLoading = false;
  reminderState.error = null;
  reminderState.toggle.mockClear();
  reminderState.snooze.mockClear();
  reminderState.remove.mockClear();
  reminderState.create.mockClear();
}

function syncBuckets() {
  reminderState.upcoming = reminderState.reminders.filter((r) => !r.is_completed);
  reminderState.completed = reminderState.reminders.filter((r) => r.is_completed);
}

describe('Reminders screen interactions', () => {
  beforeEach(() => {
    resetState();
  });

  it('renders the summary card with the active count', async () => {
    reminderState.reminders = [
      makeReminder({ id: 'r1' }),
      makeReminder({ id: 'r2' }),
      makeReminder({ id: 'r3' }),
      makeReminder({ id: 'r4', is_completed: true }),
    ];
    syncBuckets();
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<RemindersScreen />); await flush(); });
    expect(readText(renderer.root)).toContain('3');
    expect(readText(renderer.root)).toContain('active');
    act(() => renderer.unmount());
  });

  it('shows the empty state when there are no reminders', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<RemindersScreen />); await flush(); });
    const empty = renderer.root.findAll((n: any) => n.props?.testID === 'reminders-empty');
    expect(empty.length).toBeGreaterThan(0);
    act(() => renderer.unmount());
  });

  it('shows the loading skeleton while the query is pending', async () => {
    reminderState.isLoading = true;
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<RemindersScreen />); await flush(); });
    const skel = renderer.root.findAll((n: any) => n.props?.testID === 'reminders-hero-skeleton');
    expect(skel.length).toBeGreaterThan(0);
    act(() => renderer.unmount());
  });

  it('shows the error state and dismisses on retry', async () => {
    reminderState.error = new Error('boom');
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<RemindersScreen />); await flush(); });
    expect(readText(renderer.root)).toContain("Couldn't load reminders");

    const retry = renderer.root.findAll((n: any) => n.props?.testID === 'reminders-error-retry')[0];
    await act(async () => { retry.props.onPress(); await flush(); });
    expect(readText(renderer.root)).not.toContain("Couldn't load reminders");
    act(() => renderer.unmount());
  });

  it('filters to Mine (hides shared + partner rows)', async () => {
    reminderState.reminders = [
      makeReminder({ id: 'r-mine', title: 'Mine one', assigned_to: 'u-me' }),
      makeReminder({ id: 'r-partner', title: 'Sofia one', assigned_to: 'u-sofia' }),
      makeReminder({ id: 'r-shared', title: 'Shared one', assigned_to: null }),
    ];
    syncBuckets();
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<RemindersScreen />); await flush(); });

    const minePill = renderer.root.findAll((n: any) => n.props?.testID === 'reminder-filter-Mine')[0];
    await act(async () => { minePill.props.onPress(); await flush(); });

    const labels = readText(renderer.root);
    expect(labels).toContain('Mine one');
    expect(labels).not.toContain('Sofia one');
    expect(labels).not.toContain('Shared one');
    act(() => renderer.unmount());
  });

  it('hides Theirs filter when the session is solo', async () => {
    sessionState.isSolo = true;
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<RemindersScreen />); await flush(); });
    const theirs = renderer.root.findAll((n: any) => n.props?.testID === 'reminder-filter-Theirs');
    expect(theirs.length).toBe(0);
    act(() => renderer.unmount());
  });

  it('toggles complete when the checkbox is tapped', async () => {
    reminderState.reminders = [makeReminder()];
    syncBuckets();
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<RemindersScreen />); await flush(); });

    const checkbox = renderer.root.findAll(
      (n: any) => n.props?.testID === 'reminder-row-r1-checkbox',
    )[0];
    await act(async () => { checkbox.props.onPress(); await flush(); });
    expect(reminderState.toggle).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('completes on left-swipe open', async () => {
    reminderState.reminders = [makeReminder()];
    syncBuckets();
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<RemindersScreen />); await flush(); });

    const swipeable = renderer.root.findAll((n: any) => n.type === 'Swipeable')[0];
    await act(async () => { swipeable.props.triggerLeft(); await flush(); });
    expect(reminderState.toggle).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('snoozes when the snooze action is tapped', async () => {
    reminderState.reminders = [makeReminder()];
    syncBuckets();
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<RemindersScreen />); await flush(); });

    const swipeable = renderer.root.findAll((n: any) => n.type === 'Swipeable')[0];
    await act(async () => { swipeable.props.triggerRight(); await flush(); });

    const snooze = renderer.root.findAll(
      (n: any) => n.props?.testID === 'reminder-row-r1-snooze-action',
    )[0];
    await act(async () => { snooze.props.onPress(); await flush(); });
    expect(reminderState.snooze).toHaveBeenCalledTimes(1);
    expect(reminderState.snooze.mock.calls[0][0].id).toBe('r1');
    act(() => renderer.unmount());
  });

  it('deletes when the delete action is tapped', async () => {
    reminderState.reminders = [makeReminder()];
    syncBuckets();
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<RemindersScreen />); await flush(); });

    const swipeable = renderer.root.findAll((n: any) => n.type === 'Swipeable')[0];
    await act(async () => { swipeable.props.triggerRight(); await flush(); });

    const del = renderer.root.findAll(
      (n: any) => n.props?.testID === 'reminder-row-r1-delete-action',
    )[0];
    await act(async () => { del.props.onPress(); await flush(); });
    expect(reminderState.remove).toHaveBeenCalledWith('r1');
    act(() => renderer.unmount());
  });

  it('groups upcoming by due_at bucket (Today vs Tomorrow)', async () => {
    const today = new Date();
    today.setHours(18, 0, 0, 0);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    reminderState.reminders = [
      makeReminder({ id: 'r-today', title: 'Today item', due_at: today.toISOString() }),
      makeReminder({ id: 'r-tomorrow', title: 'Tomorrow item', due_at: tomorrow.toISOString() }),
    ];
    syncBuckets();
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<RemindersScreen />); await flush(); });

    const labels = readText(renderer.root);
    expect(labels).toContain('TODAY');
    expect(labels).toContain('TOMORROW');
    act(() => renderer.unmount());
  });
});
