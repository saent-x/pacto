import { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColors } from '@/src/hooks/useColors';
import { useTasks } from '@/src/hooks/useTasks';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { EmptyState } from '@/src/components/ui';
import { CreateListSheet } from '@/src/components/tasks/CreateListSheet';


export default function TasksScreen() {
  const C = useColors();
  const router = useRouter();
  const { lists, isLoading, getListCounts, createList } = useTasks();
  const sheetRef = useRef<BottomSheetModal>(null);

  const handleCreate = async (data: { name: string; icon: string; color: string }) => {
    await createList(data);
  };

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={[styles.header, { backgroundColor: C.surface }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: C.text }]}>Tasks</Text>
            <TouchableOpacity onPress={() => sheetRef.current?.present()} style={[styles.addBtn, { backgroundColor: C.primaryMuted }]}>
              <Feather name="plus" size={18} color={C.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {lists.length === 0 && !isLoading ? (
          <EmptyState
            icon="check-square"
            title="No task lists yet"
            description="Create shared lists for groceries, chores, and everything in between."
            actionLabel="Create List"
            onAction={() => sheetRef.current?.present()}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {lists.map((list, i) => {
              const counts = getListCounts(list.id);
              const progress = counts.total > 0 ? counts.completed / counts.total : 0;
              return (
                <Animated.View key={list.id} entering={FadeInDown.duration(400).delay(i * 80)} style={styles.cardWrap}>
                  <TouchableOpacity
                    style={[styles.listCard, { backgroundColor: C.card, borderColor: C.border }]}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/(tabs)/tasks/${list.id}` as any)}
                  >
                    <View style={[styles.listColorBar, { backgroundColor: list.color }]} />
                    <View style={styles.listBody}>
                      <View style={[styles.listIconCircle, { backgroundColor: list.color + '18' }]}>
                        <Feather name={(list.icon as any) || 'list'} size={18} color={list.color} />
                      </View>
                      <Text style={[styles.listName, { color: C.text }]} numberOfLines={1}>
                        {list.name}
                      </Text>
                      <View style={styles.listProgress}>
                        <View style={[styles.progressBar, { backgroundColor: C.dim }]}>
                          <View
                            style={[styles.progressFill, { backgroundColor: list.color, width: `${progress * 100}%` as any }]}
                          />
                        </View>
                        <Text style={[styles.listCount, { color: C.textTertiary }]}>
                          {counts.completed} of {counts.total}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>
        )}

        <CreateListSheet sheetRef={sheetRef} onSave={handleCreate} />
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
  },
  title: { ...Typography.title },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing['2xl'],
    gap: Spacing.md,
  },
  cardWrap: { width: '47%', flexGrow: 1 },
  listCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listColorBar: {
    height: 3,
  },
  listBody: {
    padding: Spacing.lg,
  },
  listIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  listName: {
    ...Typography.subheading,
    marginBottom: Spacing.md,
  },
  listProgress: {
    gap: Spacing.xs,
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  listCount: {
    ...Typography.small,
  },
});
