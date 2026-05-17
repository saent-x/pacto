import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-router', () => ({
  router: { back: vi.fn(), push: vi.fn() },
  useLocalSearchParams: () => ({ listId: 'list-1' }),
  Stack: { Screen: () => null },
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(async () => undefined),
  selectionAsync: vi.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const listsState = vi.hoisted(() => ({
  lists: [
    {
      id: 'list-1',
      name: 'Travel',
      icon: 'mapPin',
      colorKey: 'sky',
      category: null,
      done: 0,
      total: 0,
      createdAt: 0,
    },
  ],
}));

const taskItemsState = vi.hoisted(() => ({
  create: vi.fn(async () => undefined),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => ({
    mode: 'pair',
    isFeatureEnabled: () => true,
  }),
}));

vi.mock('@/src/hooks/useTaskLists', () => ({
  useTaskLists: () => ({ lists: listsState.lists, isLoading: false, error: null }),
}));

vi.mock('@/src/hooks/useTasks', () => ({
  useTaskItems: () => ({ create: taskItemsState.create }),
}));

import NewTask, { buildBuckets } from '@/app/sheets/new-task';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

const flush = () => new Promise((r) => setTimeout(r, 0));

function findByTestID(root: any, id: string) {
  return root.findAll((n: any) => n.props?.testID === id)[0];
}

describe('new-task sheet', () => {
  beforeEach(() => {
    taskItemsState.create.mockClear();
    (router.back as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
  });

  it('buildBuckets exposes 5 buckets with a dynamic next-month label', () => {
    const apr = new Date(2026, 3, 23); // April → next month 'May'
    const buckets = buildBuckets(apr);
    expect(buckets.map((b) => b.label)).toEqual(['Today', 'Tomorrow', 'This week', 'May', 'Later']);
    expect(buckets[3].offsetDays).toBe(8); // Apr 23 → May 1

    const dec = new Date(2026, 11, 28); // December → next month 'Jan' (year wrap)
    const decBuckets = buildBuckets(dec);
    expect(decBuckets[3].label).toBe('Jan');
    expect(decBuckets[3].offsetDays).toBe(4); // Dec 28 → Jan 1
  });

  it('renders 5 bucket pills including the dynamic next-month label', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewTask />);
      await flush();
    });
    const expected = buildBuckets().map((b) => b.label);
    for (const label of expected) {
      expect(findByTestID(renderer.root, `new-task-bucket-${label}`)).toBeDefined();
    }
    act(() => renderer.unmount());
  });

  it('disables save while title is empty, enables after typing', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewTask />);
      await flush();
    });
    const input = findByTestID(renderer.root, 'new-task-title-input');
    expect(input).toBeDefined();
    // PrimaryButton disabled prop: find by searching for a component where disabled=true
    const findDisabled = () =>
      renderer.root.findAll((n: any) => n.props?.disabled === true && n.props?.icon === 'check')
        .length > 0;
    expect(findDisabled()).toBe(true);
    await act(async () => {
      input.props.onChangeText('Pack bags');
      await flush();
    });
    expect(findDisabled()).toBe(false);
    act(() => renderer.unmount());
  });

  it('saving calls create with Today offset, fires haptic, calls router.back', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewTask />);
      await flush();
    });
    const input = findByTestID(renderer.root, 'new-task-title-input');
    await act(async () => {
      input.props.onChangeText('Pack bags');
      await flush();
    });
    const primary = renderer.root.findAll(
      (n: any) => n.props?.icon === 'check' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
    )[0];
    await act(async () => {
      primary.props.onPress();
      await flush();
    });
    expect(taskItemsState.create).toHaveBeenCalledTimes(1);
    const call = taskItemsState.create.mock.calls[0][0];
    expect(call.title).toBe('Pack bags');
    expect(call.priority).toBe(2);
    expect(call.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('selecting Later bucket sets due_date to null and priority swap carries through', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewTask />);
      await flush();
    });
    const input = findByTestID(renderer.root, 'new-task-title-input');
    await act(async () => { input.props.onChangeText('Someday'); await flush(); });
    await act(async () => { findByTestID(renderer.root, 'new-task-bucket-Later').props.onPress(); await flush(); });
    await act(async () => { findByTestID(renderer.root, 'new-task-priority-high').props.onPress(); await flush(); });
    const primary = renderer.root.findAll(
      (n: any) => n.props?.icon === 'check' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
    )[0];
    await act(async () => { primary.props.onPress(); await flush(); });
    const call = taskItemsState.create.mock.calls[0][0];
    expect(call.due_date).toBeNull();
    expect(call.priority).toBe(3);
    act(() => renderer.unmount());
  });
});
