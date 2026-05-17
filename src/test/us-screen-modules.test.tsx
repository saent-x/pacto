import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { FeatureId } from '@/src/lib/features/registry';

vi.mock('expo-router', () => ({ router: { push: vi.fn() } }));
vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('@/src/components/ui/pacto', () => {
  const Reactx = require('react');
  return {
    Card: ({ children }: any) => Reactx.createElement('Card', null, children),
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
    activeCouple: { couple: { id: 'c1', anniversary: null, name: 'Us', enabledFeatures: [] } },
    space: { id: 'c1', kind: 'pair', enabledFeatures: [] },
    isFeatureEnabled: (_id: FeatureId) => true,
    isSolo: false,
    isPair: true,
    isCrew: false,
    isCouple: true,
  }),
}));

vi.mock('@/src/hooks/useTasks', () => ({
  useTasks: () => ({ allTasks: [{ id: 't1' }], taskFeed: [{ id: 't1' }] }),
}));
vi.mock('@/src/hooks/useReminders', () => ({
  useReminders: () => ({ reminders: [{ id: 'r1' }] }),
}));
vi.mock('@/src/hooks/useLoveNotes', () => ({ useLoveNotes: () => ({ notes: [] }) }));
vi.mock('@/src/hooks/useCheckIns', () => ({ useCheckIns: () => ({ checkIns: [] }) }));
vi.mock('@/src/hooks/useWishlists', () => ({ useWishlists: () => ({ wishlists: [] }) }));
vi.mock('@/src/hooks/useMilestones', () => ({ useMilestones: () => ({ milestones: [] }) }));
vi.mock('@/src/hooks/usePlans', () => ({ usePlans: () => ({ plans: [] }) }));
vi.mock('@/src/hooks/useJournal', () => ({ useJournal: () => ({ entries: [] }) }));
vi.mock('@/src/hooks/useTimetables', () => ({ useTimetables: () => ({ timetables: [] }) }));
vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    C: {
      inkColor: '#000',
      bg: '#fff',
      accent: '#f00',
      accent2: '#0f0',
      accent3: '#00f',
      ink3: '#888',
      bgCard: '#fafafa',
      bgSoft: '#f0f0f0',
      lineColor: '#eee',
      accentSoft: '#fee',
    },
  }),
}));

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
});
