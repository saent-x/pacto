import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Avatar } from '@/src/components/ui/pacto';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/hooks/useSession';
import { useMemoryComposer } from '@/src/hooks/memories/useMemoryComposer';
import { useMediaUpload } from '@/src/hooks/memories/useMediaUpload';
import { useMediaQuota } from '@/src/hooks/memories/useMediaQuota';
import { useAiQuota } from '@/src/hooks/useAiQuota';
import { MemoriesIcon } from './MemoriesIcon';
import { QuotaBadge } from './QuotaBadge';
import { useMediaPicker } from './MediaPickerSheet';

type Visibility = 'pair' | 'crew' | 'private';

/**
 * Bottom-sheet composer matching the Claude Design `NewMemorySheet`.
 *
 * Layout, top → bottom:
 *   1. Sheet header     · "New memory" + close (×) button
 *   2. Author row       · Avatar + lowercase name + autoFocus multiline TextInput
 *   3. Attachments row  · image · entity-link · poll (crew only) · AI polish
 *   4. Optional media preview list
 *   5. Visibility chips · pair → "Just us / Just me", crew → "Crew / Just me", solo: hidden
 *   6. Primary "Post memory" button (full-width, ink fill, disabled until body)
 */
export function MemoryComposer() {
  const params = useLocalSearchParams<{
    mode?: string;
    parentId?: string;
    quoteId?: string;
  }>();
  const { C } = useTheme();
  const session = useSession() as any;
  const me = session?.user;
  const spaceMode: 'solo' | 'pair' | 'couple' | 'crew' =
    session?.mode ?? session?.space?.kind ?? 'solo';
  const space = session?.activeCouple?.couple ?? session?.space;
  const isSolo = spaceMode === 'solo';

  const { draft, setDraft, submit } = useMemoryComposer();
  const { upload } = useMediaUpload();
  const { pick } = useMediaPicker();
  const quota = useMediaQuota(space?.id);
  const aiQuota = useAiQuota(space?.id);
  const [submitting, setSubmitting] = useState(false);

  // Sync route params → draft once on mount / param change.
  useEffect(() => {
    setDraft((prev: any) => ({
      ...prev,
      mode: (params.mode as any) ?? 'post',
      parentId: params.parentId,
      quoteId: params.quoteId,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.mode, params.parentId, params.quoteId]);

  // Visibility chips — mode-aware. Maps to the existing isPrivate boolean.
  const visibilityOptions = useMemo<{ id: Visibility; label: string }[]>(() => {
    if (isSolo) return [];
    if (spaceMode === 'crew') {
      return [
        { id: 'crew', label: 'Crew' },
        { id: 'private', label: 'Just me' },
      ];
    }
    return [
      { id: 'pair', label: 'Just us' },
      { id: 'private', label: 'Just me' },
    ];
  }, [spaceMode, isSolo]);

  const visibility: Visibility =
    draft.isPrivate ? 'private' : spaceMode === 'crew' ? 'crew' : 'pair';

  const setVisibility = (v: Visibility) => {
    const isPrivate = v === 'private';
    setDraft({
      ...draft,
      isPrivate,
      // Force notify off when private (mirrors perms rule).
      notifyMembers: isPrivate ? false : draft.notifyMembers ?? true,
    });
  };

  // ── Attachment actions ──────────────────────────────────────────────────
  const onPickImage = async () => {
    if (!space?.id) return;
    const asset = await pick();
    if (!asset) return;
    if (quota.isAtCap) {
      router.push('/sheets/upgrade' as any);
      return;
    }
    try {
      const uploaded = await upload({
        spaceId: space.id,
        type: asset.isGif ? 'gif' : 'image',
        uri: asset.uri,
        rawSize: asset.size,
      });
      setDraft({
        ...draft,
        attachments: [
          ...draft.attachments,
          {
            type: asset.isGif ? 'gif' : 'image',
            mediaUrl: uploaded.mediaUrl,
            mediaPath: uploaded.mediaPath,
            mediaSize: uploaded.mediaSize,
            mediaWidth: uploaded.mediaWidth,
            mediaHeight: uploaded.mediaHeight,
          },
        ],
      });
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Unknown error');
    }
  };

  const onAttachEntity = () => router.push('/sheets/memory-attach-entity' as any);

  const showPollOption = spaceMode === 'crew';
  const onTogglePoll = () =>
    setDraft({
      ...draft,
      pollOptions: draft.pollOptions.length === 0 ? ['', ''] : [],
    });

  const onPolish = () => {
    if (aiQuota.isExhausted) {
      router.push('/sheets/upgrade' as any);
      return;
    }
    Alert.alert('AI Polish', 'Polishing coming soon. Sit tight.');
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const canPost = draft.body.trim().length > 0 || draft.attachments.length > 0;
  const onPost = async () => {
    if (!canPost || submitting) return;
    setSubmitting(true);
    try {
      await submit();
      router.back();
    } catch (e: any) {
      Alert.alert('Could not post', e?.message ?? 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Author display ──────────────────────────────────────────────────────
  const meName = (me?.displayName ?? me?.email?.split('@')[0] ?? 'you')
    .toString()
    .toLowerCase();
  const meInitial = meName.charAt(0).toUpperCase();

  const placeholder = isSolo
    ? 'remember something…'
    : params.mode === 'reply'
    ? 'reply…'
    : "what's on your mind?";

  const headerTitle =
    params.mode === 'reply'
      ? 'Reply'
      : params.mode === 'quote'
      ? 'Quote memory'
      : 'New memory';

  const ctaLabel = params.mode === 'reply' ? 'Reply' : 'Post memory';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: (C as any).coal ?? C.bg }]}
    >
      {/* Sheet header */}
      <View style={[styles.header, { borderBottomColor: C.lineColor }]}>
        <PressScale onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <MemoriesIcon
            name="plus"
            size={20}
            color={C.ink3}
            stroke={1.6}
            style={{ transform: [{ rotate: '45deg' }] }}
          />
        </PressScale>
        <Text style={[styles.headerTitle, { color: C.inkColor }]}>{headerTitle}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Author + body */}
        <View style={styles.authorRow}>
          <Avatar
            person={{ initial: meInitial, color: C.accent, avatarUrl: me?.avatarUrl }}
            size={36}
          />
          <View style={styles.bodyCol}>
            <Text style={[styles.authorName, { color: C.inkColor }]}>{meName}</Text>
            <TextInput
              value={draft.body}
              onChangeText={(text) => setDraft({ ...draft, body: text })}
              placeholder={placeholder}
              placeholderTextColor={C.ink3}
              multiline
              autoFocus
              style={[Typography.body, styles.input, { color: C.inkColor }]}
            />

            {/* Attachments toolbar */}
            <View style={styles.toolbar}>
              <PressScale onPress={onPickImage} hitSlop={8} style={styles.toolBtn}>
                <ImageIcon color={C.ink3} />
              </PressScale>
              <PressScale onPress={onAttachEntity} hitSlop={8} style={styles.toolBtn}>
                <LinkIcon color={C.ink3} />
              </PressScale>
              {showPollOption ? (
                <PressScale
                  onPress={onTogglePoll}
                  hitSlop={8}
                  style={[
                    styles.toolBtn,
                    draft.pollOptions.length > 0 && { backgroundColor: C.bgSoft },
                  ]}
                >
                  <PollIcon color={draft.pollOptions.length > 0 ? C.accent : C.ink3} />
                </PressScale>
              ) : null}
              <PressScale onPress={onPolish} hitSlop={8} style={styles.toolBtn}>
                <SparkleIcon color={C.ink3} />
              </PressScale>
            </View>

            <QuotaBadge percent={quota.percent} isOverThreshold={quota.isOverThreshold} />

            {/* Media preview list */}
            {draft.attachments.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mediaRow}
              >
                {draft.attachments.map((a, i) => (
                  <View
                    key={i}
                    style={[styles.mediaTile, { borderColor: C.lineColor, backgroundColor: C.bgCard }]}
                  >
                    {a.mediaUrl ? (
                      <Image
                        source={{ uri: a.mediaUrl }}
                        style={StyleSheet.absoluteFill as any}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={[styles.mediaLabel, { color: C.ink3 }]}>
                        {(a.type ?? 'attachment').toUpperCase()}
                      </Text>
                    )}
                    <PressScale
                      hitSlop={8}
                      onPress={() => {
                        const next = [...draft.attachments];
                        next.splice(i, 1);
                        setDraft({ ...draft, attachments: next });
                      }}
                      style={[styles.mediaRemove, { backgroundColor: C.bg + 'cc' }]}
                    >
                      <MemoriesIcon
                        name="plus"
                        size={14}
                        color={C.inkColor}
                        stroke={2}
                        style={{ transform: [{ rotate: '45deg' }] }}
                      />
                    </PressScale>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {/* Poll options input — crew only, after toggling */}
            {draft.pollOptions.length > 0 ? (
              <View style={styles.pollList}>
                {draft.pollOptions.map((opt, idx) => (
                  <TextInput
                    key={idx}
                    value={opt}
                    placeholder={`Option ${idx + 1}`}
                    placeholderTextColor={C.ink3}
                    onChangeText={(t) => {
                      const next = [...draft.pollOptions];
                      next[idx] = t;
                      setDraft({ ...draft, pollOptions: next });
                    }}
                    style={[
                      Typography.body,
                      styles.pollOpt,
                      { color: C.inkColor, borderColor: C.lineColor, backgroundColor: C.bgCard },
                    ]}
                  />
                ))}
                {draft.pollOptions.length < 4 ? (
                  <PressScale
                    onPress={() =>
                      setDraft({ ...draft, pollOptions: [...draft.pollOptions, ''] })
                    }
                    style={[styles.pollAdd, { borderColor: C.lineColor }]}
                  >
                    <Text style={[Typography.caption, { color: C.ink3 }]}>+ option</Text>
                  </PressScale>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {/* Visibility chips — hidden in solo (private inherent) */}
        {visibilityOptions.length > 0 ? (
          <View style={[styles.chipRow, { borderTopColor: C.lineColor }]}>
            {visibilityOptions.map((opt) => {
              const active = visibility === opt.id;
              return (
                <PressScale
                  key={opt.id}
                  onPress={() => setVisibility(opt.id)}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? C.inkColor : C.lineColor,
                      backgroundColor: active ? C.inkColor : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? C.bg : C.ink2,
                      fontFamily: 'Geist_500Medium',
                      fontSize: 13,
                      fontWeight: '500',
                    }}
                  >
                    {opt.label}
                  </Text>
                </PressScale>
              );
            })}
          </View>
        ) : null}

        {/* Primary CTA */}
        <PressScale
          onPress={onPost}
          disabled={!canPost || submitting}
          style={[
            styles.cta,
            {
              backgroundColor: canPost ? C.inkColor : C.bgSoft,
              opacity: submitting ? 0.6 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: canPost ? C.bg : C.ink3,
              fontFamily: 'Geist_600SemiBold',
              fontWeight: '600',
              fontSize: 15,
            }}
          >
            {ctaLabel}
          </Text>
        </PressScale>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Toolbar mini icons (image / link / poll / sparkle) ────────────────
// Inline SVG so the strokes match the design's hairline style.

function ImageIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={4} width={18} height={16} rx={2} />
      <Circle cx={9} cy={10} r={1.6} />
      <Path d="M21 16l-5-5-9 9" />
    </Svg>
  );
}

function LinkIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <Path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </Svg>
  );
}

function PollIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 20V10M12 20V4M19 20v-6" />
    </Svg>
  );
}

function SparkleIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3zM18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Geist_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bodyCol: { flex: 1, minWidth: 0 },
  authorName: {
    fontFamily: 'Geist_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  input: {
    minHeight: 80,
    fontSize: 16,
    lineHeight: 22,
    paddingTop: 4,
    paddingBottom: 4,
    textAlignVertical: 'top',
  },
  toolbar: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
    alignItems: 'center',
  },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaRow: {
    paddingTop: 12,
    gap: 8,
  },
  mediaTile: {
    width: 120,
    height: 160,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mediaLabel: {
    fontFamily: 'GeistMono_400Regular',
    fontSize: 10,
    letterSpacing: 1.4,
  },
  mediaRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollList: {
    marginTop: 12,
    gap: 6,
  },
  pollOpt: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pollAdd: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  cta: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
