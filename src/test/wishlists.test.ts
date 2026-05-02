import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as any).__DEV__ = true;

vi.mock('expo-router', () => ({
  router: { back: vi.fn(), push: vi.fn() },
  Stack: { Screen: () => null },
}));

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(async () => undefined),
  impactAsync: vi.fn(async () => undefined),
  notificationAsync: vi.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

vi.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ play: vi.fn(), pause: vi.fn(), seekTo: vi.fn() }),
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('@/src/lib/preferences', () => ({
  findCurrency: (code: string) => ({ code, symbol: code === 'EUR' ? '€' : '$' }),
  usePreferences: () => ({ currencyCode: 'USD' }),
}));

vi.mock('@/src/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => {
    const React = require('react');
    return React.createElement('Text', null, name);
  },
}));

vi.mock('@/src/components/ui/PressScale', () => ({
  PressScale: ({ children, onPress, testID }: any) => {
    const React = require('react');
    return React.createElement('Pressable', { testID, onPress }, children);
  },
}));

vi.mock('@/src/components/ui/pacto', () => {
  const React = require('react');
  return {
    ActionEmptyState: ({ title, body, actionLabel, onAction }: any) =>
      React.createElement(
        'View',
        null,
        React.createElement('Text', null, title),
        React.createElement('Text', null, body),
        React.createElement('Pressable', { onPress: onAction }, React.createElement('Text', null, actionLabel)),
      ),
    BucketedList: ({ buckets, renderRow }: any) =>
      React.createElement(
        'View',
        null,
        buckets.flatMap((bucket: any) => [
          React.createElement('Text', { key: `${bucket.label}-label` }, bucket.label),
          ...bucket.rows.map((row: any, index: number) =>
            React.createElement('View', { key: row.id }, renderRow(row, index, bucket)),
          ),
        ]),
      ),
    Checkbox: () => React.createElement('View', null),
    HeaderBrand: ({ eyebrow, title }: any) =>
      React.createElement('View', null, React.createElement('Text', null, eyebrow), React.createElement('Text', null, title)),
    PriorityDot: () => React.createElement('View', null),
    SegmentedTabs: ({ options, onChange }: any) =>
      React.createElement(
        'View',
        null,
        options.map((option: any) =>
          React.createElement(
            'Pressable',
            { key: option.key, testID: option.testID, onPress: () => onChange(option.key) },
            React.createElement('Text', null, option.label),
          ),
        ),
      ),
    StatBar: ({ eyebrow, meta, primary }: any) =>
      React.createElement(
        'View',
        null,
        React.createElement('Text', null, eyebrow),
        React.createElement('Text', null, meta),
        primary,
      ),
    SwipeableRow: ({ children }: any) => React.createElement('View', null, children),
  };
});

const queryState = vi.hoisted(() => ({
  data: null as any,
}));

const sessionState = vi.hoisted(() => ({
  activeCouple: { couple: { id: 'couple-1' } },
  user: { id: 'user-1', displayName: 'Alex Rivers' },
  partner: { id: 'partner-1', displayName: 'Sam Lee' },
  members: [] as any[],
  mode: 'pair' as 'solo' | 'pair' | 'crew',
  isFeatureEnabled: vi.fn(() => true),
}));

const dbMock = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: queryState.data, isLoading: false })),
  transact: vi.fn(),
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
  id: vi.fn(() => 'mock-id'),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: vi.fn(() => sessionState),
}));

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const hasText = (root: any, text: string) =>
  root.findAll((node: any) => {
    const children = node.props?.children;
    if (children === text) return true;
    return Array.isArray(children) && children.includes(text);
  }).length > 0;
const findByTestID = (root: any, id: string) =>
  root.findAll((node: any) => node.props?.testID === id)[0];

async function renderHookValue<T>(useValue: () => T) {
  let latest: T | null = null;

  function Probe() {
    latest = useValue();
    return null;
  }

  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Probe));
    await flush();
  });

  return { latest: latest!, renderer };
}

