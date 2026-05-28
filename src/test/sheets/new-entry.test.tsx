import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeParams = vi.hoisted(() => ({
  value: {} as { id?: string },
}));

vi.mock('expo-router', () => ({
  router: { back: vi.fn(), push: vi.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => routeParams.value,
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

const journalState = vi.hoisted(() => ({
  create: vi.fn(async () => undefined),
  update: vi.fn(async () => undefined),
  allEntries: [] as any[],
  isLoading: false,
}));

const sessionState = vi.hoisted(() => ({
  mode: 'pair',
  user: { id: 'u-me', displayName: 'Me' },
  partner: { id: 'u-sofia', displayName: 'Sofia', avatarUrl: null },
  isSolo: false,
  isFeatureEnabled: () => true,
}));

vi.mock('@/src/hooks/useJournal', () => ({
  useJournal: () => ({
    create: journalState.create,
    update: journalState.update,
    allEntries: journalState.allEntries,
    isLoading: journalState.isLoading,
  }),
}));
vi.mock('@/src/hooks/useSession', () => ({ useSession: () => sessionState }));

import { JournalEntryFormScreen as NewEntry } from '@/src/components/journal/JournalEntryFormScreen';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];
const findSaveBtn = (root: any, opts: { enabled?: boolean } = {}) =>
  root.findAll((n: any) => {
    if (n.props?.icon !== 'feather') return false;
    if (typeof n.props?.onPress !== 'function') return false;
    if (opts.enabled === true && n.props?.disabled) return false;
    if (opts.enabled === false && !n.props?.disabled) return false;
    return true;
  })[0];

describe('new-entry sheet', () => {
  beforeEach(() => {
    journalState.create.mockClear();
    journalState.update.mockClear();
    journalState.allEntries = [];
    journalState.isLoading = false;
    routeParams.value = {};
    (router.back as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
    alertSpy.mockClear();
    sessionState.isSolo = false;
    sessionState.partner = { id: 'u-sofia', displayName: 'Sofia', avatarUrl: null };
  });

  it('does not render the old journal mood picker', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewEntry />); await flush(); });
    for (const k of ['great', 'good', 'okay', 'low', 'rough']) {
      expect(findByTestID(renderer.root, `new-entry-mood-${k}`)).toBeUndefined();
    }
    act(() => renderer.unmount());
  });

  it('Save disabled while body empty; whitespace-only does not enable', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewEntry />); await flush(); });
    expect(findSaveBtn(renderer.root, { enabled: false })).toBeDefined();
    await act(async () => {
      findByTestID(renderer.root, 'new-entry-body-input').props.onChangeText('   ');
      await flush();
    });
    expect(findSaveBtn(renderer.root, { enabled: true })).toBeUndefined();
    act(() => renderer.unmount());
  });

  it('happy path: title + body + private → create called with trimmed payload and no mood', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewEntry />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-entry-title-input').props.onChangeText('  Saturday');
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-entry-body-input').props.onChangeText('long day  ');
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-entry-private-toggle').props.onPress();
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    const call = journalState.create.mock.calls[0][0];
    expect(call.title).toBe('Saturday');
    expect(call.body).toBe('long day');
    expect(call).not.toHaveProperty('mood');
    expect(call.is_private).toBe(true);
    expect(call.entry_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('ignores duplicate save taps while journal entry creation is pending', async () => {
    let resolveCreate: () => void = () => undefined;
    const createPromise = new Promise<void>((resolve) => {
      resolveCreate = resolve;
    });
    journalState.create.mockImplementationOnce(() => createPromise);

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewEntry />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-entry-body-input').props.onChangeText('one entry only');
      await flush();
    });

    await act(async () => {
      const saveBtn = findSaveBtn(renderer.root, { enabled: true });
      saveBtn.props.onPress();
      saveBtn.props.onPress();
      await flush();
    });

    expect(journalState.create).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate();
      await flush();
    });

    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('edit path hydrates the entry and updates instead of creating', async () => {
    routeParams.value = { id: 'entry-1' };
    journalState.allEntries = [
      {
        id: 'entry-1',
        title: 'Old title',
        body: 'Old body',
        author_id: 'u-me',
        mood: 'okay',
        is_private: true,
        entry_date: '2026-05-18',
      },
    ];
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewEntry />); await flush(); });
    expect(findByTestID(renderer.root, 'new-entry-title-input').props.value).toBe('Old title');
    expect(findByTestID(renderer.root, 'new-entry-body-input').props.value).toBe('Old body');

    await act(async () => {
      findByTestID(renderer.root, 'new-entry-body-input').props.onChangeText('updated body  ');
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });

    expect(journalState.update).toHaveBeenCalledWith('entry-1', {
      title: 'Old title',
      body: 'updated body',
      is_private: true,
      entry_date: '2026-05-18',
    });
    expect(journalState.create).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('does not pass a malformed legacy entry date through untouched edit saves', async () => {
    routeParams.value = { id: 'entry-bad-date' };
    journalState.allEntries = [
      {
        id: 'entry-bad-date',
        title: 'Old title',
        body: 'Old body',
        author_id: 'u-me',
        mood: null,
        is_private: true,
        entry_date: '2026-04-31',
      },
    ];

    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewEntry />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-entry-body-input').props.onChangeText('updated body');
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });

    expect(journalState.update.mock.calls[0]).toEqual([
      'entry-bad-date',
      expect.not.objectContaining({
        entry_date: expect.any(String),
      }),
    ]);
    expect(JSON.stringify(journalState.update.mock.calls[0][1])).not.toContain('2026-04-31');

    act(() => renderer.unmount());
  });

  it('does not present a partner-authored entry as editable from a direct edit route', async () => {
    routeParams.value = { id: 'entry-1' };
    journalState.allEntries = [
      {
        id: 'entry-1',
        title: 'Partner title',
        body: 'Partner body',
        author_id: 'u-sofia',
        is_private: false,
        entry_date: '2026-05-18',
      },
    ];
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewEntry />); await flush(); });

    expect(findByTestID(renderer.root, 'new-entry-title-input')).toBeUndefined();
    expect(findByTestID(renderer.root, 'new-entry-body-input')).toBeUndefined();
    expect(findSaveBtn(renderer.root)).toBeUndefined();
    expect(journalState.update).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('empty title passes null to create', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewEntry />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-entry-body-input').props.onChangeText('body only');
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    expect(journalState.create.mock.calls[0][0].title).toBeNull();
    act(() => renderer.unmount());
  });

  it('solo mode hides Private toggle and saves as a private personal entry', async () => {
    sessionState.isSolo = true;
    sessionState.partner = null as any;
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewEntry />); await flush(); });
    expect(findByTestID(renderer.root, 'new-entry-private-toggle')).toBeUndefined();
    await act(async () => {
      findByTestID(renderer.root, 'new-entry-body-input').props.onChangeText('alone today');
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    const call = journalState.create.mock.calls[0][0];
    expect(call.is_private).toBe(true);
    act(() => renderer.unmount());
  });

  it('error branch: Alert shown, back NOT called', async () => {
    journalState.create.mockRejectedValueOnce(new Error('offline'));
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewEntry />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-entry-body-input').props.onChangeText('x');
      await flush();
    });
    await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
    expect(alertSpy).toHaveBeenCalledWith('Save failed', 'Try again.');
    expect(router.back).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });
});
