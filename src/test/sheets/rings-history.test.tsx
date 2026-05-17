import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const routerSpy = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }));
vi.mock('expo-router', () => ({
  router: routerSpy,
  useRouter: () => routerSpy,
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({}),
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success' },
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
  const createAnimatedComponent = (Comp: any) => (props: any) =>
    Reactx.createElement(Comp, props, props.children);
  return {
    __esModule: true,
    default: { View: MockView, Text: MockText, createAnimatedComponent },
    View: MockView,
    Text: MockText,
    createAnimatedComponent,
    Easing: { inOut: () => 0, out: (fn: any) => fn ?? 0, cubic: (v: any) => v, bezier: () => 0, ease: 0 },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: any) => fn?.() ?? {},
    useReducedMotion: () => false,
    withTiming: (v: any) => v,
    withDelay: (_d: any, v: any) => v,
    useAnimatedProps: (fn: any) => fn(),
    interpolateColor: () => "#000000",
    withRepeat: (v: any) => v,
    withSequence: (...args: any[]) => args[args.length - 1],
    interpolate: () => 0,
  };
});

const sessionState = vi.hoisted(() => ({
  activeCouple: { couple: { id: 's1', name: null, anniversary: null }, memberCount: 2, partner: null } as any,
  user: { id: 'u1', email: 'x@y.z', displayName: 'X', avatarUrl: null },
  space: { id: 's1' } as any,
  partner: null,
  isSolo: false,
  isCouple: true,
  mode: 'pair',
  isFeatureEnabled: vi.fn((featureId: string) => featureId !== 'disabled-feature'),
  status: 'ready',
  profile: null,
}));
vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => sessionState,
}));

const ringsState = vi.hoisted(() => ({
  byDateKey: new Map<string, { connect?: number; shared?: number; present?: number }>(),
  rows: [] as any[],
  isLoading: false,
  error: null as any,
  upsert: vi.fn(async () => undefined),
}));
const ringsHistorySpy = vi.hoisted(() => vi.fn(() => ringsState));
vi.mock('@/src/hooks/useRingsHistory', () => ({
  useRingsHistory: ringsHistorySpy,
}));

import RingsHistory from '@/app/sheets/rings-history';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];
const findAllByTestIDPrefix = (root: any, prefix: string) =>
  root.findAll((n: any) => typeof n.props?.testID === 'string' && n.props.testID.startsWith(prefix));

describe('rings-history sheet', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      now: new Date('2026-04-23T12:00:00Z'),
      toFake: ['Date'],
    });
    sessionState.activeCouple = { couple: { id: 's1', name: null, anniversary: null }, memberCount: 2, partner: null };
    sessionState.isFeatureEnabled.mockImplementation((featureId: string) => featureId !== 'disabled-feature');
    sessionState.isFeatureEnabled.mockClear();
    ringsHistorySpy.mockClear();
    ringsState.byDateKey = new Map();
    ringsState.error = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders current + previous month labels', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<RingsHistory />);
      await flush();
    });
    expect(findByTestID(renderer.root, 'rings-month-label-2026-04')).toBeDefined();
    expect(findByTestID(renderer.root, 'rings-month-label-2026-03')).toBeDefined();
    act(() => renderer.unmount());
  });

  it('renders correct day cell count per month', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<RingsHistory />);
      await flush();
    });
    const marchCells = findAllByTestIDPrefix(renderer.root, 'rings-day-2026-03-');
    const aprilCells = findAllByTestIDPrefix(renderer.root, 'rings-day-2026-04-');
    expect(marchCells.length).toBe(31);
    expect(aprilCells.length).toBe(30);
    act(() => renderer.unmount());
  });

  it('today cell exists for the frozen date', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<RingsHistory />);
      await flush();
    });
    expect(findByTestID(renderer.root, 'rings-day-2026-04-23')).toBeDefined();
    act(() => renderer.unmount());
  });

  it('data from byDateKey drives AnimatedTripleRing values for past cells', async () => {
    ringsState.byDateKey = new Map([
      ['2026-04-20', { connect: 0.8, shared: 0.6, present: 0.9 }],
    ]);
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<RingsHistory />);
      await flush();
    });
    const cell = findByTestID(renderer.root, 'rings-day-2026-04-20');
    const ring = cell.findAll((n: any) => Array.isArray(n.props?.values))[0];
    expect(ring).toBeDefined();
    expect(ring.props.values).toEqual([0.8, 0.6, 0.9]);
    act(() => renderer.unmount());
  });

  it('future cell gets zero values', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<RingsHistory />);
      await flush();
    });
    const cell = findByTestID(renderer.root, 'rings-day-2026-04-30');
    const ring = cell.findAll((n: any) => Array.isArray(n.props?.values))[0];
    expect(ring.props.values).toEqual([0, 0, 0]);
    act(() => renderer.unmount());
  });

  it('no activeCouple → renders empty-state message', async () => {
    sessionState.activeCouple = null;
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<RingsHistory />);
      await flush();
    });
    expect(findByTestID(renderer.root, 'rings-empty')).toBeDefined();
    expect(findByTestID(renderer.root, 'rings-month-label-2026-04')).toBeUndefined();
    act(() => renderer.unmount());
  });

  it('disabled check-ins render unavailable before rings history hooks run', async () => {
    sessionState.isFeatureEnabled.mockImplementation((featureId: string) => featureId !== 'checkins');
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<RingsHistory />);
      await flush();
    });
    expect(renderer.root.findAll((n: any) => n.children?.includes('Check-ins is unavailable')).length).toBe(1);
    expect(ringsHistorySpy).not.toHaveBeenCalled();
    expect(sessionState.isFeatureEnabled).toHaveBeenCalledWith('checkins');
    act(() => renderer.unmount());
  });
});
