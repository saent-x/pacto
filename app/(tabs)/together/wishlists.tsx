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
import { useColors } from '@/src/hooks/useColors';
import { useWishlists, useWishlistItems } from '@/src/hooks/useWishlists';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { EmptyState } from '@/src/components/ui';
import { CreateWishlistSheet } from '@/src/components/wishlists/CreateWishlistSheet';
import { CreateWishlistItemSheet } from '@/src/components/wishlists/CreateWishlistItemSheet';

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
  const { wishlists, isLoading, create, remove, refetch } = useWishlists();
  const createSheetRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      await create(data.name);
    },
    [create],
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

  if (!isLoading && wishlists.length === 0) {
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
            <Text style={[styles.headerTitle, { color: C.text }]}>Wishlists</Text>
            <View style={{ width: 40 }} />
          </View>

          <EmptyState
            icon="gift"
            title="Your wishlists are empty"
            description="Drop some hints for each other — add things you'd love"
            actionLabel="Create Wishlist"
            onAction={() => createSheetRef.current?.present()}
          />

          {/* FAB */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              createSheetRef.current?.present();
            }}
            activeOpacity={0.85}
            style={[styles.floatingFab, { backgroundColor: C.wishlists }]}
          >
            <Feather name="plus" size={22} color={C.ink} />
          </TouchableOpacity>

          <CreateWishlistSheet sheetRef={createSheetRef} onSave={handleCreateWishlist} />
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
          <Text style={[styles.headerTitle, { color: C.text }]}>Wishlists</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {wishlists.map((wishlist, index) => (
            <Animated.View key={wishlist._id} entering={FadeInDown.duration(400).delay(100 + index * 60)}>
              <WishlistCard
                wishlist={wishlist}
                expanded={expandedId === wishlist._id}
                onToggle={toggleExpand}
                onDelete={handleDeleteWishlist}
                colors={C}
              />
            </Animated.View>
          ))}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            createSheetRef.current?.present();
          }}
          activeOpacity={0.85}
          style={[styles.floatingFab, { backgroundColor: C.wishlists }]}
        >
          <Feather name="plus" size={22} color={C.ink} />
        </TouchableOpacity>

        <CreateWishlistSheet sheetRef={createSheetRef} onSave={handleCreateWishlist} />
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
  colors: ReturnType<typeof useColors>;
};

function WishlistCard({ wishlist, expanded, onToggle, onDelete, colors: C }: WishlistCardProps) {
  return (
    <View style={styles.wishlistCard}>
      <TouchableOpacity
        onPress={() => onToggle(wishlist._id)}
        onLongPress={() => onDelete(wishlist._id, wishlist.name)}
        activeOpacity={0.7}
        style={[styles.wishlistRow, { backgroundColor: C.card, borderColor: C.border }]}
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        await togglePurchased(itemId);
      } catch {
        Alert.alert('Error', 'Could not update item.');
      }
    },
    [togglePurchased],
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
              try {
                await removeItem(itemId);
              } catch {
                Alert.alert('Error', 'Could not remove item.');
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
            <TouchableOpacity
              onPress={() => handleTogglePurchased(item._id)}
              onLongPress={() => handleDeleteItem(item._id, item.title)}
              activeOpacity={0.7}
              style={[
                styles.itemRow,
                {
                  backgroundColor: C.card,
                  borderColor: C.border,
                  opacity: item.isPurchased ? 0.5 : 1,
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

  // Header
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

  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 120,
  },

  // Wishlist card
  wishlistCard: {
    marginBottom: Spacing.md,
  },
  wishlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
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
    marginLeft: Spacing.xl,
    paddingLeft: Spacing.lg,
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  emptyItems: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyItemsText: {
    ...Typography.caption,
    fontStyle: 'italic',
  },

  // Item row
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
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
    fontFamily: 'DMSans_600SemiBold',
  },
  gotItText: {
    ...Typography.small,
    fontFamily: 'DMSans_600SemiBold',
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
