import { ReactNode, useRef } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Icon, type IconName } from '@/src/components/ui/Icon';
import { useTheme } from '@/src/lib/theme';
import { useBucketRowChrome } from './BucketedList';

type Props = {
  children: ReactNode;
  /** Edit action — revealed from the right with other row actions. */
  onEdit?: () => void;
  /** Delete action — revealed from the right with other row actions. */
  onDelete?: () => void | Promise<void>;
  deleteTitle?: string;
  deleteMessage?: string;
  /** Disable swipe entirely (e.g. completed rows). */
  disabled?: boolean;
};

export const SWIPE_ACTION_SIZE = 52;
export const SWIPE_ACTION_WIDTH = 78;
export const SWIPE_ACTION_GAP = 8;
export const SWIPE_ROW_RADIUS = 18;
export const SWIPE_ANIMATION_OPTIONS = {
  damping: 19,
  stiffness: 230,
  mass: 0.72,
};

type SwipeActionSide = 'left' | 'right';

export function SwipeActionRail({
  side,
  width = SWIPE_ACTION_WIDTH,
  children,
  style,
}: {
  side: SwipeActionSide;
  width?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.actionRail,
        {
          width,
          alignItems: side === 'left' ? 'flex-start' : 'flex-end',
          paddingLeft: side === 'left' ? 8 : 0,
          paddingRight: side === 'right' ? 8 : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SwipeActionButton({
  progress,
  side,
  icon,
  color,
  iconColor,
  accessibilityLabel,
  testID,
  onPress,
}: {
  progress: SharedValue<number>;
  side: SwipeActionSide;
  icon: IconName;
  color: string;
  iconColor: string;
  accessibilityLabel: string;
  testID?: string;
  onPress: () => void;
}) {
  const revealStyle = useAnimatedStyle(() => {
    const amount = Math.max(0, Math.min(progress.value, 1));
    const offset = (1 - amount) * (side === 'left' ? -10 : 10);
    return {
      opacity: 0.35 + amount * 0.65,
      transform: [
        { translateX: offset },
        { scale: 0.84 + amount * 0.16 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.actionBubble, { backgroundColor: color }, revealStyle]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        hitSlop={10}
        style={({ pressed }) => [
          styles.actionPressable,
          {
            opacity: pressed ? 0.78 : 1,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
      >
        <Icon name={icon} size={21} color={iconColor} strokeWidth={2.5} />
      </Pressable>
    </Animated.View>
  );
}

/** iOS Mail-style swipe row with restrained circular actions outside the moving row. */
export function SwipeableRow({
  children,
  onEdit,
  onDelete,
  deleteTitle = 'Delete?',
  deleteMessage = 'This cannot be undone.',
  disabled,
}: Props) {
  const { C } = useTheme();
  const bucketChrome = useBucketRowChrome();
  const swipeRef = useRef<SwipeableMethods>(null);
  const deletePendingRef = useRef(false);
  const isGroupedRow = bucketChrome?.presentation === 'grouped';
  const ownsGroupedSurface = Boolean(bucketChrome?.ownsSurface);
  const rowRadiusStyle = isGroupedRow
    ? {
        borderRadius: 0,
        borderTopLeftRadius: bucketChrome.index === 0 ? SWIPE_ROW_RADIUS : 0,
        borderTopRightRadius: bucketChrome.index === 0 ? SWIPE_ROW_RADIUS : 0,
        borderBottomLeftRadius:
          bucketChrome.index === bucketChrome.total - 1 ? SWIPE_ROW_RADIUS : 0,
        borderBottomRightRadius:
          bucketChrome.index === bucketChrome.total - 1 ? SWIPE_ROW_RADIUS : 0,
      }
    : null;
  const rowSurfaceStyle = isGroupedRow
    ? [
        ownsGroupedSurface
          ? [
              styles.movingGroupedSwipeSurface,
              bucketChrome.index > 0 ? styles.connectedGroupedSwipeSurface : null,
            ]
          : styles.groupedSwipeSurface,
        rowRadiusStyle,
      ]
    : styles.swipeSurface;
  const rowBorderColor =
    isGroupedRow && !ownsGroupedSurface ? 'transparent' : C.lineColor;

  if (disabled || (!onEdit && !onDelete)) {
    return (
      <View
        testID="swipeable-row-content"
        style={[
          rowSurfaceStyle,
          {
            backgroundColor: C.bgCard,
            borderColor: rowBorderColor,
          },
        ]}
      >
        {children}
      </View>
    );
  }

  const closeSwipe = () => swipeRef.current?.close();

  const triggerEdit = () => {
    if (!onEdit) return;
    closeSwipe();
    Haptics.selectionAsync().catch(() => undefined);
    onEdit();
  };

  const triggerDelete = () => {
    if (!onDelete) return;
    Alert.alert(deleteTitle, deleteMessage, [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: closeSwipe,
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (deletePendingRef.current) return;
          deletePendingRef.current = true;
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning
          ).catch(() => undefined);
          try {
            await onDelete();
            closeSwipe();
          } finally {
            deletePendingRef.current = false;
          }
        },
      },
    ]);
  };

  const actionCount = Number(Boolean(onEdit)) + Number(Boolean(onDelete));
  const rightRailWidth =
    actionCount * SWIPE_ACTION_WIDTH + Math.max(0, actionCount - 1) * SWIPE_ACTION_GAP;

  const renderRightActions =
    actionCount > 0
      ? (progress: SharedValue<number>) => (
          <SwipeActionRail side="right" width={rightRailWidth}>
            <View style={styles.rightActionGroup}>
              {onEdit ? (
                <SwipeActionButton
                  progress={progress}
                  side="right"
                  icon="edit"
                  color={C.accent2}
                  iconColor={C.bg}
                  accessibilityLabel="Edit item"
                  testID="swipe-action-edit"
                  onPress={triggerEdit}
                />
              ) : null}
              {onDelete ? (
                <SwipeActionButton
                  progress={progress}
                  side="right"
                  icon="trash"
                  color={C.error}
                  iconColor={C.bg}
                  accessibilityLabel="Delete item"
                  testID="swipe-action-delete"
                  onPress={triggerDelete}
                />
              ) : null}
            </View>
          </SwipeActionRail>
        )
      : undefined;

  return (
    <View style={[styles.swipeFrame, rowRadiusStyle]}>
      <ReanimatedSwipeable
        ref={swipeRef}
        friction={1.18}
        overshootFriction={8}
        overshootLeft={false}
        overshootRight={actionCount > 0}
        rightThreshold={rightRailWidth * 0.5}
        animationOptions={SWIPE_ANIMATION_OPTIONS}
        containerStyle={[styles.swipeContainer, rowRadiusStyle]}
        childrenContainerStyle={[styles.swipeChildren, isGroupedRow ? styles.groupedSwipeChildren : null, rowRadiusStyle]}
        renderRightActions={renderRightActions}
        onSwipeableWillOpen={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
            () => undefined
          );
        }}
      >
        <View
          testID="swipeable-row-content"
          style={[
            styles.swipeContent,
            rowSurfaceStyle,
            {
              backgroundColor: C.bgCard,
              borderColor: rowBorderColor,
            },
          ]}
        >
          {children}
        </View>
      </ReanimatedSwipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeFrame: {
    borderRadius: SWIPE_ROW_RADIUS,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  swipeContainer: {
    borderRadius: SWIPE_ROW_RADIUS,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  swipeChildren: {
    borderRadius: SWIPE_ROW_RADIUS,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  groupedSwipeChildren: {
    borderRadius: 0,
  },
  swipeContent: {
    overflow: 'hidden',
  },
  swipeSurface: {
    borderRadius: SWIPE_ROW_RADIUS,
    borderWidth: 1,
  },
  groupedSwipeSurface: {
    borderRadius: 0,
    borderWidth: 0,
  },
  movingGroupedSwipeSurface: {
    borderRadius: 0,
    borderWidth: 1,
  },
  connectedGroupedSwipeSurface: {
    borderTopWidth: 0,
  },
  actionRail: {
    height: '100%',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  rightActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SWIPE_ACTION_GAP,
  },
  actionBubble: {
    width: SWIPE_ACTION_SIZE,
    height: SWIPE_ACTION_SIZE,
    borderRadius: 999,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 8px rgba(28, 29, 40, 0.12)' }
      : {
          shadowColor: '#1C1D28',
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        }),
  },
  actionPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
});
