import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/src/lib/theme';
import { alphaColor } from '@/src/lib/color';

/**
 * Global feature flag — flip to `false` to remove every halo wrapper at
 * runtime without touching call sites. Each `<CardHalo>` becomes a
 * pass-through. Used to revert the halo design language across screens.
 */
export const HALO_ENABLED = true;

type Props = {
  children: ReactNode;
  /** Override the global flag at the call site. */
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Custom dark-mode bg. Defaults to warm peach tint for visibility. */
  darkColor?: string;
  /** Custom light-mode bg. Defaults to coral accent tint. */
  lightColor?: string;
  /** Outer radius. Default 27 (= inner 22 + padding 5). */
  radius?: number;
  /** Halo thickness. Default 5. */
  padding?: number;
};

/**
 * Light tinted outline that wraps a card to give it a soft halo border.
 * Concentric: outer = inner radius + padding (5).
 */
export function CardHalo({
  children,
  enabled,
  style,
  darkColor,
  lightColor,
  radius = 27,
  padding = 5,
}: Props) {
  const { C, mode } = useTheme();
  const isOn = (enabled ?? HALO_ENABLED) === true;
  if (!isOn) {
    // Pass-through wrapper keeps call-site layout (margins, flex) stable
    // when halos are disabled globally.
    return <View style={style}>{children}</View>;
  }
  const bg =
    mode === 'dark'
      ? darkColor ?? alphaColor(C.peach, 0.22)
      : lightColor ?? alphaColor(C.accent, 0.12);
  return (
    <View
      style={[
        { borderRadius: radius, padding, backgroundColor: bg },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const _styles = StyleSheet.create({});
