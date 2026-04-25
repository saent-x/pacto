import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-router', () => ({
  router: { push: vi.fn(), back: vi.fn() },
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(async () => undefined),
  selectionAsync: vi.fn(async () => undefined),
  impactAsync: vi.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('react-native-reanimated', () => {
  const Reactx = require('react');
  const MockView = (props: any) => Reactx.createElement('AnimatedView', props, props.children);
  const MockScrollView = (props: any) => Reactx.createElement('AnimatedScrollView', props, props.children);
  const chainable: any = {
    duration: () => chainable,
    delay: () => chainable,
    springify: () => chainable,
    damping: () => chainable,
  };
  return {
    __esModule: true,
    default: { View: MockView, ScrollView: MockScrollView, createAnimatedComponent: (C: any) => C },
    View: MockView,
    ScrollView: MockScrollView,
    createAnimatedComponent: (C: any) => C,
    FadeIn: chainable,
    FadeInDown: chainable,
    Easing: { inOut: () => 0, out: (fn: any) => fn ?? 0 },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (v: any) => v,
    useReducedMotion: () => false,
    runOnJS: (fn: any) => fn,
  };
});

vi.mock('@react-native-menu/menu', () => {
  const Reactx = require('react');
  return {
    MenuView: (props: any) =>
      Reactx.createElement('MockMenuView', props, props.children),
  };
});

const sessionState = vi.hoisted(() => ({
  user: { id: 'u-mine' } as any,
  partner: { id: 'u-partner', displayName: 'Sofia' } as any,
  activeCouple: { couple: { id: 'c1' }, partner: { id: 'u-partner', displayName: 'Sofia' } } as any,
  isSolo: false,
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => sessionState,
}));

const noteHookState = vi.hoisted(() => ({
  notes: [] as any[],
  isLoading: false,
  remove: vi.fn(async () => undefined),
  update: vi.fn(async () => undefined),
}));

vi.mock('@/src/hooks/useLoveNotes', () => ({
  useLoveNotes: () => noteHookState,
}));

import { Alert } from 'react-native';
import LoveNotes from '@/app/(tabs)/us/notes';
import { router } from 'expo-router';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

const flush = () => new Promise((r) => setTimeout(r, 0));

function findMenuFor(root: any, predicate: (n: any) => boolean) {
  const menus = root.findAll((n: any) => n.type === 'MockMenuView');
  return menus.find((m: any) => m.findAll(predicate).length > 0);
}

function findBubbleMenu(root: any, noteId: string) {
  const menu = findMenuFor(
    root,
    (n: any) => n.props?.testID === `note-bubble-${noteId}`,
  );
  if (!menu) throw new Error(`MockMenuView for note ${noteId} not found`);
  return menu;
}

function actionKeys(menu: any): string[] {
  return (menu.props.actions || []).map((a: any) => a.id);
}

async function fireMenuAction(menu: any, key: string) {
  await menu.props.onPressAction({ nativeEvent: { event: key } });
}

describe('Love notes interactions', () => {
  beforeEach(() => {
    noteHookState.notes = [
      { id: 'n1', body: 'Pasta tonight?', authorId: 'u-mine', createdAt: 1_700_000_000_000 },
      { id: 'n2', body: 'Always.', authorId: 'u-partner', createdAt: 1_700_000_100_000 },
    ];
    noteHookState.remove.mockClear();
    noteHookState.update.mockClear();
    (router.push as any).mockClear?.();
  });

  it('mounts the native menu with edit + delete on own note', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<LoveNotes />); await flush(); });
    const menu = findBubbleMenu(renderer.root, 'n1');
    expect(menu.props.shouldOpenOnLongPress).toBe(true);
    expect(actionKeys(menu)).toEqual(['edit', 'delete']);
    act(() => renderer.unmount());
  });

  it("hides Edit on partner's note", async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<LoveNotes />); await flush(); });
    const menu = findBubbleMenu(renderer.root, 'n2');
    expect(actionKeys(menu)).toEqual(['delete']);
    act(() => renderer.unmount());
  });

  it('confirms then deletes via native Alert', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons: any) => {
      const destructive = buttons?.find((b: any) => b.style === 'destructive');
      destructive?.onPress?.();
    });
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<LoveNotes />); await flush(); });
    const menu = findBubbleMenu(renderer.root, 'n1');
    await act(async () => { await fireMenuAction(menu, 'delete'); await flush(); });
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(noteHookState.remove).toHaveBeenCalledWith('n1');
    alertSpy.mockRestore();
    act(() => renderer.unmount());
  });

  it('routes Edit to /sheets/new-note with id', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<LoveNotes />); await flush(); });
    const menu = findBubbleMenu(renderer.root, 'n1');
    await act(async () => { await fireMenuAction(menu, 'edit'); await flush(); });
    expect(router.push).toHaveBeenCalledWith('/sheets/new-note?id=n1');
    act(() => renderer.unmount());
  });
});
