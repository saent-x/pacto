import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActionEmptyState,
  Bucket,
  BucketedList,
  Checkbox,
  HeaderBrand,
  SegmentedTabs,
  PriorityDot,
  StatBar,
  SwipeableRow,
} from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import {
  useAllWishlistItems,
  useQuickAddWishItem,
  type WishScope,
} from '@/src/hooks/useWishlists';
import { useSession } from '@/src/hooks/useSession';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { findCurrency, usePreferences } from '@/src/lib/preferences';

type WhoKind = 'me' | 'partner' | 'shared';
type WishRow = {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  url: string | null;
  who: WhoKind;
  authorName: string;
  authorColor: string;
  isPurchased: boolean;
  priority: number;
};

type FilterKey = 'all' | 'mine' | 'theirs' | 'open' | 'bought';

function fmtMoney(amount: number, currencyCode: string) {
  const c = findCurrency(currencyCode);
  const body = Math.round(amount).toLocaleString('en-US');
  return `${c.symbol}${body}`;
}

/** Compact money formatter — abbreviates large numbers so the hero stays readable. */
function fmtMoneyCompact(amount: number, currency: string) {
  const sym =
    currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '';
  const abs = Math.abs(amount);
  let body: string;
  if (abs >= 1_000_000) {
    body = `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
  } else if (abs >= 10_000) {
    body = `${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1)}k`;
  } else {
    body = amount.toFixed(0);
  }
  return sym ? `${sym}${body}` : `${body} ${currency}`;
}

function scopeToWho(scope: WishScope): WhoKind {
  if (scope === 'mine') return 'me';
  if (scope === 'partner') return 'partner';
  return 'shared';
}

export default function WishlistsScreen() {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, partner, mode, members } = useSession();
  const { items, isLoading } = useAllWishlistItems();
  const { remove } = useQuickAddWishItem();
  const { currencyCode } = usePreferences();

  const [filter, setFilter] = useState<FilterKey>('all');

  const userId = user?.id ?? '';
  const partnerId = partner?.id ?? '';
  const partnerName = partner?.displayName ?? null;

  const eyebrowLabel =
    mode === 'solo'
      ? 'ME'
      : mode === 'crew'
      ? 'CREW'
      : 'US';

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

  const rows = useMemo<WishRow[]>(() => {
    return items.map((raw: any): WishRow => {
      const addedBy = String(raw.addedBy ?? '');
      const scope = (raw.scope ?? 'mine') as WishScope;
      const who = scopeToWho(scope);
      const meta =
        who === 'shared'
          ? { name: 'Shared', color: C.accent3 }
          : who === 'me'
          ? authorMeta(userId || addedBy)
          : authorMeta(addedBy && addedBy !== userId ? addedBy : partnerId);
      return {
        id: String(raw.id),
        title: String(raw.title ?? ''),
        price: raw.price ?? null,
        currency: String(raw.currency ?? 'USD'),
        url: raw.url ?? null,
        who,
        authorName: meta.name,
        authorColor: meta.color,
        isPurchased: !!raw.isPurchased,
        priority: Number(raw.priority ?? 0),
      };
    });
  }, [
    items,
    userId,
    partnerId,
    partnerName,
    user?.displayName,
    members,
    C.accent,
    C.accent2,
    C.accent3,
  ]);

  const stats = useMemo(() => {
    const total = rows.length;
    const bought = rows.filter((r) => r.isPurchased).length;
    const open = total - bought;
    const totalValue = rows
      .filter((r) => !r.isPurchased && r.price)
      .reduce((sum, r) => sum + (r.price ?? 0), 0);
    return { total, bought, open, totalValue };
  }, [rows]);

  const visible = useMemo(() => {
    return rows.filter((r) => {
      if (filter === 'mine') return r.who === 'me';
      if (filter === 'theirs') return r.who === 'partner';
      if (filter === 'open') return !r.isPurchased;
      if (filter === 'bought') return r.isPurchased;
      return true;
    });
  }, [rows, filter]);

  const buckets = useMemo<Bucket<WishRow>[]>(() => {
    if (mode === 'solo') {
      const open = visible.filter((r) => !r.isPurchased);
      const bought = visible.filter((r) => r.isPurchased);
      return [
        ...(open.length
          ? [{ label: 'Wished', dotColor: C.accent, rows: open }]
          : []),
        ...(bought.length
          ? [{ label: 'Bought', dotColor: C.ink3, rows: bought }]
          : []),
      ];
    }

    // pair / crew — group by who, then split bought into its own bucket
    const groups: Record<string, WishRow[]> = {};
    const open = visible.filter((r) => !r.isPurchased);
    const bought = visible.filter((r) => r.isPurchased);

    for (const r of open) {
      const label =
        r.who === 'me'
          ? 'From you'
          : r.who === 'partner'
          ? `From ${partnerName?.split(' ')[0] ?? 'them'}`
          : 'Shared';
      if (!groups[label]) groups[label] = [];
      groups[label].push(r);
    }
    if (bought.length) groups.Bought = bought;

    const order = [
      'From you',
      `From ${partnerName?.split(' ')[0] ?? 'them'}`,
      'Shared',
      'Bought',
    ];
    const dotMap: Record<string, string> = {
      'From you': C.accent,
      [`From ${partnerName?.split(' ')[0] ?? 'them'}`]: C.accent2,
      Shared: C.accent3,
      Bought: C.ink3,
    };
    return order
      .filter((k) => groups[k]?.length)
      .map((k) => ({
        label: k,
        dotColor: dotMap[k],
        rows: groups[k],
      }));
  }, [visible, mode, partnerName, C.accent, C.accent2, C.accent3, C.ink3]);

  const filterOptions: { key: FilterKey; label: string }[] =
    mode === 'solo'
      ? [
          { key: 'all', label: 'All' },
          { key: 'open', label: 'Wished' },
          { key: 'bought', label: 'Bought' },
        ]
      : [
          { key: 'all', label: 'All' },
          { key: 'mine', label: 'Mine' },
          { key: 'theirs', label: 'Theirs' },
          { key: 'open', label: 'Open' },
          { key: 'bought', label: 'Bought' },
        ];

  const priorityLevel = (p: number): 'none' | 'low' | 'med' | 'high' =>
    p >= 3 ? 'high' : p === 2 ? 'med' : p === 1 ? 'low' : 'none';

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
            <HeaderBrand eyebrow={eyebrowLabel} title="wishes" />
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
              onPress={() => router.push('/sheets/new-wish' as any)}
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
        {/* Hero */}
        {rows.length > 0 ? (
        <View style={styles.heroWrap}>
          <StatBar
            eyebrow="ON THE LIST"
            meta={`${stats.open} OPEN · ${stats.bought} BOUGHT`}
            primary={
              <>
                <Text
                  style={[Typography.pixelHeroSm, { color: C.inkColor }]}
                  numberOfLines={1}
                >
                  {fmtMoney(stats.totalValue, currencyCode)}
                </Text>
                <PressScale
                  onPress={() => router.push('/sheets/currency' as any)}
                  hitSlop={6}
                  style={styles.currencyChip}
                >
                  <Text style={[Typography.eyebrowSm, { color: C.ink2, fontSize: 9.5 }]}>
                    {currencyCode}
                  </Text>
                  <Icon
                    name="chevronDown"
                    size={11}
                    color={C.ink2}
                    strokeWidth={2.2}
                  />
                </PressScale>
                <Text
                  style={[Typography.caption, { color: C.ink3, marginLeft: 'auto' }]}
                  numberOfLines={1}
                >
                  {stats.total} total
                </Text>
              </>
            }
          />
        </View>
        ) : null}

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
              icon="gift"
              title="No wishes yet"
              body="Drop a hint with a link, price, or just an idea."
              actionLabel="Add a wish"
              onAction={() => router.push('/sheets/new-wish' as any)}
              accent={C.accent3}
            />
          ) : (
            <BucketedList
              buckets={buckets}
              rowKey={(w) => w.id}
              renderRow={(w) => (
                <SwipeableRow
                  deleteTitle="Delete wish?"
                  deleteMessage={`"${w.title}" will be removed.`}
                  onEdit={() =>
                    router.push(`/sheets/new-wish?id=${w.id}` as any)
                  }
                  onDelete={() => remove(w.id)}
                >
                  <View style={[styles.row, { backgroundColor: C.bgCard }]}>
                    <Checkbox
                      checked={w.isPurchased}
                      onChange={() => {
                        // togglePurchased lives on per-list hook;
                        // for the all-items view we just route to detail
                        // — keep checkbox visual only for now.
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          Typography.bodyMedium,
                          {
                            color: w.isPurchased ? C.ink3 : C.inkColor,
                            textDecorationLine: w.isPurchased
                              ? 'line-through'
                              : 'none',
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {w.title}
                      </Text>
                      <View style={styles.metaRow}>
                        {w.price ? (
                          <Text
                            style={[
                              Typography.mono,
                              { color: C.ink3, fontSize: 11 },
                            ]}
                          >
                            {fmtMoney(w.price, w.currency)}
                          </Text>
                        ) : null}
                        <PriorityDot level={priorityLevel(w.priority)} />
                        <Text
                          style={[
                            Typography.eyebrowSm,
                            { color: w.authorColor, fontSize: 9.5 },
                          ]}
                        >
                          {w.authorName.toUpperCase()}
                        </Text>
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

function SegmentedBar({ open, bought }: { open: number; bought: number }) {
  const total = Math.max(1, open + bought);
  const w = (n: number) => Math.max(4, Math.round((n / total) * 100));
  return (
    <View style={styles.bar}>
      <View
        style={{
          flex: w(open),
          backgroundColor: '#2A241B',
          borderRadius: 3,
          height: 6,
        }}
      />
      <View
        style={{
          flex: w(bought),
          backgroundColor: 'rgba(0,0,0,0.18)',
          borderRadius: 3,
          height: 6,
        }}
      />
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
  bar: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 16,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
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
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    marginTop: 14,
  },
});
