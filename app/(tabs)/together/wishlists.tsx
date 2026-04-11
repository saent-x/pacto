import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useColors } from '@/src/hooks/useColors';
import { useWishlists, useWishlistItems } from '@/src/hooks/useWishlists';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { MiniDateRail } from '@/src/components/calendar/MiniDateRail';
import { EmptyState } from '@/src/components/ui';
import { CreateWishlistSheet } from '@/src/components/wishlists/CreateWishlistSheet';
import { CreateWishlistItemSheet } from '@/src/components/wishlists/CreateWishlistItemSheet';
import { matchesSelectedDateForTimestamp } from '@/src/lib/togetherDateFilter';
import { togetherItemContainerStyle, togetherListContainerStyle } from './_itemStyles';

function getPriorityColor(priority: number, C: ReturnType<typeof useColors>) {
  if (priority >= 3) return C.expenses;
  if (priority === 2) return C.wishlists;
  return C.textTertiary;
}

function getPriorityLabel(priority: number) {
  if (priority >= 3) return 'High';
  if (priority === 2) return 'Medium';
  return 'Low';
}

function formatPrice(price: number | null) {
  if (price == null) return null;
  return `$${price.toFixed(2)}`;
}

export default function WishlistsScreen() {
  const C = useColors();
  const router = useRouter();
  const { wishlists, create, update, remove, refetch } = useWishlists();
  const createSheetRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingWishlist, setEditingWishlist] = useState<{ id: string; name: string } | undefined>();
  const visibleWishlists = wishlists.filter((wishlist) =>
    matchesSelectedDateForTimestamp(wishlist.createdAt, selectedDate),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleCreateWishlist = useCallback(
    async (data: { name: string }) => {
      if (editingWishlist) {
        await update(editingWishlist.id, data.name);
        setEditingWishlist(undefined);
        return;
      }
      await create(data.name);
    },
    [create, editingWishlist, update],
  );

  const handleDeleteWishlist = useCallback(
    (id: string, name: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        'Delete Wishlist',
        `Are you sure you want to delete "${name}"? This can't be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await remove(id);
                if (expandedId === id) setExpandedId(null);
              } catch {
                Alert.alert('Error', 'Could not delete wishlist.');
              }
            },
          },
        ],
      );
    },
    [remove, expandedId],
  );

  const toggleExpand = useCallback((id: string) => {
    Haptics.selectionAsync();
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  if (wishlists.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <MiniDateRail
            title="Wishlists"
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            accentColor={C.wishlists}
            onPressLeading={() => {
              Haptics.selectionAsync();
              router.replace("/(tabs)/together");
            }}
          />

          <View style={styles.emptyWrap}>
            <EmptyState
              title="Your wishlists are empty"
              description="Drop some hints for each other — add things you'd love"
            />
          </View>

          {/* FAB */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setEditingWishlist(undefined);
              createSheetRef.current?.present();
            }}
            activeOpacity={0.85}
            style={[styles.floatingFab, { backgroundColor: C.wishlists }]}
          >
            <Feather name="plus" size={22} color={C.ink} />
          </TouchableOpacity>

          <CreateWishlistSheet sheetRef={createSheetRef} onSave={handleCreateWishlist} wishlist={editingWishlist} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <MiniDateRail
          title="Wishlists"
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          accentColor={C.wishlists}
          onPressLeading={() => {
            Haptics.selectionAsync();
            router.replace("/(tabs)/together");
          }}
        />

        <ScrollView
          contentContainerStyle={[
            styles.listContent,
            togetherListContainerStyle,
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {visibleWishlists.length > 0 ? visibleWishlists.map((wishlist, index) => (
            <Animated.View key={wishlist._id} entering={FadeInDown.duration(400).delay(100 + index * 60)}>
              <WishlistCard
                wishlist={wishlist}
                expanded={expandedId === wishlist._id}
                onToggle={toggleExpand}
                onDelete={handleDeleteWishlist}
                onEdit={(nextWishlist) => {
                  setEditingWishlist({ id: nextWishlist._id, name: nextWishlist.name });
                  createSheetRef.current?.present();
                }}
                colors={C}
              />
            </Animated.View>
          )) : (
            <View style={styles.emptyWrap}>
              <EmptyState
                title="No wishlists on this date"
                description="Pick another day or clear the date filter."
              />
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setEditingWishlist(undefined);
            createSheetRef.current?.present();
          }}
          activeOpacity={0.85}
          style={[styles.floatingFab, { backgroundColor: C.wishlists }]}
        >
          <Feather name="plus" size={22} color={C.ink} />
        </TouchableOpacity>

        <CreateWishlistSheet sheetRef={createSheetRef} onSave={handleCreateWishlist} wishlist={editingWishlist} />
      </SafeAreaView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Wishlist card + expanded items                                      */
/* ------------------------------------------------------------------ */

type WishlistCardProps = {
  wishlist: { _id: string; name: string; createdBy: string; createdAt: number };
  expanded: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onEdit: (wishlist: { _id: string; name: string; createdBy: string; createdAt: number }) => void;
  colors: ReturnType<typeof useColors>;
};

function WishlistCard({ wishlist, expanded, onToggle, onDelete, onEdit, colors: C }: WishlistCardProps) {
  const row = (
    <TouchableOpacity
      onPress={() => onToggle(wishlist._id)}
      activeOpacity={0.7}
      style={[
        togetherItemContainerStyle,
        styles.wishlistRow,
        { backgroundColor: C.card },
      ]}
    >
      <View style={styles.wishlistLeft}>
        <View style={[styles.wishlistIcon, { backgroundColor: C.wishlistsLight }]}>
          <Feather name="gift" size={18} color={C.wishlists} />
        </View>
        <Text style={[styles.wishlistName, { color: C.text }]} numberOfLines={1}>
          {wishlist.name}
        </Text>
      </View>

      <Feather
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={18}
        color={C.textTertiary}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.wishlistCard}>
      <Swipeable
        renderLeftActions={() => (
          <TouchableOpacity
            style={[styles.swipeAction, { backgroundColor: C.primary }]}
            onPress={() => onEdit(wishlist)}
          >
            <Feather name="edit-3" size={18} color="#fff" />
          </TouchableOpacity>
        )}
        renderRightActions={() => (
          <TouchableOpacity
            style={[styles.swipeAction, { backgroundColor: C.error }]}
            onPress={() => onDelete(wishlist._id, wishlist.name)}
          >
            <Feather name="trash-2" size={18} color="#fff" />
          </TouchableOpacity>
        )}
        overshootLeft={false}
        overshootRight={false}
        friction={2}
      >
        {row}
      </Swipeable>

      {expanded && <WishlistItemsList wishlistId={wishlist._id} colors={C} />}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Items list (rendered inline when a wishlist is expanded)            */
/* ------------------------------------------------------------------ */

function WishlistItemsList({
  wishlistId,
  colors: C,
}: {
  wishlistId: string;
  colors: ReturnType<typeof useColors>;
}) {
  const { items, add, togglePurchased, remove: removeItem } = useWishlistItems(wishlistId);
  const itemSheetRef = useRef<BottomSheetModal>(null);
  const [pendingItemIds, setPendingItemIds] = useState<Record<string, true>>({});

  const handleAddItem = useCallback(
    async (data: {
      title: string;
      description: string | null;
      url: string | null;
      price: number | null;
      priority: number;
    }) => {
      await add({
        title: data.title,
        description: data.description,
        url: data.url,
        price: data.price,
        priority: data.priority,
      });
    },
    [add],
  );

  const handleTogglePurchased = useCallback(
    async (itemId: string) => {
      if (pendingItemIds[itemId]) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPendingItemIds((current) => ({ ...current, [itemId]: true }));
      try {
        await togglePurchased(itemId);
      } catch {
        Alert.alert('Error', 'Could not update item.');
      } finally {
        setPendingItemIds((current) => {
          const next = { ...current };
          delete next[itemId];
          return next;
        });
      }
    },
    [pendingItemIds, togglePurchased],
  );

  const handleDeleteItem = useCallback(
    (itemId: string, title: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        'Remove Item',
        `Remove "${title}" from this wishlist?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              setPendingItemIds((current) => ({ ...current, [itemId]: true }));
              try {
                await removeItem(itemId);
              } catch {
                Alert.alert('Error', 'Could not remove item.');
              } finally {
                setPendingItemIds((current) => {
                  const next = { ...current };
                  delete next[itemId];
                  return next;
                });
              }
            },
          },
        ],
      );
    },
    [removeItem],
  );

  return (
    <View style={[styles.itemsContainer, { borderLeftColor: C.border }]}>
      {items.length === 0 ? (
        <View style={styles.emptyItems}>
          <Text style={[styles.emptyItemsText, { color: C.textTertiary }]}>
            No items yet — add something you love
          </Text>
        </View>
      ) : (
        items.map((item, i) => (
          <Animated.View key={item._id} entering={FadeInDown.duration(300).delay(i * 40)}>
            {(() => {
              const isPending = !!pendingItemIds[item._id];
              return (
            <Swipeable
              renderLeftActions={() => (
                <TouchableOpacity
                  style={[styles.swipeAction, { backgroundColor: C.wishlists }]}
                  onPress={() => handleTogglePurchased(item._id)}
                >
                  <Feather name="check" size={18} color="#fff" />
                </TouchableOpacity>
              )}
              renderRightActions={() => (
                <TouchableOpacity
                  style={[styles.swipeAction, { backgroundColor: C.error }]}
                  onPress={() => handleDeleteItem(item._id, item.title)}
                >
                  <Feather name="trash-2" size={18} color="#fff" />
                </TouchableOpacity>
              )}
              overshootLeft={false}
              overshootRight={false}
              friction={2}
            >
              <TouchableOpacity
                onPress={() => handleTogglePurchased(item._id)}
                disabled={isPending}
                activeOpacity={0.7}
                style={[
                  togetherItemContainerStyle,
                  styles.itemRow,
                  {
                    backgroundColor: C.card,
                    opacity: isPending ? 0.45 : item.isPurchased ? 0.5 : 1,
                  },
                ]}
              >
                {/* Purchased indicator */}
                <View
                  style={[
                    styles.itemCheckbox,
                    {
                      borderColor: item.isPurchased ? C.wishlists : C.border,
                      backgroundColor: item.isPurchased ? C.wishlistsLight : 'transparent',
                    },
                  ]}
                  >
                  {item.isPurchased && <Feather name="check" size={12} color={C.wishlists} />}
                </View>

                {/* Content */}
                <View style={styles.itemContent}>
                  <View style={styles.itemTitleRow}>
                    <Text
                      style={[
                        styles.itemTitle,
                        { color: C.text },
                        item.isPurchased && styles.itemStrikethrough,
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {item.price != null && (
                      <Text
                        style={[
                          styles.itemPrice,
                          { color: C.textSecondary },
                          item.isPurchased && styles.itemStrikethrough,
                        ]}
                      >
                        {formatPrice(item.price)}
                      </Text>
                    )}
                  </View>

                  {item.description ? (
                    <Text
                      style={[styles.itemDescription, { color: C.textTertiary }]}
                      numberOfLines={2}
                    >
                      {item.description}
                    </Text>
                  ) : null}

                  <View style={styles.itemMeta}>
                    {item.priority >= 2 && (
                      <View
                        style={[
                          styles.priorityBadge,
                          { backgroundColor: getPriorityColor(item.priority, C) + '18' },
                        ]}
                      >
                        <Text
                          style={[styles.priorityText, { color: getPriorityColor(item.priority, C) }]}
                        >
                          {getPriorityLabel(item.priority)}
                        </Text>
                      </View>
                    )}
                    {item.isPurchased && (
                      <Text style={[styles.gotItText, { color: C.wishlists }]}>Got it!</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Swipeable>
              );
            })()}
          </Animated.View>
        ))
      )}

      {/* Add item button */}
      <TouchableOpacity
        onPress={() => {
          Haptics.selectionAsync();
          itemSheetRef.current?.present();
        }}
        activeOpacity={0.7}
        style={[styles.addItemBtn, { borderColor: C.border }]}
      >
        <Feather name="plus" size={16} color={C.textTertiary} />
        <Text style={[styles.addItemText, { color: C.textTertiary }]}>Add item</Text>
      </TouchableOpacity>

      <CreateWishlistItemSheet sheetRef={itemSheetRef} onSave={handleAddItem} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },

  // List
  listContent: {
    paddingBottom: 120,
  },
  emptyWrap: {
    paddingHorizontal: Spacing['2xl'],
    height: 400,
  },

  // Wishlist card
  wishlistCard: {
    marginBottom: Spacing.md,
  },
  wishlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  wishlistLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  wishlistIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wishlistName: {
    ...Typography.bodyMedium,
    flex: 1,
  },

  // Items container
  itemsContainer: {
    paddingLeft: 0,
    borderLeftWidth: 0,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  emptyItems: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyItemsText: {
    ...Typography.caption,
  },

  // Item row
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    gap: Spacing.md,
  },
  itemCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  itemTitle: {
    ...Typography.bodyMedium,
    flex: 1,
  },
  itemPrice: {
    ...Typography.captionMedium,
  },
  itemDescription: {
    ...Typography.caption,
  },
  itemStrikethrough: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },

  // Meta / badges
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  priorityText: {
    ...Typography.small,
    fontFamily: Typography.captionMedium.fontFamily,
  },
  gotItText: {
    ...Typography.small,
    fontFamily: Typography.captionMedium.fontFamily,
  },

  // Add item button
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  addItemText: {
    ...Typography.captionMedium,
  },
  swipeAction: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
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
