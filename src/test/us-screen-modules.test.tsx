import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeatureId } from '@/src/lib/features/registry';

const hookState = vi.hoisted(() => ({
  tasks: [{ id: 't1' }] as any[],
  reminders: [{ id: 'r1' }] as any[],
  checkIns: [] as any[],
  plans: [] as any[],
  journalEntries: [] as any[],
  timetables: [] as any[],
}));

vi.mock('expo-router', () => ({ router: { push: vi.fn() } }));
vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('@/src/components/ui/pacto', () => {
  const Reactx = require('react');
  return {
    Card: ({ children }: any) => Reactx.createElement('Card', null, children),
    CardHalo: ({ children, lightColor, darkColor }: any) =>
      Reactx.createElement('CardHalo', { lightColor, darkColor }, children),
    PixelHero: ({ eyebrow, title }: any) =>
      Reactx.createElement(
        'PixelHero',
        null,
        Reactx.createElement('Text', null, String(eyebrow ?? '')),
        Reactx.createElement('Text', null, String(title ?? '')),
      ),
    ColorTile: ({ title, stat, tone }: any) =>
      Reactx.createElement(
        'ColorTile',
        { tone, title },
        Reactx.createElement('Text', null, String(title ?? '')),
        stat != null ? Reactx.createElement('Text', null, String(stat)) : null,
      ),
    BucketedList: ({ buckets, rowKey, renderRow }: any) =>
      Reactx.createElement(
        'BucketedList',
        null,
        buckets.flatMap((bucket: any) =>
          bucket.rows.map((row: any) =>
            Reactx.createElement(Reactx.Fragment, { key: rowKey(row) }, renderRow(row)),
          ),
        ),
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

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => ({
    user: { id: 'u1', displayName: 'Test', email: 't@e' },
    partner: null,
    mode: 'pair' as const,
    activeCouple: { couple: { id: 'c1', name: 'Us', enabledFeatures: [] }, memberCount: 2 },
    space: { id: 'c1', kind: 'pair', enabledFeatures: [] },
    isFeatureEnabled: (_id: FeatureId) => true,
    isSolo: false,
    isPair: true,
    isCrew: false,
    isCouple: true,
  }),
}));

vi.mock('@/src/hooks/useTasks', () => ({
  useTasks: () => ({ allTasks: hookState.tasks, taskFeed: hookState.tasks }),
}));
vi.mock('@/src/hooks/useReminders', () => ({
  useReminders: () => ({ reminders: hookState.reminders }),
}));
vi.mock('@/src/hooks/useCheckIns', () => ({ useCheckIns: () => ({ checkIns: hookState.checkIns }) }));
vi.mock('@/src/hooks/usePlans', () => ({ usePlans: () => ({ plans: hookState.plans }) }));
vi.mock('@/src/hooks/useJournal', () => ({ useJournal: () => ({ entries: hookState.journalEntries }) }));
vi.mock('@/src/hooks/useTimetables', () => ({ useTimetables: () => ({ timetables: hookState.timetables }) }));
vi.mock('@/src/lib/theme', async () => {
  const tokens =
    await vi.importActual<typeof import('@/src/lib/tokens')>('@/src/lib/tokens');
  return {
    useTheme: () => ({
      mode: 'light' as const,
      setMode: () => undefined,
      C: tokens.getTokens('light'),
      F: tokens.fonts,
    }),
    ThemeProvider: ({ children }: any) => children,
  };
});

import UsScreen from '@/app/(tabs)/us/index';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

async function renderScreen() {
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(<UsScreen />);
  });
  return renderer;
}

function readText(root: any): string[] {
  return root
    .findAll((n: any) => typeof n.children?.[0] === 'string')
    .flatMap((n: any) => n.children.filter((c: any) => typeof c === 'string'));
}

