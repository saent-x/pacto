import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, ScrollView } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { ThemedSheet, BottomSheetTextInput, OptionSelect } from '@/src/components/ui';
import { sheet, useGlass } from '@/src/components/ui/sheetStyles';
import { useColors } from '@/src/hooks/useColors';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { Task } from '@/src/types/database';

const PRIORITIES = [
  { value: 1, label: 'Low', icon: 'minus' as const },
  { value: 2, label: 'Med', icon: 'alert-circle' as const },
  { value: 3, label: 'High', icon: 'alert-triangle' as const },
];

type TaskComposerList = { id: string; name: string; icon?: string | null; color: string };
type TaskComposerTask = Pick<Task, 'title' | 'notes' | 'due_date' | 'priority' | 'assigned_to' | 'category'>;
export const AUTO_CREATE_TASK_LIST_ID = '__auto_create_first_list__';

export type TaskComposerSaveInput = {
  title: string;
  notes: string | null;
  due_date: string | null;
  priority: number;
  assigned_to: string | null;
  category: string;
};

function getDefaultDueDate() {
  return new Date();
}

export function buildTaskComposerState({
  task,
  lists = [],
  selectedListId = null,
}: {
  task?: TaskComposerTask;
  lists?: TaskComposerList[];
  selectedListId?: string | null;
}) {
  const resolvedListId =
    task?.category ??
    selectedListId ??
    (lists.length === 0 ? AUTO_CREATE_TASK_LIST_ID : lists[0]?.id ?? null);
  const selectedList = lists.find((list) => list.id === resolvedListId) ?? null;

  return {
    title: task?.title ?? '',
    notes: task?.notes ?? '',
    dueDate: task?.due_date ? new Date(task.due_date) : task ? null : getDefaultDueDate(),
    priority: task?.priority ?? 0,
    assignedTo: task?.assigned_to ?? null,
    selectedListId: resolvedListId,
    selectedList,
  };
}

export function getTaskComposerSaveError({
  title,
  selectedListId,
}: {
  title: string;
  selectedListId: string | null;
}) {
  if (!title.trim()) {
    return 'Title required';
  }

  if (!selectedListId) {
    return 'List required';
  }

  return null;
}

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (data: TaskComposerSaveInput) => Promise<void>;
  task?: Task;
  lists?: TaskComposerList[];
  selectedListId?: string | null;
}

