import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { ThemedSheet, BottomSheetTextInput } from '@/src/components/ui';
import { Button } from '@/src/components/ui';
import { useColors } from '@/src/hooks/useColors';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { JournalEntry } from '@/src/types/database';

const MOODS = [
  { icon: 'sun' as const, label: 'Great', color: '#8AAF7B' },
  { icon: 'cloud' as const, label: 'Good', color: '#7BA0AF' },
  { icon: 'minus' as const, label: 'Okay', color: '#D4A054' },
  { icon: 'cloud-drizzle' as const, label: 'Low', color: '#B08090' },
  { icon: 'cloud-lightning' as const, label: 'Rough', color: '#C96B5A' },
];

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (data: any) => Promise<void>;
  entry?: JournalEntry;
  readOnly?: boolean;
}

export function CreateEntrySheet({ sheetRef, onSave, entry, readOnly }: Props) {
  const C = useColors();

  const [title, setTitle] = useState(entry?.title ?? '');
  const [body, setBody] = useState(entry?.body ?? '');
  const [mood, setMood] = useState(entry?.mood ?? '');
  const [isPrivate, setIsPrivate] = useState(entry?.is_private ?? false);
  const [entryDate] = useState(entry?.entry_date ?? format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);

  const isEdit = !!entry;

  const handleSave = useCallback(async () => {
    if (!body.trim()) {
      Alert.alert('Write something', 'Your entry needs some content.');
      return;
    }
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await onSave({
      title: title.trim() || null,
      body: body.trim(),
      mood: mood || null,
      is_private: isPrivate,
      entry_date: entryDate,
    });
    setSaving(false);
    sheetRef.current?.dismiss();
    if (!isEdit) {
      setTitle('');
      setBody('');
      setMood('');
      setIsPrivate(false);
    }
  }, [title, body, mood, isPrivate, entryDate, onSave, isEdit]);

  const displayDate = format(new Date(entryDate + 'T00:00:00'), 'EEEE, MMMM d');

  return (
    <ThemedSheet sheetRef={sheetRef} snapPoints={['92%']} scrollable>
      <View style={styles.form}>
        {/* Date */}
        <Text style={[styles.dateDisplay, { color: C.primary }]}>{displayDate}</Text>

        {/* Title */}
        <BottomSheetTextInput
          style={[styles.titleInput, { color: C.text }]}
          placeholder="Give it a title..."
          placeholderTextColor={C.fog}
          value={title}
          onChangeText={setTitle}
          editable={!readOnly}
        />

        {/* Body */}
        <BottomSheetTextInput
          style={[styles.bodyInput, { color: C.text, borderColor: C.dusk }]}
          placeholder="Write your thoughts..."
          placeholderTextColor={C.fog}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          editable={!readOnly}
          autoFocus={!readOnly && !isEdit}
        />

        {/* Mood */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: C.fog }]}>Mood</Text>
          <View style={styles.moodRow}>
            {MOODS.map((m) => (
              <TouchableOpacity
                key={m.label}
                disabled={readOnly}
                style={[
                  styles.moodPill,
                  { borderColor: mood === m.icon ? m.color : C.dusk },
                  mood === m.icon && { backgroundColor: m.color + '15' },
                ]}
                onPress={() => setMood(mood === m.icon ? '' : m.icon)}
              >
                <Feather name={m.icon} size={14} color={mood === m.icon ? m.color : C.haze} />
                <Text style={[styles.moodLabel, { color: mood === m.icon ? m.color : C.haze }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Privacy */}
        {!readOnly && (
          <View style={styles.privacyRow}>
            <Feather name="lock" size={16} color={isPrivate ? C.primary : C.fog} />
            <View style={styles.privacyText}>
              <Text style={[styles.privacyLabel, { color: C.text }]}>Private</Text>
              {isPrivate && (
                <Text style={[styles.privacyHint, { color: C.fog }]}>Only you can see this</Text>
              )}
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: C.dim, true: C.primary }}
              thumbColor={C.text}
              ios_backgroundColor={C.dim}
            />
          </View>
        )}

        {/* Save */}
        {!readOnly && (
          <Button
            title={isEdit ? 'Update Entry' : 'Save Entry'}
            onPress={handleSave}
            loading={saving}
            size="lg"
            style={styles.saveBtn}
          />
        )}
      </View>
    </ThemedSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing['2xl'] },
  dateDisplay: {
    ...Typography.overline,
    letterSpacing: 1.5,
  },
  titleInput: {
    ...Typography.title,
    padding: 0,
  },
  bodyInput: {
    ...Typography.body,
    minHeight: 160,
    lineHeight: 26,
    padding: 0,
  },
  field: { gap: Spacing.md },
  label: { ...Typography.overline },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  moodLabel: {
    ...Typography.small,
    fontWeight: '500',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  privacyText: { flex: 1 },
  privacyLabel: { ...Typography.body },
  privacyHint: { ...Typography.small },
  saveBtn: { marginTop: Spacing.md },
});