describe('UsScreen modules', () => {
  beforeEach(() => {
    hookState.tasks = [{ id: 't1' }];
    hookState.reminders = [{ id: 'r1' }];
    hookState.checkIns = [];
    hookState.plans = [];
    hookState.journalEntries = [];
    hookState.timetables = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the shared activity stats card visible above the tool grid', async () => {
    const renderer = await renderScreen();
    const text = readText(renderer.root);
    expect(text).toContain('TOGETHER');
    expect(text).toContain('STREAK');
    expect(text).toContain('days');
    expect(text).toContain('no entries yet');
    expect(text).not.toContain('MEMBERS');
    expect(text).not.toContain('ITEMS');
    act(() => renderer.unmount());
  });

  it('does not count personal-only rows in pair activity stats', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-04-24T09:00:00'));
    hookState.checkIns = [
      { id: 'private-checkin', isPrivate: true, createdAt: Date.parse('2026-04-22T10:00:00') },
    ];
    hookState.plans = [
      { id: 'private-plan', isPrivate: true, createdAt: Date.parse('2026-04-23T10:00:00') },
    ];
    hookState.timetables = [
      { id: 'private-timetable', share: 'solo', updatedAt: Date.parse('2026-04-24T08:00:00') },
    ];

    const renderer = await renderScreen();
    const text = readText(renderer.root);

    expect(text).toContain('TOGETHER');
    expect(text).toContain('no entries yet');
    expect(text).toContain('0');
    expect(text).toContain('days');
    expect(text).not.toContain('since Apr');
    expect(text).not.toContain('best ·');

    act(() => renderer.unmount());
  });

  it('counts shared journal rows that use database timestamp fields', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-04-24T09:00:00'));
    hookState.journalEntries = [
      {
        id: 'shared-journal',
        is_private: false,
        created_at: '2026-04-24T08:00:00.000Z',
      },
    ];

    const renderer = await renderScreen();
    const text = readText(renderer.root);
    const combined = text.join(' ');

    expect(text).toContain('TOGETHER');
    expect(combined).toMatch(/since\s+Apr\s+24/);
    expect(combined).toMatch(/best\s+·\s+1\s*d/);
    expect(text).not.toContain('no entries yet');

    act(() => renderer.unmount());
  });

  it('ignores malformed numeric activity timestamps in shared stats', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-04-24T09:00:00'));
    hookState.journalEntries = [
      {
        id: 'malformed-journal',
        is_private: false,
        created_at: Number.MAX_VALUE,
      },
      {
        id: 'shared-journal',
        is_private: false,
        created_at: '2026-04-24T08:00:00.000Z',
      },
    ];

    const renderer = await renderScreen();
    const text = readText(renderer.root).join(' ');

    expect(text).toMatch(/since\s+Apr\s+24/);
    expect(text).toMatch(/best\s+·\s+1\s*d/);
    expect(text).not.toContain('no entries yet');

    act(() => renderer.unmount());
  });

  it('ignores impossible ISO-like activity timestamps in shared stats', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-04T09:00:00'));
    hookState.journalEntries = [
      {
        id: 'malformed-journal',
        is_private: false,
        created_at: '2026-04-31T08:00:00.000Z',
      },
    ];

    const renderer = await renderScreen();
    const text = readText(renderer.root);

    expect(text).toContain('TOGETHER');
    expect(text).toContain('no entries yet');
    expect(text.join(' ')).not.toMatch(/since\s+May\s+1/);

    act(() => renderer.unmount());
  });

  it('renders a Tasks module card with the tasks/us route', async () => {
    const renderer = await renderScreen();
    const text = readText(renderer.root);
    expect(text.some((t: string) => /tasks/i.test(t))).toBe(true);
    act(() => renderer.unmount());
  });

  it('renders a Reminders module card', async () => {
    const renderer = await renderScreen();
    const text = readText(renderer.root);
    expect(text.some((t: string) => /reminders/i.test(t))).toBe(true);
    act(() => renderer.unmount());
  });

  it('omits retired Memories and Wishlist modules', async () => {
    const renderer = await renderScreen();
    const text = readText(renderer.root);
    expect(text).not.toContain('Memories');
    expect(text).not.toContain('Wishlist');
    act(() => renderer.unmount());
  });

  it('uses distinct muted tints for the tool grid tiles', async () => {
    const renderer = await renderScreen();
    const tiles = renderer.root.findAll((n: any) => n.type === 'ColorTile');
    const halos = renderer.root.findAll((n: any) => n.type === 'CardHalo');

    expect(new Set(tiles.map((tile: any) => tile.props.tone.bg)).size).toBe(tiles.length);
    expect(new Set(halos.map((halo: any) => halo.props.lightColor)).size).toBe(halos.length);
    act(() => renderer.unmount());
  });
});
