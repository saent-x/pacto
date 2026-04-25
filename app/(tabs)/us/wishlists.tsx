import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Icon } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { useActionMenu } from '@/src/components/ui/ActionMenu';
import { confirmDestructive } from '@/src/lib/confirm';
import { useAllWishlistItems, useQuickAddWishItem } from '@/src/hooks/useWishlists';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';

type WhoKind = 'me' | 'partner' | 'both';
type FilterKind = 'ALL' | 'PARTNER' | 'MINE' | 'SHARED' | 'CLAIMED';

type WishRow = {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  tag: string | null;
  who: WhoKind;
  claimed: boolean;
};

function fmtMoney(amount: number, currency: string) {
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '';
  return symbol ? `${symbol}${amount.toFixed(0)}` : `${amount.toFixed(0)} ${currency}`;
}

function fmtWorth(total: number) {
  if (total >= 1000) return `€${(total / 1000).toFixed(1)}k`;
  return `€${total.toFixed(0)}`;
}

export default function Wishlists() {
  const { C, F } = useTheme();
  const { user, activeCouple, isSolo } = useSession();
  const { items, isLoading } = useAllWishlistItems();
  const { remove } = useQuickAddWishItem();
  const actionMenu = useActionMenu();

  const openWishMenu = useCallback(
    (row: WishRow) => {
      actionMenu.open({
        title: row.title,
        subtitle: row.tag ?? undefined,
        actions: [
          {
            key: 'edit',
            label: 'Edit',
            icon: 'edit',
            onPress: () => router.push(`/sheets/new-wish?id=${row.id}` as any),
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: 'trash',
            destructive: true,
            onPress: () => {
              confirmDestructive(
                'Delete wish?',
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
  const partnerId = activeCouple?.partner?.id ?? '';
  const partnerName = activeCouple?.partner?.displayName ?? 'Partner';

  const rows = useMemo<WishRow[]>(() => {
    return items.map((raw: any): WishRow => {
      const addedBy = String(raw.addedBy ?? '');
      const who: WhoKind =
        addedBy && addedBy === userId
          ? 'me'
          : addedBy && addedBy === partnerId
            ? 'partner'
            : 'both';
      return {
        id: String(raw.id),
        title: String(raw.title ?? ''),
        price: raw.price != null ? Number(raw.price) : null,
        currency: String(raw.currency ?? 'USD'),
        tag: raw.tag ? String(raw.tag).toUpperCase() : null,
        who,
        claimed: Boolean(raw.isPurchased),
      };
    });
  }, [items, userId, partnerId]);

  const [filter, setFilter] = useState<FilterKind>('ALL');

  const filtered = useMemo(() => {
    switch (filter) {
      case 'PARTNER':
        return rows.filter((r) => r.who === 'partner');
      case 'MINE':
        return rows.filter((r) => r.who === 'me');
      case 'SHARED':
        return rows.filter((r) => r.who === 'both');
      case 'CLAIMED':
        return rows.filter((r) => r.claimed);
      default:
        return rows;
    }
  }, [rows, filter]);

  const stats = useMemo(() => {
    const itemsCount = rows.length;
    const claimedCount = rows.filter((r) => r.claimed).length;
    const worth = rows.reduce((s, r) => s + (r.price ?? 0), 0);
    return { itemsCount, claimedCount, worth };
  }, [rows]);

  if (isLoading && rows.length === 0) return <IndexSkeleton />;
  if (rows.length === 0) return <EmptyWishlists />;

  const filters: { key: FilterKind; label: string }[] = [
    { key: 'ALL', label: 'ALL' },
    ...(isSolo ? [] : [{ key: 'PARTNER' as const, label: `${partnerName.toUpperCase()}'S` }]),
    { key: 'MINE', label: 'MINE' },
    { key: 'SHARED', label: 'SHARED' },
    { key: 'CLAIMED', label: 'CLAIMED' },
  ];

  return (
    <Screen>
      <Animated.View
        entering={FadeInDown.duration(420)}
        style={{ backgroundColor: C.lavender, borderRadius: 24, padding: 22, marginBottom: 18 }}
      >
        <Text
          style={{
            fontSize: 10,
            color: C.lavenderInk,
            fontFamily: F.bodyBold,
            letterSpacing: 1.2,
            opacity: 0.55,
            marginBottom: 6,
          }}
        >
          ON YOUR LISTS
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 20 }}>
          {[
            { n: String(stats.itemsCount), l: 'ITEMS' },
            { n: String(stats.claimedCount), l: 'CLAIMED' },
            { n: fmtWorth(stats.worth), l: 'WORTH' },
          ].map((s) => (
            <View key={s.l}>
              <Text
                style={{
                  fontFamily: F.displayBold,
                  fontSize: 44,
                  color: C.lavenderInk,
                  lineHeight: 44,
                  letterSpacing: -1.5,
                }}
              >
                {s.n}
              </Text>
              <Text
                style={{
                  fontSize: 9,
                  color: C.lavenderInk,
                  opacity: 0.55,
                  fontFamily: F.bodyBold,
                  letterSpacing: 1,
                  marginTop: 4,
                }}
              >
                {s.l}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 4 }}>
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  backgroundColor: active ? C.goldSoft : C.card,
                }}
              >
                <Text
                  style={{
                    color: active ? C.gold : C.mist,
                    fontSize: 10,
                    fontFamily: F.bodyBold,
                    letterSpacing: 1,
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {filtered.length === 0 ? (
        <View
          style={{
            padding: 20,
            borderRadius: 18,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: C.line,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 12, color: C.fog, fontFamily: F.body }}>No matches</Text>
        </View>
      ) : (
        filtered.map((it, i) => {
          const whoLabel =
            it.who === 'both' ? 'SHARED' : it.who === 'me' ? 'MINE' : partnerName.toUpperCase();
          return (
            <Animated.View
              key={it.id}
              entering={FadeInDown.delay(Math.min(i, 10) * 60 + 80).duration(400)}
              style={{ marginBottom: 8 }}
            >
            <Pressable
              testID={`wish-row-${it.id}`}
              onLongPress={() => openWishMenu(it)}
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
                opacity: it.claimed ? 0.5 : 1,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: C.lavenderInk,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="gift" size={16} color={C.lavender} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: F.displayBold,
                    fontSize: 14,
                    color: C.bone,
                    letterSpacing: -0.2,
                    textDecorationLine: it.claimed ? 'line-through' : 'none',
                  }}
                >
                  {it.title}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: C.fog,
                    fontFamily: F.bodyBold,
                    marginTop: 3,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                  }}
                >
                  {whoLabel}
                  {it.tag ? ` · ${it.tag}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {it.price != null ? (
                  <Text style={{ fontFamily: F.displayBold, fontSize: 14, color: C.bone }}>
                    {fmtMoney(it.price, it.currency)}
                  </Text>
                ) : null}
                {it.claimed && (
                  <Text
                    style={{
                      fontSize: 9,
                      color: C.mint,
                      fontFamily: F.bodyBold,
                      letterSpacing: 1,
                      marginTop: 2,
                    }}
                  >
                    CLAIMED
                  </Text>
                )}
              </View>
            </Pressable>
            </Animated.View>
          );
        })
      )}
    </Screen>
  );
}

function EmptyWishlists() {
  const { C, F } = useTheme();
  return (
    <Screen>
      <Pressable
        onPress={() => router.push('/sheets/new-wish' as any)}
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
        <Icon name="gift" size={22} color={C.fog} />
        <Text style={{ fontFamily: F.displayBold, fontSize: 16, color: C.mist }}>
          Start dropping hints
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: C.fog,
            fontFamily: F.body,
            textAlign: 'center',
          }}
        >
          Add something you've been eyeing — cozy or extravagant.
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
          height: 148,
          borderRadius: 24,
          backgroundColor: C.lavender,
          opacity: 0.35,
          marginBottom: 22,
        }}
      />
      <Animated.View
        entering={FadeIn.delay(60).duration(300)}
        style={{
          height: 30,
          borderRadius: 999,
          backgroundColor: C.card,
          opacity: 0.55,
          marginBottom: 12,
        }}
      />
      {[0, 1, 2, 3].map((i) => (
        <Animated.View
          key={i}
          entering={FadeIn.delay(120 + i * 60).duration(300)}
          style={{
            height: 64,
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
