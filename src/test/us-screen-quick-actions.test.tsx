import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { FeatureId } from '@/src/lib/features/registry';

const pushSpy = vi.hoisted(() => vi.fn());
vi.mock('expo-router', () => ({ router: { push: pushSpy } }));
vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

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
    activeCouple: { couple: { id: 'c1', name: 'Us', enabledFeatures: [] } },
    space: { id: 'c1', kind: 'pair', enabledFeatures: [] },
    isFeatureEnabled: (_id: FeatureId) => true,
    isSolo: false,
    isPair: true,
    isCrew: false,
    isCouple: true,
  }),
}));

vi.mock('@/src/hooks/useFeatureGate', () => ({
  useFeatureGate: (id: string) => ({ enabled: true, id }),
  featureForUsModule: (moduleId: string) => null,
}));

vi.mock('@/src/hooks/useTasks', () => ({
  useTasks: () => ({ allTasks: [], taskFeed: [] }),
}));
vi.mock('@/src/hooks/useReminders', () => ({
  useReminders: () => ({ reminders: [] }),
}));
vi.mock('@/src/hooks/useCheckIns', () => ({ useCheckIns: () => ({ checkIns: [] }) }));
vi.mock('@/src/hooks/usePlans', () => ({ usePlans: () => ({ plans: [] }) }));
vi.mock('@/src/hooks/useJournal', () => ({ useJournal: () => ({ entries: [] }) }));
vi.mock('@/src/hooks/useTimetables', () => ({ useTimetables: () => ({ timetables: [] }) }));
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

function findAllText(root: any): string[] {
  return root
    .findAll((n: any) => typeof n.children?.[0] === 'string')
    .flatMap((n: any) => n.children.filter((c: any) => typeof c === 'string'));
}

function findNodesByText(root: any, text: string): any[] {
  return root.findAll(
    (n: any) =>
      Array.isArray(n.children) &&
      n.children.some((c: any) => typeof c === 'string' && c === text),
  );
}

describe('UsScreen quick actions', () => {
  it('renders + List, + Reminder, + Timetable buttons', async () => {
    const renderer = await renderScreen();
    const text = findAllText(renderer.root);
    expect(text).toContain('+ List');
    expect(text).toContain('+ Reminder');
    expect(text).toContain('+ Timetable');
    expect(text).not.toContain('+ Expense');
    act(() => renderer.unmount());
  });

  it('+ List pushes /sheets/new-list instead of opening a task sheet without listId', async () => {
    pushSpy.mockClear();
    const renderer = await renderScreen();
    const nodes = findNodesByText(renderer.root, '+ List');
    expect(nodes.length).toBeGreaterThan(0);
    // Walk up to find the PressScale with onPress
    const pressable = renderer.root.findAll(
      (n: any) => n.props?.onPress && Array.isArray(n.children) &&
        n.findAll((c: any) => typeof c.children?.[0] === 'string' && c.children[0] === '+ List').length > 0,
    )[0];
    pressable?.props?.onPress();
    expect(pushSpy).toHaveBeenCalledWith('/sheets/new-list');
    act(() => renderer.unmount());
  });

  it('+ Reminder pushes /sheets/new-reminder', async () => {
    pushSpy.mockClear();
    const renderer = await renderScreen();
    const pressable = renderer.root.findAll(
      (n: any) => n.props?.onPress && Array.isArray(n.children) &&
        n.findAll((c: any) => typeof c.children?.[0] === 'string' && c.children[0] === '+ Reminder').length > 0,
    )[0];
    pressable?.props?.onPress();
    expect(pushSpy).toHaveBeenCalledWith('/sheets/new-reminder');
    act(() => renderer.unmount());
  });

  it('+ Timetable pushes /sheets/new-timetable', async () => {
    pushSpy.mockClear();
    const renderer = await renderScreen();
    const pressable = renderer.root.findAll(
      (n: any) => n.props?.onPress && Array.isArray(n.children) &&
        n.findAll((c: any) => typeof c.children?.[0] === 'string' && c.children[0] === '+ Timetable').length > 0,
    )[0];
    pressable?.props?.onPress();
    expect(pushSpy).toHaveBeenCalledWith('/sheets/new-timetable');
    act(() => renderer.unmount());
  });
});
