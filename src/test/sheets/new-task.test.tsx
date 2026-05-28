import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const routeParamsState = vi.hoisted(() => ({
  value: { listId: 'list-1' } as { listId?: string; id?: string },
}));

vi.mock('expo-router', () => ({
  router: { back: vi.fn(), push: vi.fn() },
  useLocalSearchParams: () => routeParamsState.value,
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

const dateTimePickerAndroidState = vi.hoisted(() => ({
  open: vi.fn(),
}));

vi.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: (props: any) => React.createElement('DateTimePicker', props),
  DateTimePickerAndroid: {
    open: dateTimePickerAndroidState.open,
    dismiss: vi.fn(async () => true),
  },
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
  isLoading: false,
}));

const taskItemsState = vi.hoisted(() => ({
  create: vi.fn(async () => undefined),
  update: vi.fn(async () => undefined),
  isLoading: false,
  tasks: [] as Array<{
    id: string;
    title: string;
    due_date: string | null;
    priority: number;
  }>,
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => ({
    mode: 'pair',
    isFeatureEnabled: () => true,
  }),
}));

vi.mock('@/src/hooks/useTaskLists', () => ({
  useTaskLists: () => ({
    lists: listsState.lists,
    isLoading: listsState.isLoading,
    error: null,
  }),
}));

vi.mock('@/src/hooks/useTasks', () => ({
  useTaskItems: () => ({
    create: taskItemsState.create,
    update: taskItemsState.update,
    isLoading: taskItemsState.isLoading,
    tasks: taskItemsState.tasks,
  }),
}));

import NewTask, { buildBuckets } from '@/app/sheets/new-task';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform, StyleSheet } from 'react-native';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const originalOS = Platform.OS;

const flush = () => new Promise((r) => setTimeout(r, 0));

function findByTestID(root: any, id: string) {
  return root.findAll((n: any) => n.props?.testID === id || n.props?.['data-testid'] === id)[0];
}

function findPressableByTestID(root: any, id: string) {
  return root.findAll(
    (n: any) => n.props?.testID === id && typeof n.props?.onPress === 'function',
  )[0];
}

