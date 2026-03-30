import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { ThemedSheet, BottomSheetTextInput } from '@/src/components/ui';
import { useColors } from '@/src/hooks/useColors';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { Reminder } from '@/src/types/database';

const PRIORITIES = [
  { value: 1, label: 'Low', icon: 'minus' as const },
  { value: 2, label: 'Med', icon: 'alert-circle' as const },
  { value: 3, label: 'High', icon: 'alert-triangle' as const },
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
  const { mode } = useTheme();
  const { activeCouple, profile } = useSession();
  const partner = activeCouple?.partner ?? null;
  const currentUserId = profile?._id ?? null;

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
  const sessionKey = reminder ? `edit:${reminder.id}` : 'create';
  const sessionKeyRef = useRef(sessionKey);

  const isEdit = !!reminder;

  const glassBg = mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const glassBorder = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const activeBg = C.remindersLight;

  useEffect(() => {
    if (sessionKeyRef.current === sessionKey) {
      return;
    }

    sessionKeyRef.current = sessionKey;
    setTitle(reminder?.title ?? '');
    setDescription(reminder?.description ?? '');
    setDueDate(reminder?.due_at ? new Date(reminder.due_at) : new Date());
    setShowDatePicker(false);
    setShowTimePicker(false);
    setPriority(reminder?.priority ?? 0);
    setCategory(reminder?.category ?? '');
    setRecurrence(reminder?.recurrence ?? '');
    setAssignedTo(reminder?.assigned_to ?? null);
  }, [reminder, sessionKey]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give your reminder a name.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        due_at: dueDate.toISOString(),
        priority,
        category: category || null,
        recurrence: recurrence && recurrence !== 'None' ? recurrence.toLowerCase() : null,
        assigned_to: assignedTo,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheetRef.current?.dismiss();
      if (!isEdit) {
        setTitle('');
        setDescription('');
        setDueDate(new Date());
        setPriority(0);
        setCategory('');
        setRecurrence('');
        setAssignedTo(null);
      }
    } catch (error) {
      console.warn('[Coupl] Save reminder failed:', error);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  }, [title, description, dueDate, priority, category, recurrence, assignedTo, onSave, isEdit, sheetRef]);

  const footer = (
    <TouchableOpacity
      onPress={handleSave}
      disabled={saving}
      activeOpacity={0.8}
      style={[styles.saveBtn, { backgroundColor: C.reminders }]}
    >
      <Feather name={isEdit ? 'check' : 'bell'} size={18} color={C.ink} />
      <Text style={[styles.saveBtnText, { color: C.ink }]}>
        {saving ? 'Saving...' : isEdit ? 'Update Reminder' : 'Set Reminder'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ThemedSheet
      sheetRef={sheetRef}
      snapPoints={['96%']}
      scrollable
      footer={footer}
    >
      <View style={styles.form}>
        <View style={styles.dateHeader}>
          <Text style={[styles.sheetLabel, { color: C.reminders }]}>
            {isEdit ? 'EDIT REMINDER' : 'NEW REMINDER'}
          </Text>
          <Text style={[styles.dateDisplay, { color: C.primary }]}>
            {format(dueDate, 'EEEE, MMMM d')}
          </Text>
        </View>

        <BottomSheetTextInput
          style={[styles.titleInput, { color: C.text }]}
          placeholder="What to remember..."
          placeholderTextColor={C.fog}
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

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

        {/* When — date/time in glass pills */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>When</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={[styles.glassPill, { backgroundColor: glassBg, borderColor: glassBorder }]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowDatePicker((current) => !current);
                setShowTimePicker(false);
              }}
            >
              <Feather name="calendar" size={15} color={C.reminders} />
              <Text style={[styles.glassPillText, { color: C.text }]}>
                {format(dueDate, 'MMM d, yyyy')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.glassPill, { backgroundColor: glassBg, borderColor: glassBorder }]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowTimePicker((current) => !current);
                setShowDatePicker(false);
              }}
            >
              <Feather name="clock" size={15} color={C.reminders} />
              <Text style={[styles.glassPillText, { color: C.text }]}>
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
                if (Platform.OS !== 'ios') {
                  setShowDatePicker(false);
                }
                if (date) setDueDate(date);
              }}
              themeVariant={mode}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={dueDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                if (Platform.OS !== 'ios') {
                  setShowTimePicker(false);
                }
                if (date) setDueDate(date);
              }}
              themeVariant={mode}
            />
          )}
        </View>

        {/* Priority — glass toggles */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Priority</Text>
          <View style={styles.toggleRow}>
            {PRIORITIES.map((p) => {
              const active = priority === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.glassToggle,
                    { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.reminders : glassBorder },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPriority(priority === p.value ? 0 : p.value);
                  }}
                >
                  <Feather name={p.icon} size={14} color={active ? C.reminders : C.fog} />
                  <Text style={[styles.toggleText, { color: active ? C.reminders : C.haze }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Category — horizontal scroll glass chips */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.reminders : glassBorder },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCategory(category === cat ? '' : cat);
                    }}
                  >
                    <Text style={[styles.chipText, { color: active ? C.reminders : C.haze }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Recurrence */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Repeat</Text>
          <View style={styles.chipRow}>
            {RECURRENCES.map((rec) => {
              const active = recurrence === rec || (!recurrence && rec === 'None');
              return (
                <TouchableOpacity
                  key={rec}
                  style={[
                    styles.chip,
                    { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.reminders : glassBorder },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRecurrence(rec === 'None' ? '' : rec);
                  }}
                >
                  <Text style={[styles.chipText, { color: active ? C.reminders : C.haze }]}>
                    {rec}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Assign */}
        {partner && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Assign to</Text>
            <View style={styles.toggleRow}>
              {[
                { value: null, label: 'Both', icon: 'users' as const },
                { value: currentUserId, label: 'Me', icon: 'user' as const },
                { value: partner._id, label: partner.displayName?.split(' ')[0] ?? 'Partner', icon: 'heart' as const },
              ].map((opt) => {
                const active = assignedTo === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[
                      styles.glassToggle,
                      { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.reminders : glassBorder },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setAssignedTo(opt.value);
                    }}
                  >
                    <Feather name={opt.icon} size={14} color={active ? C.reminders : C.fog} />
                    <Text style={[styles.toggleText, { color: active ? C.reminders : C.haze }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

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
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  glassToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toggleText: {
    ...Typography.captionMedium,
    fontSize: 13,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
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
