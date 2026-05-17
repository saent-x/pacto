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
  user: { id: 'u-mine', displayName: 'Alex' } as any,
  partner: { id: 'u-partner', displayName: 'Sofia' } as any,
  members: [
    { id: 'u-mine', displayName: 'Alex' },
    { id: 'u-partner', displayName: 'Sofia' },
  ] as any[],
  activeCouple: { couple: { id: 'c1' } } as any,
  isSolo: false,
  mode: 'pair',
  isFeatureEnabled: () => true,
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => sessionState,
}));

const noteHookState = vi.hoisted(() => ({
  notes: [] as any[],
  isLoading: false,
  create: vi.fn(async () => undefined),
}));

vi.mock('@/src/hooks/useLoveNotes', () => ({
  useLoveNotes: () => noteHookState,
}));

import LoveNotes from '@/app/(tabs)/us/notes';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));

function readText(root: any) {
  return root
    .findAll((n: any) => typeof n.children?.[0] === 'string')
    .map((n: any) => n.children.join(''));
}

describe('Love notes interactions', () => {
  beforeEach(() => {
    noteHookState.notes = [
      { id: 'n1', body: 'Pasta tonight?', authorId: 'u-mine', createdAt: 1_700_000_000_000 },
      { id: 'n2', body: 'Always.', authorId: 'u-partner', createdAt: 1_700_000_100_000 },
    ];
    noteHookState.create.mockClear();
    sessionState.mode = 'pair';
    sessionState.isSolo = false;
  });

  it('blocks the notes route when memories are unsupported in solo mode', async () => {
    sessionState.mode = 'solo';
    sessionState.isSolo = true;
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<LoveNotes />);
      await flush();
    });

    expect(readText(renderer.root)).toContain('Memories is unavailable');
    expect(readText(renderer.root)).not.toContain('Pasta tonight?');
    act(() => renderer.unmount());
  });

  it('renders pair note bubbles from the hook', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<LoveNotes />);
      await flush();
    });

    const labels = readText(renderer.root);
    expect(labels).toContain('Pasta tonight?');
    expect(labels).toContain('Always.');
    act(() => renderer.unmount());
  });
});
