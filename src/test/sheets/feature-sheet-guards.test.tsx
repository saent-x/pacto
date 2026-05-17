import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as any).__DEV__ = true;
});

vi.mock('expo-router', () => ({
  router: { back: vi.fn(), push: vi.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ listId: 'list-1' }),
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(async () => undefined),
  selectionAsync: vi.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('expo-audio', () => ({
  useAudioPlayer: () => ({
    play: vi.fn(),
    pause: vi.fn(),
    seekTo: vi.fn(),
  }),
}));

vi.mock('react-native-gesture-handler/ReanimatedSwipeable', () => ({
  default: (props: any) => props.children,
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const sessionState = vi.hoisted(() => ({
  mode: 'pair',
  user: { id: 'u-me', displayName: 'Me' },
  partner: { id: 'u-sofia', displayName: 'Sofia', avatarUrl: null },
  isSolo: false,
  disabledFeature: null as string | null,
  isFeatureEnabled: vi.fn((featureId: string) => featureId !== sessionState.disabledFeature),
}));

const listsState = vi.hoisted(() => ({
  lists: [
    {
      id: 'list-1',
      name: 'Travel',
      icon: 'mapPin',
      colorKey: 'sky',
      category: null,
      done: 0,
      total: 0,
      createdAt: 0,
    },
  ],
}));
const taskItemsSpy = vi.hoisted(() =>
  vi.fn(() => ({
    create: vi.fn(),
    update: vi.fn(),
    toggleComplete: vi.fn(),
    remove: vi.fn(),
    tasks: [],
  })),
);
const calendarProviderSpy = vi.hoisted(() => vi.fn((props) => props.children));
const wishlistItemsSpy = vi.hoisted(() => vi.fn(() => ({ items: [], isLoading: false })));
const memoryComposerSpy = vi.hoisted(() => vi.fn(() => null));
const entityAttachmentSpy = vi.hoisted(() => vi.fn(() => ({ entities: [] })));
const preferencesSpy = vi.hoisted(() =>
  vi.fn(() => ({ currencyCode: 'USD', setCurrencyCode: vi.fn() })),
);

vi.mock('@/src/hooks/useSession', () => ({ useSession: () => sessionState }));
vi.mock('@/src/hooks/useTaskLists', () => ({
  useTaskLists: () => ({ lists: listsState.lists, isLoading: false, error: null }),
}));
vi.mock('@/src/hooks/useTasks', () => ({
  useTaskItems: taskItemsSpy,
}));
vi.mock('@/src/hooks/useJournal', () => ({
  useJournal: () => ({ create: vi.fn() }),
}));
vi.mock('@/src/hooks/useTimetables', () => ({
  useTimetables: () => ({ create: vi.fn(), update: vi.fn(), timetables: [] }),
}));
vi.mock('@/src/hooks/useWishlists', () => ({
  useAllWishlistItems: wishlistItemsSpy,
  useQuickAddWishItem: () => ({ remove: vi.fn(), quickAdd: vi.fn(), update: vi.fn() }),
  sanitizeWishScope: (value) => value ?? 'shared',
}));
vi.mock('@/src/hooks/memories/useEntityAttachment', () => ({
  useEntityAttachment: entityAttachmentSpy,
}));
vi.mock('@/src/components/ui/pacto/memories/MemoryComposer', () => ({
  MemoryComposer: memoryComposerSpy,
}));
vi.mock('@/src/lib/calendar/context', () => ({
  CalendarProvider: calendarProviderSpy,
  useCalendar: vi.fn(),
}));
vi.mock('@/src/lib/preferences', () => ({
  findCurrency: () => ({ symbol: '$', code: 'USD' }),
  usePreferences: preferencesSpy,
}));

import NewTask from '@/app/sheets/new-task';
import NewEntry from '@/app/sheets/new-entry';
import NewTimetable from '@/app/sheets/new-timetable';
import CalendarLayout from '@/app/(tabs)/calendar/_layout';
import TaskListDetail from '@/app/(tabs)/us/tasks/[listId]';
import WishlistsScreen from '@/app/(tabs)/us/wishlists';
import CurrencySheet from '@/app/sheets/currency';
import MemoryComposerSheet from '@/app/sheets/memory-composer';
import MemoryAttachEntitySheet from '@/app/sheets/memory-attach-entity';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));

function findByTestID(root: any, id: string) {
  return root.findAll((n: any) => n.props?.testID === id)[0];
}

function hasText(root: any, text: string) {
  return root.findAll((n: any) => n.children?.includes(text)).length > 0;
}

async function render(element: React.ReactElement) {
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(element);
    await flush();
  });
  return renderer;
}

describe('direct sheet feature guards', () => {
  beforeEach(() => {
    sessionState.disabledFeature = null;
    sessionState.isFeatureEnabled.mockClear();
    taskItemsSpy.mockClear();
    calendarProviderSpy.mockClear();
    wishlistItemsSpy.mockClear();
    memoryComposerSpy.mockClear();
    entityAttachmentSpy.mockClear();
    preferencesSpy.mockClear();
  });

  it('disabled new-task renders unavailable state and hides the title input', async () => {
    sessionState.disabledFeature = 'tasks';
    const renderer = await render(<NewTask />);

    expect(hasText(renderer.root, 'Tasks is unavailable')).toBe(true);
    expect(findByTestID(renderer.root, 'new-task-title-input')).toBeUndefined();
    expect(sessionState.isFeatureEnabled).toHaveBeenCalledWith('tasks');

    act(() => renderer.unmount());
  });

  it('disabled new-entry renders unavailable state and hides the body input', async () => {
    sessionState.disabledFeature = 'journal';
    const renderer = await render(<NewEntry />);

    expect(hasText(renderer.root, 'Journal is unavailable')).toBe(true);
    expect(findByTestID(renderer.root, 'new-entry-body-input')).toBeUndefined();
    expect(sessionState.isFeatureEnabled).toHaveBeenCalledWith('journal');

    act(() => renderer.unmount());
  });

  it('disabled new-timetable renders unavailable state and hides the title input', async () => {
    sessionState.disabledFeature = 'timetable';
    const renderer = await render(<NewTimetable />);

    expect(hasText(renderer.root, 'Timetable is unavailable')).toBe(true);
    expect(findByTestID(renderer.root, 'new-timetable-title-input')).toBeUndefined();
    expect(sessionState.isFeatureEnabled).toHaveBeenCalledWith('timetable');

    act(() => renderer.unmount());
  });

  it('disabled task detail renders unavailable before task item hooks run', async () => {
    sessionState.disabledFeature = 'tasks';
    const renderer = await render(<TaskListDetail />);

    expect(hasText(renderer.root, 'Tasks is unavailable')).toBe(true);
    expect(taskItemsSpy).not.toHaveBeenCalled();
    expect(sessionState.isFeatureEnabled).toHaveBeenCalledWith('tasks');

    act(() => renderer.unmount());
  });

  it('disabled calendar layout renders unavailable before mounting the calendar provider', async () => {
    sessionState.disabledFeature = 'calendar';
    const renderer = await render(<CalendarLayout />);

    expect(hasText(renderer.root, 'Calendar is unavailable')).toBe(true);
    expect(calendarProviderSpy).not.toHaveBeenCalled();
    expect(sessionState.isFeatureEnabled).toHaveBeenCalledWith('calendar');

    act(() => renderer.unmount());
  });

  it('disabled wishlist route renders unavailable before wishlist hooks run', async () => {
    sessionState.disabledFeature = 'wishlist';
    const renderer = await render(<WishlistsScreen />);

    expect(hasText(renderer.root, 'Wishlist is unavailable')).toBe(true);
    expect(wishlistItemsSpy).not.toHaveBeenCalled();
    expect(sessionState.isFeatureEnabled).toHaveBeenCalledWith('wishlist');

    act(() => renderer.unmount());
  });

  it('disabled currency sheet renders unavailable before preferences hooks run', async () => {
    sessionState.disabledFeature = 'wishlist';
    const renderer = await render(<CurrencySheet />);

    expect(hasText(renderer.root, 'Wishlist is unavailable')).toBe(true);
    expect(preferencesSpy).not.toHaveBeenCalled();
    expect(sessionState.isFeatureEnabled).toHaveBeenCalledWith('wishlist');

    act(() => renderer.unmount());
  });

  it('disabled memory composer sheet renders unavailable before mounting composer', async () => {
    sessionState.disabledFeature = 'memoryFeed';
    const renderer = await render(<MemoryComposerSheet />);

    expect(hasText(renderer.root, 'Memory Feed is unavailable')).toBe(true);
    expect(memoryComposerSpy).not.toHaveBeenCalled();
    expect(sessionState.isFeatureEnabled).toHaveBeenCalledWith('memoryFeed');

    act(() => renderer.unmount());
  });

  it('disabled memory attachment sheet renders unavailable before attachment hooks run', async () => {
    sessionState.disabledFeature = 'memoryFeed';
    const renderer = await render(<MemoryAttachEntitySheet />);

    expect(hasText(renderer.root, 'Memory Feed is unavailable')).toBe(true);
    expect(entityAttachmentSpy).not.toHaveBeenCalled();
    expect(sessionState.isFeatureEnabled).toHaveBeenCalledWith('memoryFeed');

    act(() => renderer.unmount());
  });
});
