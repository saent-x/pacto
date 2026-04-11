import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { useColors } from '@/src/hooks/useColors';
import { useTaskItems, useTasks } from '@/src/hooks/useTasks';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { CreateTaskSheet, type TaskComposerSaveInput } from '@/src/components/tasks/CreateTaskSheet';
import {
  saveTaskFromListDetail,
} from '@/src/components/tasks/listDetailComposer';
import { Task } from '@/src/types/database';

export default function TaskListDetailScreen() {
  const C = useColors();
  const router = useRouter();
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const currentListId = listId!;
  const { lists } = useTasks();
  const { tasks, counts, create, update, toggleComplete } = useTaskItems(currentListId);

  const sheetRef = useRef<BottomSheetModal>(null);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [quickAdd, setQuickAdd] = useState('');
  const [pendingTaskIds, setPendingTaskIds] = useState<Record<string, true>>({});
  const [quickAdding, setQuickAdding] = useState(false);
  const [savingTask, setSavingTask] = useState(false);

  const handleQuickAdd = async () => {
    if (!quickAdd.trim() || quickAdding) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuickAdding(true);
    try {
      await create({ title: quickAdd.trim() });
      setQuickAdd('');
    } finally {
      setQuickAdding(false);
    }
  };

  const handleToggle = async (task: Task) => {
    if (pendingTaskIds[task.id]) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPendingTaskIds((current) => ({ ...current, [task.id]: true }));
    try {
      await toggleComplete(task);
    } finally {
      setPendingTaskIds((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
    }
  };

  const handleSave = async (data: TaskComposerSaveInput) => {
    if (savingTask) return;
    setSavingTask(true);
    try {
      await saveTaskFromListDetail({ editingTask, data, create, update });
      setEditingTask(undefined);
    } finally {
      setSavingTask(false);
    }
  };

  const uncompleted = tasks.filter((t) => !t.is_completed);
  const completed = tasks.filter((t) => t.is_completed);
  const allItems = [...uncompleted, ...completed];

  const renderItem = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={[styles.taskRow, { borderBottomColor: C.border, opacity: pendingTaskIds[item.id] ? 0.6 : 1 }]}
      activeOpacity={0.7}
      disabled={!!pendingTaskIds[item.id]}
      onLongPress={() => {
        setEditingTask(item);
        sheetRef.current?.present();
      }}
    >
      <TouchableOpacity
        onPress={() => handleToggle(item)}
        disabled={!!pendingTaskIds[item.id]}
        style={[
          styles.checkbox,
          { borderColor: item.is_completed ? C.tasks : C.dusk },
          item.is_completed && { backgroundColor: C.tasks },
        ]}
      >
        {item.is_completed && <Feather name="check" size={13} color={C.ink} />}
      </TouchableOpacity>
      <View style={styles.taskBody}>
        <Text
          style={[
            styles.taskTitle,
            { color: item.is_completed ? C.textTertiary : C.text },
            item.is_completed && styles.strikethrough,
          ]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        {item.due_date && (
          <Text style={[styles.taskDue, { color: C.textTertiary }]}>
            {format(new Date(item.due_date + 'T00:00:00'), 'MMM d')}
          </Text>
        )}
      </View>
      {item.priority > 0 && (
        <View
          style={[
            styles.priorityDot,
            { backgroundColor: item.priority === 3 ? C.error : item.priority === 2 ? C.warning : C.haze },
          ]}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: C.background }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={C.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1}>
              Task List
            </Text>
            <Text style={[styles.headerCount, { color: C.textTertiary }]}>
              {counts.completed} of {counts.total} done
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setEditingTask(undefined);
              sheetRef.current?.present();
            }}
          >
            <Feather name="plus" size={20} color={C.tasks} />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressWrap, { backgroundColor: C.dim }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: C.tasks, width: `${counts.total > 0 ? (counts.completed / counts.total) * 100 : 0}%` as any },
            ]}
          />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
          keyboardVerticalOffset={88}
        >
          {/* Task list */}
          <FlashList
            data={allItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />

          {/* Quick add bar */}
          <View style={[styles.quickAdd, { backgroundColor: C.card, borderTopColor: C.border }]}>
            <TextInput
              style={[styles.quickInput, { color: C.text }]}
              placeholder="Add a task..."
              placeholderTextColor={C.fog}
              value={quickAdd}
              onChangeText={setQuickAdd}
              onSubmitEditing={handleQuickAdd}
              returnKeyType="done"
              editable={!quickAdding}
            />
            <TouchableOpacity
              onPress={handleQuickAdd}
              disabled={!quickAdd.trim() || quickAdding}
              style={[styles.quickSend, { opacity: quickAdd.trim() && !quickAdding ? 1 : 0.3 }]}
            >
              <Feather name="arrow-up" size={18} color={C.tasks} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        <CreateTaskSheet
          sheetRef={sheetRef}
          onSave={handleSave}
          task={editingTask}
          selectedListId={currentListId}
          lists={lists}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: { ...Typography.subheading },
  headerCount: { ...Typography.small },

  progressWrap: { height: 2 },
  progressFill: { height: '100%' },

  listContent: { paddingBottom: 80 },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskBody: { flex: 1 },
  taskTitle: { ...Typography.body, marginBottom: 1 },
  strikethrough: { textDecorationLine: 'line-through' },
  taskDue: { ...Typography.small },
  priorityDot: { width: 7, height: 7, borderRadius: 4 },

  quickAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  quickInput: {
    flex: 1,
    ...Typography.body,
    paddingVertical: Spacing.sm,
  },
  quickSend: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
