import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-router', () => ({
  router: { push: vi.fn(), back: vi.fn(), replace: vi.fn() },
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    C: {
      accent: '#DD654A',
      accent2: '#77AA99',
      bg: '#F9F4EA',
      bgCard: '#FFFFFF',
      bgSoft: '#EFE8DA',
      inkColor: '#171A2A',
      ink2: '#4B5870',
      ink3: '#858095',
      lineColor: '#D8CCBB',
    },
  }),
}));

const feedState = vi.hoisted(() => ({
  memories: [
    { id: 'm1', body: 'First memory' },
    { id: 'm2', body: 'Second memory' },
  ] as any[],
}));

const sessionState = vi.hoisted(() => ({
  mode: 'solo' as const,
  user: { id: 'u1', displayName: 'Alex' },
  activeCouple: { couple: { id: 'space1' } },
  isFeatureEnabled: vi.fn(() => true),
}));
vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => sessionState,
}));

const useMemoryTopicsMock = vi.hoisted(() => vi.fn());
vi.mock('@/src/hooks/memories/useMemoryTopics', () => ({
  useMemoryTopics: (...args: any[]) => useMemoryTopicsMock(...args),
}));

const useMemoriesFeedMock = vi.hoisted(() => vi.fn());
vi.mock('@/src/hooks/memories/useMemoriesFeed', () => ({
  useMemoriesFeed: (...args: any[]) => useMemoriesFeedMock(...args),
}));

vi.mock('@/src/components/ui/pacto', () => ({
  Avatar: ({ size }: any) => <Text>{`avatar-${size}`}</Text>,
  AvatarPair: ({ size }: any) => <Text>{`avatar-pair-${size}`}</Text>,
  CrewStack: ({ size }: any) => <Text>{`crew-${size}`}</Text>,
}));

vi.mock('@/src/components/ui/pacto/memories/MemoriesHero', () => ({
  MemoriesHero: ({ title, rightSlot }: any) => (
    <View testID="memories-hero-full">
      <Text>{title}</Text>
      {rightSlot}
    </View>
  ),
}));

vi.mock('@/src/components/ui/pacto/memories/TopicChipStrip', () => ({
  TopicChipStrip: ({ compact }: any) => (
    <Text testID={compact ? 'topics-compact' : 'topics-full'}>
      {compact ? 'compact-topics' : 'full-topics'}
    </Text>
  ),
}));

vi.mock('@/src/components/ui/pacto/memories/MemoryPost', () => ({
  MemoryPost: ({ memory }: any) => <Text>{memory.body}</Text>,
}));

vi.mock('@/src/components/ui/pacto/memories/EmptyMemoriesState', () => ({
  EmptyMemoriesState: () => <Text>empty</Text>,
}));

import MemoriesScreen from '@/app/(tabs)/memories';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('memories collapsing header', () => {
  beforeEach(() => {
    sessionState.isFeatureEnabled.mockReturnValue(true);
    useMemoryTopicsMock.mockReset();
    useMemoryTopicsMock.mockReturnValue({
      topics: [
        { id: 'all', label: 'For you' },
        { id: 'mine', label: 'Just me', count: 2 },
      ],
    });
    useMemoriesFeedMock.mockReset();
    useMemoriesFeedMock.mockImplementation(() => ({ memories: feedState.memories }));
    feedState.memories = [
      { id: 'm1', body: 'First memory' },
      { id: 'm2', body: 'Second memory' },
    ];
  });

  it('switches from full to compact header chrome when the feed scrolls', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<MemoriesScreen />);
      await flush();
    });

    const layerPointerStates = () => [
      StyleSheet.flatten(renderer.root.findByProps({ testID: 'memories-header-full' }).props.style)
        .pointerEvents,
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'memories-header-compact' }).props.style,
      ).pointerEvents,
    ];

    expect(layerPointerStates()).toEqual(['auto', 'none']);
    expect(renderer.root.findByProps({ testID: 'topics-full' })).toBeDefined();
    expect(renderer.root.findByProps({ testID: 'topics-compact' })).toBeDefined();

    await act(async () => {
      renderer.root.findByType(FlashList).props.onScroll({
        nativeEvent: { contentOffset: { y: 64 } },
      });
      await flush();
    });

    expect(layerPointerStates()).toEqual(['none', 'auto']);
    act(() => renderer.unmount());
  });

  it('renders unavailable before memory feed hooks run when disabled', async () => {
    sessionState.isFeatureEnabled.mockImplementation((featureId: string) => featureId !== 'memoryFeed');

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<MemoriesScreen />);
      await flush();
    });

    expect(useMemoryTopicsMock).not.toHaveBeenCalled();
    expect(useMemoriesFeedMock).not.toHaveBeenCalled();
    expect(
      renderer.root.findAll((n: any) => n.children?.join?.('') === 'Memory Feed is unavailable'),
    ).toHaveLength(1);

    act(() => renderer.unmount());
  });
});
