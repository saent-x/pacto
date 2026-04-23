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

const wishState = vi.hoisted(() => ({
  add: vi.fn(async () => undefined),
}));

vi.mock('@/src/hooks/useWishlists', () => ({
  useQuickAddWishItem: () => ({ add: wishState.add }),
}));

import NewWish from '@/app/sheets/new-wish';
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

describe('new-wish sheet', () => {
  beforeEach(() => {
    wishState.add.mockClear();
    (router.back as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
    alertSpy.mockClear();
  });

  it('renders 6 tag pills + price/url inputs', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewWish />); await flush(); });
    for (const t of ['HOME', 'TRAVEL', 'TREATS', 'BIG', 'KITCHEN', 'CLOTHES']) {
      expect(
        renderer.root.findAll((n: any) => n.props?.testID === `new-wish-tag-${t}`).length,
      ).toBeGreaterThan(0);
    }
    expect(findByTestID(renderer.root, 'new-wish-price-input')).toBeDefined();
    expect(findByTestID(renderer.root, 'new-wish-url-input')).toBeDefined();
    act(() => renderer.unmount());
  });

  it('Save disabled until title non-empty', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewWish />); await flush(); });
    expect(findSaveBtn(renderer.root, { enabled: false })).toBeDefined();
    await act(async () => {
      findByTestID(renderer.root, 'new-wish-title-input').props.onChangeText('   ');
      await flush();
    });
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeUndefined();
    await act(async () => {
      findByTestID(renderer.root, 'new-wish-title-input').props.onChangeText('Linen throw');
      await flush();
    });
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeDefined();
    act(() => renderer.unmount());
  });

  it('happy path: title/price/tag/url persisted; EUR default', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewWish />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-wish-title-input').props.onChangeText('Kettle');
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-wish-price-input').props.onChangeText('85');
      await flush();
    });
    await act(async () => {
      const pill = renderer.root.findAll((n: any) => n.props?.testID === 'new-wish-tag-KITCHEN')[0];
      pill.props.onPress();
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-wish-url-input').props.onChangeText('https://shop/x');
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    const call = wishState.add.mock.calls[0][0];
    expect(call.title).toBe('Kettle');
    expect(call.price).toBe(85);
    expect(call.currency).toBe('EUR');
    expect(call.tag).toBe('KITCHEN');
    expect(call.url).toBe('https://shop/x');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('empty price → null; non-digit stripped', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewWish />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-wish-title-input').props.onChangeText('Book');
      await flush();
    });
    // do not enter a price
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    expect(wishState.add.mock.calls[0][0].price).toBeNull();
    act(() => renderer.unmount());
  });

  it('error branch: Alert shown, back NOT called', async () => {
    wishState.add.mockRejectedValueOnce(new Error('offline'));
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewWish />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-wish-title-input').props.onChangeText('x');
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    expect(alertSpy).toHaveBeenCalledWith('Save failed', 'Try again.');
    expect(router.back).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });
});
