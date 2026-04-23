import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-router', () => ({
  router: { back: vi.fn(), push: vi.fn() },
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

const alertSpy = vi.hoisted(() => vi.fn());
vi.mock('react-native', async () => {
  const actual: any = await vi.importActual('react-native');
  return { ...actual, Alert: { alert: alertSpy } };
});

const planState = vi.hoisted(() => ({
  create: vi.fn(async () => undefined),
}));

vi.mock('@/src/hooks/usePlans', () => ({
  usePlans: () => ({ create: planState.create }),
}));

import NewPlan from '@/app/sheets/new-plan';
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

describe('new-plan sheet', () => {
  beforeEach(() => {
    planState.create.mockClear();
    (router.back as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
    alertSpy.mockClear();
  });

  it('renders 4 bucket pressables + 6 target pills + 10 icons + 7 colors', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewPlan />); await flush(); });
    for (const b of ['Soon', 'Ongoing', 'Later', 'Someday']) {
      expect(findByTestID(renderer.root, `new-plan-bucket-${b}`)).toBeDefined();
    }
    for (const t of ['This month', 'Next month', '3 months', '6 months', 'This year', '2027+']) {
      expect(
        renderer.root.findAll((n: any) => n.props?.testID === `new-plan-target-${t}`).length,
      ).toBeGreaterThan(0);
    }
    for (const i of ['compass', 'mapPin', 'home', 'heart', 'gift', 'star', 'coffee', 'camera', 'briefcase', 'book']) {
      expect(findByTestID(renderer.root, `new-plan-icon-${i}`)).toBeDefined();
    }
    const swatchIds = new Set<string>(
      renderer.root
        .findAll((n: any) => typeof n.props?.testID === 'string' && n.props.testID.startsWith('new-plan-color-'))
        .map((n: any) => n.props.testID),
    );
    expect(swatchIds.size).toBe(7);
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

  it('happy path: bucket "Later" maps to "Later this year"; icon + target persist', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewPlan />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-plan-title-input').props.onChangeText('Buy apartment');
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-plan-sub-input').props.onChangeText('6-month savings plan');
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-plan-bucket-Later').props.onPress();
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-plan-icon-home').props.onPress();
      await flush();
    });
    await act(async () => {
      const pill = renderer.root.findAll((n: any) => n.props?.testID === 'new-plan-target-6 months')[0];
      pill.props.onPress();
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    const call = planState.create.mock.calls[0][0];
    expect(call.title).toBe('Buy apartment');
    expect(call.description).toBe('6-month savings plan');
    expect(call.bucket).toBe('Later this year');
    expect(call.category).toBe('6 months');
    expect(call.icon).toBe('home');
    expect(call.status).toBe('active');
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
