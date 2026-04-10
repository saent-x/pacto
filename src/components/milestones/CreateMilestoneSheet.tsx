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
import { sheet, useGlass } from '@/src/components/ui/sheetStyles';

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
  const [date, setDate] = useState(milestone?.date ? new Date(`${milestone.date}T00:00:00`) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [description, setDescription] = useState(milestone?.description ?? '');
  const [icon, setIcon] = useState(milestone?.icon ?? '');
  const [saving, setSaving] = useState(false);
  const sessionKey = milestone ? `edit:${milestone.id}` : 'create';
  const sessionKeyRef = useRef(sessionKey);

  const isEdit = !!milestone;

  const { glassBg, glassBorder } = useGlass();
  const activeBg = C.milestonesLight;

  useEffect(() => {
    if (sessionKeyRef.current === sessionKey) {
      return;
    }

    sessionKeyRef.current = sessionKey;
    setTitle(milestone?.title ?? '');
    setDate(milestone?.date ? new Date(`${milestone.date}T00:00:00`) : new Date());
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
        date: format(date, 'yyyy-MM-dd'),
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
      style={[sheet.saveBtn, { backgroundColor: C.milestones }]}
    >
      <Feather name={isEdit ? 'check' : 'flag'} size={18} color={C.ink} />
      <Text style={[sheet.saveBtnText, { color: C.ink }]}>
        {saving ? 'Saving...' : isEdit ? 'Update Milestone' : 'Save Milestone'}
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
          <Text style={[sheet.sheetLabel, { color: C.milestones }]}>
            {isEdit ? 'EDIT MILESTONE' : 'NEW MILESTONE'}
          </Text>
          <Text style={[sheet.dateDisplay, { color: C.primary }]}>
            {format(date, 'EEEE, MMMM d')}
          </Text>
        </View>

        <BottomSheetTextInput
          style={[sheet.titleInput, { color: C.text }]}
          placeholder="What's the milestone?"
          placeholderTextColor={C.fog}
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        {/* Date — glass pill, inline DateTimePicker */}
        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>When</Text>
          <View style={sheet.dateRow}>
            <TouchableOpacity
              style={[sheet.glassPill, { backgroundColor: glassBg, borderColor: glassBorder }]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowDatePicker((current) => !current);
              }}
            >
              <Feather name="calendar" size={15} color={C.milestones} />
              <Text style={[sheet.glassPillText, { color: C.text }]}>
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
        <View style={[sheet.bodyCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <BottomSheetTextInput
            style={[sheet.bodyInput, { color: C.text }]}
            placeholder="Add details..."
            placeholderTextColor={C.fog}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Icon picker — horizontal scroll chips with emojis */}
        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Icon</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={sheet.chipRow}>
              {ICON_OPTIONS.map((opt) => {
                const active = icon === opt.emoji;
                return (
                  <TouchableOpacity
                    key={opt.emoji}
                    style={[
                      sheet.chipWithIcon,
                      { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.milestones : glassBorder },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setIcon(active ? '' : opt.emoji);
                    }}
                  >
                    <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                    <Text style={[sheet.chipText, { color: active ? C.milestones : C.haze }]}>
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
  chipEmoji: {
    fontSize: 16,
  },
});
