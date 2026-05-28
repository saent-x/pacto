import React from 'react';
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

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: (props: any) => React.createElement('DateTimePicker', props),
  DateTimePickerAndroid: {
    open: vi.fn(),
    dismiss: vi.fn(async () => true),
  },
}));

const sessionState = vi.hoisted(() => ({
  mode: 'pair',
  user: { id: 'u-me', displayName: 'Me' },
  activeCouple: {
    couple: { id: 'c1', name: null },
    partner: { id: 'u-sofia', displayName: 'Sofia', avatarUrl: null },
  },
  isSolo: false,
  isFeatureEnabled: () => true,
}));

const reminderState = vi.hoisted(() => ({
  create: vi.fn(async () => undefined),
  update: vi.fn(async () => undefined),
  reminders: [] as any[],
  isLoading: false,
}));

vi.mock('@/src/hooks/useSession', () => ({ useSession: () => sessionState }));
vi.mock('@/src/hooks/useReminders', () => ({
  useReminders: () => ({
    create: reminderState.create,
    update: reminderState.update,
    reminders: reminderState.reminders,
    isLoading: reminderState.isLoading,
  }),
}));

import NewReminder from '@/app/sheets/new-reminder';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];
const findSaveBtn = (root: any, opts: { enabled?: boolean } = {}) =>
  root.findAll((n: any) => {
    if (n.props?.icon !== 'check') return false;
    if (typeof n.props?.onPress !== 'function') return false;
    if (opts.enabled === true && n.props?.disabled) return false;
    if (opts.enabled === false && !n.props?.disabled) return false;
    return true;
  })[0];
const originalOS = Platform.OS;

