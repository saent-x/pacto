import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const paramsState = vi.hoisted(() => ({
  current: {} as Record<string, string | undefined>,
}));

vi.mock('expo-router', () => ({
  router: { back: vi.fn(), push: vi.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => paramsState.current,
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(async () => undefined),
  selectionAsync: vi.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('@react-native-community/datetimepicker', () => ({
  default: (props: any) => React.createElement('DateTimePicker', props),
  DateTimePickerAndroid: {
    open: vi.fn(),
  },
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const alertSpy = vi.hoisted(() => vi.fn());
vi.mock('react-native', async () => {
  const actual: any = await vi.importActual('react-native');
  return { ...actual, Alert: { alert: alertSpy } };
});

const planState = vi.hoisted(() => ({
  create: vi.fn(async () => undefined),
  update: vi.fn(async () => undefined),
  plans: [] as any[],
  isLoading: false,
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => ({
    mode: 'pair',
    isFeatureEnabled: () => true,
  }),
}));

vi.mock('@/src/hooks/usePlans', () => ({
  usePlans: () => ({
    create: planState.create,
    update: planState.update,
    plans: planState.plans,
    isLoading: planState.isLoading,
  }),
}));

import NewPlan from '@/app/sheets/new-plan';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getTokens } from '@/src/lib/tokens';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];
const findSaveBtn = (root: any, opts: { enabled?: boolean } = {}) =>
  root.findAll((n: any) => {
    if (!['plus', 'check'].includes(n.props?.icon)) return false;
    if (typeof n.props?.onPress !== 'function') return false;
    if (opts.enabled === true && n.props?.disabled) return false;
    if (opts.enabled === false && !n.props?.disabled) return false;
    return true;
  })[0];

describe('new-plan sheet', () => {
  beforeEach(() => {
    planState.create.mockClear();
    planState.update.mockClear();
    planState.plans = [];
    planState.isLoading = false;
    paramsState.current = {};
    (router.back as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
    alertSpy.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders no bucket, icon, or color picker controls', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewPlan />); await flush(); });
    for (const b of ['Soon', 'Ongoing', 'Later', 'Someday']) {
      expect(findByTestID(renderer.root, `new-plan-bucket-${b}`)).toBeUndefined();
    }
    const iconIds = renderer.root
      .findAll((n: any) => typeof n.props?.testID === 'string' && n.props.testID.startsWith('new-plan-icon-'))
      .map((n: any) => n.props.testID);
    expect(iconIds).toEqual([]);
    const swatchIds = new Set<string>(
      renderer.root
        .findAll((n: any) => typeof n.props?.testID === 'string' && n.props.testID.startsWith('new-plan-color-'))
        .map((n: any) => n.props.testID),
    );
    expect(swatchIds.size).toBe(0);
    act(() => renderer.unmount());
  });

  it('Save disabled until title non-empty', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewPlan />); await flush(); });
    expect(findSaveBtn(renderer.root, { enabled: false })).toBeDefined();
    await act(async () => {
      findByTestID(renderer.root, 'new-plan-title-input').props.onChangeText('   ');
      await flush();
    });
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeUndefined();
    await act(async () => {
      findByTestID(renderer.root, 'new-plan-title-input').props.onChangeText('Venice weekend');
      await flush();
    });
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeDefined();
    act(() => renderer.unmount());
  });

  it('renders priority choices and saves the selected target priority', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewPlan />); await flush(); });

    expect(findByTestID(renderer.root, 'new-plan-priority-low')).toBeDefined();
    expect(findByTestID(renderer.root, 'new-plan-priority-med')).toBeDefined();
    expect(findByTestID(renderer.root, 'new-plan-priority-high')).toBeDefined();

    await act(async () => {
      findByTestID(renderer.root, 'new-plan-title-input').props.onChangeText('Launch product');
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-plan-priority-high').props.onPress();
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });

    expect(planState.create.mock.calls[0][0]).toMatchObject({
      title: 'Launch product',
      priority: 3,
      isPrivate: false,
    });

    act(() => renderer.unmount());
  });

  it('ignores duplicate save taps while target creation is pending', async () => {
    let resolveCreate: () => void = () => undefined;
    const createPromise = new Promise<void>((resolve) => {
      resolveCreate = resolve;
    });
    planState.create.mockImplementation(() => createPromise);

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewPlan />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-plan-title-input').props.onChangeText('Launch product');
      await flush();
    });
    await act(async () => {
      const saveBtn = findSaveBtn(renderer.root, { enabled: true });
      saveBtn.props.onPress();
      saveBtn.props.onPress();
      await flush();
    });

    expect(planState.create).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate();
      await flush();
    });

    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('lets shared-space users create a personal target', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewPlan />); await flush(); });

    expect(findByTestID(renderer.root, 'new-plan-visibility-shared')).toBeDefined();
    expect(findByTestID(renderer.root, 'new-plan-visibility-personal')).toBeDefined();

    await act(async () => {
      findByTestID(renderer.root, 'new-plan-title-input').props.onChangeText('Solo passport renewal');
      findByTestID(renderer.root, 'new-plan-visibility-personal').props.onPress();
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });

    expect(planState.create.mock.calls[0][0]).toMatchObject({
      title: 'Solo passport renewal',
      isPrivate: true,
    });

    act(() => renderer.unmount());
  });

  it('preserves an edited target visibility and can move it back to shared', async () => {
    paramsState.current = { id: 'plan-private' };
    planState.plans = [
      {
        id: 'plan-private',
        title: 'Solo target',
        targetDate: '2030-04-15',
        status: 'active',
        priority: 1,
        isPrivate: true,
        colorKey: 'sky',
      },
    ];

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewPlan />); await flush(); });

    expect(
      findByTestID(renderer.root, 'new-plan-visibility-personal').props.accessibilityState,
    ).toMatchObject({ selected: true });

    await act(async () => {
      findByTestID(renderer.root, 'new-plan-visibility-shared').props.onPress();
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });

    expect(planState.update.mock.calls[0]).toEqual([
      'plan-private',
      expect.objectContaining({
        title: 'Solo target',
        isPrivate: false,
      }),
    ]);

    act(() => renderer.unmount());
  });

  it('does not rewrite malformed legacy edit target dates to today on save', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-25T12:00:00.000Z'));
    paramsState.current = { id: 'plan-bad-date' };
    planState.plans = [
      {
        id: 'plan-bad-date',
        title: 'Legacy target',
        targetDate: '2026-04-31',
        category: 'Someday',
        bucket: 'Someday',
        status: 'active',
        priority: 2,
        isPrivate: false,
        colorKey: 'sky',
      },
    ];

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewPlan />); await flush(); });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });

    expect(planState.update.mock.calls[0]).toEqual([
      'plan-bad-date',
      expect.objectContaining({
        title: 'Legacy target',
        targetDate: null,
        category: 'Someday',
        bucket: 'Someday',
      }),
    ]);
    expect(JSON.stringify(planState.update.mock.calls[0][1])).not.toContain('2026-05-25');
    expect(JSON.stringify(planState.update.mock.calls[0][1])).not.toContain('2026-05-01');

    act(() => renderer.unmount());
  });

  it('keeps save disabled when the target being edited cannot be resolved', async () => {
    paramsState.current = { id: 'not-a-uuid' };
    planState.plans = [];

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewPlan />); await flush(); });

    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('Target missing');
    expect(text).toContain('could not be found');
    expect(findByTestID(renderer.root, 'new-plan-title-input')).toBeUndefined();
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeUndefined();

    act(() => renderer.unmount());
  });

  it('shows a loading state for a direct edit route while the target is resolving', async () => {
    paramsState.current = { id: 'plan-1' };
    planState.plans = [];
    planState.isLoading = true;

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewPlan />); await flush(); });

    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('Loading target');
    expect(text).toContain('Loading this target');
    expect(text).not.toContain('Target missing');
    expect(findByTestID(renderer.root, 'new-plan-title-input')).toBeUndefined();

    act(() => renderer.unmount());
  });

  it('renders a native target date control and infers bucket from the selected date', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewPlan />); await flush(); });

    const dateField = findByTestID(renderer.root, 'new-plan-target-date');
    expect(dateField).toBeDefined();
    const pickerControl = findByTestID(renderer.root, 'new-plan-target-date-picker-control');
    expect(pickerControl).toBeDefined();

    await act(async () => {
      findByTestID(renderer.root, 'new-plan-title-input').props.onChangeText('Venice trip');
      pickerControl.props.onChange({ type: 'set' }, new Date('2030-04-15T12:00:00'));
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });

    expect(planState.create.mock.calls[0][0]).toMatchObject({
      title: 'Venice trip',
      targetDate: '2030-04-15',
      bucket: 'Someday',
      category: 'Someday',
    });

    act(() => renderer.unmount());
  });

  it('starts new targets on an unused random color before repeating', async () => {
    const dark = getTokens('dark') as Record<string, string>;
    planState.plans = ['sky', 'peach', 'butter', 'mint', 'rose', 'lavender'].map((key) => ({
      id: key,
      color: dark[key],
    }));

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewPlan />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-plan-title-input').props.onChangeText('Unused color target');
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });

    expect(planState.create.mock.calls[0][0]).toMatchObject({
      title: 'Unused color target',
      colorKey: 'gold',
    });

    act(() => renderer.unmount());
  });

  it('happy path: saves with a date-inferred bucket', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewPlan />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-plan-title-input').props.onChangeText('Buy apartment');
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    const call = planState.create.mock.calls[0][0];
    expect(call.title).toBe('Buy apartment');
    expect(call.bucket).toBe('This month');
    expect(call.icon).toBeUndefined();
    expect(call.status).toBe('active');
    expect(typeof call.colorKey).toBe('string');
    expect(typeof call.color).toBe('string');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('error branch: Alert shown, back NOT called', async () => {
    planState.create.mockRejectedValueOnce(new Error('offline'));
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewPlan />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-plan-title-input').props.onChangeText('x');
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    expect(alertSpy).toHaveBeenCalledWith('Save failed', 'Try again.');
    expect(router.back).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });
});