describe('new-task sheet', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
    routeParamsState.value = { listId: 'list-1' };
    listsState.lists = [
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
    ];
    listsState.isLoading = false;
    taskItemsState.tasks = [];
    taskItemsState.isLoading = false;
    taskItemsState.create.mockClear();
    taskItemsState.update.mockClear();
    (router.back as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
    dateTimePickerAndroidState.open.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
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
    expect(findByTestID(renderer.root, 'new-task-bucket-Date')).toBeUndefined();
    act(() => renderer.unmount());
  });

  it('renders date as a native date field separate from the bucket presets', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewTask />);
      await flush();
    });
    expect(findByTestID(renderer.root, 'new-task-bucket-Date')).toBeUndefined();
    expect(findByTestID(renderer.root, 'new-task-date-picker-control')).toBeDefined();
    act(() => renderer.unmount());
  });

  it('puts the native date field before the quick when presets', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewTask />);
      await flush();
    });
    const orderedTestIDs = renderer.root
      .findAll((n: any) => typeof n.props?.testID === 'string')
      .map((n: any) => n.props.testID);
    expect(orderedTestIDs.indexOf('new-task-date')).toBeLessThan(
      orderedTestIDs.indexOf('new-task-bucket-Today'),
    );
    act(() => renderer.unmount());
  });

  it('keeps spacing between the native date field and quick when presets', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewTask />);
      await flush();
    });
    const spacedRows = renderer.root.findAll((n: any) => {
      const style = StyleSheet.flatten(n.props?.style);
      return typeof style?.marginBottom === 'number' && style.marginBottom >= 8;
    });
    expect(spacedRows.length).toBeGreaterThan(0);
    act(() => renderer.unmount());
  });

  it('renders priority choices as priority bars instead of arrow icons', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewTask />);
      await flush();
    });
    const high = findByTestID(renderer.root, 'new-task-priority-high');
    expect(findByTestID(high, 'new-task-priority-glyph-high')).toBeDefined();
    expect(high.findAll((n: any) => n.props?.name === 'chevronsUp')).toHaveLength(0);
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

  it('keeps save disabled when the parent list cannot be resolved', async () => {
    listsState.lists = [];
    routeParamsState.value = { listId: 'not-a-uuid' };
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewTask />);
      await flush();
    });
    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('List missing');
    expect(text).toContain('could not be found');
    expect(findByTestID(renderer.root, 'new-task-title-input')).toBeUndefined();
    const enabledSave = renderer.root.findAll(
      (n: any) => n.props?.icon === 'check' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
    )[0];
    expect(enabledSave).toBeUndefined();
    act(() => renderer.unmount());
  });

  it('shows a loading state while the parent list is resolving', async () => {
    listsState.lists = [];
    listsState.isLoading = true;
    routeParamsState.value = { listId: 'list-1' };
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewTask />);
      await flush();
    });
    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('Loading list');
    expect(text).toContain('Loading this list');
    expect(text).not.toContain('List missing');
    expect(findByTestID(renderer.root, 'new-task-title-input')).toBeUndefined();
    expect(
      renderer.root.findAll(
        (n: any) => n.props?.icon === 'check' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
      )[0],
    ).toBeUndefined();
    act(() => renderer.unmount());
  });

  it('keeps save disabled when editing a task that cannot be resolved', async () => {
    routeParamsState.value = { listId: 'list-1', id: 'missing-task' };
    taskItemsState.tasks = [];
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewTask />);
      await flush();
    });

    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('Task missing');
    expect(text).toContain('could not be found');
    expect(findByTestID(renderer.root, 'new-task-title-input')).toBeUndefined();

    const enabledSave = renderer.root.findAll(
      (n: any) => n.props?.icon === 'check' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
    )[0];
    expect(enabledSave).toBeUndefined();
    expect(taskItemsState.update).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('shows a loading state while the edited task is resolving', async () => {
    routeParamsState.value = { listId: 'list-1', id: 'task-1' };
    taskItemsState.tasks = [];
    taskItemsState.isLoading = true;
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewTask />);
      await flush();
    });

    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('Loading task');
    expect(text).toContain('Loading this task');
    expect(text).not.toContain('Task missing');
    expect(findByTestID(renderer.root, 'new-task-title-input')).toBeUndefined();
    expect(
      renderer.root.findAll(
        (n: any) => n.props?.icon === 'check' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
      )[0],
    ).toBeUndefined();

    act(() => renderer.unmount());
  });

  it('hydrates edit fields when the task row resolves after initial render', async () => {
    routeParamsState.value = { listId: 'list-1', id: 'task-1' };
    taskItemsState.tasks = [];
    taskItemsState.isLoading = true;
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewTask />);
      await flush();
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('Loading task');
    expect(findByTestID(renderer.root, 'new-task-title-input')).toBeUndefined();

    await act(async () => {
      taskItemsState.tasks = [
        {
          id: 'task-1',
          title: 'Pack bags',
          due_date: '2030-07-09',
          priority: 3,
        },
      ];
      taskItemsState.isLoading = false;
      renderer.update(<NewTask />);
      await flush();
    });

    expect(findByTestID(renderer.root, 'new-task-title-input').props.value).toBe('Pack bags');

    act(() => renderer.unmount());
  });

  it('does not roll malformed legacy edit due dates into real dates on save', async () => {
    routeParamsState.value = { listId: 'list-1', id: 'task-legacy' };
    taskItemsState.tasks = [
      {
        id: 'task-legacy',
        title: 'Imported task',
        due_date: '2026-04-31',
        priority: 2,
      },
    ];

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewTask />);
      await flush();
    });

    const primary = renderer.root.findAll(
      (n: any) => n.props?.icon === 'check' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
    )[0];
    await act(async () => {
      primary.props.onPress();
      await flush();
    });

    expect(taskItemsState.update).toHaveBeenCalledTimes(1);
    expect(taskItemsState.update.mock.calls[0][0]).toBe('task-legacy');
    expect(taskItemsState.update.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        due_date: null,
      }),
    );
    expect(JSON.stringify(taskItemsState.update.mock.calls[0][1])).not.toContain('2026-05-01');

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

  it('saves the Today bucket using the local date around midnight', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-04-17T23:30:00.000Z'));

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewTask />);
      await flush();
    });
    const input = findByTestID(renderer.root, 'new-task-title-input');
    await act(async () => {
      input.props.onChangeText('Book train tickets');
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
    expect(taskItemsState.create.mock.calls[0][0]).toMatchObject({
      title: 'Book train tickets',
      due_date: '2026-04-18',
    });

    act(() => renderer.unmount());
  });

  it('ignores duplicate save taps while task creation is pending', async () => {
    let resolveCreate: () => void = () => undefined;
    const createPromise = new Promise<void>((resolve) => {
      resolveCreate = resolve;
    });
    taskItemsState.create.mockImplementation(() => createPromise);

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewTask />);
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-task-title-input').props.onChangeText('Pack bags');
      await flush();
    });
    await act(async () => {
      const primary = renderer.root.findAll(
        (n: any) => n.props?.icon === 'check' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
      )[0];
      primary.props.onPress();
      primary.props.onPress();
      await flush();
    });

    expect(taskItemsState.create).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate();
      await flush();
    });

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

  it('saves a specific picked date from the native Date choice', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewTask />);
      await flush();
    });
    const input = findByTestID(renderer.root, 'new-task-title-input');
    await act(async () => { input.props.onChangeText('Custom date task'); await flush(); });
    expect(findByTestID(renderer.root, 'new-task-custom-date')).toBeUndefined();
    expect(findByTestID(renderer.root, 'new-task-custom-date-picker')).toBeUndefined();
    await act(async () => {
      findByTestID(renderer.root, 'new-task-date-picker-control').props.onChange(
        { type: 'set' },
        new Date('2030-07-09T12:00:00'),
      );
      await flush();
    });
    const primary = renderer.root.findAll(
      (n: any) => n.props?.icon === 'check' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
    )[0];
    await act(async () => { primary.props.onPress(); await flush(); });
    const call = taskItemsState.create.mock.calls[0][0];
    expect(call.due_date).toBe('2030-07-09');
    act(() => renderer.unmount());
  });

  it('opens the native Android date dialog from the Date choice', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewTask />);
      await flush();
    });
    const input = findByTestID(renderer.root, 'new-task-title-input');
    await act(async () => { input.props.onChangeText('Android date task'); await flush(); });
    await act(async () => {
      findPressableByTestID(renderer.root, 'new-task-date').props.onPress();
      await flush();
    });
    expect(findByTestID(renderer.root, 'new-task-custom-date')).toBeUndefined();
    expect(findByTestID(renderer.root, 'new-task-custom-date-picker')).toBeUndefined();
    expect(dateTimePickerAndroidState.open).toHaveBeenCalledTimes(1);
    const pickerArgs = dateTimePickerAndroidState.open.mock.calls[0][0];
    expect(pickerArgs.mode).toBe('date');
    await act(async () => {
      pickerArgs.onChange({ type: 'set' }, new Date('2032-08-11T12:00:00'));
      await flush();
    });
    const primary = renderer.root.findAll(
      (n: any) => n.props?.icon === 'check' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
    )[0];
    await act(async () => { primary.props.onPress(); await flush(); });
    const call = taskItemsState.create.mock.calls[0][0];
    expect(call.due_date).toBe('2032-08-11');
    act(() => renderer.unmount());
  });

  it('uses a browser-native date input inside the Date choice on web', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<NewTask />);
      await flush();
    });
    const input = findByTestID(renderer.root, 'new-task-title-input');
    await act(async () => {
      input.props.onChangeText('Web date task');
      await flush();
    });
    expect(findByTestID(renderer.root, 'new-task-custom-date')).toBeUndefined();
    const pickerControl = findByTestID(renderer.root, 'new-task-date-picker-control');
    expect(pickerControl.props.type).toBe('date');
    expect(pickerControl.props.style?.flex).not.toBe(1);
    expect(pickerControl.props.style?.width).not.toBe('100%');
    await act(async () => {
      pickerControl.props.onChange({ target: { value: '2031-02-03' } });
      await flush();
    });
    const primary = renderer.root.findAll(
      (n: any) => n.props?.icon === 'check' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
    )[0];
    await act(async () => { primary.props.onPress(); await flush(); });
    const call = taskItemsState.create.mock.calls[0][0];
    expect(call.due_date).toBe('2031-02-03');
    act(() => renderer.unmount());
  });
});
