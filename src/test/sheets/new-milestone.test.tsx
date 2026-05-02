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

const milestoneState = vi.hoisted(() => ({
  create: vi.fn(async () => undefined),
}));

const sessionState = vi.hoisted(() => ({
  mode: 'pair',
  user: { id: 'u-me', displayName: 'Me' },
  partner: { id: 'u-sofia', displayName: 'Sofia', avatarUrl: null },
  isSolo: false,
  isFeatureEnabled: () => true,
}));

vi.mock('@/src/hooks/useMilestones', () => ({
  useMilestones: () => ({ create: milestoneState.create }),
}));
vi.mock('@/src/hooks/useSession', () => ({ useSession: () => sessionState }));

import NewMilestone from '@/app/sheets/new-milestone';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];
const findSaveBtn = (root: any, opts: { enabled?: boolean } = {}) =>
  root.findAll((n: any) => {
    if (n.props?.icon !== 'star') return false;
    if (typeof n.props?.onPress !== 'function') return false;
    if (opts.enabled === true && n.props?.disabled) return false;
    if (opts.enabled === false && !n.props?.disabled) return false;
    return true;
  })[0];

describe('new-milestone sheet', () => {
  beforeEach(() => {
    milestoneState.create.mockClear();
    (router.back as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
    alertSpy.mockClear();
    sessionState.isSolo = false;
  });

  it('renders 9 icon tiles + 7 color swatches + repeat toggle', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewMilestone />); await flush(); });
    for (const i of ['heart','star','home','mapPin','gift','coffee','briefcase','camera','music']) {
      expect(findByTestID(renderer.root, `new-milestone-icon-${i}`)).toBeDefined();
    }
    const swatchIds = new Set<string>(
      renderer.root
        .findAll((n: any) => typeof n.props?.testID === 'string' && n.props.testID.startsWith('new-milestone-color-'))
        .map((n: any) => n.props.testID),
    );
    expect(swatchIds.size).toBe(7);
    expect(findByTestID(renderer.root, 'new-milestone-repeat-toggle')).toBeDefined();
    act(() => renderer.unmount());
  });

  it('Save disabled until title non-empty', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewMilestone />); await flush(); });
    expect(findSaveBtn(renderer.root, { enabled: false })).toBeDefined();
    await act(async () => {
      findByTestID(renderer.root, 'new-milestone-title-input').props.onChangeText('   ');
      await flush();
    });
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeUndefined();
    await act(async () => {
      findByTestID(renderer.root, 'new-milestone-title-input').props.onChangeText('Anniversary');
      await flush();
    });
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeDefined();
    act(() => renderer.unmount());
  });

  it('happy path: icon + repeat → create called with full payload', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewMilestone />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-milestone-title-input').props.onChangeText('First trip');
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-milestone-icon-mapPin').props.onPress();
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-milestone-repeat-toggle').props.onPress();
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    const call = milestoneState.create.mock.calls[0][0];
    expect(call.title).toBe('First trip');
    expect(call.icon).toBe('mapPin');
    expect(call.repeatYearly).toBe(true);
    expect(typeof call.color).toBe('string');
    expect(call.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('error branch: Alert shown, back NOT called', async () => {
    milestoneState.create.mockRejectedValueOnce(new Error('offline'));
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewMilestone />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-milestone-title-input').props.onChangeText('x');
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    expect(alertSpy).toHaveBeenCalledWith('Save failed', 'Try again.');
    expect(router.back).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });
});
