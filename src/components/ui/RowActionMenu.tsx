import { MenuView, type MenuAction } from '@react-native-menu/menu';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
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

const ICON_MAP: Record<string, { ios?: string; android?: string }> = {
  edit: { ios: 'pencil', android: 'ic_menu_edit' },
  trash: { ios: 'trash', android: 'ic_menu_delete' },
  chevronsUp: { ios: 'arrow.up.to.line' },
};

function resolveImage(icon: IconName): string | undefined {
  const m = ICON_MAP[icon];
  if (!m) return undefined;
  return Platform.select({ ios: m.ios, android: m.android });
}

export function RowActionMenu({
  title,
  subtitle,
  actions,
  children,
  style,
}: RowActionMenuProps) {
  const menuActions: MenuAction[] = actions.map((a, i) => ({
    id: a.key,
    title: a.label,
    subtitle: i === 0 ? subtitle : undefined,
    image: resolveImage(a.icon),
    attributes: {
      destructive: a.destructive,
      disabled: a.disabled,
    },
  }));

  return (
    <MenuView
      title={title ?? ''}
      shouldOpenOnLongPress
      actions={menuActions}
      onOpenMenu={() => {
        Haptics.selectionAsync().catch(() => undefined);
      }}
      onPressAction={async ({ nativeEvent }) => {
        const item = actions.find((a) => a.key === nativeEvent.event);
        if (!item || item.disabled) return;
        if (item.destructive) {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning,
          ).catch(() => undefined);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
            () => undefined,
          );
        }
        await item.onPress();
      }}
      style={style}
    >
      {children}
    </MenuView>
  );
}
