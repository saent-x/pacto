import { ReactNode, useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Icon } from '@/src/components/ui/Icon';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

type Props = {
  children: ReactNode;
  /** Edit action — revealed by swipe-right (action sits on the LEFT). */
  onEdit?: () => void;
  /** Delete action — revealed by swipe-left (action sits on the RIGHT). */
  onDelete?: () => void;
  deleteTitle?: string;
  deleteMessage?: string;
  /** Disable swipe entirely (e.g. completed rows). */
  disabled?: boolean;
};

const ACTION_WIDTH = 84;

/**
 * iOS Mail-style swipe row.
 *   • Swipe right  → reveal Edit on the left (sage).
 *   • Swipe left   → reveal Delete on the right (red).
 *
 * Action buttons fill the full height of the row, solid backgrounds, no
 * transparency. Implemented with react-native-gesture-handler — no extra
 * native module required.
 */
export function SwipeableRow({
  children,
  onEdit,
  onDelete,
  deleteTitle = 'Delete?',
  deleteMessage = 'This cannot be undone.',
  disabled,
}: Props) {
  const { C } = useTheme();
  const swipeRef = useRef<SwipeableMethods>(null);

  if (disabled || (!onEdit && !onDelete)) {
    return <>{children}</>;
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
        onPress: () => {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning
          ).catch(() => undefined);
          onDelete();
        },
      },
    ]);
  };

  const renderLeftActions = onEdit
    ? () => (
        <View style={[styles.action, { backgroundColor: C.accent2 }]}>
          <Pressable onPress={triggerEdit} style={styles.actionPressable}>
            <Icon name="edit" size={20} color={C.bg} strokeWidth={2.4} />
            <Text
              style={[
                Typography.eyebrowSm,
                { color: C.bg, marginTop: 4, fontSize: 9.5 },
              ]}
            >
              EDIT
            </Text>
          </Pressable>
        </View>
      )
    : undefined;

  const renderRightActions = onDelete
    ? () => (
        <View style={[styles.action, { backgroundColor: C.error }]}>
          <Pressable onPress={triggerDelete} style={styles.actionPressable}>
            <Icon name="trash" size={20} color={C.bg} strokeWidth={2.4} />
            <Text
              style={[
                Typography.eyebrowSm,
                { color: C.bg, marginTop: 4, fontSize: 9.5 },
              ]}
            >
              DELETE
            </Text>
          </Pressable>
        </View>
      )
    : undefined;

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={2}
      overshootLeft={false}
      overshootRight={false}
      leftThreshold={ACTION_WIDTH * 0.6}
      rightThreshold={ACTION_WIDTH * 0.6}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
          () => undefined
        );
      }}
      onSwipeableWillClose={() => {
        Haptics.selectionAsync().catch(() => undefined);
      }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: ACTION_WIDTH,
    height: '100%',
  },
  actionPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
