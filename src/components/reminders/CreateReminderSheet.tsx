import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, Alert } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { ThemedSheet, BottomSheetTextInput, OptionSelect } from '@/src/components/ui';
import { useColors } from '@/src/hooks/useColors';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';
import { sheet, useGlass } from '@/src/components/ui/sheetStyles';
import { Reminder } from '@/src/types/database';

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
  const [dueDate, setDueDate] = useState(reminder?.due_at ? new Date(reminder.due_at) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [recurrence, setRecurrence] = useState(reminder?.recurrence ?? '');
  const [assignedTo, setAssignedTo] = useState<string | null>(reminder?.assigned_to ?? null);
  const [saving, setSaving] = useState(false);
  const sessionKey = reminder ? `edit:${reminder.id}` : 'create';
  const sessionKeyRef = useRef(sessionKey);

  const isEdit = !!reminder;

  const { glassBg, glassBorder } = useGlass();

  useEffect(() => {
    if (sessionKeyRef.current === sessionKey) {
      return;
    }

    sessionKeyRef.current = sessionKey;
    setTitle(reminder?.title ?? '');
    setDueDate(reminder?.due_at ? new Date(reminder.due_at) : new Date());
    setShowDatePicker(false);
    setShowTimePicker(false);
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
        description: null,
        due_at: dueDate.toISOString(),
        priority: 0,
        category: null,
        recurrence: recurrence && recurrence !== 'None' ? recurrence.toLowerCase() : null,
        assigned_to: assignedTo,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheetRef.current?.dismiss();
      if (!isEdit) {
        setTitle('');
        setDueDate(new Date());
        setRecurrence('');
        setAssignedTo(null);
      }
    } catch (error) {
      console.warn('[Coupl] Save reminder failed:', error);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  }, [title, dueDate, recurrence, assignedTo, onSave, isEdit, sheetRef]);

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

        {/* Recurrence */}
        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Repeat</Text>
          <OptionSelect
            options={RECURRENCES.map((r) => ({ value: r, label: r }))}
            selected={recurrence || 'None'}
            onSelect={(val) => setRecurrence(val === 'None' ? '' : val)}
            accentColor={C.reminders}
            accentBg={C.remindersLight}
            allowDeselect={false}
            mode="segment"
          />
        </View>

        {/* Assign */}
        {partner && (
          <View style={sheet.section}>
            <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Assign to</Text>
            <OptionSelect
              options={[
                { value: 'both', label: 'Both', icon: 'users' },
                { value: currentUserId ?? '', label: 'Me', icon: 'user' },
                { value: partner.id, label: partner.displayName?.split(' ')[0] ?? 'Partner', icon: 'heart' },
              ]}
              selected={assignedTo ?? 'both'}
              onSelect={(val) => setAssignedTo(val === 'both' ? null : val)}
              accentColor={C.reminders}
              accentBg={C.remindersLight}
              allowDeselect={false}
            />
          </View>
        )}

      </View>
    </ThemedSheet>
  );
}

