import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-router', () => ({
  router: { push: vi.fn(), back: vi.fn() },
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  Stack: { Screen: () => null },
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const sessionState = vi.hoisted(() => ({
  user: { id: 'u-me', displayName: 'Me' },
  partner: { id: 'u-sofia', displayName: 'Sofia' },
  mode: 'pair',
  isSolo: false,
  isFeatureEnabled: () => true,
}));

const reminderState = vi.hoisted(() => ({
  reminders: [] as any[],
  upcoming: [] as any[],
  completed: [] as any[],
  isLoading: false,
  error: null as any,
  toggle: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined),
}));

vi.mock('@/src/hooks/useSession', () => ({ useSession: () => sessionState }));
vi.mock('@/src/hooks/useReminders', () => ({
  useReminders: () => ({
    reminders: reminderState.reminders,
    upcoming: reminderState.upcoming,
    completed: reminderState.completed,
    isLoading: reminderState.isLoading,
    error: reminderState.error,
    toggleComplete: reminderState.toggle,
    remove: reminderState.remove,
    refetch: async () => undefined,
  }),
}));

import RemindersScreen from '@/app/(tabs)/reminders/index';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));

function readText(root: any) {
  return root
    .findAll((n: any) => typeof n.children?.[0] === 'string')
    .map((n: any) => n.children.join(''));
}

function makeReminder(over: any = {}) {
  return {
    id: 'r1',
    couple_id: 'c1',
    created_by: 'u-me',
    assigned_to: null,
    title: 'Call mom',
    description: null,
    due_at: new Date(Date.now() + 3600_000).toISOString(),
    recurrence: null,
    is_completed: false,
    completed_at: null,
    completed_by: null,
    priority: 2,
    category: 'General',
    created_at: '2026-04-23T00:00:00Z',
    updated_at: '2026-04-23T00:00:00Z',
    ...over,
  };
}

function resetState() {
  sessionState.mode = 'pair';
  sessionState.isSolo = false;
  reminderState.reminders = [];
  reminderState.upcoming = [];
  reminderState.completed = [];
  reminderState.toggle.mockClear();
  reminderState.remove.mockClear();
}

async function renderScreen() {
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(<RemindersScreen />);
    await flush();
  });
  return renderer;
}

function findPressableByText(root: any, text: string) {
  return root.findAll(
    (n: any) =>
      typeof n.props?.onPress === 'function' &&
      n.findAll((child: any) => child.children?.join?.('') === text).length > 0,
  )[0];
}

describe('Reminders screen interactions', () => {
  beforeEach(resetState);

  it('renders the summary card with the active count', async () => {
    reminderState.upcoming = [makeReminder({ title: 'Pay rent' })];
    reminderState.reminders = reminderState.upcoming;
    const renderer = await renderScreen();

    const labels = readText(renderer.root);
    expect(labels).toContain('1');
    expect(labels).toContain('active');
    expect(labels).toContain('Pay rent');
    act(() => renderer.unmount());
  });

  it('shows the empty state when there are no reminders', async () => {
    const renderer = await renderScreen();
    expect(readText(renderer.root)).toContain('No reminders yet');
    act(() => renderer.unmount());
  });

  it('filters to Mine', async () => {
    reminderState.reminders = [
      makeReminder({ id: 'mine', title: 'Mine only', assigned_to: 'u-me' }),
      makeReminder({ id: 'shared', title: 'Shared row', assigned_to: null }),
      makeReminder({ id: 'their', title: 'Their row', assigned_to: 'u-sofia' }),
    ];
    reminderState.upcoming = reminderState.reminders;
    const renderer = await renderScreen();

    await act(async () => {
      findPressableByText(renderer.root, 'Mine').props.onPress();
      await flush();
    });

    const labels = readText(renderer.root);
    expect(labels).toContain('Mine only');
    expect(labels).not.toContain('Shared row');
    expect(labels).not.toContain('Their row');
    act(() => renderer.unmount());
  });

  it('toggles complete when the checkbox changes', async () => {
    reminderState.reminders = [makeReminder()];
    reminderState.upcoming = reminderState.reminders;
    const renderer = await renderScreen();
    const checkbox = renderer.root.findAll(
      (n: any) => n.props?.checked === false && typeof n.props?.onChange === 'function',
    )[0];

    await act(async () => {
      checkbox.props.onChange();
      await flush();
    });

    expect(reminderState.toggle).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('groups upcoming by due_at bucket', async () => {
    const now = Date.now();
    reminderState.reminders = [
      makeReminder({ id: 'today', title: 'Today item', due_at: new Date(now + 3600_000).toISOString() }),
      makeReminder({ id: 'tomorrow', title: 'Tomorrow item', due_at: new Date(now + 26 * 3600_000).toISOString() }),
    ];
    reminderState.upcoming = reminderState.reminders;
    const renderer = await renderScreen();

    const labels = readText(renderer.root);
    expect(labels).toContain('Today');
    expect(labels).toContain('Tomorrow');
    act(() => renderer.unmount());
  });
});
