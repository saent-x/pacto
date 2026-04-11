import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable, Switch, Alert,
  Keyboard, ScrollView, Image, ActivityIndicator, Platform,
} from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
  editorHtml,
  RichText,
  useEditorBridge,
  useBridgeState,
  TenTapStartKit,
} from '@10play/tentap-editor';
import { ThemedSheet, BottomSheetTextInput } from '@/src/components/ui';
import { sheet, useGlass } from '@/src/components/ui/sheetStyles';
import { MarkdownText } from '@/src/components/journal/MarkdownText';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { JournalEntry } from '@/src/types/database';

/* ─── Constants ─── */

const MOODS = [
  { icon: 'sun' as const, label: 'Great', color: '#8AAF7B' },
  { icon: 'cloud' as const, label: 'Good', color: '#7BA0AF' },
  { icon: 'minus' as const, label: 'Okay', color: '#D4A054' },
  { icon: 'cloud-drizzle' as const, label: 'Low', color: '#B08090' },
  { icon: 'cloud-lightning' as const, label: 'Rough', color: '#C96B5A' },
];

type ToolbarItem = {
  id: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  isActive: (s: any) => boolean;
  onPress: (e: any) => void;
};

/* ─── Types ─── */

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (data: any) => Promise<void>;
  onUploadImage?: (input: { uri: string; contentType?: string }) => Promise<string>;
  entry?: JournalEntry;
  readOnly?: boolean;
}

type MediaItem = { uri: string; storageId?: string };

/* ─── Helpers ─── */

function isEmptyHtml(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length === 0;
}

/* ═══════════════════════════════════ COMPONENT ═══════════════════════════════════ */

