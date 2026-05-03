import { router } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';
import { PressScale } from '@/src/components/ui/PressScale';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/hooks/useSession';
import { useMemoryActions } from '@/src/hooks/memories/useMemoryActions';
import { MemoryActions, type SpaceMode } from './MemoryActions';
import { MemoryAttachments } from './MemoryAttachments';
import { MemoryBody } from './MemoryBody';
import { MemoryHeader } from './MemoryHeader';
import { MemoryPoll } from './MemoryPoll';
import { MemoryQuoteEmbed } from './MemoryQuoteEmbed';
import { MemoryRepostHeader } from './MemoryRepostHeader';

export interface Memory {
  id: string;
  body: string;
  kind: 'post' | 'reply' | 'repost' | 'quote';
  createdAt: number;
  reactionCount?: number;
  replyCount?: number;
  repostCount?: number;
  isPinned?: boolean;
  isPrivate?: boolean;
  author?: { id: string; displayName?: string; avatarUrl?: string };
  attachments?: any[];
  reactions?: { id: string; user?: { id: string } }[];
  poll?: { id: string; question?: string; options: any[] }[] | { id: string; question?: string; options: any[] };
  quoteOf?: { id: string; body: string; author?: { displayName?: string }; attachments?: any[] };
  repostOf?: { id: string; body: string; author?: { displayName?: string; avatarUrl?: string; id: string }; attachments?: any[]; createdAt: number };
}

interface Props {
  memory: Memory;
  variant: 'feed' | 'detail' | 'reply';
}

export function MemoryCard({ memory, variant }: Props) {
  const { C } = useTheme();
  const session = useSession() as any;
  const user = session?.user;
  const mode: SpaceMode = (session?.mode ?? session?.space?.kind ?? 'solo') as SpaceMode;
  const actions = useMemoryActions();

  // Repost: surface the original memory inside this card.
  if (memory.kind === 'repost' && memory.repostOf) {
    const reposter = memory.author?.displayName ?? 'Someone';
    return (
      <View style={[styles.card, { borderColor: C.ink3 }]}>
        <MemoryRepostHeader reposterName={reposter} />
        <MemoryHeader
          authorId={memory.repostOf.author?.id ?? ''}
          authorName={memory.repostOf.author?.displayName ?? 'Unknown'}
          authorAvatarUrl={memory.repostOf.author?.avatarUrl}
          createdAt={memory.repostOf.createdAt}
        />
        <MemoryBody body={memory.repostOf.body} />
        <MemoryAttachments attachments={memory.repostOf.attachments ?? []} />
        <MemoryActions
          mode={mode}
          reactionCount={memory.reactionCount ?? 0}
          replyCount={memory.replyCount ?? 0}
          repostCount={memory.repostCount ?? 0}
          onReply={() => router.push(`/sheets/memory-composer?mode=reply&parentId=${memory.id}` as any)}
          onShare={() => Share.share({ message: `coupl://memories/${memory.id}` })}
        />
      </View>
    );
  }

  const hasReacted = !!memory.reactions?.some((r) => r.user?.id === user?.id);
  const poll = Array.isArray(memory.poll) ? memory.poll[0] : memory.poll;

  return (
    <PressScale
      onPress={variant === 'feed' ? () => router.push(`/(tabs)/memories/${memory.id}` as any) : undefined}
      style={[styles.card, { borderColor: C.ink3 }]}
    >
      <MemoryHeader
        authorId={memory.author?.id ?? ''}
        authorName={memory.author?.displayName ?? 'Unknown'}
        authorAvatarUrl={memory.author?.avatarUrl}
        createdAt={memory.createdAt}
      />
      <MemoryBody body={memory.body} />
      <MemoryAttachments attachments={memory.attachments ?? []} />
      {poll ? <MemoryPoll pollId={poll.id} question={poll.question} options={poll.options} currentUserId={user?.id} /> : null}
      {memory.quoteOf ? (
        <MemoryQuoteEmbed
          quotedMemoryId={memory.quoteOf.id}
          authorName={memory.quoteOf.author?.displayName ?? 'Unknown'}
          body={memory.quoteOf.body}
          attachments={memory.quoteOf.attachments}
        />
      ) : null}
      <MemoryActions
        mode={mode}
        reactionCount={memory.reactionCount ?? 0}
        replyCount={memory.replyCount ?? 0}
        repostCount={memory.repostCount ?? 0}
        hasReacted={hasReacted}
        onReact={() => {
          if (hasReacted) {
            const mine = memory.reactions?.find((r) => r.user?.id === user?.id);
            if (mine) actions.unreact(mine.id);
          } else {
            actions.react(memory.id);
          }
        }}
        onReply={() => router.push(`/sheets/memory-composer?mode=reply&parentId=${memory.id}` as any)}
        onRepost={() => actions.repost(memory.id)}
        onShare={() => Share.share({ message: `coupl://memories/${memory.id}` })}
      />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: { borderTopWidth: StyleSheet.hairlineWidth, paddingBottom: 4 },
});
