import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const routerSpy = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }));
vi.mock('expo-router', () => ({
  router: routerSpy,
  useRouter: () => routerSpy,
  Stack: { Screen: () => null },
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('react-native-reanimated', () => {
  const Reactx = require('react');
  const MockView = (props: any) =>
    Reactx.createElement('AnimatedView', props, props.children);
  const MockText = (props: any) =>
    Reactx.createElement('AnimatedText', props, props.children);
  const chainable = () => {
    const api: any = {};
    for (const m of ['duration', 'delay', 'springify', 'damping']) {
      api[m] = () => api;
    }
    return api;
  };
  return {
    __esModule: true,
    default: { View: MockView, Text: MockText, createAnimatedComponent: (C: any) => C },
    View: MockView,
    Text: MockText,
    createAnimatedComponent: (C: any) => C,
    FadeIn: chainable(),
    FadeOut: chainable(),
    FadeInDown: chainable(),
    Easing: { inOut: () => 0, out: (fn: any) => fn ?? 0, cubic: (v: any) => v, bezier: () => 0, ease: 0 },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: any) => fn?.() ?? {},
    useReducedMotion: () => false,
    withTiming: (v: any) => v,
    withDelay: (_d: any, v: any) => v,
    useAnimatedProps: (fn: any) => fn(),
    interpolateColor: () => "#000000",
    withRepeat: (v: any) => v,
    withSequence: (...args: any[]) => args[0],
    interpolate: () => 0,
  };
});

const sessionState = vi.hoisted(() => ({ status: 'loading' as string }));
vi.mock('@/src/lib/session', () => ({
  useSession: () => sessionState,
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { INTRO_SEEN_KEY } from '@/src/lib/intro';
import Index from '@/app/index';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];
const allText = (root: any) =>
  root
    .findAll((n: any) => typeof n.children?.[0] === 'string')
    .map((n: any) => n.children.join(''));

describe('root index routing + boot visual', () => {
  beforeEach(async () => {
    routerSpy.replace.mockClear();
    sessionState.status = 'loading';
    await AsyncStorage.clear();
    await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('loading status renders boot screen and does not redirect', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<Index />);
      await flush();
    });
    expect(findByTestID(renderer.root, 'boot-screen')).toBeDefined();
    expect(findByTestID(renderer.root, 'boot-status')).toBeDefined();
    expect(allText(renderer.root).join(' ')).toContain('OPENING YOUR PACT');
    expect(allText(renderer.root).join(' ')).not.toContain('loading');
    expect(routerSpy.replace).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('unauthed status with intro seen redirects to sign-in', async () => {
    sessionState.status = 'unauthed';
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<Index />);
      await flush();
      await flush();
    });
    expect(routerSpy.replace).toHaveBeenCalledWith('/(auth)/sign-in');
    act(() => renderer.unmount());
  });

  it('unauthed status without intro seen redirects to intro', async () => {
    sessionState.status = 'unauthed';
    await AsyncStorage.removeItem(INTRO_SEEN_KEY);
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<Index />);
      await flush();
      await flush();
    });
    expect(routerSpy.replace).toHaveBeenCalledWith('/(auth)/intro');
    act(() => renderer.unmount());
  });

  it('onboarding status redirects to onboarding', async () => {
    sessionState.status = 'onboarding';
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<Index />);
      await flush();
      await flush();
    });
    expect(routerSpy.replace).toHaveBeenCalledWith('/(auth)/onboarding');
    act(() => renderer.unmount());
  });

  it('ready status redirects to tabs/home', async () => {
    sessionState.status = 'ready';
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<Index />);
      await flush();
      await flush();
    });
    expect(routerSpy.replace).toHaveBeenCalledWith('/(tabs)/home');
    act(() => renderer.unmount());
  });
});