export function CreateEntrySheet({ sheetRef, onSave, onUploadImage, entry, readOnly }: Props) {
  const C = useColors();
  const { mode } = useTheme();

  const [title, setTitle] = useState(entry?.title ?? '');
  const [mood, setMood] = useState(entry?.mood ?? '');
  const [isPrivate, setIsPrivate] = useState(entry?.is_private ?? false);
  const [entryDate] = useState(entry?.entry_date ?? format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(
    (entry?.media_urls ?? []).map((uri) => ({
      uri,
    })),
  );

  const sessionKey = entry ? `edit:${entry.id}` : 'create';
  const sessionKeyRef = useRef(sessionKey);
  const isEdit = !!entry;

  const { glassBg, glassBorder } = useGlass();
  const themeBg = mode === 'dark' ? '#0F0D0B' : '#EDE8E0';

  /* ─── TipTap Editor with embedded CSS ─── */
  const customSource = React.useMemo(() => {
    const textColor = mode === 'dark' ? '#F2EBE2' : '#2C2420';
    const textSecondary = mode === 'dark' ? '#A89A8C' : '#6B5F52';
    const fogColor = mode === 'dark' ? '#7A6E62' : '#8A7E72';
    const journalColor = mode === 'dark' ? '#C4977A' : '#A87258';
    const codeBg = mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

    const css = `
      html, body {
        background-color: ${themeBg} !important;
        color: ${textColor} !important;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
        font-size: 17px; line-height: 1.7;
        margin: 0; padding: 0;
      }
      .ProseMirror {
        outline: none; min-height: 200px; padding: 16px;
        color: ${textColor} !important;
        background-color: ${themeBg} !important;
      }
      .ProseMirror p, .ProseMirror li, .ProseMirror h1, .ProseMirror h2,
      .ProseMirror strong, .ProseMirror em, .ProseMirror u, .ProseMirror span {
        color: ${textColor} !important;
      }
      p { margin: 0 0 12px; }
      h1 { font-size: 24px; line-height: 1.3; margin: 0 0 10px; }
      h2 { font-size: 20px; line-height: 1.3; margin: 0 0 10px; }
      blockquote {
        margin: 0 0 12px; padding-left: 14px;
        border-left: 3px solid ${journalColor};
      }
      blockquote, blockquote * { color: ${textSecondary} !important; }
      ul, ol { margin: 0 0 12px; padding-left: 22px; }
      li { margin-bottom: 4px; }
      code {
        font-family: monospace; font-size: 14px;
        background: ${codeBg}; padding: 2px 6px; border-radius: 4px;
      }
      strong, b { font-weight: 700; }
      em, i { font-style: italic; }
      u { text-decoration-color: ${journalColor}; }
      s, del { opacity: 0.6; text-decoration: line-through; }
      .ProseMirror p.is-editor-empty:first-child::before {
        color: ${fogColor} !important;
        content: attr(data-placeholder);
        float: left; height: 0; pointer-events: none;
      }
    `;
    return (editorHtml as string).replace('</head>', `<style data-tag="coupl-theme">${css}</style></head>`);
  }, [mode, themeBg]);

  const editorTheme = React.useMemo(() => ({
    toolbar: { toolbarBody: { borderTopWidth: 0 } },
    webview: { backgroundColor: themeBg },
  }), [themeBg]);

  const editor = useEditorBridge({
    bridgeExtensions: TenTapStartKit,
    customSource,
    initialContent: entry?.body || '<p></p>',
    autofocus: !isEdit && !readOnly,
    editable: !readOnly,
    theme: editorTheme,
  });

  const editorState = useBridgeState(editor);

  /* ─── Toolbar items ─── */
  const toolbarItems: ToolbarItem[] = [
    { id: 'heading', icon: 'type', isActive: (s) => s.headingLevel !== undefined, onPress: (e) => e.toggleHeading(1) },
    { id: 'bold', icon: 'bold', isActive: (s) => s.isBoldActive, onPress: (e) => e.toggleBold() },
    { id: 'italic', icon: 'italic', isActive: (s) => s.isItalicActive, onPress: (e) => e.toggleItalic() },
    { id: 'underline', icon: 'underline', isActive: (s) => s.isUnderlineActive, onPress: (e) => e.toggleUnderline() },
    { id: 'strike', icon: 'minus', isActive: (s) => s.isStrikeActive, onPress: (e) => e.toggleStrike() },
    { id: 'bullet', icon: 'list', isActive: (s) => s.isBulletListActive, onPress: (e) => e.toggleBulletList() },
    { id: 'ordered', icon: 'align-left', isActive: (s) => s.isOrderedListActive, onPress: (e) => e.toggleOrderedList() },
    { id: 'quote', icon: 'message-square', isActive: (s) => s.isBlockquoteActive, onPress: (e) => e.toggleBlockquote() },
    { id: 'code', icon: 'code', isActive: (s) => s.isCodeActive, onPress: (e) => e.toggleCode() },
  ];

  /* ─── Sync entry when switching between create/edit ─── */
  useEffect(() => {
    if (sessionKeyRef.current === sessionKey) return;
    sessionKeyRef.current = sessionKey;
    setTitle(entry?.title ?? '');
    setMood(entry?.mood ?? '');
    setIsPrivate(entry?.is_private ?? false);
    setMediaItems((entry?.media_urls ?? []).map((uri) => ({
      uri,
    })));
    editor.setContent(entry?.body || '<p></p>');
  }, [entry, sessionKey, editor]);

  /* ─── Dismiss ─── */
  const dismiss = useCallback(() => {
    editor.blur();
    Keyboard.dismiss();
  }, [editor]);

  /* ─── Save ─── */
  const handleSave = useCallback(async () => {
    if (uploadingImage) {
      Alert.alert('Upload in progress', 'Wait for the image upload to finish before saving.');
      return;
    }
    const html = await editor.getHTML();
    if (isEmptyHtml(html)) {
      Alert.alert('Write something', 'Your entry needs some content.');
      return;
    }
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const mediaRefs = mediaItems.map((item) => item.uri);
      await onSave({
        title: title.trim() || null,
        body: html,
        mood: mood || null,
        is_private: isPrivate,
        entry_date: entryDate,
        media_urls: mediaRefs,
      });
      sheetRef.current?.dismiss();
      if (!isEdit) {
        setTitle(''); setMood(''); setIsPrivate(false); setMediaItems([]);
        editor.setContent('<p></p>');
      }
    } finally { setSaving(false); }
  }, [editor, entryDate, isEdit, isPrivate, mediaItems, mood, onSave, sheetRef, title, uploadingImage]);

  /* ─── Image upload ─── */
  const handleAddImage = useCallback(async () => {
    if (readOnly || !onUploadImage || uploadingImage) return;
    dismiss();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Photos permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploadingImage(true);
    try {
      const storageId = await onUploadImage({ uri: asset.uri, contentType: asset.mimeType });
      setMediaItems((prev) => [...prev, { uri: asset.uri, storageId }]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert('Upload failed'); }
    finally { setUploadingImage(false); }
  }, [dismiss, onUploadImage, readOnly, uploadingImage]);

  const displayDate = format(new Date(entryDate + 'T00:00:00'), 'EEEE, MMMM d');

  /* ─── Footer ─── */
  const footer = !readOnly ? (
    <TouchableOpacity onPress={handleSave} disabled={saving || uploadingImage} activeOpacity={0.8}
      style={[sheet.saveBtn, { backgroundColor: C.journal }]}>
      <Feather name={isEdit ? 'check' : 'feather'} size={18} color={C.ink} />
      <Text style={[sheet.saveBtnText, { color: C.ink }]}>
        {uploadingImage ? 'Uploading image...' : saving ? 'Saving...' : isEdit ? 'Update Entry' : 'Save Entry'}
      </Text>
    </TouchableOpacity>
  ) : null;

  /* ═══════════════════════════════════ RENDER ═══════════════════════════════════ */

  return (
    <ThemedSheet sheetRef={sheetRef} scrollable footer={footer} onTapBackground={dismiss}>
      <View style={sheet.form}
        onTouchEnd={(e) => {
          // Dismiss keyboard when tapping empty space (gaps, padding)
          // Only if the touch target is this View itself, not a child
          if (e.target === e.currentTarget) {
            dismiss();
          }
        }}
      >
        {/* Date header — tapping dismisses keyboard */}
        <Pressable onPress={dismiss} style={sheet.dateHeader}>
          <Text style={[sheet.sheetLabel, { color: C.journal }]}>
            {readOnly ? 'JOURNAL ENTRY' : isEdit ? 'EDIT ENTRY' : 'NEW ENTRY'}
          </Text>
          <Text style={[sheet.dateDisplay, { color: C.primary }]}>{displayDate}</Text>
        </Pressable>

        {/* Title */}
        <BottomSheetTextInput
          style={[sheet.titleInput, { color: C.text }]}
          placeholder="Give it a title..."
          placeholderTextColor={C.fog}
          value={title}
          onChangeText={setTitle}
          editable={!readOnly}
        />

        {/* ─── Images ─── */}
        <Pressable onPress={dismiss} style={sheet.section}>
          <View style={styles.sectionHeader}>
            <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Images</Text>
            {!readOnly && (
              <TouchableOpacity activeOpacity={0.8} onPress={() => void handleAddImage()}
                style={[sheet.glassPill, styles.addMediaBtn, { backgroundColor: glassBg, borderColor: glassBorder }]}>
                {uploadingImage ? <ActivityIndicator size="small" color={C.journal} /> : (
                  <><Feather name="image" size={15} color={C.journal} />
                  <Text style={[sheet.glassPillText, { color: C.journal }]}>Add</Text></>
                )}
              </TouchableOpacity>
            )}
          </View>
          {mediaItems.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
              {mediaItems.map((item, i) => (
                <View key={`${item.uri}-${i}`} style={styles.mediaWrap}>
                  <Image source={{ uri: item.uri }} style={styles.mediaThumb} />
                  {!readOnly && (
                    <TouchableOpacity style={[styles.mediaRemove, { backgroundColor: C.ink }]}
                      onPress={() => setMediaItems((p) => p.filter((_, idx) => idx !== i))}>
                      <Feather name="x" size={12} color={C.white} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={[styles.hint, { color: C.textTertiary }]}>Add a photo to make this memory more visual.</Text>
          )}
        </Pressable>

        {/* ─── Editor ─── */}
        <View style={sheet.section}
          onTouchEnd={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
          {/* Toolbar */}
          {!readOnly && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.toolbarRow}
              style={[styles.toolbar, { backgroundColor: glassBg, borderColor: glassBorder }]}>
              {toolbarItems.map((item) => {
                const active = item.isActive(editorState);
                return (
                  <TouchableOpacity key={item.id} activeOpacity={0.6}
                    onPress={() => { Haptics.selectionAsync(); item.onPress(editor); }}
                    style={[styles.toolbarBtn, active && { backgroundColor: C.journalLight }]}>
                    <Feather name={item.icon} size={16} color={active ? C.journal : C.textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Editor body */}
          <View style={[sheet.bodyCard, styles.bodyCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            {readOnly ? (
              entry?.body && !isEmptyHtml(entry.body) ? (
                <MarkdownText value={entry.body} />
              ) : (
                <Text style={[styles.placeholder, { color: C.fog }]}>Nothing written yet.</Text>
              )
            ) : (
              <RichText editor={editor}
                style={[styles.editor, { backgroundColor: themeBg }]} />
            )}
          </View>
        </View>

        {/* ─── Mood ─── */}
        <Pressable onPress={dismiss} style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Mood</Text>
          <View style={styles.moodRow}>
            {MOODS.map((m) => {
              const active = mood === m.icon;
              return (
                <TouchableOpacity key={m.label} disabled={readOnly}
                  style={[styles.moodPill, {
                    backgroundColor: active ? m.color + '15' : glassBg,
                    borderColor: active ? m.color : glassBorder,
                  }]}
                  onPress={() => { dismiss(); Haptics.selectionAsync(); setMood(mood === m.icon ? '' : m.icon); }}>
                  <Feather name={m.icon} size={15} color={active ? m.color : C.fog} />
                  <Text style={[styles.moodLabel, { color: active ? m.color : C.haze }]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>

        {/* ─── Privacy ─── */}
        {!readOnly && (
          <Pressable onPress={dismiss}
            style={[styles.privacyRow, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <View style={[styles.privacyIcon, { backgroundColor: isPrivate ? C.primary + '15' : 'transparent' }]}>
              <Feather name={isPrivate ? 'lock' : 'unlock'} size={16} color={isPrivate ? C.primary : C.fog} />
            </View>
            <View style={styles.privacyText}>
              <Text style={[styles.privacyLabel, { color: C.text }]}>Private</Text>
              <Text style={[styles.privacyHint, { color: C.textTertiary }]}>
                {isPrivate ? 'Only you can see this' : 'Shared with partner'}
              </Text>
            </View>
            <Switch value={isPrivate}
              onValueChange={(val) => { Haptics.selectionAsync(); setIsPrivate(val); }}
              trackColor={{ false: C.dim, true: C.primary }}
              thumbColor={C.text} ios_backgroundColor={C.dim} />
          </Pressable>
        )}
      </View>
    </ThemedSheet>
  );
}

/* ═══════════════════════════════════ STYLES ═══════════════════════════════════ */

const styles = StyleSheet.create({
  toolbar: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 6,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
  },
  toolbarBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  bodyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 300,
  },
  editor: {
    flex: 1,
    minHeight: 280,
  },
  placeholder: {
    ...Typography.body,
    padding: Spacing.lg,
    minHeight: 160,
  },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  addMediaBtn: {
    paddingVertical: 8,
  },
  mediaRow: { gap: Spacing.md },
  mediaWrap: { position: 'relative' },
  mediaThumb: {
    width: 100, height: 100, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.08)',
  },
  mediaRemove: {
    position: 'absolute', top: 6, right: 6,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  hint: { ...Typography.small },

  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  moodPill: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, borderWidth: StyleSheet.hairlineWidth,
  },
  moodLabel: { ...Typography.captionMedium, fontSize: 13 },

  privacyRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.lg, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
  },
  privacyIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  privacyText: { flex: 1 },
  privacyLabel: { ...Typography.bodyMedium },
  privacyHint: { ...Typography.small },
});
