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

vi.mock('@/src/hooks/useSession', () => ({ useSession: () => sessionState }));
vi.mock('@/src/hooks/useTaskLists', () => ({
  useTaskLists: () => ({ lists: listsState.lists, isLoading: false, error: null }),
}));
vi.mock('@/src/hooks/useTasks', () => ({
  useTaskItems: () => ({ create: vi.fn(), update: vi.fn(), tasks: [] }),
}));
vi.mock('@/src/hooks/useJournal', () => ({
  useJournal: () => ({ create: vi.fn() }),
}));
vi.mock('@/src/hooks/useTimetables', () => ({
  useTimetables: () => ({ create: vi.fn(), update: vi.fn(), timetables: [] }),
}));

import NewTask from '@/app/sheets/new-task';
import NewEntry from '@/app/sheets/new-entry';
import NewTimetable from '@/app/sheets/new-timetable';

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
});
