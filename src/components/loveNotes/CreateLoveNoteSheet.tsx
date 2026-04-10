import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedSheet, BottomSheetTextInput } from '@/src/components/ui';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (data: { body: string; isPrivate: boolean }) => Promise<void>;
  note?: { id: string; body: string; isPrivate: boolean };
}

export function CreateLoveNoteSheet({ sheetRef, onSave, note }: Props) {
  const C = useColors();
  const { mode } = useTheme();

  const [body, setBody] = useState(note?.body ?? '');
  const [isPrivate, setIsPrivate] = useState(note?.isPrivate ?? false);
  const [saving, setSaving] = useState(false);
  const sessionKey = note ? `edit:${note.id}` : 'create';
  const sessionKeyRef = useRef(sessionKey);

  const isEdit = !!note;

  const glassBg = mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const glassBorder = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  useEffect(() => {
    if (sessionKeyRef.current === sessionKey) {
      return;
    }

    sessionKeyRef.current = sessionKey;
    setBody(note?.body ?? '');
    setIsPrivate(note?.isPrivate ?? false);
  }, [note, sessionKey]);

  const handleSave = useCallback(async () => {
    if (!body.trim()) {
      Alert.alert('Note required', 'Write something before sending.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ body: body.trim(), isPrivate });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheetRef.current?.dismiss();
      if (!isEdit) {
        setBody('');
        setIsPrivate(false);
      }
    } catch (error) {
      console.warn('[Coupl] Save love note failed:', error);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  }, [body, isPrivate, onSave, isEdit, sheetRef]);

  const togglePrivacy = useCallback(() => {
    Haptics.selectionAsync();
    setIsPrivate((prev) => !prev);
  }, []);

  const footer = (
    <TouchableOpacity
      onPress={handleSave}
      disabled={saving}
      activeOpacity={0.8}
      style={[styles.saveBtn, { backgroundColor: C.error }]}
    >
      <Feather name={isEdit ? 'check' : 'send'} size={18} color={C.ink} />
      <Text style={[styles.saveBtnText, { color: C.ink }]}>
        {saving ? 'Saving...' : isEdit ? 'Update' : 'Send Note'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ThemedSheet
      sheetRef={sheetRef}
      snapPoints={['84%']}
      scrollable
      footer={footer}
    >
      <Animated.View entering={FadeInDown.duration(300)} style={styles.form}>
        <View style={styles.header}>
          <Text style={[styles.sheetLabel, { color: C.primary }]}>
            {isEdit ? 'EDIT NOTE' : 'NEW NOTE'}
          </Text>
        </View>

        <View style={[styles.bodyCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <BottomSheetTextInput
            style={[styles.bodyInput, { color: C.text }]}
            placeholder="Write something sweet..."
            placeholderTextColor={C.fog}
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
            autoFocus
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Visibility</Text>
          <TouchableOpacity
            style={[
              styles.privacyToggle,
              { backgroundColor: isPrivate ? C.primaryMuted : glassBg, borderColor: isPrivate ? C.primary : glassBorder },
            ]}
            onPress={togglePrivacy}
            activeOpacity={0.7}
          >
            <Feather name={isPrivate ? 'lock' : 'unlock'} size={16} color={isPrivate ? C.primary : C.fog} />
            <Text style={[styles.privacyLabel, { color: isPrivate ? C.primary : C.haze }]}>
              {isPrivate ? 'Only you' : 'Share with partner'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ThemedSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.xl,
  },
  header: {
    gap: Spacing.xs,
  },
  sheetLabel: {
    ...Typography.overline,
    letterSpacing: 3,
  },
  bodyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.md,
  },
  bodyInput: {
    ...Typography.body,
    minHeight: 120,
    lineHeight: 22,
    textAlignVertical: 'top',
    padding: 0,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    ...Typography.overline,
    letterSpacing: 2,
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  privacyLabel: {
    ...Typography.captionMedium,
    fontSize: 14,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveBtnText: {
    ...Typography.subheading,
    fontSize: 15,
  },
});
