import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const paramsState = vi.hoisted(() => ({
  value: { timetableId: 'tt-1' } as Record<string, string | undefined>,
}));

vi.mock('expo-router', () => ({
  router: { back: vi.fn(), push: vi.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => paramsState.value,
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

const ttiState = vi.hoisted(() => ({
  add: vi.fn(async () => undefined),
}));

const sessionState = vi.hoisted(() => ({
  user: { id: 'u-me', displayName: 'Me' },
  partner: { id: 'u-sofia', displayName: 'Sofia', avatarUrl: null },
  isSolo: false,
}));

vi.mock('@/src/hooks/useTimetables', () => ({
  useTimetable: (_id: string | null) => ({ add: ttiState.add, update: vi.fn(), items: [] }),
}));
vi.mock('@/src/hooks/useSession', () => ({ useSession: () => sessionState }));

import NewTimetableItem from '@/app/sheets/new-timetable-item';
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

describe('new-timetable-item sheet', () => {
  beforeEach(() => {
    ttiState.add.mockClear();
    (router.back as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
    alertSpy.mockClear();
    paramsState.value = { timetableId: 'tt-1' };
    sessionState.isSolo = false;
    sessionState.partner = { id: 'u-sofia', displayName: 'Sofia', avatarUrl: null };
  });

  it('solo mode hides For segment and forces who:"me"', async () => {
    sessionState.isSolo = true;
    sessionState.partner = null as any;
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetableItem />); await flush(); });
    expect(findByTestID(renderer.root, 'new-timetable-item-who-me')).toBeUndefined();
    expect(findByTestID(renderer.root, 'new-timetable-item-who-sofia')).toBeUndefined();
    expect(findByTestID(renderer.root, 'new-timetable-item-who-both')).toBeUndefined();
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-item-title-input').props.onChangeText('Solo lunch');
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    const call = ttiState.add.mock.calls[0][0];
    expect(call.who).toBe('me');
    act(() => renderer.unmount());
  });

  it('renders 4 cats + duration field + 7 days + 3 presets + 3 who + 2 repeat', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetableItem />); await flush(); });
    for (const k of ['Breakfast', 'Lunch', 'Dinner', 'Snack']) {
      expect(findByTestID(renderer.root, `new-timetable-item-cat-${k}`)).toBeDefined();
    }
    expect(findByTestID(renderer.root, 'new-timetable-item-dur-input')).toBeDefined();
    expect(findByTestID(renderer.root, 'new-timetable-item-time')).toBeDefined();
    for (let i = 0; i < 7; i++) {
      expect(findByTestID(renderer.root, `new-timetable-item-day-${i}`)).toBeDefined();
    }
    for (const l of ['Every day', 'Weekdays', 'Weekends']) {
      expect(
        renderer.root.findAll((n: any) => n.props?.testID === `new-timetable-item-preset-${l}`).length,
      ).toBeGreaterThan(0);
    }
    for (const w of ['me', 'sofia', 'both']) {
      expect(findByTestID(renderer.root, `new-timetable-item-who-${w}`)).toBeDefined();
    }
    for (const r of ['weekly', 'once']) {
      expect(findByTestID(renderer.root, `new-timetable-item-repeat-${r}`)).toBeDefined();
    }
    act(() => renderer.unmount());
  });

  it('Save disabled when no timetableId param', async () => {
    paramsState.value = {};
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetableItem />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-item-title-input').props.onChangeText('Risotto');
      await flush();
    });
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeUndefined();
    act(() => renderer.unmount());
  });

  it('Save disabled when no days selected', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetableItem />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-item-title-input').props.onChangeText('Risotto');
      await flush();
    });
    // default has day 2 selected; toggle it off
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-item-day-2').props.onPress();
      await flush();
    });
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeUndefined();
    act(() => renderer.unmount());
  });

  it('happy path: adds once per selected day with selected duration', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetableItem />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-item-title-input').props.onChangeText('Risotto');
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-item-cat-Lunch').props.onPress();
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-item-dur-input').props.onChangeText('45');
      await flush();
    });
    // start with [2]; add day 4
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-item-day-4').props.onPress();
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-item-who-me').props.onPress();
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-item-repeat-once').props.onPress();
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    expect(ttiState.add).toHaveBeenCalledTimes(2);
    const first = ttiState.add.mock.calls[0][0];
    const second = ttiState.add.mock.calls[1][0];
    expect([first.day, second.day].sort()).toEqual([2, 4]);
    expect(first.title).toBe('Risotto');
    expect(first.category).toBe('lunch');
    expect(first.duration).toBe(45);
    expect(first.who).toBe('me');
    expect(first.repeat).toBe('once');
    expect(typeof first.startHour).toBe('number');
    expect(typeof first.color).toBe('string');
    expect(typeof first.ink).toBe('string');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('preset "Weekdays" selects day 0..4', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetableItem />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-item-title-input').props.onChangeText('x');
      await flush();
    });
    await act(async () => {
      const pill = renderer.root.findAll((n: any) => n.props?.testID === 'new-timetable-item-preset-Weekdays')[0];
      pill.props.onPress();
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    expect(ttiState.add).toHaveBeenCalledTimes(5);
    const days = ttiState.add.mock.calls.map((c: any) => c[0].day).sort();
    expect(days).toEqual([0, 1, 2, 3, 4]);
    act(() => renderer.unmount());
  });

  it('error branch: Alert shown, back NOT called', async () => {
    ttiState.add.mockRejectedValueOnce(new Error('offline'));
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetableItem />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-item-title-input').props.onChangeText('x');
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    expect(alertSpy).toHaveBeenCalledWith('Save failed', 'Try again.');
    expect(router.back).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });
});
