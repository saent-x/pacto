import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { IconName } from '@/src/components/ui/Icon';

export type ActionMenuItem = {
  key: string;
  label: string;
  icon: IconName;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void | Promise<void>;
};

export type ActionMenuPayload = {
  title?: string;
  subtitle?: string;
  actions: ActionMenuItem[];
};

export type RowActionMenuProps = ActionMenuPayload & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Long-press → native action sheet (iOS ActionSheetIOS, Android Alert with
 * options). Replaces the previous @react-native-menu/menu implementation
 * which required a native module not always linked into dev builds.
 *
 * UX is slightly less polished than UIMenu (full-width bottom sheet vs
 * anchored menu) but works in any build with no native dependency.
 */
export function RowActionMenu({
  title,
  subtitle,
  actions,
  children,
  style,
}: RowActionMenuProps) {
  const enabledActions = actions.filter((a) => !a.disabled);

  const handleLongPress = () => {
    if (enabledActions.length === 0) return;
    Haptics.selectionAsync().catch(() => undefined);

    if (Platform.OS === 'ios') {
      const labels = enabledActions.map((a) => a.label);
      const cancelButtonIndex = labels.length;
      const destructiveIndex = enabledActions.findIndex((a) => a.destructive);

      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          message: subtitle,
          options: [...labels, 'Cancel'],
          cancelButtonIndex,
          destructiveButtonIndex:
            destructiveIndex >= 0 ? destructiveIndex : undefined,
        },
        async (idx) => {
          if (idx === cancelButtonIndex) return;
          const item = enabledActions[idx];
          if (!item) return;
          if (item.destructive) {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning
            ).catch(() => undefined);
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
              () => undefined
            );
          }
          await item.onPress();
        }
      );
      return;
    }

    // Android — use Alert with up to N options. Native M3 popup would be
    // nicer; this works without an extra dep.
    Alert.alert(
      title ?? '',
      subtitle,
      [
        ...enabledActions.map((item) => ({
          text: item.label,
          style: (item.destructive ? 'destructive' : 'default') as
            | 'default'
            | 'destructive',
          onPress: async () => {
            if (item.destructive) {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning
              ).catch(() => undefined);
            } else {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                () => undefined
              );
            }
            await item.onPress();
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  return (
    <Pressable
      onLongPress={handleLongPress}
      delayLongPress={350}
      style={style}
    >
      {children}
    </Pressable>
  );
}
