import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-router', () => ({
  router: { back: vi.fn(), push: vi.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({}),
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
  default: (props: any) => null,
}));

const sessionState = vi.hoisted(() => ({
  mode: 'pair',
  user: { id: 'u-me', displayName: 'Me' },
  activeCouple: {
    couple: { id: 'c1', name: null, anniversary: null },
    partner: { id: 'u-sofia', displayName: 'Sofia', avatarUrl: null },
  },
  isSolo: false,
  isFeatureEnabled: () => true,
}));

const reminderState = vi.hoisted(() => ({
  create: vi.fn(async () => undefined),
}));

vi.mock('@/src/hooks/useSession', () => ({ useSession: () => sessionState }));
vi.mock('@/src/hooks/useReminders', () => ({
  useReminders: () => ({ create: reminderState.create }),
}));

import NewReminder from '@/app/sheets/new-reminder';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];

describe('new-reminder sheet', () => {
  beforeEach(() => {
    reminderState.create.mockClear();
    (router.back as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
    sessionState.isSolo = false;
  });

  it('renders all 6 category icons', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewReminder />); await flush(); });
    for (const k of ['General', 'DateNight', 'Anniversary', 'Health', 'Bills', 'Travel']) {
      expect(findByTestID(renderer.root, `new-reminder-cat-${k}`)).toBeDefined();
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

  it('toggles the native date picker when the date field is tapped', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewReminder />); await flush(); });
    expect(findByTestID(renderer.root, 'new-reminder-date-picker')).toBeUndefined();
    await act(async () => { findByTestID(renderer.root, 'new-reminder-date').props.onPress(); await flush(); });
    expect(findByTestID(renderer.root, 'new-reminder-date-picker')).toBeDefined();
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
    expect(call.category).toBe('General');
    expect(call.recurrence).toBeNull();
    expect(call.assigned_to).toBeNull();
    expect(typeof call.due_at).toBe('string');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });
});
