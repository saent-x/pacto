import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { ThemedSheet, BottomSheetTextInput } from '@/src/components/ui';
import { useColors } from '@/src/hooks/useColors';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';
import { sheet, useGlass } from '@/src/components/ui/sheetStyles';
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
  const currentUserId = profile?.id ?? null;

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

  const { glassBg, glassBorder } = useGlass();
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
      style={[sheet.saveBtn, { backgroundColor: C.reminders }]}
    >
      <Feather name={isEdit ? 'check' : 'bell'} size={18} color={C.ink} />
      <Text style={[sheet.saveBtnText, { color: C.ink }]}>
        {saving ? 'Saving...' : isEdit ? 'Update Reminder' : 'Set Reminder'}
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
          <Text style={[sheet.sheetLabel, { color: C.reminders }]}>
            {isEdit ? 'EDIT REMINDER' : 'NEW REMINDER'}
          </Text>
          <Text style={[sheet.dateDisplay, { color: C.primary }]}>
            {format(dueDate, 'EEEE, MMMM d')}
          </Text>
        </View>

        <BottomSheetTextInput
          style={[sheet.titleInput, { color: C.text }]}
          placeholder="What to remember..."
          placeholderTextColor={C.fog}
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

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

        {/* When — date/time in glass pills */}
        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>When</Text>
          <View style={sheet.dateRow}>
            <TouchableOpacity
              style={[sheet.glassPill, { backgroundColor: glassBg, borderColor: glassBorder }]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowDatePicker((current) => !current);
                setShowTimePicker(false);
              }}
            >
              <Feather name="calendar" size={15} color={C.reminders} />
              <Text style={[sheet.glassPillText, { color: C.text }]}>
                {format(dueDate, 'MMM d, yyyy')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sheet.glassPill, { backgroundColor: glassBg, borderColor: glassBorder }]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowTimePicker((current) => !current);
                setShowDatePicker(false);
              }}
            >
              <Feather name="clock" size={15} color={C.reminders} />
              <Text style={[sheet.glassPillText, { color: C.text }]}>
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
        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Priority</Text>
          <View style={sheet.toggleRow}>
            {PRIORITIES.map((p) => {
              const active = priority === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    sheet.glassToggle,
                    { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.reminders : glassBorder },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPriority(priority === p.value ? 0 : p.value);
                  }}
                >
                  <Feather name={p.icon} size={14} color={active ? C.reminders : C.fog} />
                  <Text style={[sheet.toggleText, { color: active ? C.reminders : C.haze }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Category — horizontal scroll glass chips */}
        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={sheet.chipRow}>
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      sheet.chip,
                      { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.reminders : glassBorder },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCategory(category === cat ? '' : cat);
                    }}
                  >
                    <Text style={[sheet.chipText, { color: active ? C.reminders : C.haze }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Recurrence */}
        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Repeat</Text>
          <View style={sheet.chipRow}>
            {RECURRENCES.map((rec) => {
              const active = recurrence === rec || (!recurrence && rec === 'None');
              return (
                <TouchableOpacity
                  key={rec}
                  style={[
                    sheet.chip,
                    { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.reminders : glassBorder },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRecurrence(rec === 'None' ? '' : rec);
                  }}
                >
                  <Text style={[sheet.chipText, { color: active ? C.reminders : C.haze }]}>
                    {rec}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Assign */}
        {partner && (
          <View style={sheet.section}>
            <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Assign to</Text>
            <View style={sheet.toggleRow}>
              {[
                { value: null, label: 'Both', icon: 'users' as const },
                { value: currentUserId, label: 'Me', icon: 'user' as const },
                { value: partner.id, label: partner.displayName?.split(' ')[0] ?? 'Partner', icon: 'heart' as const },
              ].map((opt) => {
                const active = assignedTo === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[
                      sheet.glassToggle,
                      { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.reminders : glassBorder },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setAssignedTo(opt.value);
                    }}
                  >
                    <Feather name={opt.icon} size={14} color={active ? C.reminders : C.fog} />
                    <Text style={[sheet.toggleText, { color: active ? C.reminders : C.haze }]}>
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

