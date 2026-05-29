import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeatureId } from '@/src/lib/features/registry';

vi.hoisted(() => {
  (globalThis as any).__DEV__ = true;
});

const routerSpy = vi.hoisted(() => ({
  push: vi.fn(),
}));

const dataHookSpies = vi.hoisted(() => ({
  useTasks: vi.fn(() => ({ allTasks: [], taskFeed: [] })),
  useReminders: vi.fn(() => ({ reminders: [] })),
  useCheckIns: vi.fn(() => ({ checkIns: [] })),
  usePlans: vi.fn(() => ({ plans: [] })),
  useJournal: vi.fn(() => ({ entries: [] })),
  useTimetables: vi.fn(() => ({ timetables: [] })),
}));

vi.mock('expo-router', () => ({
  router: routerSpy,
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(async () => undefined),
  impactAsync: vi.fn(async () => undefined),
  notificationAsync: vi.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Warning: 'warning', Success: 'success' },
}));

vi.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ play: vi.fn(), pause: vi.fn(), seekTo: vi.fn() }),
}));

vi.mock('@/src/components/ui/pacto', () => {
  const Reactx = require('react');
  return {
    Card: ({ children }: any) => Reactx.createElement('Card', null, children),
    CardHalo: ({ children }: any) => Reactx.createElement('CardHalo', null, children),
    PixelHero: ({ eyebrow, title }: any) =>
      Reactx.createElement(
        'PixelHero',
        null,
        Reactx.createElement('Text', null, String(eyebrow ?? '')),
        Reactx.createElement('Text', null, String(title ?? '')),
      ),
    ColorTile: ({ title, stat }: any) =>
      Reactx.createElement(
        'ColorTile',
        null,
        Reactx.createElement('Text', null, String(title ?? '')),
        stat != null ? Reactx.createElement('Text', null, String(stat)) : null,
      ),
    BucketedList: ({ buckets, rowKey, renderRow }: any) =>
      Reactx.createElement(
        'BucketedList',
        null,
        buckets.flatMap((bucket: any) => bucket.rows.map((row: any) =>
          Reactx.createElement(Reactx.Fragment, { key: rowKey(row) }, renderRow(row)),
        )),
      ),
  };
});

vi.mock('@/src/components/ui/Icon', () => ({
  Icon: ({ name }: any) => React.createElement('Icon', { name }),
}));

vi.mock('@/src/components/ui/PressScale', () => ({
  PressScale: ({ children, onPress, style }: any) =>
    React.createElement('PressScale', { onPress, style }, children),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const sessionState = vi.hoisted(() => ({
  status: 'ready' as const,
  user: { id: 'me', email: 'me@example.com', displayName: 'Mattia', avatarUrl: null },
  profile: null,
  activeCouple: {
    couple: { id: 'space-1', name: null, enabledFeatures: [] },
    memberCount: 2,
    partner: null,
  },
  space: { id: 'space-1', kind: 'pair', enabledFeatures: [] },
  membership: null,
  partner: null,
  members: [],
  mode: 'pair' as const,
  enabledFeatures: [] as FeatureId[],
  isFeatureEnabled: (id: FeatureId) => sessionState.enabledFeatures.includes(id),
  isSolo: false,
  isPair: true,
  isCrew: false,
  isCouple: true,
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => sessionState,
}));

vi.mock('@/src/hooks/useTasks', () => ({
  useTasks: dataHookSpies.useTasks,
}));

vi.mock('@/src/hooks/useReminders', () => ({
  useReminders: dataHookSpies.useReminders,
}));

vi.mock('@/src/hooks/useCheckIns', () => ({
  useCheckIns: dataHookSpies.useCheckIns,
}));

vi.mock('@/src/hooks/usePlans', () => ({
  usePlans: dataHookSpies.usePlans,
}));

vi.mock('@/src/hooks/useJournal', () => ({
  useJournal: dataHookSpies.useJournal,
}));

vi.mock('@/src/hooks/useTimetables', () => ({
  useTimetables: dataHookSpies.useTimetables,
}));

import UsIndex from '@/app/(tabs)/us/index';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

function readText(root: any): string[] {
  return root
    .findAll((n: any) => typeof n.children?.[0] === 'string')
    .flatMap((n: any) => n.children.filter((c: any) => typeof c === 'string'));
}

async function render() {
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(<UsIndex />);
  });
  return renderer;
}

describe('UsIndex feature gates', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-04-23T09:00:00'));
    routerSpy.push.mockReset();
    sessionState.mode = 'pair';
    sessionState.isSolo = false;
    sessionState.isPair = true;
    sessionState.isCrew = false;
    sessionState.isCouple = true;
    sessionState.enabledFeatures = ['goals'];
    for (const spy of Object.values(dataHookSpies)) {
      spy.mockClear();
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hides disabled mapped modules and keeps enabled mapped modules visible', async () => {
    const renderer = await render();
    const text = readText(renderer.root);

    expect(text).toContain('Targets');
    expect(text).not.toContain('Expenses');
    expect(text).not.toContain('Memories');
    expect(text).not.toContain('Wishlist');
    expect(text).not.toContain('Journal');
    expect(text).not.toContain('Check-ins');
    expect(text).not.toContain('Timetable');

    act(() => renderer.unmount());
  });

  it('uses feature registry names for enabled modules', async () => {
    sessionState.enabledFeatures = ['goals', 'timetable'];

    const renderer = await render();
    const text = readText(renderer.root);

    expect(text).toContain('Targets');
    expect(text).toContain('Timetable');
    expect(text).not.toContain('Wishlist');
    expect(text).not.toContain('Memories');
    expect(text).not.toContain('Expenses');
    expect(text).not.toContain('Plans');
    expect(text).not.toContain('Timetables');
    expect(text).not.toContain('rhythms');

    act(() => renderer.unmount());
  });

  it('does not enable data hooks for disabled modules', async () => {
    const renderer = await render();

    expect(dataHookSpies.useTasks).toHaveBeenCalledWith({ enabled: false });
    expect(dataHookSpies.useReminders).toHaveBeenCalledWith({ enabled: false });
    expect(dataHookSpies.useCheckIns).toHaveBeenCalledWith({ enabled: false });
    expect(dataHookSpies.usePlans).toHaveBeenCalledWith(undefined, { enabled: true });
    expect(dataHookSpies.useJournal).toHaveBeenCalledWith({ enabled: false });
    expect(dataHookSpies.useTimetables).toHaveBeenCalledWith({ enabled: false });

    act(() => renderer.unmount());
  });
});
