import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedSheet, BottomSheetTextInput } from '@/src/components/ui';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';

const MOOD_OPTIONS = [
  { emoji: '😫', label: 'Struggling' },
  { emoji: '😔', label: 'Down' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😊', label: 'Happy' },
  { emoji: '🥰', label: 'Loved' },
  { emoji: '🤩', label: 'Amazing' },
];

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (data: { mood: string | null; note: string | null; isPrivate: boolean; checkInDate?: string }) => Promise<void>;
  checkIn?: { id: string; mood: string | null; note: string | null; isPrivate: boolean };
}

export function CreateCheckInSheet({ sheetRef, onSave, checkIn }: Props) {
  const C = useColors();
  const { mode } = useTheme();

  const [mood, setMood] = useState(checkIn?.mood ?? '');
  const [note, setNote] = useState(checkIn?.note ?? '');
  const [isPrivate, setIsPrivate] = useState(checkIn?.isPrivate ?? false);
  const [saving, setSaving] = useState(false);
  const sessionKey = checkIn ? `edit:${checkIn.id}` : 'create';
  const sessionKeyRef = useRef(sessionKey);

  const isEdit = !!checkIn;

  const glassBg = mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const glassBorder = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const activeBg = C.moodLight;

  useEffect(() => {
    if (sessionKeyRef.current === sessionKey) {
      return;
    }

    sessionKeyRef.current = sessionKey;
    setMood(checkIn?.mood ?? '');
    setNote(checkIn?.note ?? '');
    setIsPrivate(checkIn?.isPrivate ?? false);
  }, [checkIn, sessionKey]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave({
        mood: mood || null,
        note: note.trim() || null,
        isPrivate,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheetRef.current?.dismiss();
      if (!isEdit) {
        setMood('');
        setNote('');
        setIsPrivate(false);
      }
    } catch (error) {
      console.warn('[Coupl] Save check-in failed:', error);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  }, [mood, note, isPrivate, onSave, isEdit, sheetRef]);

  const footer = (
    <TouchableOpacity
      onPress={handleSave}
      disabled={saving}
      activeOpacity={0.8}
      style={[styles.saveBtn, { backgroundColor: C.mood }]}
    >
      <Feather name={isEdit ? 'check' : 'smile'} size={18} color={C.ink} />
      <Text style={[styles.saveBtnText, { color: C.ink }]}>
        {saving ? 'Saving...' : isEdit ? 'Update' : 'Check In'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ThemedSheet
      sheetRef={sheetRef}
      snapPoints={['60%']}
      scrollable
      footer={footer}
    >
      <View style={styles.form}>
        <Text style={[styles.sheetLabel, { color: C.mood }]}>
          HOW ARE YOU?
        </Text>

        {/* Mood grid — circular glass toggles in a row */}
        <View style={styles.section}>
          <View style={styles.moodRow}>
            {MOOD_OPTIONS.map((opt) => {
              const active = mood === opt.emoji;
              return (
                <TouchableOpacity
                  key={opt.emoji}
                  style={[
                    styles.moodCircle,
                    { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.mood : glassBorder },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setMood(active ? '' : opt.emoji);
                  }}
                >
                  <Text style={styles.moodEmoji}>{opt.emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {mood && (
            <Text style={[styles.moodLabel, { color: C.mood }]}>
              {MOOD_OPTIONS.find((o) => o.emoji === mood)?.label}
            </Text>
          )}
        </View>

        {/* Note — optional */}
        <View style={[styles.bodyCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <BottomSheetTextInput
            style={[styles.bodyInput, { color: C.text }]}
            placeholder="Share a thought..."
            placeholderTextColor={C.fog}
            value={note}
            onChangeText={setNote}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Privacy toggle */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.privacyToggle,
              { backgroundColor: isPrivate ? activeBg : glassBg, borderColor: isPrivate ? C.mood : glassBorder },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setIsPrivate((prev) => !prev);
            }}
          >
            <Feather name={isPrivate ? 'lock' : 'unlock'} size={15} color={isPrivate ? C.mood : C.fog} />
            <Text style={[styles.privacyText, { color: isPrivate ? C.mood : C.haze }]}>
              {isPrivate ? 'Private' : 'Shared'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.xl,
  },
  sheetLabel: {
    ...Typography.overline,
    letterSpacing: 3,
  },
  section: {
    gap: Spacing.md,
    alignItems: 'center',
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  moodCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  moodEmoji: {
    fontSize: 22,
  },
  moodLabel: {
    ...Typography.captionMedium,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  bodyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.md,
  },
  bodyInput: {
    ...Typography.body,
    minHeight: 60,
    lineHeight: 22,
    textAlignVertical: 'top',
    padding: 0,
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  privacyText: {
    ...Typography.captionMedium,
    fontSize: 13,
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
