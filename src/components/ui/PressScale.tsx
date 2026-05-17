import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

// Scale 0.96 on press via Pressable's `pressed` state.
// Pure RN — no Reanimated dependency, no worklets.
// Tradeoff: snap instead of spring, but always works.
export function PressScale({
  children,
  style,
  disabled,
  static: staticMode = false,
  haptic = 'selection',
  pressedScale = 0.96,
  onPress,
  accessibilityRole,
  accessibilityState,
  ...rest
}: Omit<PressableProps, 'style'> & {
  style?: PressableProps['style'] | StyleProp<ViewStyle>;
  static?: boolean;
  haptic?: false | 'selection' | 'impact' | 'impactMedium' | 'warning' | 'success';
  pressedScale?: number;
}) {
  const handlePress: PressableProps['onPress'] = (event) => {
    if (haptic === 'selection') {
      Haptics.selectionAsync().catch(() => undefined);
    } else if (haptic === 'impact') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    } else if (haptic === 'impactMedium') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    } else if (haptic === 'warning') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    } else if (haptic === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
    onPress?.(event);
  };

  return (
    <Pressable
      {...rest}
      onPress={onPress ? handlePress : undefined}
      disabled={disabled}
      accessibilityRole={accessibilityRole ?? (onPress ? 'button' : undefined)}
      accessibilityState={{
        ...accessibilityState,
        disabled: disabled || accessibilityState?.disabled || undefined,
      }}
      style={(state) => {
        const base =
          typeof style === 'function' ? (style as any)(state) : style;
        if (staticMode || disabled) return base;
        return [
          base,
          { transform: [{ scale: state.pressed ? pressedScale : 1 }] },
        ];
      }}
    >
      {children as any}
    </Pressable>
  );
}
