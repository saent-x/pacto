import { Pressable, ViewStyle, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { useTheme } from '@/src/lib/theme';

type Props = {
  name: IconName;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  soft?: boolean;
  active?: boolean;
  color?: string;
  style?: ViewStyle;
};

/**
 * Soft circular utility button. Filled (active) inverts to ink-on-bg.
 *
 * Design source: /tmp/pacto-design/coupl-design-ii/project/components.jsx (IconButton)
 */
export function IconButton({
  name,
  onPress,
  size = 36,
  iconSize = 18,
  soft = false,
  active = false,
  color,
  style,
}: Props) {
  const { C } = useTheme();
  const bg = active ? C.inkColor : soft ? C.bgSoft : 'transparent';
  const fg = color ?? (active ? C.bg : C.ink2);

  return (
    <Pressable
      onPress={onPress ? () => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress();
      } : undefined}
      android_ripple={{ color: C.line2, borderless: true, radius: size / 2 }}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pressed && Platform.OS === 'ios' ? { opacity: 0.6 } : null,
        style,
      ]}
    >
      <Icon name={name} size={iconSize} color={fg} />
    </Pressable>
  );
}
