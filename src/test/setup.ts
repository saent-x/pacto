import { vi } from 'vitest';

// react-native-get-random-values is a CJS polyfill that uses require(),
// which fails in Vitest's ESM environment. jsdom already provides
// crypto.getRandomValues, so mock it as a no-op.
vi.mock('react-native-get-random-values', () => ({}));

// expo-haptics pulls in expo-modules-core which references __DEV__ at
// module scope. Provide a global mock so components importing haptics
// (Pill, BlockCard, etc.) don't crash test loading.
vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(async () => undefined),
  impactAsync: vi.fn(async () => undefined),
  notificationAsync: vi.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// @instantdb/react-native transitively imports react-native-get-random-values
// (CJS) which cannot be loaded in Vitest's ESM context. Mock the SDK.
vi.mock('@instantdb/react-native', () => {
  const fieldType = () => {
    const f: any = {};
    for (const m of ['unique', 'indexed', 'optional']) {
      f[m] = () => f;
    }
    return f;
  };

  // Proxy that supports tx.collection[id].update/link/unlink/delete() chaining
  function txProxy(): any {
    return new Proxy(() => {}, {
      get: () => txProxy(),
      apply: () => txProxy(),
    });
  }

  return {
    i: {
      schema: (def: any) => def,
      entity: (fields: any) => fields,
      string: fieldType,
      number: fieldType,
      boolean: fieldType,
      json: fieldType,
    },
    init: () => ({
      useQuery: vi.fn(() => ({ isLoading: false, error: null, data: {} })),
      useAuth: vi.fn(() => ({ isLoading: false, user: null, error: null })),
      transact: vi.fn(),
      tx: txProxy(),
      auth: { signOut: vi.fn() },
    }),
    id: () => 'mock-id',
  };
});

// react-native-svg ships a web build whose module entry pulls in syntax
// (legacy `typeof` import expressions in css/web subpaths) that Node's ESM
// loader cannot parse. Stub it with passthrough components so snapshots still
// capture which SVG primitives render and with what props.
vi.mock('react-native-svg', () => {
  const React = require('react') as typeof import('react');
  const passthrough = (displayName: string) =>
    Object.assign(
      (props: Record<string, unknown>) =>
        React.createElement(displayName, props, (props as { children?: React.ReactNode }).children),
      { displayName },
    );
  const Svg = passthrough('Svg');
  return {
    __esModule: true,
    default: Svg,
    Svg,
    Circle: passthrough('Circle'),
    Defs: passthrough('Defs'),
    LinearGradient: passthrough('LinearGradient'),
    Line: passthrough('Line'),
    Path: passthrough('Path'),
    Polygon: passthrough('Polygon'),
    Polyline: passthrough('Polyline'),
    Rect: passthrough('Rect'),
    Stop: passthrough('Stop'),
  };
});

// SheetShell imports DateTimePicker at module scope. Its web build uses
// Flow-style type imports that Vitest's parser can't handle. Stub it.
vi.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
}));

// SheetShell + atoms use reanimated for ToggleRow, Pill scale, etc. Tests
// that don't already mock reanimated would hit native bindings. Provide a
// passthrough mock matching the shape used across the suite.
vi.mock('react-native-reanimated', () => {
  const Reactx = require('react');
  const MockView = (props: any) => Reactx.createElement('AnimatedView', props, props.children);
  const MockScrollView = (props: any) => Reactx.createElement('AnimatedScrollView', props, props.children);
  const chainable: any = {
    duration: () => chainable,
    delay: () => chainable,
    springify: () => chainable,
    damping: () => chainable,
    stiffness: () => chainable,
  };
  return {
    __esModule: true,
    default: { View: MockView, ScrollView: MockScrollView, createAnimatedComponent: (C: any) => C },
    View: MockView,
    ScrollView: MockScrollView,
    createAnimatedComponent: (C: any) => C,
    FadeIn: chainable,
    FadeInDown: chainable,
    LinearTransition: chainable,
    ZoomIn: chainable,
    Easing: { inOut: () => 0, out: (fn: any) => fn ?? 0, cubic: (v: any) => v, bezier: () => 0, ease: 0 },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (v: any) => v,
    withDelay: (_d: any, v: any) => v,
    useReducedMotion: () => false,
    useAnimatedProps: (fn: any) => fn(),
    interpolateColor: () => '#000000',
    withSpring: (v: any) => v,
    runOnJS: (fn: any) => fn,
  };
});

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
