import React from 'react';
import { Pressable, Text } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pollVoteSpy = vi.hoisted(() => ({
  cast: vi.fn(async () => undefined),
  revoke: vi.fn(async () => undefined),
  switchVote: vi.fn(async () => undefined),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: vi.fn(() => ({
    mode: 'crew',
    user: { id: 'user-1', displayName: 'Tor' },
  })),
}));

vi.mock('expo-router', () => ({
  router: { push: vi.fn() },
}));

vi.mock('date-fns', () => ({
  formatDistanceToNowStrict: vi.fn(() => '1 hour'),
}));

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    C: {
      accent: '#D88B74',
      accent2: '#9C89B8',
      bg: '#FFFFFF',
      bgCard: '#FFFFFF',
      ink2: '#555555',
      ink3: '#777777',
      inkColor: '#222222',
      lineColor: '#EEEEEE',
      line2: '#EFEFEF',
    },
  }),
}));

vi.mock('@/src/components/ui/PressScale', () => ({
  PressScale: ({ children, onPress, style }: any) => (
    <Pressable onPress={onPress} style={style}>{children}</Pressable>
  ),
}));

vi.mock('@/src/components/ui/pacto/Avatar', () => ({
  Avatar: () => <Text testID="memory-avatar">avatar</Text>,
}));

vi.mock('@/src/components/ui/pacto/memories/MemoriesIcon', () => ({
  MemoriesIcon: ({ name }: { name: string }) => <Text testID={`memory-post-icon-${name}`}>{name}</Text>,
}));

vi.mock('@/src/hooks/memories/usePollVote', () => ({
  usePollVote: () => pollVoteSpy,
}));

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function renderedText(renderer: any): string[] {
  return renderer.root
    .findAllByType(Text)
    .map((node: any) => textContent(node.props.children))
    .filter(Boolean);
}

function textContent(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(textContent).join('');
  if (value && typeof value === 'object' && 'props' in value) {
    return textContent((value as { props?: { children?: unknown } }).props?.children);
  }
  return '';
}

