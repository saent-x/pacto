import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { format, parseISO } from 'date-fns';
import { Icon } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { useActionMenu } from '@/src/components/ui/ActionMenu';
import { confirmDestructive } from '@/src/lib/confirm';
import { useExpenses } from '@/src/hooks/useExpenses';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';

type ExpenseRow = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  date: string;
  splitType: string;
  splitAmount: number | null;
  paidBy: string;
};

function toRow(e: any): ExpenseRow {
  return {
    id: String(e.id),
    title: String(e.title ?? ''),
    amount: Number(e.amount ?? 0),
    currency: String(e.currency ?? 'USD'),
    date: String(e.date ?? ''),
    splitType: String(e.splitType ?? 'even'),
    splitAmount: e.splitAmount != null ? Number(e.splitAmount) : null,
    paidBy: String(e.paidBy ?? ''),
  };
}

function fmtMoney(amount: number, currency: string) {
  const abs = Math.abs(amount);
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '';
  return symbol ? `${symbol}${abs.toFixed(2)}` : `${abs.toFixed(2)} ${currency}`;
}

function formatRelativeDay(iso: string) {
  if (!iso) return '';
  const today = format(new Date(), 'yyyy-MM-dd');
  if (iso === today) return 'TODAY';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (iso === format(yesterday, 'yyyy-MM-dd')) return 'YESTERDAY';
  try {
    return format(parseISO(iso), 'EEE').toUpperCase();
  } catch {
    return iso.slice(5).toUpperCase();
  }
}

