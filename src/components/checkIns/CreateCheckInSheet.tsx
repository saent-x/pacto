import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { ThemedSheet, BottomSheetTextInput } from '@/src/components/ui';
import { useColors } from '@/src/hooks/useColors';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';
import { CHECK_IN_MOODS, normalizeCheckInMood } from '@/src/constants/checkInMoods';
import { sheet, useGlass } from '@/src/components/ui/sheetStyles';

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (data: { mood: string | null; note: string | null; isPrivate: boolean; checkInDate?: string }) => Promise<void>;
  checkIn?: { id: string; mood: string | null; note: string | null; isPrivate: boolean };
}

export function CreateCheckInSheet({ sheetRef, onSave, checkIn }: Props) {
  const C = useColors();
  const initialMood = normalizeCheckInMood(checkIn?.mood);

  const [mood, setMood] = useState(initialMood ?? '');
  const [note, setNote] = useState(checkIn?.note ?? '');
  const [isPrivate, setIsPrivate] = useState(checkIn?.isPrivate ?? false);
  const [saving, setSaving] = useState(false);
  const sessionKey = checkIn ? `edit:${checkIn.id}` : 'create';
  const sessionKeyRef = useRef(sessionKey);

  const isEdit = !!checkIn;

  const { glassBg, glassBorder } = useGlass();
  const activeBg = C.moodLight;

  useEffect(() => {
    if (sessionKeyRef.current === sessionKey) {
      return;
    }

    sessionKeyRef.current = sessionKey;
    setMood(normalizeCheckInMood(checkIn?.mood) ?? '');
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
      style={[sheet.saveBtn, { backgroundColor: C.mood }]}
    >
      <Feather name={isEdit ? 'check' : 'activity'} size={18} color={C.ink} />
      <Text style={[sheet.saveBtnText, { color: C.ink }]}>
        {saving ? 'Saving...' : isEdit ? 'Update' : 'Check In'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ThemedSheet
      sheetRef={sheetRef}
      scrollable
      footer={footer}
    >
      <View style={sheet.form}>
        <View style={sheet.dateHeader}>
          <Text style={[sheet.sheetLabel, { color: C.mood }]}>
            {isEdit ? 'EDIT CHECK-IN' : 'NEW CHECK-IN'}
          </Text>
          <Text style={[sheet.dateDisplay, { color: C.primary }]}>
            {format(new Date(), 'EEEE, MMMM d')}
          </Text>
        </View>

        {/* Mood grid — circular glass toggles in a row */}
        <View style={[sheet.section, { alignItems: 'center' }]}>
          <View style={styles.moodRow}>
            {CHECK_IN_MOODS.map((opt) => {
              const active = mood === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.moodCircle,
                    { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.mood : glassBorder },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setMood(active ? '' : opt.id);
                  }}
                >
                  <Feather name={opt.icon} size={18} color={active ? C.mood : C.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </View>
          {mood && (
            <Text style={[styles.moodLabel, { color: C.mood }]}>
              {CHECK_IN_MOODS.find((option) => option.id === mood)?.label}
            </Text>
          )}
        </View>

        {/* Note — optional */}
        <View style={[sheet.bodyCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <BottomSheetTextInput
            style={[sheet.bodyInput, styles.bodyInput, { color: C.text }]}
            placeholder="Share a thought..."
            placeholderTextColor={C.fog}
            value={note}
            onChangeText={setNote}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Privacy toggle */}
        <View style={sheet.section}>
          <TouchableOpacity
            style={[
              sheet.privacyToggle,
              { backgroundColor: isPrivate ? activeBg : glassBg, borderColor: isPrivate ? C.mood : glassBorder },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setIsPrivate((prev) => !prev);
            }}
          >
            <Feather name={isPrivate ? 'lock' : 'unlock'} size={15} color={isPrivate ? C.mood : C.fog} />
            <Text style={[sheet.privacyText, { color: isPrivate ? C.mood : C.haze }]}>
              {isPrivate ? 'Private' : 'Shared'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedSheet>
  );
}

const styles = StyleSheet.create({
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
  moodLabel: {
    ...Typography.captionMedium,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  bodyInput: {
    minHeight: 60,
  },
});
