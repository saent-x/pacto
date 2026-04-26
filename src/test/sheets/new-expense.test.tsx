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

const alertSpy = vi.hoisted(() => vi.fn());
vi.mock('react-native', async () => {
  const actual: any = await vi.importActual('react-native');
  return { ...actual, Alert: { alert: alertSpy } };
});

const sessionState = vi.hoisted(() => ({
  user: { id: 'u-me', displayName: 'Me' },
  partner: { id: 'u-sofia', displayName: 'Sofia', avatarUrl: null },
  isSolo: false,
}));

const expenseState = vi.hoisted(() => ({
  create: vi.fn(async () => undefined),
}));

vi.mock('@/src/hooks/useSession', () => ({ useSession: () => sessionState }));
vi.mock('@/src/hooks/useExpenses', () => ({
  useExpenses: () => ({ create: expenseState.create }),
}));

import NewExpense from '@/app/sheets/new-expense';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];
const findSaveBtn = (root: any, opts: { enabled?: boolean } = {}) =>
  root.findAll((n: any) => {
    if (n.props?.icon !== 'check') return false;
    if (typeof n.props?.onPress !== 'function') return false;
    if (opts.enabled === true && n.props?.disabled) return false;
    if (opts.enabled === false && !n.props?.disabled) return false;
    return true;
  })[0];

describe('new-expense sheet', () => {
  beforeEach(() => {
    expenseState.create.mockClear();
    (router.back as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
    alertSpy.mockClear();
    sessionState.isSolo = false;
    sessionState.partner = { id: 'u-sofia', displayName: 'Sofia', avatarUrl: null };
  });

  it('renders 5 category pills + 2 payers + 3 splits', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewExpense />); await flush(); });
    for (const k of ['food', 'home', 'fun', 'travel', 'other']) {
      expect(findByTestID(renderer.root, `new-expense-cat-${k}`)).toBeDefined();
    }
    expect(findByTestID(renderer.root, 'new-expense-paidby-mattia')).toBeDefined();
    expect(findByTestID(renderer.root, 'new-expense-paidby-sofia')).toBeDefined();
    for (const s of ['50/50', 'Me', 'Them']) {
      expect(findByTestID(renderer.root, `new-expense-split-${s}`)).toBeDefined();
    }
    act(() => renderer.unmount());
  });

  it('Save disabled until amount > 0 AND what non-empty', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewExpense />); await flush(); });
    expect(findSaveBtn(renderer.root, { enabled: false })).toBeDefined();
    await act(async () => {
      findByTestID(renderer.root, 'new-expense-amount-input').props.onChangeText('12');
      await flush();
    });
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeUndefined();
    await act(async () => {
      findByTestID(renderer.root, 'new-expense-what-input').props.onChangeText('Groceries');
      await flush();
    });
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeDefined();
    act(() => renderer.unmount());
  });

  it('comma decimal "12,50" parses to 12.5', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewExpense />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-expense-amount-input').props.onChangeText('12,50');
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-expense-what-input').props.onChangeText('Dinner');
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    const call = expenseState.create.mock.calls[0][0];
    expect(call.amount).toBe(12.5);
    expect(call.title).toBe('Dinner');
    expect(call.currency).toBe('EUR');
    expect(call.splitType).toBe('even');
    expect(call.category).toBe('food');
    expect(call.paidBy).toBe('u-me');
    expect(call.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('paidBy sofia resolves to partner id; split "Me" maps to payer', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewExpense />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-expense-amount-input').props.onChangeText('40');
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-expense-what-input').props.onChangeText('Coffee');
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-expense-paidby-sofia').props.onPress();
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-expense-split-Me').props.onPress();
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    const call = expenseState.create.mock.calls[0][0];
    expect(call.paidBy).toBe('u-sofia');
    expect(call.splitType).toBe('payer');
    act(() => renderer.unmount());
  });

  it('solo mode hides Paid by + Split row and forces self payer + even split', async () => {
    sessionState.isSolo = true;
    sessionState.partner = null as any;
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewExpense />); await flush(); });
    expect(findByTestID(renderer.root, 'new-expense-paidby-mattia')).toBeUndefined();
    expect(findByTestID(renderer.root, 'new-expense-paidby-sofia')).toBeUndefined();
    for (const s of ['50/50', 'Me', 'Them']) {
      expect(findByTestID(renderer.root, `new-expense-split-${s}`)).toBeUndefined();
    }
    await act(async () => {
      findByTestID(renderer.root, 'new-expense-amount-input').props.onChangeText('20');
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-expense-what-input').props.onChangeText('Lunch');
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    const call = expenseState.create.mock.calls[0][0];
    expect(call.paidBy).toBe('u-me');
    expect(call.splitType).toBe('even');
    act(() => renderer.unmount());
  });
});