export default function Expenses() {
  const { C, F } = useTheme();
  const { user, activeCouple, isSolo } = useSession();
  const { expenses, unsettled, isLoading, settle, remove } = useExpenses();
  const actionMenu = useActionMenu();

  const openExpenseMenu = useCallback(
    (row: ExpenseRow) => {
      actionMenu.open({
        title: row.title,
        subtitle: `${fmtMoney(row.amount, row.currency)}`,
        actions: [
          {
            key: 'edit',
            label: 'Edit',
            icon: 'edit',
            onPress: () => router.push(`/sheets/new-expense?id=${row.id}` as any),
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: 'trash',
            destructive: true,
            onPress: () => {
              confirmDestructive(
                'Delete expense?',
                `"${row.title}" will be removed.`,
                () => remove(row.id),
              );
            },
          },
        ],
      });
    },
    [actionMenu, remove],
  );

  const userId = user?.id ?? '';
  const partnerName = activeCouple?.partner?.displayName ?? 'Partner';
  const partnerUpper = partnerName.toUpperCase();

  const rows = useMemo(() => expenses.map(toRow), [expenses]);
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30),
    [rows],
  );

  const balance = useMemo(() => {
    let net = 0;
    for (const r of unsettled.map(toRow)) {
      const share = r.splitType === 'even' ? r.amount / 2 : (r.splitAmount ?? r.amount / 2);
      if (r.paidBy === userId) net += share;
      else net -= share;
    }
    return net;
  }, [unsettled, userId]);

  const currency = rows[0]?.currency ?? 'USD';

  const monthStats = useMemo(() => {
    const monthKey = format(new Date(), 'yyyy-MM');
    const monthRows = rows.filter((r) => r.date.startsWith(monthKey));
    let youPaid = 0;
    let partnerPaid = 0;
    for (const r of monthRows) {
      if (r.paidBy === userId) youPaid += r.amount;
      else partnerPaid += r.amount;
    }
    const total = youPaid + partnerPaid;
    return { youPaid, partnerPaid, total };
  }, [rows, userId]);

  if (isLoading && rows.length === 0) return <IndexSkeleton />;
  if (rows.length === 0) return <EmptyExpenses />;

  const direction =
    balance > 0.005
      ? `${isSolo ? 'YOU ARE OWED' : `${partnerUpper} OWES YOU`}`
      : balance < -0.005
        ? `YOU OWE ${partnerUpper}`
        : 'ALL SETTLED';

  const youPct = monthStats.total > 0 ? (monthStats.youPaid / monthStats.total) * 100 : 50;
  const partnerPct = monthStats.total > 0 ? 100 - youPct : 50;

  const settleAll = async () => {
    if (!unsettled.length) return;
    await Promise.all(unsettled.map((e: any) => settle(String(e.id))));
  };

  const absBalance = Math.abs(balance);
  const whole = Math.floor(absBalance);
  const cents = Math.round((absBalance - whole) * 100).toString().padStart(2, '0');
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '';

  return (
    <Screen>
      <Animated.View
        entering={FadeInDown.duration(420)}
        style={{ backgroundColor: C.mint, borderRadius: 26, padding: 22, marginBottom: 18 }}
      >
        <Text
          style={{
            fontSize: 10,
            color: C.mintInk,
            fontFamily: F.bodyBold,
            letterSpacing: 1.4,
            opacity: 0.55,
            marginBottom: 6,
          }}
        >
          {direction}
        </Text>
        <Text
          style={{
            fontFamily: F.displayBold,
            fontSize: 56,
            color: C.mintInk,
            lineHeight: 50,
            letterSpacing: -2.5,
          }}
        >
          {symbol}
          {whole}
          <Text style={{ fontSize: 28, opacity: 0.6 }}>.{cents}</Text>
        </Text>
        <View style={{ marginTop: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 11, color: C.mintInk, opacity: 0.7, fontFamily: F.bodyBold }}>
            This month · {fmtMoney(monthStats.total, currency)} total
          </Text>
          {unsettled.length > 0 ? (
            <Pressable onPress={settleAll} hitSlop={8}>
              <Text
                style={{
                  fontSize: 11,
                  color: C.mintInk,
                  opacity: 0.7,
                  fontFamily: F.bodyBold,
                  letterSpacing: 0.8,
                }}
              >
                SETTLE →
              </Text>
            </Pressable>
          ) : null}
        </View>
        <View
          style={{
            marginTop: 12,
            height: 6,
            backgroundColor: 'rgba(0,0,0,0.12)',
            borderRadius: 3,
            overflow: 'hidden',
            flexDirection: 'row',
          }}
        >
          <View style={{ width: `${youPct}%`, backgroundColor: C.mintInk }} />
          <View style={{ width: `${partnerPct}%`, backgroundColor: 'rgba(15,44,26,0.45)' }} />
        </View>
        <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text
            style={{
              fontSize: 10,
              color: C.mintInk,
              opacity: 0.6,
              fontFamily: F.bodyBold,
              letterSpacing: 0.8,
            }}
          >
            YOU · {fmtMoney(monthStats.youPaid, currency)}
          </Text>
          {!isSolo ? (
            <Text
              style={{
                fontSize: 10,
                color: C.mintInk,
                opacity: 0.6,
                fontFamily: F.bodyBold,
                letterSpacing: 0.8,
              }}
            >
              {partnerUpper} · {fmtMoney(monthStats.partnerPaid, currency)}
            </Text>
          ) : null}
        </View>
      </Animated.View>

      <Text
        style={{
          fontSize: 11,
          color: C.fog,
          fontFamily: F.bodyBold,
          letterSpacing: 1.4,
          paddingLeft: 4,
          marginBottom: 10,
        }}
      >
        RECENT
      </Text>

      {sortedRows.map((x, i) => {
        const by = x.paidBy === userId ? 'YOU' : partnerName.toLowerCase();
        const splitLabel =
          x.splitType === 'even' ? '50/50' : x.splitAmount != null ? `${x.splitAmount}` : 'custom';
        const day = formatRelativeDay(x.date);
        return (
          <Animated.View
            key={x.id}
            entering={FadeInDown.delay(Math.min(i, 10) * 60 + 80).duration(400)}
            style={{ marginBottom: 8 }}
          >
          <Pressable
            testID={`expense-row-${x.id}`}
            onLongPress={() => openExpenseMenu(x)}
            delayLongPress={350}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              padding: 14,
              backgroundColor: C.card,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: C.line,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: C.mintInk,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="dollarSign" size={16} color={C.mint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: F.displayBold,
                  fontSize: 14,
                  color: C.bone,
                  letterSpacing: -0.2,
                }}
                numberOfLines={1}
              >
                {x.title}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: C.fog,
                  fontFamily: F.bodyBold,
                  marginTop: 2,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                {day} · {by} paid · {splitLabel}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: F.displayBold,
                fontSize: 16,
                color: C.bone,
                letterSpacing: -0.3,
              }}
            >
              {fmtMoney(x.amount, x.currency)}
            </Text>
          </Pressable>
          </Animated.View>
        );
      })}
    </Screen>
  );
}

function EmptyExpenses() {
  const { C, F } = useTheme();
  return (
    <Screen>
      <Pressable
        onPress={() => router.push('/sheets/new-expense' as any)}
        style={{
          marginTop: 8,
          padding: 24,
          borderRadius: 22,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: C.line,
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Icon name="dollarSign" size={22} color={C.fog} />
        <Text style={{ fontFamily: F.displayBold, fontSize: 16, color: C.mist }}>
          No shared expenses yet
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: C.fog,
            fontFamily: F.body,
            textAlign: 'center',
          }}
        >
          Track groceries, trips, bills — split any way you like.
        </Text>
      </Pressable>
    </Screen>
  );
}

function IndexSkeleton() {
  const { C } = useTheme();
  return (
    <Screen>
      <Animated.View
        entering={FadeIn.duration(300)}
        style={{
          height: 168,
          borderRadius: 26,
          backgroundColor: C.mint,
          opacity: 0.35,
          marginBottom: 22,
        }}
      />
      {[0, 1, 2, 3].map((i) => (
        <Animated.View
          key={i}
          entering={FadeIn.delay(60 + i * 60).duration(300)}
          style={{
            height: 62,
            borderRadius: 18,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            opacity: 0.55,
            marginBottom: 8,
          }}
        />
      ))}
    </Screen>
  );
}
