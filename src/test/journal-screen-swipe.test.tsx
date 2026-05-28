import React from 'react';
import { format } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routerSpy = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
}));

const journalState = vi.hoisted(() => ({
  entries: [] as any[],
  remove: vi.fn(async () => undefined),
}));

const sessionState = vi.hoisted(() => ({
  mode: 'pair',
  user: { id: 'me', displayName: 'Tor', email: 'tor@example.com' },
  partner: { id: 'partner', displayName: 'Sofia' } as any,
  members: [] as any[],
}));

vi.mock('expo-router', () => ({
  router: routerSpy,
  Stack: { Screen: () => null },
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('@/src/components/features/FeatureRouteGuard', () => ({
  FeatureRouteGuard: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/src/components/ui/Icon', () => {
  const Reactx = require('react');
  return {
    Icon: (props: any) => Reactx.createElement('MockIcon', props),
  };
});

vi.mock('@/src/components/ui/PressScale', () => {
  const Reactx = require('react');
  return {
    PressScale: (props: any) => Reactx.createElement('MockPressScale', props, props.children),
  };
});

vi.mock('@/src/components/ui/pacto', () => {
  const Reactx = require('react');
  return {
    ActionEmptyState: (props: any) => Reactx.createElement('MockActionEmptyState', props),
    BucketedList: ({ buckets, rowKey, renderRow }: any) =>
      Reactx.createElement(
        'MockBucketedList',
        { buckets },
        buckets.flatMap((bucket: any) =>
          bucket.rows.map((row: any) =>
            Reactx.createElement(Reactx.Fragment, { key: rowKey(row) }, renderRow(row)),
          ),
        ),
      ),
    HeaderBrand: (props: any) => Reactx.createElement('MockHeaderBrand', props),
    SegmentedTabs: (props: any) => Reactx.createElement('MockSegmentedTabs', props),
    StatBar: (props: any) => Reactx.createElement('MockStatBar', props),
    SwipeableRow: (props: any) =>
      Reactx.createElement('MockSwipeableRow', props, props.children),
  };
});

vi.mock('@/src/hooks/useJournal', () => ({
  useJournal: () => ({
    allEntries: journalState.entries,
    remove: journalState.remove,
  }),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => sessionState,
}));

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    C: {
      bg: '#fbf8f0',
      bgSoft: '#f2ecdf',
      inkColor: '#20243a',
      ink2: '#566175',
      ink3: '#8b8799',
      lineColor: '#d9cfbe',
      accent: '#d66b52',
      accent2: '#76afa0',
      accent3: '#c4a143',
      journal: '#76afa0',
    },
  }),
}));

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));

function localDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

async function renderJournal() {
  const { default: JournalScreen } = await import('@/app/(tabs)/us/journal');
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(<JournalScreen />);
    await flush();
  });
  return renderer;
}

function findSwipeRow(root: any, entryId: string) {
  return root
    .findAll((node: any) => node.type === 'MockSwipeableRow')
    .find((node: any) =>
      node.findAll((child: any) => child.children?.includes?.(entryId)).length > 0,
    );
}

