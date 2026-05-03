import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/hooks/useSession';
import { useMemoryComposer } from '@/src/hooks/memories/useMemoryComposer';
import { useMediaUpload } from '@/src/hooks/memories/useMediaUpload';
import { useMediaQuota } from '@/src/hooks/memories/useMediaQuota';
// import { polishDraft } from '@/src/lib/ai'; // TODO: re-enable once polish.ts is real
import { useAiQuota } from '@/src/hooks/useAiQuota';
import { QuotaBadge } from './QuotaBadge';
import { useMediaPicker } from './MediaPickerSheet';

export function MemoryComposer() {
  const params = useLocalSearchParams<{ mode?: string; parentId?: string; quoteId?: string }>();
  const { C } = useTheme();
  const session = useSession() as any;
  const spaceMode = session?.mode ?? session?.space?.kind ?? 'solo';
  const space = session?.activeCouple?.couple ?? session?.space;
  const { draft, setDraft, submit } = useMemoryComposer();
  const { upload } = useMediaUpload();
  const { pick } = useMediaPicker();
  const quota = useMediaQuota(space?.id);
  const aiQuota = useAiQuota(space?.id);
  const [submitting, setSubmitting] = useState(false);

  // Sync mode/parent/quote from route params into draft state (effect avoids render-phase setState).
  useEffect(() => {
    setDraft((prev) => ({
      ...prev,
      mode: (params.mode as any) ?? 'post',
      parentId: params.parentId,
      quoteId: params.quoteId,
    }));
  }, [params.mode, params.parentId, params.quoteId]);

  const onPickImage = async () => {
    if (!space?.id) return;
    const asset = await pick();
    if (!asset) return;
    if (quota.isAtCap) {
      router.push('/sheets/upgrade' as any);
      return;
    }
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
  };

  const onPost = async () => {
    setSubmitting(true);
    try {
      await submit();
      router.back();
    } catch (e) {
      console.warn(e);
    } finally {
      setSubmitting(false);
    }
  };

  const showPrivacyToggle = spaceMode !== 'solo';
  const showNotifyToggle = spaceMode !== 'solo' && !draft.isPrivate;
  const showPollOption = spaceMode === 'crew';

  return (
    <ScrollView style={[styles.root, { backgroundColor: C.bg }]} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.headerRow}>
        <PressScale onPress={() => router.back()} hitSlop={12}>
          <Text style={[Typography.body, { color: C.inkColor }]}>Cancel</Text>
        </PressScale>
        <PressScale
          onPress={onPost}
          disabled={submitting}
          style={[styles.postBtn, { backgroundColor: C.accent, opacity: submitting ? 0.5 : 1 }]}
        >
          <Text style={[Typography.body, { color: '#fff', fontWeight: '600' }]}>{params.mode === 'reply' ? 'Reply' : 'Post'}</Text>
        </PressScale>
      </View>

      <TextInput
        value={draft.body}
        onChangeText={(text) => setDraft({ ...draft, body: text })}
        placeholder="What's on your mind?"
        placeholderTextColor={C.ink3}
        multiline
        style={[Typography.body, styles.input, { color: C.inkColor }]}
      />

      {draft.attachments.length > 0 ? (
        <Text style={[Typography.caption, { color: C.ink3, paddingHorizontal: 16 }]}>{`${draft.attachments.length} attachment${draft.attachments.length > 1 ? 's' : ''}`}</Text>
      ) : null}

      <QuotaBadge percent={quota.percent} isOverThreshold={quota.isOverThreshold} />

      <View style={styles.toolbar}>
        {/* image icon not in set — substituted with camera (closest available) */}
        <PressScale onPress={onPickImage} hitSlop={8} style={styles.toolBtn}>
          <Icon name="camera" size={20} color={C.ink3} />
        </PressScale>
        <PressScale onPress={() => router.push('/sheets/memory-attach-entity' as any)} hitSlop={8} style={styles.toolBtn}>
          <Icon name="link" size={20} color={C.ink3} />
        </PressScale>
        {showPollOption ? (
          <PressScale
            onPress={() =>
              setDraft({
                ...draft,
                pollOptions: draft.pollOptions.length === 0 ? ['', ''] : draft.pollOptions,
              })
            }
            hitSlop={8}
            style={styles.toolBtn}
          >
            {/* barChart icon not in set — substituted with pieChart (closest available) */}
            <Icon name="pieChart" size={20} color={C.ink3} />
          </PressScale>
        ) : null}
        {/* sparkles icon not in set — substituted with sparkle (singular, closest available) */}
        <PressScale
          onPress={async () => {
            if (aiQuota.isExhausted) {
              router.push('/sheets/upgrade' as any);
              return;
            }
            Alert.alert('AI Polish', 'Polishing coming soon. Sit tight.');
            // TODO: uncomment once polish.ts is real:
            // const polished = await polishDraft(draft.body);
            // setDraft({ ...draft, body: polished });
          }}
          hitSlop={8}
          style={styles.toolBtn}
        >
          <Icon name="sparkle" size={20} color={C.ink3} />
        </PressScale>
      </View>

      {draft.pollOptions.length > 0 ? (
        <View style={{ paddingHorizontal: 16, gap: 6 }}>
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
              style={[Typography.body, styles.pollOpt, { color: C.inkColor, borderColor: C.ink3 }]}
            />
          ))}
        </View>
      ) : null}

      {showPrivacyToggle ? (
        <View style={styles.toggleRow}>
          <Text style={[Typography.body, { color: C.inkColor }]}>Private</Text>
          <Switch value={!!draft.isPrivate} onValueChange={(v) => setDraft({ ...draft, isPrivate: v })} />
        </View>
      ) : null}

      {showNotifyToggle ? (
        <View style={styles.toggleRow}>
          <Text style={[Typography.body, { color: C.inkColor }]}>Notify members</Text>
          <Switch
            value={draft.notifyMembers ?? true}
            onValueChange={(v) => setDraft({ ...draft, notifyMembers: v })}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  postBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  input: { paddingHorizontal: 16, minHeight: 120, textAlignVertical: 'top' },
  toolbar: { flexDirection: 'row', gap: 16, padding: 16 },
  toolBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pollOpt: { borderWidth: 1, borderRadius: 8, padding: 10 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
});
