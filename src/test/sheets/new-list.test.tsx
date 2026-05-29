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

const listsState = vi.hoisted(() => ({
  create: vi.fn(async () => 'new-list-id'),
  update: vi.fn(async () => undefined),
  lists: [] as any[],
  isLoading: false,
}));

const sessionState = vi.hoisted(() => ({
  mode: 'pair',
  isSolo: false,
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => ({
    mode: sessionState.mode,
    isSolo: sessionState.isSolo,
    isFeatureEnabled: () => true,
  }),
}));

vi.mock('@/src/hooks/useTaskLists', () => ({
  useTaskLists: () => ({
    create: listsState.create,
    update: listsState.update,
    lists: listsState.lists,
    isLoading: listsState.isLoading,
    error: null,
  }),
}));

import NewList from '@/app/sheets/new-list';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];
const flattenText = (value: any): string =>
  Array.isArray(value)
    ? value.map(flattenText).join('')
    : typeof value === 'string'
      ? value
      : '';
const textNodes = (root: any) =>
  root
    .findAll((n: any) => flattenText(n.props?.children).length > 0)
    .map((n: any) => flattenText(n.props.children));
const findSaveBtn = (root: any, opts: { enabled?: boolean } = {}) =>
  root.findAll((n: any) => {
    if (!['plus', 'check'].includes(n.props?.icon)) return false;
    if (typeof n.props?.onPress !== 'function') return false;
    if (opts.enabled === true && n.props?.disabled) return false;
    if (opts.enabled === false && !n.props?.disabled) return false;
    return true;
  })[0];

describe('new-list sheet', () => {
  beforeEach(() => {
    listsState.create.mockClear();
    listsState.update.mockClear();
    listsState.lists = [];
    listsState.isLoading = false;
    paramsState.current = {};
    sessionState.mode = 'pair';
    sessionState.isSolo = false;
    (router.back as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
  });

  it('renders the title without a duplicate dot', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewList />); await flush(); });
    const texts = textNodes(renderer.root);
    expect(texts).toContain('Make a list');
    expect(texts).not.toContain('Make a list.');
    act(() => renderer.unmount());
  });

  it('does not render an icon picker section', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewList />); await flush(); });
    const iconIds = renderer.root
      .findAll((n: any) => typeof n.props?.testID === 'string' && n.props.testID.startsWith('new-list-icon-'))
      .map((n: any) => n.props.testID);
    expect(iconIds).toEqual([]);
    act(() => renderer.unmount());
  });

  it('does not render a manual color picker', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewList />); await flush(); });
    const swatchIds = renderer.root
      .findAll((n: any) => typeof n.props?.testID === 'string' && n.props.testID.startsWith('new-list-color-'))
      .map((n: any) => n.props.testID);
    expect(swatchIds).toEqual([]);
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

  it('save calls create with the automatic colorKey + haptic + back', async () => {
    listsState.lists = ['peach','lavender','butter','mint','rose','sky','gold'].map((colorKey) => ({
      id: colorKey,
      colorKey,
    }));

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewList />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-list-name-input').props.onChangeText('Trips');
      await flush();
    });
    const saveBtn = renderer.root.findAll(
      (n: any) => n.props?.icon === 'plus' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
    )[0];
    await act(async () => { saveBtn.props.onPress(); await flush(); });
    expect(listsState.create).toHaveBeenCalledWith({
      name: 'Trips',
      colorKey: 'journal',
      scope: 'shared',
    });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('ignores duplicate create taps while list creation is pending', async () => {
    let resolveCreate: (value: string) => void = () => undefined;
    const createPromise = new Promise<string>((resolve) => {
      resolveCreate = resolve;
    });
    listsState.create.mockImplementation(() => createPromise);

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewList />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-list-name-input').props.onChangeText('Trips');
      await flush();
    });

    await act(async () => {
      const saveBtn = findSaveBtn(renderer.root, { enabled: true });
      saveBtn.props.onPress();
      saveBtn.props.onPress();
      await flush();
    });

    expect(listsState.create).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate('new-list-id');
      await flush();
    });

    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('can create a personal list in a shared pact', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewList />); await flush(); });

    const personal = findByTestID(renderer.root, 'new-list-visibility-personal');
    expect(personal).toBeTruthy();
    expect(findByTestID(renderer.root, 'new-list-visibility-shared')).toBeTruthy();

    await act(async () => {
      personal.props.onPress();
      findByTestID(renderer.root, 'new-list-name-input').props.onChangeText('Private errands');
      await flush();
    });

    const saveBtn = renderer.root.findAll(
      (n: any) => n.props?.icon === 'plus' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
    )[0];
    await act(async () => { saveBtn.props.onPress(); await flush(); });

    expect(listsState.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Private errands',
      scope: 'personal',
    }));
    act(() => renderer.unmount());
  });

  it('keeps save disabled when the list being edited cannot be resolved', async () => {
    paramsState.current = { id: 'not-a-uuid' };
    listsState.lists = [];

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewList />); await flush(); });

    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('List missing');
    expect(text).toContain('could not be found');
    expect(findByTestID(renderer.root, 'new-list-name-input')).toBeUndefined();
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeUndefined();
    act(() => renderer.unmount());
  });

  it('shows a loading state for a direct edit route while the list is resolving', async () => {
    paramsState.current = { id: 'list-1' };
    listsState.lists = [];
    listsState.isLoading = true;

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewList />); await flush(); });

    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('Loading list');
    expect(text).toContain('Loading this list');
    expect(text).not.toContain('List missing');
    expect(findByTestID(renderer.root, 'new-list-name-input')).toBeUndefined();
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeUndefined();
    act(() => renderer.unmount());
  });

  it('keeps solo list creation personal and hides visibility controls', async () => {
    sessionState.mode = 'solo';
    sessionState.isSolo = true;

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewList />); await flush(); });

    expect(findByTestID(renderer.root, 'new-list-visibility-personal')).toBeFalsy();
    expect(findByTestID(renderer.root, 'new-list-visibility-shared')).toBeFalsy();

    await act(async () => {
      findByTestID(renderer.root, 'new-list-name-input').props.onChangeText('Solo list');
      await flush();
    });
    const saveBtn = renderer.root.findAll(
      (n: any) => n.props?.icon === 'plus' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
    )[0];
    await act(async () => { saveBtn.props.onPress(); await flush(); });

    expect(listsState.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Solo list',
      scope: 'personal',
    }));
    act(() => renderer.unmount());
  });

  it('can change list visibility while editing a shared pact list', async () => {
    paramsState.current = { id: 'list-1' };
    listsState.lists = [
      {
        id: 'list-1',
        name: 'House list',
        colorKey: 'peach',
        scope: 'shared',
      },
    ];

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewList />); await flush(); });

    const personal = findByTestID(renderer.root, 'new-list-visibility-personal');
    expect(personal).toBeTruthy();

    await act(async () => {
      personal.props.onPress();
      await flush();
    });
    const saveBtn = renderer.root.findAll(
      (n: any) => n.props?.icon === 'check' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
    )[0];
    await act(async () => { saveBtn.props.onPress(); await flush(); });

    expect(listsState.update).toHaveBeenCalledWith('list-1', expect.objectContaining({
      name: 'House list',
      colorKey: 'peach',
      scope: 'personal',
    }));
    act(() => renderer.unmount());
  });
});
