import { router } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';
import { PressScale } from '@/src/components/ui/PressScale';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/hooks/useSession';
import { useMemoryActions } from '@/src/hooks/memories/useMemoryActions';
import { setMemoryComposerDraft } from '@/src/hooks/memories/useMemoryComposer';
import { useAssistantOverlay } from '@/src/lib/assistant-overlay';
import { memoryShareUrl } from '@/src/lib/share-links';
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
  space?: { id: string } | { id: string }[];
  attachments?: any[];
  reactions?: { id: string; user?: { id: string } }[];
  poll?: { id: string; question?: string; options: any[] }[] | { id: string; question?: string; options: any[] };
  quoteOf?: { id: string; body: string; author?: { displayName?: string }; space?: { id: string } | { id: string }[]; attachments?: any[] };
  repostOf?: { id: string; body: string; author?: { displayName?: string; avatarUrl?: string; id: string }; space?: { id: string } | { id: string }[]; attachments?: any[]; createdAt: number };
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
  const overlay = useAssistantOverlay() as any;
  const memorySpaceId = firstRel(memory.space)?.id ?? null;

  // Repost: surface the original memory inside this card.
  if (memory.kind === 'repost' && memory.repostOf) {
    const reposter = memory.author?.displayName ?? 'Someone';
    const repostedSpaceId = firstRel(memory.repostOf.space)?.id ?? null;
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
        <MemoryAttachments attachments={memory.repostOf.attachments ?? []} spaceId={repostedSpaceId} />
        <MemoryActions
          mode={mode}
          reactionCount={memory.reactionCount ?? 0}
          replyCount={memory.replyCount ?? 0}
          repostCount={memory.repostCount ?? 0}
          onReply={() => router.push(`/sheets/memory-composer?mode=reply&parentId=${memory.id}` as any)}
          onShare={() => Share.share({ message: memoryShareUrl(memory.id) })}
        />
      </View>
    );
  }

  const hasReacted = !!memory.reactions?.some((r) => r.user?.id === user?.id);
  const poll = Array.isArray(memory.poll) ? memory.poll[0] : memory.poll;
  const isPrivateMemory = !!memory.isPrivate || memorySpaceId === session?.personalSpaceId;
  const canUseSharedActions = mode !== 'solo' && !isPrivateMemory;

  const openReply = () => {
    if (isPrivateMemory) {
      setMemoryComposerDraft((current: any) => ({
        ...current,
        mode: 'reply',
        parentId: memory.id,
        isPrivate: true,
        notifyMembers: false,
      }));
    }
    router.push(`/sheets/memory-composer?mode=reply&parentId=${memory.id}` as any);
  };

  return (
    <PressScale
      onPress={variant === 'feed' ? () => router.push(`/(tabs)/memories/${memory.id}` as any) : undefined}
      onLongPress={() => {
        if (typeof overlay.openWithContext === 'function') {
          overlay.openWithContext(`Memory: ${memory.body}`);
        } else if (typeof overlay.openVoiceOverlay === 'function') {
          overlay.openVoiceOverlay();
        }
      }}
      style={[styles.card, { borderColor: C.ink3 }]}
    >
      <MemoryHeader
        authorId={memory.author?.id ?? ''}
        authorName={memory.author?.displayName ?? 'Unknown'}
        authorAvatarUrl={memory.author?.avatarUrl}
        createdAt={memory.createdAt}
      />
      <MemoryBody body={memory.body} />
      <MemoryAttachments attachments={memory.attachments ?? []} spaceId={memorySpaceId} />
      {poll ? <MemoryPoll pollId={poll.id} question={poll.question} options={poll.options} currentUserId={user?.id} /> : null}
      {memory.quoteOf ? (
        <MemoryQuoteEmbed
          quotedMemoryId={memory.quoteOf.id}
          authorName={memory.quoteOf.author?.displayName ?? 'Unknown'}
          body={memory.quoteOf.body}
          attachments={memory.quoteOf.attachments}
          spaceId={firstRel(memory.quoteOf.space)?.id ?? null}
        />
      ) : null}
      <MemoryActions
        mode={mode}
        reactionCount={memory.reactionCount ?? 0}
        replyCount={memory.replyCount ?? 0}
        repostCount={memory.repostCount ?? 0}
        hasReacted={hasReacted}
        canReact={canUseSharedActions}
        canRepost={canUseSharedActions}
        canShare={!isPrivateMemory}
        onReact={() => {
          if (!canUseSharedActions) return;
          if (hasReacted) {
            const mine = memory.reactions?.find((r) => r.user?.id === user?.id);
            if (mine) actions.unreact(mine.id);
          } else {
            actions.react(memory.id, 'heart', { isPrivate: isPrivateMemory });
          }
        }}
        onReply={openReply}
        onRepost={() => actions.repost(memory.id, { isPrivate: isPrivateMemory })}
        onShare={() => {
          if (!isPrivateMemory) Share.share({ message: memoryShareUrl(memory.id) });
        }}
      />
    </PressScale>
  );
}

function firstRel(value: any): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const styles = StyleSheet.create({
  card: { borderTopWidth: StyleSheet.hairlineWidth, paddingBottom: 4 },
});
