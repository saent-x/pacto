import React, { useState } from 'react';
import {
  AccessibilityRole,
  AccessibilityState,
  Animated,
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressProps = {
  children?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  scale?: number;
  haptic?: boolean;
  disabled?: boolean;
  ripple?: boolean;
  style?: StyleProp<ViewStyle>;
  hitSlop?: PressableProps['hitSlop'];
  // Accessibility — forwarded to the underlying Pressable so screen readers can
  // announce icon-only and custom controls. Role defaults to "button" when the
  // control is pressable.
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  accessibilityElementsHidden?: boolean;
  importantForAccessibility?: PressableProps['importantForAccessibility'];
};

// The design's `Press` primitive: scales on press, with optional haptic (iOS)
// and Material ripple (Android). Style (incl. layout like flex) is applied to the
// Pressable itself so flex distribution works.
export function Press({
  children,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  scale = 0.975,
  haptic = false,
  disabled = false,
  ripple = true,
  style,
  hitSlop,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  accessibilityState,
  accessibilityElementsHidden,
  importantForAccessibility,
}: PressProps) {
  const [v] = useState(() => new Animated.Value(1));
  const animate = (to: number) =>
    Animated.spring(v, { toValue: to, useNativeDriver: true, speed: 50, bounciness: 0 }).start();

  return (
    <AnimatedPressable
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole ?? (onPress || onLongPress ? 'button' : undefined)}
      accessibilityState={accessibilityState ?? (disabled ? { disabled: true } : undefined)}
      accessibilityElementsHidden={accessibilityElementsHidden}
      importantForAccessibility={importantForAccessibility}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        animate(scale);
        if (haptic && Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
        onPressIn?.();
      }}
      onPressOut={() => {
        animate(1);
        onPressOut?.();
      }}
      android_ripple={ripple ? { color: 'rgba(127,127,127,0.18)' } : undefined}
      style={[{ transform: [{ scale: v }] }, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
