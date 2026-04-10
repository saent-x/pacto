import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, ScrollView } from 'react-native';
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
import { Task, TaskList } from '@/src/types/database';

const PRIORITIES = [
  { value: 1, label: 'Low', icon: 'minus' as const },
  { value: 2, label: 'Med', icon: 'alert-circle' as const },
  { value: 3, label: 'High', icon: 'alert-triangle' as const },
];

type TaskComposerList = Pick<TaskList, 'id' | 'name' | 'icon' | 'color'>;
type TaskComposerTask = Pick<Task, 'title' | 'notes' | 'due_date' | 'priority' | 'assigned_to' | 'list_id'>;
export const AUTO_CREATE_TASK_LIST_ID = '__auto_create_first_list__';

export type TaskComposerSaveInput = {
  title: string;
  notes: string | null;
  due_date: string | null;
  priority: number;
  assigned_to: string | null;
  list_id: string;
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
    task?.list_id ??
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
  const currentUserId = profile?._id ?? null;

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

  const glassBg = mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const glassBorder = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const activeBg = C.tasksLight;

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
        list_id: listId,
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
      style={[styles.saveBtn, { backgroundColor: C.tasks }]}
    >
      <Feather name={isEdit ? 'check' : 'plus'} size={18} color={C.ink} />
      <Text style={[styles.saveBtnText, { color: C.ink }]}>
        {saving ? 'Saving...' : isEdit ? 'Update Task' : 'Add Task'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ThemedSheet sheetRef={sheetRef} snapPoints={['84%']} scrollable footer={footer}>
      <View style={styles.form}>
        <View style={styles.dateHeader}>
          <Text style={[styles.sheetLabel, { color: C.tasks }]}>
            {isEdit ? 'EDIT TASK' : 'NEW TASK'}
          </Text>
          <Text style={[styles.dateDisplay, { color: C.primary }]}>
            {dueDate ? format(dueDate, 'EEEE, MMMM d') : 'No deadline yet'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>List</Text>
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
          style={[styles.titleInput, { color: C.text }]}
          placeholder="What needs doing?"
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
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Due date */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Due date</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={[styles.glassPill, { backgroundColor: glassBg, borderColor: glassBorder }]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowDatePicker((current) => !current);
              }}
            >
              <Feather name="calendar" size={15} color={C.tasks} />
              <Text style={[styles.glassPillText, { color: C.text }]}>
                {dueDate ? format(dueDate, 'MMM d, yyyy') : 'No date'}
              </Text>
            </TouchableOpacity>
            {dueDate && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setDueDate(null);
                }}
                style={[styles.clearBtn, { backgroundColor: glassBg, borderColor: glassBorder }]}
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
                    { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.tasks : glassBorder },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPriority(priority === p.value ? 0 : p.value);
                  }}
                >
                  <Feather name={p.icon} size={14} color={active ? C.tasks : C.fog} />
                  <Text style={[styles.toggleText, { color: active ? C.tasks : C.haze }]}>
                    {p.label}
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
                { value: null, label: 'Either', icon: 'users' as const },
                { value: currentUserId, label: 'Me', icon: 'user' as const },
                { value: partner._id, label: partner.displayName?.split(' ')[0] ?? 'Partner', icon: 'heart' as const },
              ].map((opt) => {
                const active = assignedTo === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[
                      styles.glassToggle,
                      { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.tasks : glassBorder },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setAssignedTo(opt.value);
                    }}
                  >
                    <Feather name={opt.icon} size={14} color={active ? C.tasks : C.fog} />
                    <Text style={[styles.toggleText, { color: active ? C.tasks : C.haze }]}>
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
  form: { gap: Spacing.lg },
  dateHeader: { gap: Spacing.xs },
  sheetLabel: { ...Typography.overline, letterSpacing: 3 },
  dateDisplay: { ...Typography.overline, letterSpacing: 1.5 },
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
  titleInput: { ...Typography.title, padding: 0 },
  bodyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.lg,
  },
  bodyInput: {
    ...Typography.body,
    minHeight: 84,
    lineHeight: 24,
    textAlignVertical: 'top',
    padding: 0,
  },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.overline, letterSpacing: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  glassPillText: { ...Typography.captionMedium },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  toggleRow: { flexDirection: 'row', gap: Spacing.sm },
  glassToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toggleText: { ...Typography.captionMedium, fontSize: 13 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveBtnText: { ...Typography.subheading, fontSize: 15 },
});
