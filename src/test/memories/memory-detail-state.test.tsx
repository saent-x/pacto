import React from 'react';
import { Text } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeState = vi.hoisted(() => ({
  id: '55555555-5555-4555-8555-555555555555',
}));

const memoryState = vi.hoisted(() => ({
  memory: null as any,
  isLoading: false,
  error: null as any,
}));

const sessionState = vi.hoisted(() => ({
  personalSpaceId: 'solo-space',
  sharedSpaceId: 'shared-space',
  user: { id: 'user-1', displayName: 'Avery' },
  profile: { displayName: 'Avery', avatarUrl: null },
  isFeatureEnabled: vi.fn(() => true),
}));

vi.mock('expo-router', () => ({
  router: { push: vi.fn(), back: vi.fn() },
  useLocalSearchParams: () => routeState,
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    C: {
      bg: '#F9F4EA',
      bgCard: '#FFFFFF',
      inkColor: '#171A2A',
      ink2: '#4B5870',
      ink3: '#858095',
      lineColor: '#D8CCBB',
      accent: '#DD654A',
    },
  }),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => sessionState,
}));

vi.mock('@/src/components/features/FeatureRouteGuard', () => ({
  FeatureRouteGuard: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/src/hooks/memories/useMemory', () => ({
  useMemory: () => memoryState,
}));

vi.mock('@/src/components/ui/pacto/memories/MemoryPost', () => ({
  MemoryPost: ({ memory }: any) => <Text>{memory.body}</Text>,
}));

vi.mock('@/src/components/ui/pacto/Avatar', () => ({
  Avatar: () => <Text>avatar</Text>,
}));

import MemoryDetailScreen from '@/app/(tabs)/memories/[id]';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function nodeText(root: any) {
  return root.children
    .map((child: any) => {
      if (typeof child === 'string') return child;
      if (child && typeof child === 'object') return nodeText(child);
      return '';
    })
    .join('');
}

describe('memory detail route state', () => {
  beforeEach(() => {
    memoryState.memory = null;
    memoryState.isLoading = false;
    memoryState.error = null;
    sessionState.isFeatureEnabled.mockReturnValue(true);
  });

  it('renders a not-found state after a missing or inaccessible memory finishes loading', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<MemoryDetailScreen />);
      await flush();
    });

    const text = nodeText(renderer.root);
    expect(text).toContain('Memory not found');
    expect(text).not.toContain('Loading');
    expect(text).not.toContain('Add a reply');

    act(() => renderer.unmount());
  });
});
