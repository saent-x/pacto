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
  update: vi.fn(async () => undefined),
  timetable: { id: 'tt-1', template: 'meals', title: 'Meal plan' } as any,
  items: [] as any[],
  isLoading: false,
}));

const sessionState = vi.hoisted(() => ({
  mode: 'pair',
  user: { id: 'u-me', displayName: 'Me' },
  partner: { id: 'u-sofia', displayName: 'Sofia', avatarUrl: null },
  isSolo: false,
  isFeatureEnabled: () => true,
}));

vi.mock('@/src/hooks/useTimetables', () => ({
  useTimetable: (_id: string | null) => ({
    timetable: ttiState.timetable,
    add: ttiState.add,
    update: ttiState.update,
    items: ttiState.items,
    isLoading: ttiState.isLoading,
  }),
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
    if (!['plus', 'check'].includes(n.props?.icon)) return false;
    if (typeof n.props?.onPress !== 'function') return false;
    if (opts.enabled === true && n.props?.disabled) return false;
    if (opts.enabled === false && !n.props?.disabled) return false;
    return true;
  })[0];

describe('new-timetable-item sheet', () => {
  beforeEach(() => {
    ttiState.add.mockClear();
    ttiState.update.mockClear();
    (router.back as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
    alertSpy.mockClear();
    paramsState.value = { timetableId: 'tt-1' };
    ttiState.timetable = { id: 'tt-1', template: 'meals', title: 'Meal plan' };
    ttiState.items = [];
    ttiState.isLoading = false;
    sessionState.isSolo = false;
    sessionState.partner = { id: 'u-sofia', displayName: 'Sofia', avatarUrl: null };
  });

  it('solo mode hides For segment and forces who:"me"', async () => {
    sessionState.isSolo = true;
    sessionState.partner = null as any;
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetableItem />); await flush(); });
    expect(findByTestID(renderer.root, 'new-timetable-item-who-me')).toBeUndefined();
    expect(findByTestID(renderer.root, 'new-timetable-item-who-partner')).toBeUndefined();
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

  it('renders meal-plan types + duration field + 7 days + 3 presets + 3 who + 2 repeat', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetableItem />); await flush(); });
    for (const k of ['none', 'breakfast', 'lunch', 'dinner', 'snack']) {
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
    for (const w of ['me', 'partner', 'both']) {
      expect(findByTestID(renderer.root, `new-timetable-item-who-${w}`)).toBeDefined();
    }
    for (const r of ['weekly', 'once']) {
      expect(findByTestID(renderer.root, `new-timetable-item-repeat-${r}`)).toBeDefined();
    }
    act(() => renderer.unmount());
  });

  it('shows curated type options for workout timetables', async () => {
    ttiState.timetable = { id: 'tt-1', template: 'workout', title: 'Workout' };
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetableItem />); await flush(); });
    for (const k of ['breakfast', 'lunch', 'dinner', 'snack']) {
      expect(findByTestID(renderer.root, `new-timetable-item-cat-${k}`)).toBeUndefined();
    }
    for (const k of ['none', 'strength', 'cardio', 'mobility', 'recovery']) {
      expect(findByTestID(renderer.root, `new-timetable-item-cat-${k}`)).toBeDefined();
    }
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-item-title-input').props.onChangeText('Leg day');
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-item-cat-cardio').props.onPress();
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    const call = ttiState.add.mock.calls[0][0];
    expect(call.category).toBe('cardio');
    expect(call.icon).toBe('zap');
    act(() => renderer.unmount());
  });

  it('shows curated type options for study, routine, sleep, and custom timetables', async () => {
    const cases = [
      { template: 'study', keys: ['none', 'focus', 'reading', 'admin', 'break'] },
      { template: 'routine', keys: ['none', 'morning', 'reset', 'chore', 'reflection'] },
      { template: 'sleep', keys: ['none', 'wind-down', 'bedtime', 'wake-up', 'nap'] },
      { template: 'custom', keys: ['none', 'block', 'task', 'reminder', 'note'] },
    ];
    for (const c of cases) {
      ttiState.timetable = { id: 'tt-1', template: c.template, title: c.template };
      let renderer: any;
      await act(async () => { renderer = TestRenderer.create(<NewTimetableItem />); await flush(); });
      for (const k of c.keys) {
        expect(findByTestID(renderer.root, `new-timetable-item-cat-${k}`)).toBeDefined();
      }
      act(() => renderer.unmount());
    }
  });

  it('Save disabled when no timetableId param', async () => {
    paramsState.value = {};
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetableItem />); await flush(); });
    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('Timetable missing');
    expect(text).toContain('could not be found');
    expect(findByTestID(renderer.root, 'new-timetable-item-title-input')).toBeUndefined();
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeUndefined();
    act(() => renderer.unmount());
  });

  it('Save disabled when the timetable id cannot be resolved', async () => {
    paramsState.value = { timetableId: 'not-a-uuid' };
    ttiState.timetable = null;
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetableItem />); await flush(); });
    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('Timetable missing');
    expect(text).toContain('could not be found');
    expect(findByTestID(renderer.root, 'new-timetable-item-title-input')).toBeUndefined();
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeUndefined();
    act(() => renderer.unmount());
  });

  it('shows a loading state while the parent timetable is resolving', async () => {
    paramsState.value = { timetableId: 'tt-1' };
    ttiState.timetable = null;
    ttiState.isLoading = true;
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetableItem />); await flush(); });
    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('Loading timetable');
    expect(text).toContain('Loading this timetable');
    expect(text).not.toContain('Timetable missing');
    expect(findByTestID(renderer.root, 'new-timetable-item-title-input')).toBeUndefined();
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeUndefined();
    act(() => renderer.unmount());
  });

  it('Save disabled when the timetable item being edited cannot be resolved', async () => {
    paramsState.value = { timetableId: 'tt-1', id: 'missing-item' };
    ttiState.items = [];

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetableItem />); await flush(); });

    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('Item missing');
    expect(text).toContain('could not be found');
    expect(findByTestID(renderer.root, 'new-timetable-item-title-input')).toBeUndefined();
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeUndefined();
    expect(ttiState.update).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('shows a loading state while the edited timetable item is resolving', async () => {
    paramsState.value = { timetableId: 'tt-1', id: 'item-1' };
    ttiState.items = [];
    ttiState.isLoading = true;

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetableItem />); await flush(); });

    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('Loading item');
    expect(text).toContain('Loading this timetable item');
    expect(text).not.toContain('Item missing');
    expect(findByTestID(renderer.root, 'new-timetable-item-title-input')).toBeUndefined();
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeUndefined();
    act(() => renderer.unmount());
  });

  it('hydrates edit fields when the timetable item resolves after initial render', async () => {
    paramsState.value = { timetableId: 'tt-1', id: 'item-1' };
    ttiState.items = [];
    ttiState.isLoading = true;

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetableItem />); await flush(); });
    expect(JSON.stringify(renderer.toJSON())).toContain('Loading item');
    expect(findByTestID(renderer.root, 'new-timetable-item-title-input')).toBeUndefined();

    await act(async () => {
      ttiState.items = [
        {
          id: 'item-1',
          title: 'Late dinner',
          cat: 'dinner',
          start: 20.5,
          dur: 1,
          day: 5,
          who: 'partner',
          repeat: 'once',
        },
      ];
      ttiState.isLoading = false;
      renderer.update(<NewTimetableItem />);
      await flush();
    });

    expect(findByTestID(renderer.root, 'new-timetable-item-title-input').props.value).toBe('Late dinner');
    expect(findByTestID(renderer.root, 'new-timetable-item-cat-dinner').props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(findByTestID(renderer.root, 'new-timetable-item-who-partner').props.active).toBe(true);
    expect(findByTestID(renderer.root, 'new-timetable-item-repeat-once').props.active).toBe(true);
    expect(findByTestID(renderer.root, 'new-timetable-item-day-4').props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeDefined();

    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });

    expect(ttiState.update).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({
        title: 'Late dinner',
        category: 'dinner',
        day: 5,
        duration: 60,
        who: 'partner',
        repeat: 'once',
      }),
    );

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
      findByTestID(renderer.root, 'new-timetable-item-cat-lunch').props.onPress();
      await flush();
    });
    // Stepper: default 90, step -5 nine times = 45
    for (let i = 0; i < 9; i++) {
      await act(async () => {
        findByTestID(renderer.root, 'new-timetable-item-dur-input-minus').props.onPress();
        await flush();
      });
    }
    // UI days are Monday-first; storage days are Sunday-first.
    // Start with Wednesday (UI 2 → storage 3); add Friday (UI 4 → storage 5).
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
    expect([first.day, second.day].sort()).toEqual([3, 5]);
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

  it('ignores duplicate save taps while timetable item creation is pending', async () => {
    let resolveAdd: () => void = () => undefined;
    const addPromise = new Promise<void>((resolve) => {
      resolveAdd = resolve;
    });
    ttiState.add.mockImplementation(() => addPromise);

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewTimetableItem />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-timetable-item-title-input').props.onChangeText('Risotto');
      await flush();
    });
    await act(async () => {
      const saveBtn = findSaveBtn(renderer.root, { enabled: true });
      saveBtn.props.onPress();
      saveBtn.props.onPress();
      await flush();
    });

    expect(ttiState.add).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveAdd();
      await flush();
    });

    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('preset "Weekdays" stores Monday-Friday in Sunday-first day ids', async () => {
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
    expect(days).toEqual([1, 2, 3, 4, 5]);
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