export function CreateTaskSheet({ sheetRef, onSave, task, lists = [], selectedListId = null }: Props) {
  const C = useColors();
  const { mode } = useTheme();
  const { activeCouple, profile } = useSession();
  const partner = activeCouple?.partner ?? null;
  const currentUserId = profile?.id ?? null;

  const initialState = buildTaskComposerState({ task, lists, selectedListId });
  const initialSelectedListId = initialState.selectedListId;

  const [title, setTitle] = useState(initialState.title);
  const [notes, setNotes] = useState(initialState.notes);
  const [dueDate, setDueDate] = useState<Date | null>(initialState.dueDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priority, setPriority] = useState(initialState.priority);
  const [assignedTo, setAssignedTo] = useState<string | null>(initialState.assignedTo);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(initialState.selectedListId);
  const [saving, setSaving] = useState(false);

  const isEdit = !!task;
  const sessionKey = task ? `edit:${task.id}` : `create:${selectedListId ?? 'none'}`;
  const sessionKeyRef = useRef(sessionKey);

  const { glassBg, glassBorder } = useGlass();

  useEffect(() => {
    if (sessionKeyRef.current === sessionKey) {
      return;
    }

    sessionKeyRef.current = sessionKey;
    const nextState = buildTaskComposerState({ task, lists, selectedListId });
    setTitle(nextState.title);
    setNotes(nextState.notes);
    setDueDate(nextState.dueDate);
    setPriority(nextState.priority);
    setAssignedTo(nextState.assignedTo);
    setSelectedTaskListId(nextState.selectedListId);
    setShowDatePicker(false);
  }, [sessionKey, task, lists, selectedListId]);

  const handleSave = useCallback(async () => {
    const saveError = getTaskComposerSaveError({ title, selectedListId: selectedTaskListId });
    if (saveError) {
      Alert.alert(
        saveError,
        saveError === 'List required' ? 'Select a list before saving this task.' : undefined,
      );
      return;
    }
    const listId = selectedTaskListId;
    if (!listId) {
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        notes: notes.trim() || null,
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
        priority,
        assigned_to: assignedTo,
        category: listId,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheetRef.current?.dismiss();
      if (!isEdit) {
        const nextCreateState = buildTaskComposerState({ lists, selectedListId });
        setTitle('');
        setNotes('');
        setDueDate(getDefaultDueDate());
        setPriority(0);
        setAssignedTo(null);
        setSelectedTaskListId(nextCreateState.selectedListId);
      }
    } catch (error) {
      console.warn('[Coupl] Save task failed:', error);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  }, [title, notes, dueDate, priority, assignedTo, selectedTaskListId, onSave, isEdit, lists, selectedListId]);

  const footer = (
    <TouchableOpacity
      onPress={handleSave}
      disabled={saving}
      activeOpacity={0.8}
      style={[sheet.saveBtn, { backgroundColor: C.tasks }]}
    >
      <Feather name={isEdit ? 'check' : 'plus'} size={18} color={C.ink} />
      <Text style={[sheet.saveBtnText, { color: C.ink }]}>
        {saving ? 'Saving...' : isEdit ? 'Update Task' : 'Add Task'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ThemedSheet sheetRef={sheetRef} scrollable footer={footer}>
      <View style={sheet.form}>
        <View style={sheet.dateHeader}>
          <Text style={[sheet.sheetLabel, { color: C.tasks }]}>
            {isEdit ? 'EDIT TASK' : 'NEW TASK'}
          </Text>
          <Text style={[sheet.dateDisplay, { color: C.primary }]}>
            {dueDate ? format(dueDate, 'EEEE, MMMM d') : 'No deadline yet'}
          </Text>
        </View>

        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>List</Text>
          {lists.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listRow}>
              {lists.map((list) => {
                const active = selectedTaskListId === list.id;
                return (
                  <TouchableOpacity
                    key={list.id}
                    style={[
                      styles.listChip,
                      { backgroundColor: active ? C.tasksLight : glassBg, borderColor: active ? C.tasks : glassBorder },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedTaskListId(list.id);
                    }}
                  >
                    <View style={[styles.listDot, { backgroundColor: list.color }]} />
                    <Text style={[styles.listChipText, { color: active ? C.tasks : C.text }]} numberOfLines={1}>
                      {list.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={[styles.emptyListHint, { color: C.textTertiary }]}>
              Your first task will create a General list automatically.
            </Text>
          )}
          {!selectedTaskListId && lists.length > 0 && (
            <Text style={[styles.selectionHint, { color: C.error }]}>Select a list to save this task.</Text>
          )}
        </View>

        <BottomSheetTextInput
          style={[sheet.titleInput, { color: C.text }]}
          placeholder="What needs doing?"
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
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Due date */}
        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Due date</Text>
          <View style={sheet.dateRow}>
            <TouchableOpacity
              style={[sheet.glassPill, { backgroundColor: glassBg, borderColor: glassBorder }]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowDatePicker((current) => !current);
              }}
            >
              <Feather name="calendar" size={15} color={C.tasks} />
              <Text style={[sheet.glassPillText, { color: C.text }]}>
                {dueDate ? format(dueDate, 'MMM d, yyyy') : 'No date'}
              </Text>
            </TouchableOpacity>
            {dueDate && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setDueDate(null);
                }}
                style={[sheet.clearBtn, { backgroundColor: glassBg, borderColor: glassBorder }]}
              >
                <Feather name="x" size={14} color={C.fog} />
              </TouchableOpacity>
            )}
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={dueDate ?? new Date()}
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
        </View>

        {/* Priority */}
        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Priority</Text>
          <OptionSelect
            options={PRIORITIES.map((p) => ({ value: String(p.value), label: p.label, icon: p.icon }))}
            selected={priority === 0 ? '' : String(priority)}
            onSelect={(val) => setPriority(val ? Number(val) : 0)}
            accentColor={C.tasks}
            accentBg={C.tasksLight}
          />
        </View>

        {/* Assign */}
        {partner && (
          <View style={sheet.section}>
            <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Assign to</Text>
            <OptionSelect
              options={[
                { value: 'either', label: 'Either', icon: 'users' },
                { value: currentUserId ?? '', label: 'Me', icon: 'user' },
                { value: partner.id, label: partner.displayName?.split(' ')[0] ?? 'Partner', icon: 'heart' },
              ]}
              selected={assignedTo ?? 'either'}
              onSelect={(val) => setAssignedTo(val === 'either' ? null : val)}
              accentColor={C.tasks}
              accentBg={C.tasksLight}
              allowDeselect={false}
            />
          </View>
        )}

      </View>
    </ThemedSheet>
  );
}

const styles = StyleSheet.create({
  listRow: { gap: Spacing.sm, paddingRight: Spacing.md },
  listChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: Spacing.sm,
  },
  listDot: { width: 10, height: 10, borderRadius: 5 },
  listChipText: { ...Typography.captionMedium, maxWidth: 120 },
  emptyListHint: { ...Typography.captionMedium },
  selectionHint: { ...Typography.captionMedium, marginTop: 2 },
});
