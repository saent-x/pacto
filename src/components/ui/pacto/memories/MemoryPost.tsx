import { router } from 'expo-router';
import { useMemo } from 'react';
import {
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { formatDistanceToNowStrict } from 'date-fns';
import { Avatar } from '@/src/components/ui/pacto/Avatar';
import { MemoriesIcon, type MemoriesIconName } from './MemoriesIcon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useSession } from '@/src/hooks/useSession';
import { useMemoryActions } from '@/src/hooks/memories/useMemoryActions';
import { useTheme } from '@/src/lib/theme';

export type MemoryPostVariant = 'feed' | 'detail' | 'reply';

export interface MemoryPostMemory {
  id: string;
  body: string;
  kind: 'post' | 'reply' | 'repost' | 'quote';
  createdAt: number;
  isPinned?: boolean;
  isPrivate?: boolean;
  reactionCount?: number;
  replyCount?: number;
  repostCount?: number;
  author?: { id: string; displayName?: string; avatarUrl?: string };
  attachments?: any[];
  reactions?: { id: string; user?: { id: string } }[];
  replyTo?: { id: string; author?: { displayName?: string; avatarUrl?: string } };
  quoteOf?: { id: string; body: string; author?: { displayName?: string; avatarUrl?: string } };
  repostOf?: {
    id: string;
    body: string;
    createdAt: number;
    author?: { id: string; displayName?: string; avatarUrl?: string };
    attachments?: any[];
  };
  /** Optional preview of the most recent reply to this memory, used to render the threaded avatar. */
  replyPreview?: { who: string; body: string; avatarUrl?: string };
}

interface Props {
  memory: MemoryPostMemory;
  variant: MemoryPostVariant;
  /** When `true`, the post sits in a thread and shows no bottom hairline. */
  isLast?: boolean;
}

/**
 * Threads-style memory post. Avatar gutter on the left (with optional thread
 * line + reply preview avatar), body column on the right with header row
 * (lowercase name · pinned/private badge · mono timestamp · dots), body text,
 * media carousel, action row (heart / reply / repost / send), and an
 * inline reply preview when one exists.
 */
export function MemoryPost({ memory, variant, isLast }: Props) {
  const { C } = useTheme();
  const session = useSession() as any;
  const me = session?.user;
  const mode: 'solo' | 'pair' | 'couple' | 'crew' =
    session?.mode ?? session?.space?.kind ?? 'solo';
  const isSolo = mode === 'solo';
  const actions = useMemoryActions();

  // ── Repost rendering: surface the original memory inside this card ─────
  if (memory.kind === 'repost' && memory.repostOf) {
    const reposter = memory.author?.displayName ?? 'Someone';
    return (
      <View style={[styles.repostWrap, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.lineColor }]}>
        <View style={[styles.repostHeader, { paddingLeft: AVATAR_COL_W + 12 }]}>
          <MemoriesIcon name="repost" size={12} color={C.ink3} />
          <Text style={[styles.repostHeaderText, { color: C.ink3 }]}>
            {reposter.toLowerCase()} reposted
          </Text>
        </View>
        <MemoryPost
          memory={{
            ...memory.repostOf,
            kind: 'post',
            reactionCount: memory.reactionCount,
            replyCount: memory.replyCount,
            repostCount: memory.repostCount,
          } as MemoryPostMemory}
          variant={variant}
          isLast
        />
      </View>
    );
  }

  const author = memory.author;
  const authorName = (author?.displayName ?? 'someone').toLowerCase();
  const hasReply = !!memory.replyPreview;
  const hasReacted = !!memory.reactions?.some((r) => r.user?.id === me?.id);
  const time = useMemo(() => formatTime(memory.createdAt), [memory.createdAt]);

  const onPress =
    variant === 'feed'
      ? () => router.push(`/(tabs)/memories/${memory.id}` as any)
      : undefined;

  const onReact = () => {
    if (isSolo) return;
    if (hasReacted) {
      const mine = memory.reactions?.find((r) => r.user?.id === me?.id);
      if (mine) actions.unreact(mine.id);
    } else {
      actions.react(memory.id);
    }
  };
  const onReply = () =>
    router.push(`/sheets/memory-composer?mode=reply&parentId=${memory.id}` as any);
  const onRepost = () => {
    if (isSolo) return;
    actions.repost(memory.id);
  };
  const onShare = () => {
    Share.share({ message: `coupl://memories/${memory.id}` });
  };

  return (
    <PressScale
      onPress={onPress}
      style={[
        styles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.lineColor },
      ]}
    >
      {/* Avatar gutter with thread line */}
      <View style={styles.gutter}>
        <Avatar
          person={{
            initial: authorName.charAt(0).toUpperCase(),
            color: C.accent,
            avatarUrl: author?.avatarUrl,
          }}
          size={36}
        />
        {hasReply ? (
          <>
            <View style={[styles.threadLine, { backgroundColor: C.lineColor }]} />
            <Avatar
              person={{
                initial: (memory.replyPreview!.who ?? '?').charAt(0).toUpperCase(),
                color: C.accent2,
                avatarUrl: memory.replyPreview!.avatarUrl,
              }}
              size={20}
            />
          </>
        ) : null}
      </View>

      {/* Body column */}
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={[styles.name, { color: C.inkColor }]} numberOfLines={1}>
              {authorName}
            </Text>
            {memory.isPinned ? (
              <Text style={[styles.metaTag, { color: C.accent }]}>· pinned</Text>
            ) : null}
            {memory.isPrivate ? (
              <Text style={[styles.metaTag, { color: C.ink3 }]}>· private</Text>
            ) : null}
            <Text style={[styles.time, { color: C.ink3 }]} numberOfLines={1}>
              {time}
            </Text>
          </View>
          <PressScale hitSlop={8} onPress={() => undefined} style={styles.dotsBtn}>
            <MemoriesIcon name="dots" size={18} color={C.ink3} />
          </PressScale>
        </View>

        {memory.body ? (
          <Body body={memory.body} color={C.inkColor} />
        ) : null}

        {memory.attachments && memory.attachments.length > 0 ? (
          <MediaCarousel attachments={memory.attachments} />
        ) : null}

        {memory.quoteOf ? (
          <QuotePreview
            quoted={memory.quoteOf}
            onPress={() =>
              router.push(`/(tabs)/memories/${memory.quoteOf!.id}` as any)
            }
          />
        ) : null}

        {/* Action row */}
        <View style={styles.actionRow}>
          {!isSolo ? (
            <ActionBtn
              icon="heart"
              count={memory.reactionCount ?? 0}
              active={hasReacted}
              activeColor={C.accent}
              idleColor={C.ink2}
              countColor={hasReacted ? C.accent : C.ink3}
              onPress={onReact}
            />
          ) : null}
          <ActionBtn
            icon="reply"
            count={memory.replyCount ?? 0}
            idleColor={C.ink2}
            countColor={C.ink3}
            onPress={onReply}
          />
          {!isSolo ? (
            <ActionBtn
              icon="repost"
              count={memory.repostCount ?? 0}
              idleColor={C.ink2}
              countColor={C.ink3}
              onPress={onRepost}
            />
          ) : null}
          <ActionBtn icon="send" idleColor={C.ink2} countColor={C.ink3} onPress={onShare} />
        </View>

        {hasReply ? (
          <View style={styles.replyPreview}>
            <Text style={[styles.replyName, { color: C.inkColor }]}>
              {(memory.replyPreview!.who ?? '?').toLowerCase()}
            </Text>
            <Text style={[styles.replyBody, { color: C.ink2 }]} numberOfLines={2}>
              {memory.replyPreview!.body}
            </Text>
          </View>
        ) : null}
      </View>
    </PressScale>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

const AVATAR_COL_W = 36;

function formatTime(ts: number): string {
  // Compact relative — design uses "2h", "5h", "1d"; date-fns "Strict" gives us that.
  try {
    const formatted = formatDistanceToNowStrict(ts, { addSuffix: false });
    return formatted
      .replace(' seconds', 's')
      .replace(' second', 's')
      .replace(' minutes', 'm')
      .replace(' minute', 'm')
      .replace(' hours', 'h')
      .replace(' hour', 'h')
      .replace(' days', 'd')
      .replace(' day', 'd')
      .replace(' months', 'mo')
      .replace(' month', 'mo')
      .replace(' years', 'y')
      .replace(' year', 'y');
  } catch {
    return '';
  }
}

function Body({ body, color }: { body: string; color: string }) {
  const { C } = useTheme();
  // Highlight #hashtags in the accent ink; URLs stay in body color (no inline
  // tap target — the whole post is pressable).
  const tokens = useMemo(() => splitHashtags(body), [body]);
  return (
    <Text style={[styles.bodyText, { color }]} selectable>
      {tokens.map((tk, i) =>
        tk.kind === 'tag' ? (
          <Text key={i} style={{ color: C.accent, fontFamily: 'Geist_500Medium' }}>
            {tk.text}
          </Text>
        ) : (
          <Text key={i}>{tk.text}</Text>
        ),
      )}
    </Text>
  );
}

function splitHashtags(body: string): { kind: 'text' | 'tag'; text: string }[] {
  const re = /(#[\p{L}\p{N}_]+)/gu;
  const out: { kind: 'text' | 'tag'; text: string }[] = [];
  let last = 0;
  for (const m of body.matchAll(re)) {
    if (m.index! > last) out.push({ kind: 'text', text: body.slice(last, m.index!) });
    out.push({ kind: 'tag', text: m[0] });
    last = m.index! + m[0].length;
  }
  if (last < body.length) out.push({ kind: 'text', text: body.slice(last) });
  return out;
}

function MediaCarousel({ attachments }: { attachments: any[] }) {
  const { C } = useTheme();
  const { width: winW } = useWindowDimensions();
  const single = attachments.length === 1;
  // Body column width = window - 18px L/R padding - 36px gutter - 12px gap.
  const bodyW = Math.max(200, winW - 18 * 2 - AVATAR_COL_W - 12);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingTop: 12 }}
    >
      {attachments.map((a, i) => {
        const isMedia = a.type === 'image' || a.type === 'gif' || a.type === 'video';
        const aspect =
          a.mediaWidth && a.mediaHeight ? a.mediaWidth / a.mediaHeight : single ? 4 / 5 : 1;
        const w = single ? bodyW : 220;
        const h = single ? bodyW / aspect : 260;
        if (isMedia && a.mediaUrl) {
          return (
            <View
              key={a.id ?? i}
              style={[
                styles.mediaTile,
                { width: w, height: h, borderColor: C.lineColor, backgroundColor: C.bgCard },
              ]}
            >
              <Image
                source={{ uri: a.mediaUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
          );
        }
        // Entity ref → tonal placeholder (matches design)
        const tone = entityTone(a.type, C);
        return (
          <View
            key={a.id ?? i}
            style={[
              styles.mediaTile,
              {
                width: single ? bodyW : 220,
                height: single ? Math.min(280, bodyW) : 260,
                borderColor: C.lineColor,
                backgroundColor: tone,
              },
            ]}
          >
            <View style={[styles.placeholderLabel, { backgroundColor: 'rgba(255,255,255,0.7)' }]}>
              <Text style={[styles.placeholderText, { color: C.ink2 }]}>
                {(a.type ?? 'attachment').toString().toUpperCase()}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function entityTone(type: string | undefined, C: any): string {
  switch (type) {
    case 'milestone': return C.accent3 ?? C.accent;
    case 'plan': return C.accent ?? '#eee';
    case 'checkIn': return C.accent2 ?? '#eee';
    case 'expense': return C.bgSoft ?? '#eee';
    case 'wishlistItem': return C.accent3 ?? '#eee';
    default: return C.bgCard ?? '#eee';
  }
}

function QuotePreview({ quoted, onPress }: { quoted: any; onPress: () => void }) {
  const { C } = useTheme();
  return (
    <PressScale
      onPress={onPress}
      style={[styles.quote, { borderColor: C.lineColor, backgroundColor: C.bgCard }]}
    >
      <Text style={[styles.quoteAuthor, { color: C.ink3 }]} numberOfLines={1}>
        {(quoted.author?.displayName ?? 'someone').toLowerCase()}
      </Text>
      <Text style={[styles.quoteBody, { color: C.inkColor }]} numberOfLines={3}>
        {quoted.body}
      </Text>
    </PressScale>
  );
}

interface ActionBtnProps {
  icon: MemoriesIconName;
  count?: number;
  active?: boolean;
  activeColor?: string;
  idleColor: string;
  countColor: string;
  onPress?: () => void;
}

function ActionBtn({ icon, count, active, activeColor, idleColor, countColor, onPress }: ActionBtnProps) {
  return (
    <PressScale onPress={onPress} hitSlop={8} style={styles.actionBtn}>
      <MemoriesIcon
        name={icon}
        size={18}
        color={active && activeColor ? activeColor : idleColor}
        stroke={active ? 2 : 1.6}
        filled={!!(active && icon === 'heart')}
      />
      {count != null && count > 0 ? (
        <Text style={[styles.actionCount, { color: countColor }]}>{count}</Text>
      ) : null}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 12,
  },
  gutter: {
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
    paddingTop: 2,
    width: AVATAR_COL_W,
  },
  threadLine: {
    flex: 1,
    width: 2,
    borderRadius: 1,
    marginTop: 8,
    marginBottom: 8,
    minHeight: 20,
    opacity: 0.6,
  },
  body: { flex: 1, minWidth: 0 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: 'Geist_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
  },
  metaTag: {
    fontFamily: 'GeistMono_400Regular',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  time: {
    fontFamily: 'GeistMono_400Regular',
    fontSize: 13,
  },
  dotsBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  bodyText: {
    fontFamily: 'Geist_400Regular',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  mediaTile: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
  },
  placeholderLabel: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  placeholderText: {
    fontFamily: 'GeistMono_400Regular',
    fontSize: 10,
    letterSpacing: 1.6,
  },
  quote: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  quoteAuthor: {
    fontFamily: 'GeistMono_400Regular',
    fontSize: 12,
  },
  quoteBody: {
    fontFamily: 'Geist_400Regular',
    fontSize: 14,
    lineHeight: 19,
  },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  actionCount: {
    fontFamily: 'GeistMono_400Regular',
    fontSize: 12,
  },
  replyPreview: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  replyName: {
    fontFamily: 'Geist_600SemiBold',
    fontSize: 13,
    fontWeight: '600',
  },
  replyBody: {
    flex: 1,
    fontFamily: 'Geist_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  // Repost wrapper
  repostWrap: {
    paddingTop: 10,
  },
  repostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 4,
  },
  repostHeaderText: {
    fontFamily: 'GeistMono_400Regular',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
