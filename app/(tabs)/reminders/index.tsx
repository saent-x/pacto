import { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { format, isPast, isToday } from 'date-fns';
import { useColors } from '@/src/hooks/useColors';
import { useReminders } from '@/src/hooks/useReminders';
import { useAuthStore } from '@/src/stores/authStore';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { EmptyState } from '@/src/components/ui';
import { CreateReminderSheet } from '@/src/components/reminders/CreateReminderSheet';
import { Reminder } from '@/src/types/database';



type Filter = 'all' | 'mine' | 'partner';

export default function RemindersScreen() {
  const C = useColors();
  const userId = useAuthStore((s) => s.user?.id);
  const { upcoming, completed, isLoading, create, update, toggleComplete, remove } = useReminders();

  const sheetRef = useRef<BottomSheetModal>(null);
  const [editingReminder, setEditingReminder] = useState<Reminder | undefined>();
  const [filter, setFilter] = useState<Filter>('all');
  const [showCompleted, setShowCompleted] = useState(false);

  const filtered = upcoming.filter((r) => {
    if (filter === 'mine') return r.created_by === userId || r.assigned_to === userId;
    if (filter === 'partner') return r.created_by !== userId;
    return true;
  });

  const handleSave = async (data: any) => {
    if (editingReminder) {
      await update(editingReminder.id, data);
    } else {
      await create(data);
    }
    setEditingReminder(undefined);
  };

  const openCreate = () => {
    setEditingReminder(undefined);
    sheetRef.current?.present();
  };

  const openEdit = (r: Reminder) => {
    setEditingReminder(r);
    sheetRef.current?.present();
  };

  const handleToggle = (r: Reminder) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleComplete(r);
  };

  const renderItem = ({ item }: { item: Reminder }) => {
    const overdue = !item.is_completed && isPast(new Date(item.due_at)) && !isToday(new Date(item.due_at));
    return (
      <TouchableOpacity
        style={[styles.reminderRow, { borderBottomColor: C.border }]}
        activeOpacity={0.7}
        onPress={() => openEdit(item)}
      >
        <TouchableOpacity
          onPress={() => handleToggle(item)}
          style={[
            styles.checkbox,
            { borderColor: item.is_completed ? C.reminders : C.dusk },
            item.is_completed && { backgroundColor: C.reminders },
          ]}
        >
          {item.is_completed && <Feather name="check" size={14} color={C.ink} />}
        </TouchableOpacity>
        <View style={styles.reminderBody}>
          <Text
            style={[
              styles.reminderTitle,
              { color: item.is_completed ? C.textTertiary : C.text },
              item.is_completed && styles.strikethrough,
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={[styles.reminderDate, { color: overdue ? C.error : C.textTertiary }]}>
            {format(new Date(item.due_at), 'MMM d, h:mm a')}
          </Text>
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
  };

  const hasItems = upcoming.length > 0 || completed.length > 0;

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: C.surface }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: C.text }]}>Reminders</Text>
            <TouchableOpacity onPress={openCreate} style={[styles.addBtn, { backgroundColor: C.primaryMuted }]}>
              <Feather name="plus" size={18} color={C.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.filterRow}>
            {(['all', 'mine', 'partner'] as Filter[]).map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.filterPill,
                  { borderColor: filter === f ? C.reminders : C.dusk },
                  filter === f && { backgroundColor: C.remindersLight },
                ]}
              >
                <Text style={[styles.filterText, { color: filter === f ? C.reminders : C.haze }]}>
                  {f === 'all' ? 'All' : f === 'mine' ? 'Mine' : "Partner's"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {!hasItems && !isLoading ? (
          <EmptyState
            icon="bell"
            title="No reminders yet"
            description="Create shared reminders so you never forget what matters."
            actionLabel="Add Reminder"
            onAction={openCreate}
          />
        ) : (
          <FlashList
            data={filtered}
            renderItem={renderItem}

            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={
              completed.length > 0 ? (
                <View style={styles.completedSection}>
                  <TouchableOpacity
                    onPress={() => setShowCompleted(!showCompleted)}
                    style={styles.completedToggle}
                  >
                    <Text style={[styles.completedLabel, { color: C.textTertiary }]}>
                      Completed ({completed.length})
                    </Text>
                    <Feather name={showCompleted ? 'chevron-up' : 'chevron-down'} size={14} color={C.textTertiary} />
                  </TouchableOpacity>
                  {showCompleted && completed.map((item) => (
                    <View key={item.id}>
                      {renderItem({ item })}
                    </View>
                  ))}
                </View>
              ) : null
            }
          />
        )}

        <CreateReminderSheet
          sheetRef={sheetRef}
          onSave={handleSave}
          reminder={editingReminder}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },

  header: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: { ...Typography.title },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: { flexDirection: 'row', gap: Spacing.sm },
  filterPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterText: { ...Typography.small, fontWeight: '500' },

  listContent: { paddingBottom: 120 },

  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderBody: { flex: 1 },
  reminderTitle: { ...Typography.body, marginBottom: 2 },
  strikethrough: { textDecorationLine: 'line-through' },
  reminderDate: { ...Typography.small },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },

  completedSection: { paddingTop: Spacing.xl },
  completedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
  },
  completedLabel: { ...Typography.captionMedium },

});
