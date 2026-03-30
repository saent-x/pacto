import { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useColors } from '@/src/hooks/useColors';
import { useSession } from '@/src/hooks/useSession';
import { useExpenses } from '@/src/hooks/useExpenses';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { EmptyState } from '@/src/components/ui';
import { CreateExpenseSheet } from '@/src/components/expenses/CreateExpenseSheet';

type ExpenseItem = {
  _id: string;
  title: string;
  amount: number;
  paidBy: string;
  category: string;
  date: string;
  isSettled: boolean;
  createdAt: number;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatAmount(n: number) {
  return `$${n.toFixed(2)}`;
}

function getDaysUntil(dateStr: string) {
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function ExpensesScreen() {
  const C = useColors();
  const router = useRouter();
  const { activeCouple, profile } = useSession();
  const { unsettled, settled, isLoading, create, settle, refetch } = useExpenses();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [settledOpen, setSettledOpen] = useState(false);

  const partner = activeCouple?.partner ?? null;
  const currentUserId = profile?._id ?? null;

  const totalUnsettled = unsettled.reduce((sum, e) => sum + e.amount, 0);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleCreate = useCallback(
    async (data: {
      title: string;
      amount: number;
      paidBy: string;
      splitType: string;
      category: string;
      date: string;
    }) => {
      await create({
        title: data.title,
        amount: data.amount,
        splitType: data.splitType,
        category: data.category,
        date: data.date,
      });
    },
    [create],
  );

  const handleSettle = useCallback(
    async (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        await settle(id);
      } catch {
        Alert.alert('Error', 'Could not settle expense.');
      }
    },
    [settle],
  );

  const getPaidByName = (paidBy: string) => {
    if (paidBy === currentUserId) return 'You';
    if (paidBy === partner?._id) return partner?.displayName?.split(' ')[0] ?? 'Partner';
    return 'Unknown';
  };

  const getCategoryEmoji = (category: string) => {
    const map: Record<string, string> = {
      'Date night': '\u{1F37D}\uFE0F',
      'Our place': '\u{1F3E0}',
      Trip: '\u2708\uFE0F',
      Surprise: '\u{1F381}',
      Groceries: '\u{1F6D2}',
    };
    return map[category] ?? '\u{1F4B0}';
  };

  const headerComponent = (
    <View>
      {/* Total unsettled */}
      {unsettled.length > 0 && (
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <View style={[styles.totalCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.totalLabel, { color: C.textTertiary }]}>Unsettled</Text>
            <Text style={[styles.totalAmount, { color: C.expenses }]}>
              {formatAmount(totalUnsettled)}
            </Text>
            <Text style={[styles.totalSub, { color: C.textTertiary }]}>
              {unsettled.length} expense{unsettled.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </Animated.View>
      )}

      {unsettled.length > 0 && (
        <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>OPEN</Text>
      )}
    </View>
  );

  const footerComponent = (
    <View>
      {settled.length > 0 && (
        <View style={styles.settledSection}>
          <TouchableOpacity
            style={styles.settledToggle}
            onPress={() => {
              Haptics.selectionAsync();
              setSettledOpen((o) => !o);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.sectionLabel, { color: C.textTertiary, marginBottom: 0 }]}>
              SETTLED ({settled.length})
            </Text>
            <Feather
              name={settledOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={C.textTertiary}
            />
          </TouchableOpacity>

          {settledOpen &&
            settled.map((item, i) => (
              <Animated.View
                key={item._id}
                entering={FadeInDown.duration(300).delay(i * 50)}
              >
                <View
                  style={[
                    styles.expenseCard,
                    styles.settledCard,
                    { backgroundColor: C.card, borderColor: C.border, opacity: 0.6 },
                  ]}
                >
                  <View style={styles.cardLeft}>
                    <Text style={styles.emoji}>{getCategoryEmoji(item.category)}</Text>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardTitle, { color: C.textSecondary }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.cardMeta, { color: C.textTertiary }]}>
                        Paid by {getPaidByName(item.paidBy)} · {formatDate(item.date)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.cardAmount, { color: C.textTertiary }]}>
                    {formatAmount(item.amount)}
                  </Text>
                </View>
              </Animated.View>
            ))}
        </View>
      )}

      <View style={{ height: 120 }} />
    </View>
  );

  if (!isLoading && unsettled.length === 0 && settled.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: C.background }]}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                router.back();
              }}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="arrow-left" size={22} color={C.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: C.text }]}>Our Expenses</Text>
            <View style={{ width: 40 }} />
          </View>

          <EmptyState
            icon="dollar-sign"
            title="No expenses yet"
            description="Start tracking your adventures together"
            actionLabel="Add Expense"
            onAction={() => sheetRef.current?.present()}
          />

          {/* FAB */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              sheetRef.current?.present();
            }}
            activeOpacity={0.85}
            style={[styles.floatingFab, { backgroundColor: C.expenses }]}
          >
            <Feather name="plus" size={22} color={C.ink} />
          </TouchableOpacity>

          <CreateExpenseSheet sheetRef={sheetRef} onSave={handleCreate} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              router.back();
            }}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="arrow-left" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.text }]}>Our Expenses</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlashList
          data={unsettled}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={headerComponent}
          ListFooterComponent={footerComponent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(400).delay(150 + index * 50)}>
              <View style={[styles.expenseCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={styles.cardLeft}>
                  <Text style={styles.emoji}>{getCategoryEmoji(item.category)}</Text>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.cardMeta, { color: C.textTertiary }]}>
                      Paid by {getPaidByName(item.paidBy)} · {formatDate(item.date)}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.cardAmount, { color: C.expenses }]}>
                    {formatAmount(item.amount)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleSettle(item._id)}
                    style={[styles.settleBtn, { backgroundColor: C.expensesLight }]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Feather name="check" size={14} color={C.expenses} />
                    <Text style={[styles.settleBtnText, { color: C.expenses }]}>Settle</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}
        />

        {/* FAB */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            sheetRef.current?.present();
          }}
          activeOpacity={0.85}
          style={[styles.floatingFab, { backgroundColor: C.expenses }]}
        >
          <Feather name="plus" size={22} color={C.ink} />
        </TouchableOpacity>

        <CreateExpenseSheet sheetRef={sheetRef} onSave={handleCreate} />
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: 20,
  },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 120,
  },

  // Total card
  totalCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  totalLabel: {
    ...Typography.overline,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  totalAmount: {
    ...Typography.display,
    fontSize: 40,
    marginBottom: Spacing.xs,
  },
  totalSub: {
    ...Typography.caption,
  },

  // Section labels
  sectionLabel: {
    ...Typography.overline,
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },

  // Expense card
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  settledCard: {
    marginBottom: Spacing.xs,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  emoji: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    ...Typography.bodyMedium,
    marginBottom: 2,
  },
  cardMeta: {
    ...Typography.small,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  cardAmount: {
    ...Typography.subheading,
    fontSize: 16,
  },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  settleBtnText: {
    ...Typography.small,
    fontFamily: 'DMSans_600SemiBold',
  },

  // Settled section
  settledSection: {
    marginTop: Spacing.lg,
  },
  settledToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  floatingFab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
