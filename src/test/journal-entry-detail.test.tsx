import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const journalState = vi.hoisted(() => ({
  entries: [] as any[],
  isLoading: false,
  remove: vi.fn(async () => undefined),
}));

vi.mock('expo-router', () => ({
  router: { back: vi.fn(), push: vi.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: 'entry-1' }),
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('@/src/hooks/useFeatureGate', () => ({
  useFeatureGate: () => ({ enabled: true, feature: null }),
}));

vi.mock('@/src/hooks/useJournal', () => ({
  useJournal: () => ({
    allEntries: journalState.entries,
    isLoading: journalState.isLoading,
    remove: journalState.remove,
  }),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => ({
    user: { id: 'user-1', displayName: 'You' },
    partner: { id: 'partner-1', displayName: 'Partner' },
    members: [],
  }),
}));

import { JournalEntryDetailScreen } from '@/src/components/journal/JournalEntryDetailScreen';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));

const findByTestID = (root: any, id: string) =>
  root.findAll((node: any) => node.props?.testID === id)[0];

describe('journal entry detail', () => {
  beforeEach(() => {
    journalState.entries = [
      {
        id: 'entry-1',
        title: 'Another nice thought',
        body: 'This is another nice thought',
        author_id: 'user-1',
        created_at: '2026-04-25T14:53:00.000Z',
        entry_date: '2026-04-25',
        is_private: false,
        tags: [],
      },
    ];
    journalState.isLoading = false;
    journalState.remove.mockReset();
    journalState.remove.mockResolvedValue(undefined);
  });

  it('renders a loading state while a direct entry route is still resolving', async () => {
    journalState.entries = [];
    journalState.isLoading = true;

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<JournalEntryDetailScreen />);
      await flush();
    });

    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('Loading entry');
    expect(text).toContain('Loading this entry');
    expect(text).not.toContain('Entry missing');

    act(() => renderer.unmount());
  });

  it('renders the entry body as plain text instead of a card container', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<JournalEntryDetailScreen />);
      await flush();
    });

    const body = findByTestID(renderer.root, 'journal-entry-body-text');
    expect(body.props.children).toBe('This is another nice thought');

    const bodyStyle = StyleSheet.flatten(body.props.style);
    expect(bodyStyle).toMatchObject({
      fontSize: 18,
      lineHeight: 30,
      fontStyle: 'normal',
    });

    const bodyWrap = findByTestID(renderer.root, 'journal-entry-body-wrap');
    const bodyWrapStyle = StyleSheet.flatten(bodyWrap.props.style);
    expect(bodyWrapStyle).toMatchObject({
      marginTop: 24,
      paddingHorizontal: 2,
    });
    expect(bodyWrapStyle.borderWidth).toBeUndefined();
    expect(bodyWrapStyle.borderRadius).toBeUndefined();
    expect(bodyWrapStyle.backgroundColor).toBeUndefined();

    act(() => renderer.unmount());
  });

  it('falls back to the created timestamp when the detail entry date is malformed', async () => {
    journalState.entries = [
      {
        id: 'entry-1',
        title: 'Imported thought',
        body: 'This came from an import',
        author_id: 'user-1',
        created_at: '2026-04-25T14:53:00.000Z',
        entry_date: 'not-a-date',
        is_private: false,
        tags: [],
      },
    ];

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<JournalEntryDetailScreen />);
      await flush();
    });

    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('Apr 25, 2026');

    act(() => renderer.unmount());
  });

  it('pins edit and delete actions to a rounded bottom bar', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<JournalEntryDetailScreen />);
      await flush();
    });

    const bar = findByTestID(renderer.root, 'journal-entry-actions-bar');
    const barStyle = StyleSheet.flatten(bar.props.style);
    expect(barStyle).toMatchObject({
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 20,
    });

    const editButton = findByTestID(renderer.root, 'journal-entry-edit-action');
    const deleteButton = findByTestID(renderer.root, 'journal-entry-delete-action');
    expect(StyleSheet.flatten(editButton.props.style)).toMatchObject({
      borderRadius: 999,
    });
    expect(StyleSheet.flatten(deleteButton.props.style)).toMatchObject({
      borderRadius: 999,
    });

    act(() => renderer.unmount());
  });

  it('does not render edit or delete actions for partner-authored entries', async () => {
    journalState.entries = [
      {
        id: 'entry-1',
        title: 'Partner thought',
        body: 'This belongs to Partner',
        author_id: 'partner-1',
        created_at: '2026-04-25T14:53:00.000Z',
        entry_date: '2026-04-25',
        is_private: false,
        tags: [],
      },
    ];
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<JournalEntryDetailScreen />);
      await flush();
    });

    expect(findByTestID(renderer.root, 'journal-entry-actions-bar')).toBeUndefined();
    expect(findByTestID(renderer.root, 'journal-entry-edit-action')).toBeUndefined();
    expect(findByTestID(renderer.root, 'journal-entry-delete-action')).toBeUndefined();

    act(() => renderer.unmount());
  });

  it('ignores duplicate delete confirmations while removal is pending', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    let releaseRemove: (() => void) | undefined;
    journalState.remove.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseRemove = resolve;
        }),
    );
    let renderer: any;
    try {
      await act(async () => {
        renderer = TestRenderer.create(<JournalEntryDetailScreen />);
        await flush();
      });

      await act(async () => {
        findByTestID(renderer.root, 'journal-entry-delete-action').props.onPress();
        await flush();
      });

      const [, , buttons] = alertSpy.mock.calls[0];
      const destructive = buttons.find((button: any) => button.style === 'destructive');
      let firstPress: Promise<void> | undefined;
      let secondPress: Promise<void> | undefined;
      await act(async () => {
        firstPress = destructive.onPress();
        secondPress = destructive.onPress();
        await Promise.resolve();
      });

      expect(journalState.remove).toHaveBeenCalledTimes(1);
      releaseRemove?.();
      await act(async () => {
        await Promise.all([firstPress, secondPress]);
        await flush();
      });
    } finally {
      alertSpy.mockRestore();
      if (renderer) act(() => renderer.unmount());
    }
  });
});
