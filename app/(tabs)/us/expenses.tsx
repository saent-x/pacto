import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, isAfter, parseISO, startOfMonth, subDays } from 'date-fns';
import {
  ActionEmptyState,
  Bucket,
  BucketedList,
  HeaderBrand,
  SegmentedTabs,
  StatBar,
  SwipeableRow,
} from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { useExpenses } from '@/src/hooks/useExpenses';
import { useSession } from '@/src/hooks/useSession';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { findCurrency, usePreferences } from '@/src/lib/preferences';

type ExpenseRow = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  paidBy: string;
  paidByName: string;
  paidByColor: string;
  isMine: boolean;
  isSettled: boolean;
  createdAt: number;
};

type FilterKey = 'all' | 'mine' | 'theirs' | 'unsettled' | 'settled';

function fmtMoney(amount: number, currencyCode: string) {
  const c = findCurrency(currencyCode);
  const body = Math.round(amount).toLocaleString('en-US');
  return `${c.symbol}${body}`;
}

export default function ExpensesScreen() {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, partner, mode, members } = useSession();
  const { expenses, remove, settle } = useExpenses();
  const { currencyCode } = usePreferences();

  const [filter, setFilter] = useState<FilterKey>('all');

  const userId = user?.id ?? '';
  const partnerId = partner?.id ?? '';
  const partnerName = partner?.displayName ?? null;

  const eyebrowLabel =
    mode === 'solo' ? 'ME' : mode === 'crew' ? 'CREW' : 'US';

  const authorMeta = (id: string): { name: string; color: string } => {
    if (id === userId)
      return {
        name: (user?.displayName ?? 'You').split(' ')[0],
        color: C.accent,
      };
    if (id === partnerId)
      return {
        name: (partnerName ?? 'Partner').split(' ')[0],
        color: C.accent2,
      };
    const m = members.find((mm) => mm.id === id);
    return {
      name: m?.displayName?.split(' ')[0] ?? 'Member',
      color: C.accent3,
    };
  };

  const rows = useMemo<ExpenseRow[]>(() => {
    return expenses.map((raw: any): ExpenseRow => {
      const paidBy = String(raw.paidBy ?? '');
      const meta = authorMeta(paidBy);
      return {
        id: String(raw.id),
        title: String(raw.title ?? ''),
        amount: Number(raw.amount ?? 0),
        currency: String(raw.currency ?? 'USD'),
        category: String(raw.category ?? 'general'),
        date: String(raw.date ?? ''),
        paidBy,
        paidByName: meta.name,
        paidByColor: meta.color,
        isMine: paidBy === userId,
        isSettled: !!raw.isSettled,
        createdAt: Number(raw.createdAt ?? 0),
      };
    });
  }, [expenses, userId, partnerId, partnerName, user?.displayName]);

  const stats = useMemo(() => {
    const total = rows.length;
    const settledCount = rows.filter((r) => r.isSettled).length;
    const unsettled = total - settledCount;
    const youPaid = rows
      .filter((r) => r.isMine && !r.isSettled)
      .reduce((s, r) => s + r.amount, 0);
    const theyPaid = rows
      .filter((r) => !r.isMine && !r.isSettled)
      .reduce((s, r) => s + r.amount, 0);
    // Even-split balance: positive = they owe you, negative = you owe them.
    const balance = (youPaid - theyPaid) / 2;
    return { total, settled: settledCount, unsettled, youPaid, theyPaid, balance };
  }, [rows]);

  const visible = useMemo(() => {
    return rows.filter((r) => {
      if (filter === 'mine') return r.isMine;
      if (filter === 'theirs') return !r.isMine;
      if (filter === 'unsettled') return !r.isSettled;
      if (filter === 'settled') return r.isSettled;
      return true;
    });
  }, [rows, filter]);

  const buckets = useMemo<Bucket<ExpenseRow>[]>(() => {
    const now = new Date();
    const weekAgo = subDays(now, 7);
    const monthStart = startOfMonth(now);

    const groups: Record<string, ExpenseRow[]> = {
      'This week': [],
      'This month': [],
      Earlier: [],
    };
    for (const r of visible) {
      const d = r.date ? parseISO(r.date) : new Date(r.createdAt);
      if (isAfter(d, weekAgo)) groups['This week'].push(r);
      else if (isAfter(d, monthStart)) groups['This month'].push(r);
      else groups.Earlier.push(r);
    }

    const order = ['This week', 'This month', 'Earlier'];
    const dotMap: Record<string, string> = {
      'This week': C.accent,
      'This month': C.accent2,
      Earlier: C.ink3,
    };
    return order
      .filter((k) => groups[k]?.length)
      .map((k) => ({
        label: k,
        dotColor: dotMap[k],
        rows: groups[k].slice().sort((a, b) => b.createdAt - a.createdAt),
      }));
  }, [visible, C.accent, C.accent2, C.ink3]);

  const filterOptions: { key: FilterKey; label: string }[] =
    mode === 'solo'
      ? [
          { key: 'all', label: 'All' },
          { key: 'unsettled', label: 'Open' },
          { key: 'settled', label: 'Settled' },
        ]
      : [
          { key: 'all', label: 'All' },
          { key: 'mine', label: 'Mine' },
          { key: 'theirs', label: 'Theirs' },
          { key: 'unsettled', label: 'Open' },
          { key: 'settled', label: 'Settled' },
        ];

  const settleUpLabel = (() => {
    if (mode === 'solo' || stats.unsettled === 0) return 'No open expenses';
    if (Math.abs(stats.balance) < 0.5) return "You're even";
    if (stats.balance > 0)
      return `${partnerName?.split(' ')[0] ?? 'They'} owes you`;
    return `You owe ${partnerName?.split(' ')[0] ?? 'them'}`;
  })();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerShadowVisible: false,
          headerBackground: () => null,
          headerTintColor: C.inkColor,
          title: '',
          headerTitleAlign: 'center',
          headerTitle: () => (
            <HeaderBrand eyebrow={eyebrowLabel} title="expenses" />
          ),
          headerLeft: () => (
            <PressScale
              onPress={() => router.back()}
              hitSlop={12}
              style={{ padding: 4 }}
            >
              <Icon name="chevronLeft" size={22} color={C.inkColor} strokeWidth={2.2} />
            </PressScale>
          ),
          headerRight: () => (
            <PressScale
              onPress={() => router.push('/sheets/new-expense' as any)}
              hitSlop={12}
              style={{ padding: 4 }}
            >
              <Icon name="plus" size={22} color={C.inkColor} strokeWidth={2.2} />
            </PressScale>
          ),
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — slim settle-up row */}
        <View style={styles.heroWrap}>
          <StatBar
            eyebrow={settleUpLabel.toUpperCase()}
            meta={`${stats.unsettled} OPEN · ${stats.settled} SETTLED`}
            primary={
              <>
                <Text
                  style={[Typography.pixelHeroSm, { color: C.inkColor }]}
                  numberOfLines={1}
                >
                  {fmtMoney(Math.abs(stats.balance), currencyCode)}
                </Text>
                <PressScale
                  onPress={() => router.push('/sheets/currency' as any)}
                  hitSlop={6}
                  style={styles.currencyChip}
                >
                  <Text style={[Typography.eyebrowSm, { color: C.ink2, fontSize: 9.5 }]}>
                    {currencyCode}
                  </Text>
                  <Icon name="chevronDown" size={11} color={C.ink2} strokeWidth={2.2} />
                </PressScale>
                {mode !== 'solo' &&
                stats.unsettled > 0 &&
                Math.abs(stats.balance) >= 0.5 ? (
                  <View style={styles.directionInline}>
                    <Text
                      style={[
                        Typography.eyebrowSm,
                        { color: stats.balance < 0 ? C.accent : C.ink3 },
                      ]}
                    >
                      {(user?.displayName ?? 'YOU').charAt(0).toUpperCase()}
                    </Text>
                    <Icon
                      name="arrowRight"
                      size={12}
                      color={C.ink3}
                      strokeWidth={2.4}
                      style={
                        stats.balance > 0
                          ? { transform: [{ scaleX: -1 }] }
                          : undefined
                      }
                    />
                    <Text
                      style={[
                        Typography.eyebrowSm,
                        { color: stats.balance > 0 ? C.accent2 : C.ink3 },
                      ]}
                    >
                      {(partnerName ?? 'P').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </>
            }
          />
        </View>

        {/* Filter pills */}
        <View style={styles.filterRow}>
          <SegmentedTabs<FilterKey>
            value={filter}
            onChange={setFilter}
            options={filterOptions.map((f) => ({
              key: f.key,
              label:
                f.key === 'theirs' && partnerName
                  ? `${partnerName.split(' ')[0]}'s`
                  : f.label,
            }))}
          />
        </View>

        {/* Bucketed list */}
        <View style={styles.listWrap}>
          {buckets.length === 0 ? (
            <ActionEmptyState
              icon="creditCard"
              title="No expenses yet"
              body="Log a shared cost — split it evenly or call out who paid."
              actionLabel="New expense"
              onAction={() => router.push('/sheets/new-expense' as any)}
            />
          ) : (
            <BucketedList
              buckets={buckets}
              rowKey={(e) => e.id}
              renderRow={(e) => (
                <SwipeableRow
                  deleteTitle="Delete expense?"
                  deleteMessage={`"${e.title}" will be removed.`}
                  onEdit={() =>
                    router.push(`/sheets/new-expense?id=${e.id}` as any)
                  }
                  onDelete={() => remove(e.id)}
                >
                  <View style={[styles.row, { backgroundColor: C.bgCard }]}>
                    <View
                      style={[
                        styles.amountTile,
                        {
                          backgroundColor: e.isSettled
                            ? C.bgSoft
                            : e.isMine
                            ? C.accentSoft
                            : C.accent2Soft,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontFamily: Typography.pixelFont,
                          fontSize: 14,
                          color: e.isSettled
                            ? C.ink3
                            : e.isMine
                            ? C.accent
                            : C.accent2,
                        }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.5}
                      >
                        {fmtMoney(e.amount, e.currency)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.rowHead}>
                        <Text
                          style={[
                            Typography.bodyMedium,
                            {
                              color: e.isSettled ? C.ink3 : C.inkColor,
                              flex: 1,
                              textDecorationLine: e.isSettled
                                ? 'line-through'
                                : 'none',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {e.title}
                        </Text>
                        <Text
                          style={[
                            Typography.eyebrowSm,
                            { color: e.paidByColor, fontSize: 9.5 },
                          ]}
                        >
                          {e.paidByName.toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Text style={[Typography.mono, { color: C.ink3, fontSize: 11 }]}>
                          {e.date
                            ? format(parseISO(e.date), 'MMM d')
                            : format(new Date(e.createdAt), 'MMM d')}
                        </Text>
                        <Text style={[Typography.eyebrowSm, { color: C.ink3, fontSize: 9.5 }]}>
                          · {e.category.toUpperCase()}
                        </Text>
                        {!e.isSettled && e.isMine ? (
                          <PressScale
                            hitSlop={6}
                            onPress={() => settle(e.id)}
                            style={[
                              styles.settleChip,
                              { backgroundColor: C.bgSoft, borderColor: C.lineColor },
                            ]}
                          >
                            <Icon
                              name="check"
                              size={10}
                              color={C.accent}
                              strokeWidth={2.6}
                            />
                            <Text
                              style={[
                                Typography.eyebrowSm,
                                { color: C.accent, fontSize: 9 },
                              ]}
                            >
                              SETTLE
                            </Text>
                          </PressScale>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </SwipeableRow>
              )}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 6,
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  directionInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
  },
  filterRow: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 14,
    gap: 6,
  },
  listWrap: {
    paddingHorizontal: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  amountTile: {
    minWidth: 64,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  settleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    marginLeft: 'auto',
  },
});
