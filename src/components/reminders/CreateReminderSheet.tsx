import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { ThemedSheet, BottomSheetTextInput } from '@/src/components/ui';
import { Button } from '@/src/components/ui';
import { useColors } from '@/src/hooks/useColors';
import { useCoupleStore } from '@/src/stores/coupleStore';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { Reminder } from '@/src/types/database';

const PRIORITIES = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Med' },
  { value: 3, label: 'High' },
];

const CATEGORIES = ['General', 'Date night', 'Anniversary', 'Health', 'Bills', 'Travel'];
const RECURRENCES = ['None', 'Daily', 'Weekly', 'Monthly', 'Yearly'];

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (data: any) => Promise<void>;
  reminder?: Reminder;
}

export function CreateReminderSheet({ sheetRef, onSave, reminder }: Props) {
  const C = useColors();
  const partner = useCoupleStore((s) => s.partner);

  const [title, setTitle] = useState(reminder?.title ?? '');
  const [description, setDescription] = useState(reminder?.description ?? '');
  const [dueDate, setDueDate] = useState(reminder?.due_at ? new Date(reminder.due_at) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [priority, setPriority] = useState(reminder?.priority ?? 0);
  const [category, setCategory] = useState(reminder?.category ?? '');
  const [recurrence, setRecurrence] = useState(reminder?.recurrence ?? '');
  const [assignedTo, setAssignedTo] = useState<string | null>(reminder?.assigned_to ?? null);
  const [saving, setSaving] = useState(false);

  const isEdit = !!reminder;

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give your reminder a name.');
      return;
    }
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await onSave({
      title: title.trim(),
      description: description.trim() || null,
      due_at: dueDate.toISOString(),
      priority,
      category: category || null,
      recurrence: recurrence && recurrence !== 'None' ? recurrence.toLowerCase() : null,
      assigned_to: assignedTo,
    });
    setSaving(false);
    sheetRef.current?.dismiss();
    // Reset form
    if (!isEdit) {
      setTitle('');
      setDescription('');
      setDueDate(new Date());
      setPriority(0);
      setCategory('');
      setRecurrence('');
      setAssignedTo(null);
    }
  }, [title, description, dueDate, priority, category, recurrence, assignedTo, onSave, isEdit]);

  return (
    <ThemedSheet
      sheetRef={sheetRef}
      snapPoints={['85%']}
      title={isEdit ? 'Edit Reminder' : 'New Reminder'}
      scrollable
    >
      <View style={styles.form}>
        {/* Title */}
        <View style={styles.field}>
          <BottomSheetTextInput
            style={[styles.titleInput, { color: C.text, borderBottomColor: C.dusk }]}
            placeholder="What to remember..."
            placeholderTextColor={C.fog}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: C.fog }]}>Description</Text>
          <BottomSheetTextInput
            style={[styles.descInput, { color: C.text, borderColor: C.dusk, backgroundColor: C.card }]}
            placeholder="Add details..."
            placeholderTextColor={C.fog}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Due Date & Time */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: C.fog }]}>When</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={[styles.datePill, { backgroundColor: C.card, borderColor: C.dusk }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Feather name="calendar" size={14} color={C.reminders} />
              <Text style={[styles.datePillText, { color: C.text }]}>
                {format(dueDate, 'MMM d, yyyy')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.datePill, { backgroundColor: C.card, borderColor: C.dusk }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Feather name="clock" size={14} color={C.reminders} />
              <Text style={[styles.datePillText, { color: C.text }]}>
                {format(dueDate, 'h:mm a')}
              </Text>
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setDueDate(date);
              }}
              themeVariant="dark"
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={dueDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (date) setDueDate(date);
              }}
              themeVariant="dark"
            />
          )}
        </View>

        {/* Priority */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: C.fog }]}>Priority</Text>
          <View style={styles.pillRow}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.pill,
                  { borderColor: priority === p.value ? C.reminders : C.dusk },
                  priority === p.value && { backgroundColor: C.remindersLight },
                ]}
                onPress={() => setPriority(priority === p.value ? 0 : p.value)}
              >
                <Text style={[styles.pillText, { color: priority === p.value ? C.reminders : C.haze }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: C.fog }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.pillRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.pill,
                    { borderColor: category === cat ? C.reminders : C.dusk },
                    category === cat && { backgroundColor: C.remindersLight },
                  ]}
                  onPress={() => setCategory(category === cat ? '' : cat)}
                >
                  <Text style={[styles.pillText, { color: category === cat ? C.reminders : C.haze }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Recurrence */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: C.fog }]}>Repeat</Text>
          <View style={styles.pillRow}>
            {RECURRENCES.map((rec) => (
              <TouchableOpacity
                key={rec}
                style={[
                  styles.pill,
                  { borderColor: recurrence === rec || (!recurrence && rec === 'None') ? C.reminders : C.dusk },
                  (recurrence === rec || (!recurrence && rec === 'None')) && { backgroundColor: C.remindersLight },
                ]}
                onPress={() => setRecurrence(rec === 'None' ? '' : rec)}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: recurrence === rec || (!recurrence && rec === 'None') ? C.reminders : C.haze },
                  ]}
                >
                  {rec}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Assign */}
        {partner && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: C.fog }]}>Assign to</Text>
            <View style={styles.pillRow}>
              {[
                { value: null, label: 'Both' },
                { value: 'me', label: 'Me' },
                { value: partner.id, label: partner.display_name?.split(' ')[0] ?? 'Partner' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.label}
                  style={[
                    styles.pill,
                    { borderColor: assignedTo === opt.value ? C.reminders : C.dusk },
                    assignedTo === opt.value && { backgroundColor: C.remindersLight },
                  ]}
                  onPress={() => setAssignedTo(opt.value)}
                >
                  <Text style={[styles.pillText, { color: assignedTo === opt.value ? C.reminders : C.haze }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Save */}
        <Button
          title={isEdit ? 'Update Reminder' : 'Save Reminder'}
          onPress={handleSave}
          loading={saving}
          size="lg"
          style={styles.saveBtn}
        />
      </View>
    </ThemedSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing['2xl'],
  },
  field: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.overline,
  },
  titleInput: {
    ...Typography.heading,
    borderBottomWidth: 1,
    paddingBottom: Spacing.md,
  },
  descInput: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  datePillText: {
    ...Typography.captionMedium,
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pillText: {
    ...Typography.captionMedium,
    fontSize: 13,
  },
  saveBtn: {
    marginTop: Spacing.md,
  },
});
