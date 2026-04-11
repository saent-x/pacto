import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { FlashList } from "@shopify/flash-list";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { useColors } from "@/src/hooks/useColors";
import { useSession } from "@/src/hooks/useSession";
import { useExpenses } from "@/src/hooks/useExpenses";
import { Typography } from "@/src/constants/typography";
import { Spacing, BorderRadius } from "@/src/constants/spacing";
import { MiniDateRail } from "@/src/components/calendar/MiniDateRail";
import { EmptyState } from "@/src/components/ui";
import { CreateExpenseSheet } from "@/src/components/expenses/CreateExpenseSheet";
import { matchesSelectedDate } from "@/src/lib/togetherDateFilter";
import {
  togetherItemContainerStyle,
  togetherListContainerStyle,
} from "./_itemStyles";

type ExpenseItem = {
  _id: string;
  title: string;
  amount: number;
  paidBy: string;
  currency: string;
  splitType: string;
  category: string;
  date: string;
  isSettled: boolean;
  createdAt: number;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatAmount(n: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function summarizeByCurrency(items: ExpenseItem[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.currency] = (acc[item.currency] ?? 0) + item.amount;
    return acc;
  }, {});
}

export default function ExpensesScreen() {
  const C = useColors();
  const router = useRouter();
  const { activeCouple, profile } = useSession();
  const { unsettled, settled, create, update, remove, settle, refetch } =
    useExpenses();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [settledOpen, setSettledOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<
    ExpenseItem | undefined
  >();

  const partner = activeCouple?.partner ?? null;
  const currentUserId = profile?._id ?? null;
  const filteredUnsettled = unsettled.filter((item) =>
    matchesSelectedDate(item.date, selectedDate),
  );
  const filteredSettled = settled.filter((item) =>
    matchesSelectedDate(item.date, selectedDate),
  );

  const unsettledTotals = summarizeByCurrency(filteredUnsettled as ExpenseItem[]);

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
      currency: string;
      splitType: string;
      category: string;
      date: string;
    }) => {
      const payload = {
        title: data.title,
        amount: data.amount,
        paidBy: data.paidBy,
        currency: data.currency,
        splitType: data.splitType,
        category: data.category,
        date: data.date,
      };

      if (editingExpense) {
        await update(editingExpense._id, payload);
        setEditingExpense(undefined);
        return;
      }

      await create(payload);
    },
    [create, editingExpense, update],
  );

  const handleSettle = useCallback(
    async (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        await settle(id);
      } catch {
        Alert.alert("Error", "Could not settle expense.");
      }
    },
    [settle],
  );

  const getPaidByName = (paidBy: string) => {
    if (paidBy === currentUserId) return "You";
    if (paidBy === partner?._id)
      return partner?.displayName?.split(" ")[0] ?? "Partner";
    return "Unknown";
  };

  const handleDelete = useCallback(
    (item: ExpenseItem) => {
      Alert.alert("Delete expense", `Remove "${item.title}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await remove(item._id);
            } catch {
              Alert.alert("Error", "Could not delete expense.");
            }
          },
        },
      ]);
    },
    [remove],
  );

  const openComposer = useCallback((item?: ExpenseItem) => {
    setEditingExpense(item);
    sheetRef.current?.present();
  }, []);

  const renderEditAction = useCallback(
    (item: ExpenseItem) => () => (
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: C.primary }]}
        onPress={() => openComposer(item)}
      >
        <Feather name="edit-3" size={18} color="#fff" />
      </TouchableOpacity>
    ),
    [C.primary, openComposer],
  );

  const renderDeleteAction = useCallback(
    (item: ExpenseItem) => () => (
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: C.error }]}
        onPress={() => handleDelete(item)}
      >
        <Feather name="trash-2" size={18} color="#fff" />
      </TouchableOpacity>
    ),
    [C.error, handleDelete],
  );

  const getCategoryEmoji = (category: string) => {
    const map: Record<string, string> = {
      "Date night": "\u{1F37D}\uFE0F",
      "Our place": "\u{1F3E0}",
      Trip: "\u2708\uFE0F",
      Surprise: "\u{1F381}",
      Groceries: "\u{1F6D2}",
    };
    return map[category] ?? "\u{1F4B0}";
  };

  const headerComponent = (
    <View>
      {/* Total unsettled */}
      {filteredUnsettled.length > 0 && (
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <View
            style={[
              styles.totalCard,
              { backgroundColor: C.card, borderColor: C.border },
            ]}
          >
            <Text style={[styles.totalLabel, { color: C.textTertiary }]}>
              Open balances
            </Text>
            <View style={styles.totalSummaryList}>
              {Object.entries(unsettledTotals).map(([currency, total]) => (
                <View
                  key={currency}
                  style={[
                    styles.totalSummaryChip,
                    { backgroundColor: C.expensesLight },
                  ]}
                >
                  <Text
                    style={[styles.totalSummaryCode, { color: C.expenses }]}
                  >
                    {currency}
                  </Text>
                  <Text style={[styles.totalSummaryValue, { color: C.text }]}>
                    {formatAmount(total, currency)}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={[styles.totalSub, { color: C.textTertiary }]}>
              {filteredUnsettled.length} unsettled item
              {filteredUnsettled.length !== 1 ? "s" : ""} across your shared spending.
            </Text>
          </View>
        </Animated.View>
      )}

      {filteredUnsettled.length > 0 && (
        <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>
          OPEN
        </Text>
      )}
    </View>
  );

  const footerComponent = (
    <View>
      {filteredSettled.length > 0 && (
        <View style={styles.settledSection}>
          <TouchableOpacity
            style={styles.settledToggle}
            onPress={() => {
              Haptics.selectionAsync();
              setSettledOpen((o) => !o);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.sectionLabel,
                { color: C.textTertiary, marginBottom: 0 },
              ]}
            >
              SETTLED ({filteredSettled.length})
            </Text>
            <Feather
              name={settledOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color={C.textTertiary}
            />
          </TouchableOpacity>

          {settledOpen &&
            filteredSettled.map((item, i) => (
              <Animated.View
                key={item._id}
                entering={FadeInDown.duration(300).delay(i * 50)}
              >
                <View
                  style={[
                    togetherItemContainerStyle,
                    styles.expenseCard,
                    styles.settledCard,
                    { backgroundColor: C.card, opacity: 0.6 },
                  ]}
                >
                  <View style={styles.cardLeft}>
                    <Text style={styles.emoji}>
                      {getCategoryEmoji(item.category)}
                    </Text>
                    <View style={styles.cardInfo}>
                      <Text
                        style={[styles.cardTitle, { color: C.textSecondary }]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[styles.cardMeta, { color: C.textTertiary }]}
                      >
                        Paid by {getPaidByName(item.paidBy)} ·{" "}
                        {formatDate(item.date)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.cardAmount, { color: C.textTertiary }]}>
                    {formatAmount(item.amount, item.currency)}
                  </Text>
                </View>
              </Animated.View>
            ))}
        </View>
      )}

      <View style={{ height: 120 }} />
    </View>
  );

  if (unsettled.length === 0 && settled.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
        <SafeAreaView style={styles.flex} edges={["top"]}>
          <MiniDateRail
            title="Our Expenses"
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            accentColor={C.expenses}
            onPressLeading={() => {
              Haptics.selectionAsync();
              router.replace("/(tabs)/together");
            }}
          />

          <View style={styles.emptyWrap}>
            <EmptyState
              title="No expenses yet"
              description="Start tracking your adventures together"
            />
          </View>

          {/* FAB */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              openComposer();
            }}
            activeOpacity={0.85}
            style={[styles.floatingFab, { backgroundColor: C.expenses }]}
          >
            <Feather name="plus" size={22} color={C.ink} />
          </TouchableOpacity>

          <CreateExpenseSheet
            sheetRef={sheetRef}
            onSave={handleCreate}
            expense={
              editingExpense
                ? {
                    id: editingExpense._id,
                    title: editingExpense.title,
                    amount: editingExpense.amount,
                    paidBy: editingExpense.paidBy,
                    currency: editingExpense.currency,
                    splitType: editingExpense.splitType,
                    category: editingExpense.category,
                    date: editingExpense.date,
                  }
                : undefined
            }
          />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
      <SafeAreaView style={styles.flex} edges={["top"]}>
        <MiniDateRail
          title="Our Expenses"
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          accentColor={C.expenses}
          onPressLeading={() => {
            Haptics.selectionAsync();
            router.replace("/(tabs)/together");
          }}
        />

        {filteredUnsettled.length === 0 && filteredSettled.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              title="No expenses on this date"
              description="Pick another day or clear the date filter."
            />
          </View>
        ) : (
          <FlashList
            data={filteredUnsettled}
            keyExtractor={(item) => item._id}
            contentContainerStyle={[
              styles.listContent,
              togetherListContainerStyle,
            ]}
            ListHeaderComponent={headerComponent}
            ListFooterComponent={footerComponent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={C.primary}
              />
            }
            renderItem={({ item, index }) => {
            const row = (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => openComposer(item)}
                style={[
                  togetherItemContainerStyle,
                  styles.expenseCard,
                  { backgroundColor: C.card },
                ]}
              >
                <View style={styles.cardLeft}>
                  <Text style={styles.emoji}>
                    {getCategoryEmoji(item.category)}
                  </Text>
                  <View style={styles.cardInfo}>
                    <Text
                      style={[styles.cardTitle, { color: C.text }]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={[styles.cardMeta, { color: C.textTertiary }]}>
                      Paid by {getPaidByName(item.paidBy)} ·{" "}
                      {formatDate(item.date)} · {item.currency}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.cardAmount, { color: C.expenses }]}>
                    {formatAmount(item.amount, item.currency)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleSettle(item._id)}
                    style={[
                      styles.settleBtn,
                      { backgroundColor: C.expensesLight },
                    ]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Feather name="check" size={14} color={C.expenses} />
                    <Text style={[styles.settleBtnText, { color: C.expenses }]}>
                      Settle
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );

            return (
              <Animated.View
                entering={FadeInDown.duration(400).delay(150 + index * 50)}
              >
                <Swipeable
                  renderLeftActions={renderEditAction(item)}
                  renderRightActions={renderDeleteAction(item)}
                  overshootLeft={false}
                  overshootRight={false}
                  friction={2}
                >
                  {row}
                </Swipeable>
              </Animated.View>
            );
            }}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            openComposer();
          }}
          activeOpacity={0.85}
          style={[styles.floatingFab, { backgroundColor: C.expenses }]}
        >
          <Feather name="plus" size={22} color={C.ink} />
        </TouchableOpacity>

        <CreateExpenseSheet
          sheetRef={sheetRef}
          onSave={handleCreate}
          expense={
            editingExpense
              ? {
                  id: editingExpense._id,
                  title: editingExpense.title,
                  amount: editingExpense.amount,
                  paidBy: editingExpense.paidBy,
                  currency: editingExpense.currency,
                  splitType: editingExpense.splitType,
                  category: editingExpense.category,
                  date: editingExpense.date,
                }
              : undefined
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  listContent: {
    paddingBottom: 120,
  },
  emptyWrap: {
    paddingHorizontal: Spacing["2xl"],
    height: 400,
  },

  // Total card
  totalCard: {
    padding: Spacing.xl,
    alignItems: "flex-start",
    marginBottom: Spacing["2xl"],
  },
  totalLabel: {
    ...Typography.overline,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  totalSummaryList: {
    width: "100%",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  totalSummaryChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  totalSummaryCode: {
    ...Typography.captionMedium,
    letterSpacing: 0.8,
  },
  totalSummaryValue: {
    ...Typography.subheading,
  },
  totalSub: {
    ...Typography.caption,
  },

  // Section labels
  sectionLabel: {
    ...Typography.overline,
    letterSpacing: 2,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing["2xl"],
  },

  // Expense card
  expenseCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    marginBottom: Spacing.sm,
  },
  settledCard: {
    marginBottom: Spacing.xs,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  cardAmount: {
    ...Typography.subheading,
    fontSize: 16,
  },
  settleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  settleBtnText: {
    ...Typography.captionMedium,
  },

  // Settled section
  settledSection: {
    marginTop: Spacing.lg,
  },
  settledToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  swipeAction: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingFab: {
    position: "absolute",
    bottom: 100,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
