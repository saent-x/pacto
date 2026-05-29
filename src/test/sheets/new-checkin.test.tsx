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

const alertSpy = vi.hoisted(() => vi.fn());
vi.mock('react-native', async () => {
  const actual: any = await vi.importActual('react-native');
  return { ...actual, Alert: { alert: alertSpy } };
});

const checkInState = vi.hoisted(() => ({
  createOrUpdate: vi.fn(async () => undefined),
  update: vi.fn(async () => undefined),
  checkIns: [] as any[],
  isLoading: false,
  isSubmitting: false,
}));

const sessionState = vi.hoisted(() => ({
  mode: 'pair',
  user: { id: 'u-me', displayName: 'Me' },
  partner: { id: 'u-sofia', displayName: 'Sofia', avatarUrl: null },
  isSolo: false,
  isFeatureEnabled: () => true,
}));

vi.mock('@/src/hooks/useCheckIns', () => ({
  useCheckIns: () => ({
    createOrUpdate: checkInState.createOrUpdate,
    update: checkInState.update,
    checkIns: checkInState.checkIns,
    isLoading: checkInState.isLoading,
    isSubmitting: checkInState.isSubmitting,
  }),
}));
vi.mock('@/src/hooks/useSession', () => ({ useSession: () => sessionState }));

