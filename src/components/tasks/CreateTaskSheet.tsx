import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
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
import { Task } from '@/src/types/database';

const PRIORITIES = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Med' },
  { value: 3, label: 'High' },
];

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (data: any) => Promise<void>;
  task?: Task;
}

export function CreateTaskSheet({ sheetRef, onSave, task }: Props) {
  const C = useColors();
  const partner = useCoupleStore((s) => s.partner);

  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [dueDate, setDueDate] = useState<Date | null>(task?.due_date ? new Date(task.due_date) : null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priority, setPriority] = useState(task?.priority ?? 0);
  const [assignedTo, setAssignedTo] = useState<string | null>(task?.assigned_to ?? null);
  const [saving, setSaving] = useState(false);

  const isEdit = !!task;

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Title required');
      return;
    }
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await onSave({
      title: title.trim(),
      notes: notes.trim() || null,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      priority,
      assigned_to: assignedTo,
    });
    setSaving(false);
    sheetRef.current?.dismiss();
    if (!isEdit) {
      setTitle('');
      setNotes('');
      setDueDate(null);
      setPriority(0);
      setAssignedTo(null);
    }
  }, [title, notes, dueDate, priority, assignedTo, onSave, isEdit]);

  return (
    <ThemedSheet sheetRef={sheetRef} snapPoints={['70%']} title={isEdit ? 'Edit Task' : 'New Task'} scrollable>
      <View style={styles.form}>
        <BottomSheetTextInput
          style={[styles.titleInput, { color: C.text, borderBottomColor: C.dusk }]}
          placeholder="What needs doing?"
          placeholderTextColor={C.fog}
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        <View style={styles.field}>
          <Text style={[styles.label, { color: C.fog }]}>Notes</Text>
          <BottomSheetTextInput
            style={[styles.notesInput, { color: C.text, borderColor: C.dusk, backgroundColor: C.card }]}
            placeholder="Add details..."
            placeholderTextColor={C.fog}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: C.fog }]}>Due date</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={[styles.datePill, { backgroundColor: C.card, borderColor: C.dusk }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Feather name="calendar" size={14} color={C.tasks} />
              <Text style={[styles.datePillText, { color: C.text }]}>
                {dueDate ? format(dueDate, 'MMM d, yyyy') : 'No date'}
              </Text>
            </TouchableOpacity>
            {dueDate && (
              <TouchableOpacity onPress={() => setDueDate(null)}>
                <Feather name="x" size={16} color={C.fog} />
              </TouchableOpacity>
            )}
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={dueDate ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setDueDate(date);
              }}
              themeVariant="dark"
            />
          )}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: C.fog }]}>Priority</Text>
          <View style={styles.pillRow}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.pill,
                  { borderColor: priority === p.value ? C.tasks : C.dusk },
                  priority === p.value && { backgroundColor: C.tasksLight },
                ]}
                onPress={() => setPriority(priority === p.value ? 0 : p.value)}
              >
                <Text style={[styles.pillText, { color: priority === p.value ? C.tasks : C.haze }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {partner && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: C.fog }]}>Assign to</Text>
            <View style={styles.pillRow}>
              {[
                { value: null, label: 'Either' },
                { value: 'me', label: 'Me' },
                { value: partner.id, label: partner.display_name?.split(' ')[0] ?? 'Partner' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.label}
                  style={[
                    styles.pill,
                    { borderColor: assignedTo === opt.value ? C.tasks : C.dusk },
                    assignedTo === opt.value && { backgroundColor: C.tasksLight },
                  ]}
                  onPress={() => setAssignedTo(opt.value)}
                >
                  <Text style={[styles.pillText, { color: assignedTo === opt.value ? C.tasks : C.haze }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <Button
          title={isEdit ? 'Update Task' : 'Save Task'}
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
  form: { gap: Spacing['2xl'] },
  field: { gap: Spacing.sm },
  label: { ...Typography.overline },
  titleInput: {
    ...Typography.heading,
    borderBottomWidth: 1,
    paddingBottom: Spacing.md,
  },
  notesInput: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  datePillText: { ...Typography.captionMedium },
  pillRow: { flexDirection: 'row', gap: Spacing.sm },
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pillText: { ...Typography.captionMedium, fontSize: 13 },
  saveBtn: { marginTop: Spacing.md },
});
