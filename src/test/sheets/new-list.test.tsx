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

const listsState = vi.hoisted(() => ({
  create: vi.fn(async () => 'new-list-id'),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => ({
    mode: 'pair',
    isFeatureEnabled: () => true,
  }),
}));

vi.mock('@/src/hooks/useTaskLists', () => ({
  useTaskLists: () => ({ create: listsState.create, lists: [], isLoading: false, error: null }),
}));

import NewList from '@/app/sheets/new-list';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];

describe('new-list sheet', () => {
  beforeEach(() => {
    listsState.create.mockClear();
    (router.back as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
  });

  it('renders 10 icon tiles in the canonical order', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewList />); await flush(); });
    const expected = ['shoppingBag','home','heart','briefcase','book','gift','mapPin','coffee','music','camera'];
    for (const ico of expected) {
      expect(findByTestID(renderer.root, `new-list-icon-${ico}`)).toBeDefined();
    }
    act(() => renderer.unmount());
  });

  it('renders 8 color swatches including gold and journal', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewList />); await flush(); });
    const expected = ['peach','lavender','butter','mint','rose','sky','gold','journal'];
    for (const ck of expected) {
      expect(findByTestID(renderer.root, `new-list-color-${ck}`)).toBeDefined();
    }
    act(() => renderer.unmount());
  });

  it('disables Create list until a name is typed', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewList />); await flush(); });
    const findDisabledPlus = () =>
      renderer.root.findAll((n: any) => n.props?.icon === 'plus' && n.props?.disabled === true).length > 0;
    expect(findDisabledPlus()).toBe(true);
    await act(async () => {
      findByTestID(renderer.root, 'new-list-name-input').props.onChangeText('Trips');
      await flush();
    });
    expect(findDisabledPlus()).toBe(false);
    act(() => renderer.unmount());
  });

  it('save with journal swatch calls create with colorKey=journal + haptic + back', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewList />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-list-name-input').props.onChangeText('Trips');
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-list-icon-mapPin').props.onPress();
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-list-color-journal').props.onPress();
      await flush();
    });
    const saveBtn = renderer.root.findAll(
      (n: any) => n.props?.icon === 'plus' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
    )[0];
    await act(async () => { saveBtn.props.onPress(); await flush(); });
    expect(listsState.create).toHaveBeenCalledWith({
      name: 'Trips',
      icon: 'mapPin',
      colorKey: 'journal',
    });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('save with gold swatch passes colorKey=gold', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewList />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-list-name-input').props.onChangeText('Wishlist');
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-list-color-gold').props.onPress();
      await flush();
    });
    const saveBtn = renderer.root.findAll(
      (n: any) => n.props?.icon === 'plus' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
    )[0];
    await act(async () => { saveBtn.props.onPress(); await flush(); });
    expect(listsState.create.mock.calls[0][0].colorKey).toBe('gold');
    act(() => renderer.unmount());
  });
});
