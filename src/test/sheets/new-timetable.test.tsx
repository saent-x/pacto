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

const alertSpy = vi.hoisted(() => vi.fn());
vi.mock('react-native', async () => {
  const actual: any = await vi.importActual('react-native');
  return { ...actual, Alert: { alert: alertSpy } };
});

const ttState = vi.hoisted(() => ({
  create: vi.fn(async () => undefined),
}));

vi.mock('@/src/hooks/useTimetables', () => ({
  useTimetables: () => ({ create: ttState.create }),
}));

import NewTimetable from '@/app/sheets/new-timetable';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];
const findSaveBtn = (root: any, opts: { enabled?: boolean } = {}) =>
  root.findAll((n: any) => {
    if (n.props?.icon !== 'plus') return false;
    if (typeof n.props?.onPress !== 'function') return false;
    if (opts.enabled === true && n.props?.disabled) return false;
    if (opts.enabled === false && !n.props?.disabled) return false;
    return true;
  })[0];

describe('new-timetable sheet', () => {
  beforeEach(() => {
    ttState.create.mockClear();
    (router.back as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
    alertSpy.mockClear();
  });

  it('renders 6 template tiles + 3 share options', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetable />); await flush(); });
    for (const k of ['meals', 'workout', 'study', 'routine', 'sleep', 'custom']) {
      expect(findByTestID(renderer.root, `new-timetable-tmpl-${k}`)).toBeDefined();
    }
    for (const s of ['solo', 'partner', 'shared']) {
      expect(findByTestID(renderer.root, `new-timetable-share-${s}`)).toBeDefined();
    }
    act(() => renderer.unmount());
  });

  it('Save disabled until title non-empty', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetable />); await flush(); });
    expect(findSaveBtn(renderer.root, { enabled: false })).toBeDefined();
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-title-input').props.onChangeText(' ');
      await flush();
    });
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeUndefined();
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-title-input').props.onChangeText('Our week');
      await flush();
    });
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeDefined();
    act(() => renderer.unmount());
  });

  it('happy path: template + share persisted', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetable />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-title-input').props.onChangeText('Dinner plan');
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-tmpl-workout').props.onPress();
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-share-solo').props.onPress();
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    const call = ttState.create.mock.calls[0][0];
    expect(call.title).toBe('Dinner plan');
    expect(call.template).toBe('workout');
    expect(call.share).toBe('solo');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('error branch: Alert shown, back NOT called', async () => {
    ttState.create.mockRejectedValueOnce(new Error('offline'));
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetable />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-title-input').props.onChangeText('x');
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    expect(alertSpy).toHaveBeenCalledWith('Save failed', 'Try again.');
    expect(router.back).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });
});
