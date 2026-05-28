import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const alertSpy = vi.hoisted(() => vi.fn());
vi.mock('react-native', async () => {
  const actual: any = await vi.importActual('react-native');
  return { ...actual, Alert: { alert: alertSpy } };
});

const ttState = vi.hoisted(() => ({
  create: vi.fn(async () => undefined),
  update: vi.fn(async () => undefined),
  timetables: [] as any[],
  isLoading: false,
}));

const sessionState = vi.hoisted(() => ({
  mode: 'pair',
  user: { id: 'u-me', displayName: 'Me' },
  partner: { id: 'u-sofia', displayName: 'Sofia', avatarUrl: null },
  isSolo: false,
  isFeatureEnabled: () => true,
}));

vi.mock('@/src/hooks/useTimetables', () => ({
  useTimetables: () => ({
    create: ttState.create,
    update: ttState.update,
    timetables: ttState.timetables,
    isLoading: ttState.isLoading,
  }),
}));
vi.mock('@/src/hooks/useSession', () => ({ useSession: () => sessionState }));

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
    if (!['plus', 'check'].includes(n.props?.icon)) return false;
    if (typeof n.props?.onPress !== 'function') return false;
    if (opts.enabled === true && n.props?.disabled) return false;
    if (opts.enabled === false && !n.props?.disabled) return false;
    return true;
  })[0];
function nodeText(node: any): string {
  return node.children
    .map((child: any) => {
      if (typeof child === 'string') return child;
      if (child && typeof child === 'object') return nodeText(child);
      return '';
    })
    .join('');
}

describe('new-timetable sheet', () => {
  beforeEach(() => {
    ttState.create.mockClear();
    ttState.update.mockClear();
    ttState.timetables = [];
    ttState.isLoading = false;
    paramsState.current = {};
    (router.back as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
    alertSpy.mockClear();
    sessionState.isSolo = false;
    sessionState.partner = { id: 'u-sofia', displayName: 'Sofia', avatarUrl: null };
  });

  it('solo mode hides Share-with picker and forces share:"solo"', async () => {
    sessionState.isSolo = true;
    sessionState.partner = null as any;
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetable />); await flush(); });
    for (const s of ['solo', 'partner', 'shared']) {
      expect(findByTestID(renderer.root, `new-timetable-share-${s}`)).toBeUndefined();
    }
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-title-input').props.onChangeText('My week');
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    const call = ttState.create.mock.calls[0][0];
    expect(call.share).toBe('solo');
    act(() => renderer.unmount());
  });

  it('renders 6 template choices + 3 share options', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetable />); await flush(); });
    for (const k of ['meals', 'workout', 'study', 'routine', 'sleep', 'custom']) {
      expect(findByTestID(renderer.root, `new-timetable-tmpl-${k}`)).toBeDefined();
    }
    for (const s of ['solo', 'partner', 'shared']) {
      expect(findByTestID(renderer.root, `new-timetable-share-${s}`)).toBeDefined();
    }
    const text = nodeText(renderer.root);
    expect(text).toContain('Breakfast, lunch, dinner, and snack blocks.');
    expect(text).toContain('Training sessions, recovery windows, and movement days.');
    expect(text).toContain('A blank timetable for anything else.');
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

  it('keeps save disabled when the timetable being edited cannot be resolved', async () => {
    paramsState.current = { id: 'not-a-uuid' };
    ttState.timetables = [];

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetable />); await flush(); });

    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('Timetable missing');
    expect(text).toContain('could not be found');
    expect(findByTestID(renderer.root, 'new-timetable-title-input')).toBeUndefined();
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeUndefined();
    act(() => renderer.unmount());
  });

  it('shows a loading state for a direct edit route while the timetable is resolving', async () => {
    paramsState.current = { id: 'tt-1' };
    ttState.timetables = [];
    ttState.isLoading = true;

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetable />); await flush(); });

    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('Loading timetable');
    expect(text).toContain('Loading this timetable');
    expect(text).not.toContain('Timetable missing');
    expect(findByTestID(renderer.root, 'new-timetable-title-input')).toBeUndefined();
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeUndefined();
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

  it('ignores duplicate save taps while timetable creation is pending', async () => {
    let resolveCreate: () => void = () => undefined;
    const createPromise = new Promise<void>((resolve) => {
      resolveCreate = resolve;
    });
    ttState.create.mockImplementation(() => createPromise);

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetable />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-title-input').props.onChangeText('Dinner plan');
      await flush();
    });
    await act(async () => {
      const saveBtn = findSaveBtn(renderer.root, { enabled: true });
      saveBtn.props.onPress();
      saveBtn.props.onPress();
      await flush();
    });

    expect(ttState.create).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate();
      await flush();
    });

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