describe('new-reminder sheet', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
    reminderState.create.mockClear();
    reminderState.update.mockClear();
    reminderState.reminders = [];
    reminderState.isLoading = false;
    paramsState.current = {};
    (router.back as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
    sessionState.isSolo = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not render the removed category picker', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewReminder />); await flush(); });
    for (const k of ['General', 'DateNight', 'Health', 'Bills', 'Travel']) {
      expect(findByTestID(renderer.root, `new-reminder-cat-${k}`)).toBeUndefined();
    }
    act(() => renderer.unmount());
  });

  it('renders 3 assignees in couple mode with partner display name substituted', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewReminder />); await flush(); });
    expect(findByTestID(renderer.root, 'new-reminder-assignee-both')).toBeDefined();
    expect(findByTestID(renderer.root, 'new-reminder-assignee-me')).toBeDefined();
    const partnerBtn = findByTestID(renderer.root, 'new-reminder-assignee-partner');
    expect(partnerBtn).toBeDefined();
    const texts = partnerBtn.findAll((n: any) => typeof n.children?.[0] === 'string').map((n: any) => n.children[0]);
    expect(texts).toContain('Sofia');
    act(() => renderer.unmount());
  });

  it('solo mode hides the redundant assignee control', async () => {
    sessionState.isSolo = true;
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewReminder />); await flush(); });
    expect(findByTestID(renderer.root, 'new-reminder-assignee-me')).toBeUndefined();
    expect(findByTestID(renderer.root, 'new-reminder-assignee-both')).toBeUndefined();
    expect(findByTestID(renderer.root, 'new-reminder-assignee-partner')).toBeUndefined();
    act(() => renderer.unmount());
  });

  it('renders a single native date control without a nested picker row', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewReminder />); await flush(); });
    expect(findByTestID(renderer.root, 'new-reminder-date')).toBeDefined();
    expect(findByTestID(renderer.root, 'new-reminder-date-picker')).toBeUndefined();
    const datePicker = findByTestID(renderer.root, 'new-reminder-date-picker-control');
    const timePicker = findByTestID(renderer.root, 'new-reminder-time-picker-control');
    expect(datePicker).toBeDefined();
    expect(timePicker).toBeDefined();
    expect(datePicker.props.style?.flex).not.toBe(1);
    expect(timePicker.props.style?.flex).not.toBe(1);
    expect(datePicker.props.style?.width).toBeGreaterThanOrEqual(150);
    act(() => renderer.unmount());
  });

  it('save path: type title → tap save → create called, haptic fired, router.back', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewReminder />); await flush(); });
    const input = findByTestID(renderer.root, 'new-reminder-title');
    await act(async () => { input.props.onChangeText('Call mom'); await flush(); });
    const saveBtn = renderer.root.findAll(
      (n: any) => n.props?.icon === 'check' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
    )[0];
    await act(async () => { saveBtn.props.onPress(); await flush(); });
    expect(reminderState.create).toHaveBeenCalledTimes(1);
    const call = reminderState.create.mock.calls[0][0];
    expect(call.title).toBe('Call mom');
    expect(call.priority).toBe(2);
    expect(call.category).toBeUndefined();
    expect(call.recurrence).toBeNull();
    expect(call.assigned_to).toBeNull();
    expect(call.scope).toBe('shared');
    expect(typeof call.due_at).toBe('string');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('ignores duplicate save taps while reminder creation is pending', async () => {
    let resolveCreate: () => void = () => undefined;
    const createPromise = new Promise<void>((resolve) => {
      resolveCreate = resolve;
    });
    reminderState.create.mockImplementation(() => createPromise);

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewReminder />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-reminder-title').props.onChangeText('Call mom');
      await flush();
    });
    await act(async () => {
      const saveBtn = findSaveBtn(renderer.root, { enabled: true });
      saveBtn.props.onPress();
      saveBtn.props.onPress();
      await flush();
    });

    expect(reminderState.create).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate();
      await flush();
    });

    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('lets shared-space users create a personal reminder', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewReminder />); await flush(); });

    expect(findByTestID(renderer.root, 'new-reminder-visibility-shared')).toBeDefined();
    expect(findByTestID(renderer.root, 'new-reminder-visibility-personal')).toBeDefined();

    await act(async () => {
      findByTestID(renderer.root, 'new-reminder-title').props.onChangeText('Renew passport');
      findByTestID(renderer.root, 'new-reminder-visibility-personal').props.onPress();
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });

    expect(reminderState.create.mock.calls[0][0]).toMatchObject({
      title: 'Renew passport',
      assigned_to: 'u-me',
      scope: 'personal',
    });

    act(() => renderer.unmount());
  });

  it('solo mode hides visibility and forces personal scope', async () => {
    sessionState.isSolo = true;
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewReminder />); await flush(); });

    expect(findByTestID(renderer.root, 'new-reminder-visibility-shared')).toBeUndefined();
    expect(findByTestID(renderer.root, 'new-reminder-visibility-personal')).toBeUndefined();

    await act(async () => {
      findByTestID(renderer.root, 'new-reminder-title').props.onChangeText('Water plants');
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });

    expect(reminderState.create.mock.calls[0][0]).toMatchObject({
      title: 'Water plants',
      assigned_to: 'u-me',
      scope: 'personal',
    });

    act(() => renderer.unmount());
  });

  it('edits an existing reminder instead of creating a new one', async () => {
    paramsState.current = { id: 'reminder-1' };
    reminderState.reminders = [makeReminder({ id: 'reminder-1', title: 'Old reminder', scope: 'personal' })];

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewReminder />); await flush(); });

    expect(findByTestID(renderer.root, 'new-reminder-title').props.value).toBe('Old reminder');

    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });

    expect(reminderState.update).toHaveBeenCalledWith(
      'reminder-1',
      expect.objectContaining({ title: 'Old reminder', scope: 'personal' }),
    );
    expect(reminderState.create).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('does not rewrite normalized malformed legacy edit due dates to the default reminder time', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-25T12:00:00.000Z'));
    paramsState.current = { id: 'reminder-bad-date' };
    reminderState.reminders = [
      makeReminder({
        id: 'reminder-bad-date',
        title: 'Legacy reminder',
        due_at: '',
        scope: 'shared',
      }),
    ];

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewReminder />); await flush(); });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });

    expect(reminderState.update.mock.calls[0]).toEqual([
      'reminder-bad-date',
      expect.not.objectContaining({
        due_at: expect.any(String),
      }),
    ]);
    expect(JSON.stringify(reminderState.update.mock.calls[0][1])).not.toContain('2026-05-25');

    act(() => renderer.unmount());
  });

  it('keeps save disabled when the reminder being edited cannot be resolved', async () => {
    paramsState.current = { id: 'not-a-uuid' };
    reminderState.reminders = [];

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewReminder />); await flush(); });

    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('Reminder missing');
    expect(findByTestID(renderer.root, 'new-reminder-title')).toBeUndefined();
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeUndefined();

    act(() => renderer.unmount());
  });

  it('shows a loading state for a direct edit route while the reminder is resolving', async () => {
    paramsState.current = { id: 'reminder-1' };
    reminderState.reminders = [];
    reminderState.isLoading = true;

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewReminder />); await flush(); });

    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('Loading reminder');
    expect(text).toContain('Loading this reminder');
    expect(text).not.toContain('Reminder missing');
    expect(findByTestID(renderer.root, 'new-reminder-title')).toBeUndefined();

    act(() => renderer.unmount());
  });
});

function makeReminder(overrides: Record<string, any> = {}) {
  return {
    id: 'reminder-1',
    couple_id: 'c1',
    created_by: 'u-me',
    assigned_to: null,
    title: 'Old reminder',
    description: null,
    due_at: '2030-05-24T09:00:00.000Z',
    recurrence: null,
    is_completed: false,
    completed_at: null,
    completed_by: null,
    priority: 2,
    category: null,
    created_at: '2026-05-24T00:00:00.000Z',
    updated_at: '2026-05-24T00:00:00.000Z',
    scope: 'shared',
    ...overrides,
  };
}