describe('Journal screen swipe actions', () => {
  beforeEach(() => {
    routerSpy.push.mockClear();
    routerSpy.back.mockClear();
    journalState.remove.mockClear();
    journalState.entries = [];
    sessionState.mode = 'pair';
    sessionState.user = { id: 'me', displayName: 'Tor', email: 'tor@example.com' };
    sessionState.partner = { id: 'partner', displayName: 'Sofia' };
    sessionState.members = [];
  });

  it('does not expose edit or delete swipe actions for partner journal entries', async () => {
    journalState.entries = [
      {
        id: 'partner-entry',
        title: 'Jounrallee',
        body: 'This is a simple journallee',
        author_id: 'partner',
        entry_date: new Date().toISOString().slice(0, 10),
        created_at: new Date().toISOString(),
        is_private: false,
      },
    ];

    const renderer = await renderJournal();
    const row = findSwipeRow(renderer.root, 'Jounrallee');

    expect(row?.props.onEdit).toBeUndefined();
    expect(row?.props.onDelete).toBeUndefined();
    expect(routerSpy.push).not.toHaveBeenCalledWith('/sheets/journal-entry?id=partner-entry');
    expect(journalState.remove).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('keeps edit and delete swipe actions for current-user journal entries', async () => {
    journalState.entries = [
      {
        id: 'my-entry',
        title: 'Jounrallee',
        body: 'This is a simple journallee',
        author_id: 'me',
        entry_date: new Date().toISOString().slice(0, 10),
        created_at: new Date().toISOString(),
        is_private: false,
      },
    ];

    const renderer = await renderJournal();
    const row = findSwipeRow(renderer.root, 'Jounrallee');

    expect(row?.props.onEdit).toEqual(expect.any(Function));
    expect(row?.props.onDelete).toEqual(expect.any(Function));
    await act(async () => {
      await row.props.onEdit();
      await row.props.onDelete();
      await flush();
    });
    expect(routerSpy.push).toHaveBeenCalledWith('/sheets/journal-entry?id=my-entry');
    expect(journalState.remove).toHaveBeenCalledWith('my-entry');

    act(() => renderer.unmount());
  });

  it('does not label entries with missing authors as partner in solo mode', async () => {
    sessionState.mode = 'solo';
    sessionState.partner = null;
    journalState.entries = [
      {
        id: 'local-entry',
        title: 'Jounrallee',
        body: 'This is a simple journallee',
        author_id: '',
        entry_date: new Date().toISOString().slice(0, 10),
        created_at: new Date().toISOString(),
        is_private: false,
      },
    ];

    const renderer = await renderJournal();
    const labels = renderer.root
      .findAll((node: any) => typeof node.children?.[0] === 'string')
      .flatMap((node: any) => node.children.filter((child: any) => typeof child === 'string'));

    expect(labels).toContain('TOR');
    expect(labels).not.toContain('PARTNER');

    act(() => renderer.unmount());
  });

  it('buckets journal rows by journal date instead of created timestamp', async () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    journalState.entries = [
      {
        id: 'backdated-entry',
        title: 'Backdated day',
        body: 'Saved today for an older journal date',
        author_id: 'me',
        entry_date: localDateKey(tenDaysAgo),
        created_at: new Date().toISOString(),
        is_private: true,
      },
    ];

    const renderer = await renderJournal();
    const bucketList = renderer.root.findByType('MockBucketedList');
    const earlierBucket = bucketList.props.buckets.find((bucket: any) => bucket.label === 'Earlier');
    const text = renderer.root
      .findAll((node: any) => typeof node.children?.[0] === 'string')
      .flatMap((node: any) => node.children.filter((child: any) => typeof child === 'string'))
      .join(' ');

    expect(earlierBucket?.rows.map((row: any) => row.id)).toEqual(['backdated-entry']);
    expect(
      bucketList.props.buckets.find((bucket: any) => bucket.label === 'Today'),
    ).toBeUndefined();
    expect(text).toContain(format(tenDaysAgo, 'MMM d'));

    act(() => renderer.unmount());
  });

  it('falls back to the created timestamp when the featured entry date is malformed', async () => {
    journalState.entries = [
      {
        id: 'malformed-date-entry',
        title: 'Saved thought',
        body: 'The entry date was imported incorrectly',
        author_id: 'me',
        entry_date: 'not-a-date',
        created_at: '2026-04-25T14:53:00.000Z',
        is_private: false,
      },
    ];

    const renderer = await renderJournal();
    const labels = renderer.root
      .findAll((node: any) => typeof node.children?.[0] === 'string')
      .flatMap((node: any) => node.children.filter((child: any) => typeof child === 'string'));

    expect(labels).toContain('Apr 25');

    act(() => renderer.unmount());
  });
});
