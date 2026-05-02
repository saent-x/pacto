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

const checkInState = vi.hoisted(() => ({
  createOrUpdate: vi.fn(async () => undefined),
  isSubmitting: false,
}));

const sessionState = vi.hoisted(() => ({
  mode: 'pair',
  user: { id: 'u-me', displayName: 'Me' },
  partner: { id: 'u-sofia', displayName: 'Sofia', avatarUrl: null },
  isSolo: false,
  isFeatureEnabled: () => true,
}));

vi.mock('@/src/hooks/useCheckIns', () => ({
  useCheckIns: () => ({
    createOrUpdate: checkInState.createOrUpdate,
    isSubmitting: checkInState.isSubmitting,
  }),
}));
vi.mock('@/src/hooks/useSession', () => ({ useSession: () => sessionState }));

import NewCheckin from '@/app/sheets/new-checkin';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

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

describe('new-checkin sheet', () => {
  beforeEach(() => {
    checkInState.createOrUpdate.mockClear();
    checkInState.isSubmitting = false;
    (router.back as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
    alertSpy.mockClear();
    sessionState.isSolo = false;
    sessionState.partner = { id: 'u-sofia', displayName: 'Sofia', avatarUrl: null };
  });

  it('solo mode hides the partner-aware Privacy info card', async () => {
    sessionState.isSolo = true;
    sessionState.partner = null as any;
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewCheckin />); await flush(); });
    const eyeIcons = renderer.root.findAll((n: any) => n.props?.name === 'eye');
    expect(eyeIcons.length).toBe(0);
    act(() => renderer.unmount());
  });

  it('renders all 4 check-in state tiles', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewCheckin />); await flush(); });
    for (const n of ['rough', 'low', 'steady', 'soft']) {
      expect(findByTestID(renderer.root, `new-checkin-mood-${n}`)).toBeDefined();
    }
    act(() => renderer.unmount());
  });

  it('happy path: default soft state saves mood:"soft" with default energy, haptic, back', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewCheckin />); await flush(); });
    const btn = findSaveBtn(renderer.root, { enabled: true });
    await act(async () => { btn.props.onPress(); await flush(); });
    expect(checkInState.createOrUpdate).toHaveBeenCalledTimes(1);
    expect(checkInState.createOrUpdate).toHaveBeenCalledWith({
      mood: 'soft',
      note: null,
      isPrivate: false,
      energy: 3,
    });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('mood 1 maps to "rough", note trims, and selected energy is saved', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewCheckin />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-checkin-mood-rough').props.onPress();
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-checkin-energy-5').props.onPress();
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-checkin-note-input').props.onChangeText('  long day  ');
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    expect(checkInState.createOrUpdate).toHaveBeenCalledWith({
      mood: 'rough',
      note: 'long day',
      isPrivate: false,
      energy: 5,
    });
    act(() => renderer.unmount());
  });

  it('error branch: Alert shown, back NOT called, button re-enables', async () => {
    checkInState.createOrUpdate.mockRejectedValueOnce(new Error('offline'));
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewCheckin />); await flush(); });
    const btn = findSaveBtn(renderer.root, { enabled: true });
    await act(async () => { btn.props.onPress(); await flush(); });
    expect(alertSpy).toHaveBeenCalledWith('Save failed', 'Try again.');
    expect(router.back).not.toHaveBeenCalled();
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeDefined();
    act(() => renderer.unmount());
  });
});