describe('useWishlists', () => {
  beforeEach(() => {
    queryState.data = null;
    sessionState.mode = 'pair';
    sessionState.partner = { id: 'partner-1', displayName: 'Sam Lee' };
    sessionState.members = [];
    sessionState.isFeatureEnabled.mockClear();
    dbMock.useQuery.mockClear();
    dbMock.transact.mockClear();
  });

  it('exports the useWishlists hook as a function', async () => {
    const { useWishlists } = await import('@/src/hooks/useWishlists');
    expect(useWishlists).toBeTypeOf('function');
  });

  it('exports the useWishlistItems hook as a function', async () => {
    const { useWishlistItems } = await import('@/src/hooks/useWishlists');
    expect(useWishlistItems).toBeTypeOf('function');
  });

  it('maps all wishlist items with persisted scope and defaults missing scope to mine', async () => {
    queryState.data = {
      wishlistItems: [
        {
          id: 'wish-1',
          title: 'Lamp',
          addedBy: { id: 'user-1' },
          wishlist: { id: 'list-1', name: 'Home' },
        },
        {
          id: 'wish-2',
          title: 'Trip',
          scope: 'shared',
          addedBy: { id: 'partner-1' },
          wishlist: { id: 'list-1', name: 'Home' },
        },
      ],
    };

    const { useAllWishlistItems } = await import('@/src/hooks/useWishlists');
    const { latest, renderer } = await renderHookValue(() => useAllWishlistItems());

    expect(latest.items.map((item: any) => item.scope)).toEqual(['mine', 'shared']);
    act(() => renderer.unmount());
  });

  it('sanitizes invalid persisted wishlist scope to mine', async () => {
    queryState.data = {
      wishlistItems: [
        {
          id: 'wish-1',
          title: 'Lamp',
          scope: 'theirs',
          addedBy: { id: 'partner-1' },
          wishlist: { id: 'list-1', name: 'Home' },
        },
      ],
    };

    const { useAllWishlistItems } = await import('@/src/hooks/useWishlists');
    const { latest, renderer } = await renderHookValue(() => useAllWishlistItems());

    expect(latest.items[0].scope).toBe('mine');
    act(() => renderer.unmount());
  });

  it('maps per-list wishlist items with persisted scope and defaults missing scope to mine', async () => {
    queryState.data = {
      wishlistItems: [
        { id: 'wish-1', title: 'Lamp' },
        { id: 'wish-2', title: 'Watch', scope: 'partner' },
      ],
    };

    const { useWishlistItems } = await import('@/src/hooks/useWishlists');
    const { latest, renderer } = await renderHookValue(() => useWishlistItems('list-1'));

    expect(latest.items.map((item: any) => item.scope)).toEqual(['mine', 'partner']);
    act(() => renderer.unmount());
  });

  it('filters wishlist screen rows using sanitized persisted scope', async () => {
    queryState.data = {
      wishlistItems: [
        {
          id: 'wish-1',
          title: 'Lamp',
          price: 20,
          scope: 'mine',
          addedBy: { id: 'user-1' },
          wishlist: { id: 'list-1', name: 'Home' },
        },
        {
          id: 'wish-2',
          title: 'Watch',
          price: 80,
          scope: 'partner',
          addedBy: { id: 'partner-1' },
          wishlist: { id: 'list-1', name: 'Home' },
        },
        {
          id: 'wish-3',
          title: 'Trip',
          price: 200,
          scope: 'shared',
          addedBy: { id: 'partner-1' },
          wishlist: { id: 'list-1', name: 'Home' },
        },
        {
          id: 'wish-4',
          title: 'Legacy invalid',
          price: 15,
          scope: 'theirs',
          addedBy: { id: 'partner-1' },
          wishlist: { id: 'list-1', name: 'Home' },
        },
      ],
    };

    const { default: WishlistsScreen } = await import('@/app/(tabs)/us/wishlists');
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(WishlistsScreen));
      await flush();
    });

    expect(hasText(renderer.root, 'Lamp')).toBe(true);
    expect(hasText(renderer.root, 'Watch')).toBe(true);
    expect(hasText(renderer.root, 'Trip')).toBe(true);
    expect(hasText(renderer.root, 'Legacy invalid')).toBe(true);

    await act(async () => {
      findByTestID(renderer.root, 'wishlist-filter-mine').props.onPress();
      await flush();
    });

    expect(hasText(renderer.root, 'Lamp')).toBe(true);
    expect(hasText(renderer.root, 'Legacy invalid')).toBe(true);
    expect(hasText(renderer.root, 'Watch')).toBe(false);
    expect(hasText(renderer.root, 'Trip')).toBe(false);

    await act(async () => {
      findByTestID(renderer.root, 'wishlist-filter-theirs').props.onPress();
      await flush();
    });

    expect(hasText(renderer.root, 'Watch')).toBe(true);
    expect(hasText(renderer.root, 'Lamp')).toBe(false);
    expect(hasText(renderer.root, 'Legacy invalid')).toBe(false);
    expect(hasText(renderer.root, 'Trip')).toBe(false);
    act(() => renderer.unmount());
  });
});
