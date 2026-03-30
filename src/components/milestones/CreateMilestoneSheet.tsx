import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { ThemedSheet, BottomSheetTextInput } from '@/src/components/ui';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';

const ICON_OPTIONS = [
  { emoji: '💍', label: 'Engagement' },
  { emoji: '🏠', label: 'Home' },
  { emoji: '✈️', label: 'Trip' },
  { emoji: '🎂', label: 'Birthday' },
  { emoji: '💕', label: 'Anniversary' },
  { emoji: '🎓', label: 'Achievement' },
  { emoji: '👶', label: 'Life' },
  { emoji: '⭐', label: 'Custom' },
];

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (data: { title: string; date: string; description: string | null; icon: string }) => Promise<void>;
  milestone?: { id: string; title: string; date: string; description: string | null; icon: string };
}

export function CreateMilestoneSheet({ sheetRef, onSave, milestone }: Props) {
  const C = useColors();
  const { mode } = useTheme();

  const [title, setTitle] = useState(milestone?.title ?? '');
  const [date, setDate] = useState(milestone?.date ? new Date(milestone.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [description, setDescription] = useState(milestone?.description ?? '');
  const [icon, setIcon] = useState(milestone?.icon ?? '');
  const [saving, setSaving] = useState(false);
  const sessionKey = milestone ? `edit:${milestone.id}` : 'create';
  const sessionKeyRef = useRef(sessionKey);

  const isEdit = !!milestone;

  const glassBg = mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const glassBorder = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const activeBg = C.milestonesLight;

  useEffect(() => {
    if (sessionKeyRef.current === sessionKey) {
      return;
    }

    sessionKeyRef.current = sessionKey;
    setTitle(milestone?.title ?? '');
    setDate(milestone?.date ? new Date(milestone.date) : new Date());
    setShowDatePicker(false);
    setDescription(milestone?.description ?? '');
    setIcon(milestone?.icon ?? '');
  }, [milestone, sessionKey]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give your milestone a name.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        date: date.toISOString(),
        description: description.trim() || null,
        icon: icon || '⭐',
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheetRef.current?.dismiss();
      if (!isEdit) {
        setTitle('');
        setDate(new Date());
        setDescription('');
        setIcon('');
      }
    } catch (error) {
      console.warn('[Coupl] Save milestone failed:', error);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  }, [title, date, description, icon, onSave, isEdit, sheetRef]);

  const footer = (
    <TouchableOpacity
      onPress={handleSave}
      disabled={saving}
      activeOpacity={0.8}
      style={[styles.saveBtn, { backgroundColor: C.milestones }]}
    >
      <Feather name={isEdit ? 'check' : 'flag'} size={18} color={C.ink} />
      <Text style={[styles.saveBtnText, { color: C.ink }]}>
        {saving ? 'Saving...' : isEdit ? 'Update Milestone' : 'Save Milestone'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ThemedSheet
      sheetRef={sheetRef}
      snapPoints={['78%']}
      scrollable
      footer={footer}
    >
      <View style={styles.form}>
        <View style={styles.dateHeader}>
          <Text style={[styles.sheetLabel, { color: C.milestones }]}>
            {isEdit ? 'EDIT MILESTONE' : 'NEW MILESTONE'}
          </Text>
          <Text style={[styles.dateDisplay, { color: C.primary }]}>
            {format(date, 'EEEE, MMMM d')}
          </Text>
        </View>

        <BottomSheetTextInput
          style={[styles.titleInput, { color: C.text }]}
          placeholder="What's the milestone?"
          placeholderTextColor={C.fog}
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        {/* Date — glass pill, inline DateTimePicker */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>When</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={[styles.glassPill, { backgroundColor: glassBg, borderColor: glassBorder }]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowDatePicker((current) => !current);
              }}
            >
              <Feather name="calendar" size={15} color={C.milestones} />
              <Text style={[styles.glassPillText, { color: C.text }]}>
                {format(date, 'MMM d, yyyy')}
              </Text>
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selectedDate) => {
                if (Platform.OS !== 'ios') {
                  setShowDatePicker(false);
                }
                if (selectedDate) setDate(selectedDate);
              }}
              themeVariant={mode}
            />
          )}
        </View>

        {/* Description — optional, multiline */}
        <View style={[styles.bodyCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <BottomSheetTextInput
            style={[styles.bodyInput, { color: C.text }]}
            placeholder="Add details..."
            placeholderTextColor={C.fog}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Icon picker — horizontal scroll chips with emojis */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Icon</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {ICON_OPTIONS.map((opt) => {
                const active = icon === opt.emoji;
                return (
                  <TouchableOpacity
                    key={opt.emoji}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.milestones : glassBorder },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setIcon(active ? '' : opt.emoji);
                    }}
                  >
                    <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                    <Text style={[styles.chipText, { color: active ? C.milestones : C.haze }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </ThemedSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.xl,
  },
  dateHeader: {
    gap: Spacing.xs,
  },
  sheetLabel: {
    ...Typography.overline,
    letterSpacing: 3,
  },
  dateDisplay: {
    ...Typography.overline,
    letterSpacing: 1.5,
  },
  titleInput: {
    ...Typography.title,
    padding: 0,
  },
  bodyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.md,
  },
  bodyInput: {
    ...Typography.body,
    minHeight: 72,
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
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  glassPillText: {
    ...Typography.captionMedium,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipText: {
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