describe('memory poll rendering', () => {
  beforeEach(() => {
    pollVoteSpy.cast.mockClear();
    pollVoteSpy.revoke.mockClear();
    pollVoteSpy.switchVote.mockClear();
  });

  it('uses linked poll votes over stale denormalized vote counts', async () => {
    const { MemoryPoll } = await import('@/src/components/ui/pacto/memories/MemoryPoll');
    let renderer: any;

    await act(async () => {
      renderer = TestRenderer.create(
        <MemoryPoll
          pollId="poll-1"
          currentUserId="user-1"
          question="Where should crew dinner be?"
          options={[
            {
              id: 'option-1',
              label: 'Noodle bar',
              voteCount: 0,
              votes: [{ id: 'vote-1', user: { id: 'user-2' } }],
            },
            {
              id: 'option-2',
              label: 'Rooftop',
              voteCount: 0,
              votes: [],
            },
          ]}
        />,
      );
      await flush();
    });

    const text = renderedText(renderer);
    expect(text).toContain('100%');
    expect(text).toContain('0%');

    act(() => renderer.unmount());
  });

  it('switches an existing poll vote atomically when another option is pressed', async () => {
    const { MemoryPoll } = await import('@/src/components/ui/pacto/memories/MemoryPoll');
    let renderer: any;

    await act(async () => {
      renderer = TestRenderer.create(
        <MemoryPoll
          pollId="poll-1"
          currentUserId="user-1"
          options={[
            {
              id: 'option-1',
              label: 'Noodle bar',
              votes: [{ id: 'vote-1', user: { id: 'user-1' } }],
            },
            {
              id: 'option-2',
              label: 'Rooftop',
              votes: [],
            },
          ]}
        />,
      );
      await flush();
    });

    const rooftop = renderer.root
      .findAllByType(Pressable)
      .find((node: any) => textContent(node.props.children).includes('Rooftop'));
    expect(rooftop).toBeDefined();

    await act(async () => {
      rooftop!.props.onPress();
      await flush();
    });

    expect(pollVoteSpy.switchVote).toHaveBeenCalledWith('vote-1', 'option-2');
    expect(pollVoteSpy.revoke).not.toHaveBeenCalled();
    expect(pollVoteSpy.cast).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('ignores duplicate poll option presses while the vote mutation is pending', async () => {
    const { MemoryPoll } = await import('@/src/components/ui/pacto/memories/MemoryPoll');
    let resolveSwitch!: () => void;
    pollVoteSpy.switchVote.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveSwitch = resolve;
        }),
    );
    let renderer: any;

    await act(async () => {
      renderer = TestRenderer.create(
        <MemoryPoll
          pollId="poll-1"
          currentUserId="user-1"
          options={[
            {
              id: 'option-1',
              label: 'Noodle bar',
              votes: [{ id: 'vote-1', user: { id: 'user-1' } }],
            },
            {
              id: 'option-2',
              label: 'Rooftop',
              votes: [],
            },
          ]}
        />,
      );
      await flush();
    });

    const rooftop = renderer.root
      .findAllByType(Pressable)
      .find((node: any) => textContent(node.props.children).includes('Rooftop'));
    expect(rooftop).toBeDefined();

    await act(async () => {
      rooftop!.props.onPress();
      rooftop!.props.onPress();
      await flush();
    });

    expect(pollVoteSpy.switchVote).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSwitch();
      await flush();
    });
    act(() => renderer.unmount());
  });

  it('renders poll questions and options in the active MemoryPost surface', async () => {
    const { MemoryPost } = await import('@/src/components/ui/pacto/memories/MemoryPost');
    let renderer: any;

    await act(async () => {
      renderer = TestRenderer.create(
        <MemoryPost
          variant="feed"
          memory={{
            id: 'memory-1',
            body: 'vote before friday',
            kind: 'post',
            createdAt: Date.now(),
            author: { id: 'user-2', displayName: 'Maya' },
            poll: {
              id: 'poll-1',
              question: 'Where should crew dinner be?',
              options: [
                {
                  id: 'option-1',
                  label: 'Noodle bar',
                  voteCount: 0,
                  votes: [{ id: 'vote-1', user: { id: 'user-2' } }],
                },
                {
                  id: 'option-2',
                  label: 'Rooftop',
                  voteCount: 0,
                  votes: [],
                },
              ],
            },
          } as any}
        />,
      );
      await flush();
    });

    const text = renderedText(renderer);
    expect(text).toContain('Where should crew dinner be?');
    expect(text).toContain('Noodle bar');
    expect(text).toContain('Rooftop');

    act(() => renderer.unmount());
  });

  it('renders original memory counts inside reposted posts', async () => {
    const { MemoryPost } = await import('@/src/components/ui/pacto/memories/MemoryPost');
    let renderer: any;

    await act(async () => {
      renderer = TestRenderer.create(
        <MemoryPost
          variant="feed"
          memory={{
            id: 'repost-1',
            body: '',
            kind: 'repost',
            createdAt: Date.now(),
            reactionCount: 1,
            replyCount: 2,
            repostCount: 3,
            author: { id: 'user-3', displayName: 'Ari' },
            repostOf: {
              id: 'original-1',
              body: 'original memory',
              kind: 'post',
              createdAt: Date.now(),
              reactionCount: 7,
              replyCount: 8,
              repostCount: 9,
              author: { id: 'user-2', displayName: 'Maya' },
            },
          } as any}
        />,
      );
      await flush();
    });

    const text = renderedText(renderer);
    expect(text).toContain('7');
    expect(text).toContain('8');
    expect(text).toContain('9');
    expect(text).not.toContain('1');
    expect(text).not.toContain('2');
    expect(text).not.toContain('3');

    act(() => renderer.unmount());
  });
});