import NewCheckin from '@/app/sheets/new-checkin';
import { CHECK_IN_STATES } from '@/src/constants/checkInStates';
import { getTokens } from '@/src/lib/tokens';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];
const readText = (root: any) =>
  root
    .findAll((n: any) => Array.isArray(n.children) && n.children.some((c: any) => typeof c === 'string'))
    .flatMap((n: any) => n.children.filter((c: any) => typeof c === 'string'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
const findSaveBtn = (root: any, opts: { enabled?: boolean } = {}) =>
  root.findAll((n: any) => {
    if (n.props?.icon !== 'check') return false;
    if (typeof n.props?.onPress !== 'function') return false;
    if (opts.enabled === true && n.props?.disabled) return false;
    if (opts.enabled === false && !n.props?.disabled) return false;
    return true;
  })[0];
const hexToLuminance = (hex: string) => {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const [rl, gl, bl] = [r, g, b].map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
};
const contrastRatio = (a: string, b: string) => {
  const [lighter, darker] = [hexToLuminance(a), hexToLuminance(b)].sort((left, right) => right - left);
  return (lighter + 0.05) / (darker + 0.05);
};

describe('new-checkin sheet', () => {
  beforeEach(() => {
    paramsState.current = {};
    checkInState.createOrUpdate.mockClear();
    checkInState.update.mockClear();
    checkInState.checkIns = [];
    checkInState.isLoading = false;
    checkInState.isSubmitting = false;
    (router.back as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
    alertSpy.mockClear();
    sessionState.isSolo = false;
    sessionState.partner = { id: 'u-sofia', displayName: 'Sofia', avatarUrl: null };
  });

  it('solo mode hides the partner-aware Privacy info card', async () => {
    sessionState.isSolo = true;
    sessionState.partner = null as any;
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewCheckin />); await flush(); });
    const eyeIcons = renderer.root.findAll((n: any) => n.props?.name === 'eye');
    expect(eyeIcons.length).toBe(0);
    act(() => renderer.unmount());
  });

  it('solo mode saves check-ins as private personal rows', async () => {
    sessionState.isSolo = true;
    sessionState.partner = null as any;
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewCheckin />); await flush(); });

    expect(findByTestID(renderer.root, 'new-checkin-visibility-shared')).toBeUndefined();
    expect(findByTestID(renderer.root, 'new-checkin-visibility-personal')).toBeUndefined();

    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });

    expect(checkInState.createOrUpdate).toHaveBeenCalledWith({
      mood: 'okay',
      note: null,
      isPrivate: true,
    });
    act(() => renderer.unmount());
  });

  it('renders all 6 check-in mood choices and no free-text note field', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewCheckin />); await flush(); });
    for (const n of ['rough', 'low', 'okay', 'steady', 'good', 'great']) {
      expect(findByTestID(renderer.root, `new-checkin-mood-${n}`)).toBeDefined();
    }
    expect(findByTestID(renderer.root, 'new-checkin-note-input')).toBeUndefined();
    expect(findByTestID(renderer.root, 'new-checkin-selected-mood')).toBeDefined();
    act(() => renderer.unmount());
  });

  it('uses a visible light-theme amber for the default okay mood', () => {
    const okay = CHECK_IN_STATES.find((state) => state.id === 'okay');
    expect(okay).toBeDefined();
    expect(contrastRatio(okay!.color, getTokens('light').bg)).toBeGreaterThanOrEqual(3);
  });

  it('keeps mood icons distinct from the weather signal icons', () => {
    const weatherIcons = new Set(['sun', 'cloud', 'cloudRain', 'zap', 'mapPin']);
    const rough = CHECK_IN_STATES.find((state) => state.id === 'rough');
    const good = CHECK_IN_STATES.find((state) => state.id === 'good');

    expect(rough?.icon).toBe('droplet');
    expect(good).toMatchObject({ icon: 'star', color: '#637F55' });
    expect(CHECK_IN_STATES.some((state) => weatherIcons.has(state.icon))).toBe(false);
  });

  it('happy path: default okay state saves mood:"okay", haptic, back', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewCheckin />); await flush(); });
    const btn = findSaveBtn(renderer.root, { enabled: true });
    await act(async () => { btn.props.onPress(); await flush(); });
    expect(checkInState.createOrUpdate).toHaveBeenCalledTimes(1);
    expect(checkInState.createOrUpdate).toHaveBeenCalledWith({
      mood: 'okay',
      note: null,
      isPrivate: false,
    });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('ignores duplicate save taps while check-in creation is pending', async () => {
    let resolveCreate: () => void = () => undefined;
    const createPromise = new Promise<void>((resolve) => {
      resolveCreate = resolve;
    });
    checkInState.createOrUpdate.mockImplementation(() => createPromise);

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewCheckin />); await flush(); });
    await act(async () => {
      const btn = findSaveBtn(renderer.root, { enabled: true });
      btn.props.onPress();
      btn.props.onPress();
      await flush();
    });

    expect(checkInState.createOrUpdate).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate();
      await flush();
    });

    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('lets shared-space users save a personal check-in', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewCheckin />); await flush(); });

    expect(findByTestID(renderer.root, 'new-checkin-visibility-shared')).toBeDefined();
    expect(findByTestID(renderer.root, 'new-checkin-visibility-personal')).toBeDefined();

    await act(async () => {
      findByTestID(renderer.root, 'new-checkin-visibility-personal').props.onPress();
      findByTestID(renderer.root, 'new-checkin-mood-great').props.onPress();
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });

    expect(checkInState.createOrUpdate).toHaveBeenCalledWith({
      mood: 'great',
      note: null,
      isPrivate: true,
    });
    act(() => renderer.unmount());
  });

  it('selected mood name updates and is saved', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewCheckin />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-checkin-mood-great').props.onPress();
      await flush();
    });
    expect(readText(renderer.root)).toContain('Great');
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    expect(checkInState.createOrUpdate).toHaveBeenCalledWith({
      mood: 'great',
      note: null,
      isPrivate: false,
    });
    act(() => renderer.unmount());
  });

  it('edits the selected historical check-in instead of logging today', async () => {
    paramsState.current = { id: 'check-in-1' };
    checkInState.checkIns = [
      {
        id: 'check-in-1',
        authorId: 'u-me',
        spaceId: 'solo-1',
        mood: 'low',
        note: null,
        isPrivate: true,
        checkInDate: '2026-05-02',
        createdAt: Date.parse('2026-05-02T09:00:00Z'),
      },
    ];

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewCheckin />); await flush(); });
    expect(readText(renderer.root)).toContain('Low');

    await act(async () => {
      findByTestID(renderer.root, 'new-checkin-mood-great').props.onPress();
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });

    expect(checkInState.update).toHaveBeenCalledWith('check-in-1', {
      mood: 'great',
      note: null,
      isPrivate: true,
      checkInDate: '2026-05-02',
    });
    expect(checkInState.createOrUpdate).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalledTimes(1);

    act(() => renderer.unmount());
  });

  it('does not pass a malformed legacy check-in date through untouched edit saves', async () => {
    paramsState.current = { id: 'check-in-bad-date' };
    checkInState.checkIns = [
      {
        id: 'check-in-bad-date',
        authorId: 'u-me',
        spaceId: 'solo-1',
        mood: 'low',
        note: null,
        isPrivate: true,
        checkInDate: '2026-04-31',
        createdAt: Date.parse('2026-05-02T09:00:00Z'),
      },
    ];

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewCheckin />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-checkin-mood-great').props.onPress();
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });

    expect(checkInState.update.mock.calls[0]).toEqual([
      'check-in-bad-date',
      expect.not.objectContaining({
        checkInDate: expect.any(String),
      }),
    ]);
    expect(JSON.stringify(checkInState.update.mock.calls[0][1])).not.toContain('2026-04-31');

    act(() => renderer.unmount());
  });

  it('does not present a partner-authored check-in as editable from a direct edit route', async () => {
    paramsState.current = { id: 'check-in-1' };
    checkInState.checkIns = [
      {
        id: 'check-in-1',
        authorId: 'u-sofia',
        spaceId: 'pair-1',
        mood: 'low',
        note: null,
        isPrivate: false,
        checkInDate: '2026-05-02',
        createdAt: Date.parse('2026-05-02T09:00:00Z'),
      },
    ];

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewCheckin />); await flush(); });

    expect(findByTestID(renderer.root, 'new-checkin-mood-low')).toBeUndefined();
    expect(findSaveBtn(renderer.root)).toBeUndefined();
    expect(checkInState.update).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('shows a loading state while a direct edit check-in route is resolving', async () => {
    paramsState.current = { id: 'check-in-1' };
    checkInState.checkIns = [];
    checkInState.isLoading = true;

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewCheckin />); await flush(); });

    const text = readText(renderer.root);
    expect(text).toContain('Loading check-in');
    expect(text).toContain('Loading this check-in');
    expect(text).not.toContain('Check-in missing');
    expect(findByTestID(renderer.root, 'new-checkin-mood-low')).toBeUndefined();
    expect(findSaveBtn(renderer.root)).toBeUndefined();

    act(() => renderer.unmount());
  });

  it('error branch: Alert shown, back NOT called, button re-enables', async () => {
    checkInState.createOrUpdate.mockRejectedValueOnce(new Error('offline'));
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewCheckin />); await flush(); });
    const btn = findSaveBtn(renderer.root, { enabled: true });
    await act(async () => { btn.props.onPress(); await flush(); });
    expect(alertSpy).toHaveBeenCalledWith('Save failed', 'Try again.');
    expect(router.back).not.toHaveBeenCalled();
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeDefined();
    act(() => renderer.unmount());
  });
});
