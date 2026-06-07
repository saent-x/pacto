import React from 'react';
import { Platform, View, ViewStyle, StyleProp } from 'react-native';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { useTheme } from '@/theme';

// True only on iOS 26+ where the liquid-glass API is actually backed by the OS.
export const glassOK =
  Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

type GlassProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Style applied only on the non-glass fallback path (e.g. a solid/translucent fill). */
  fallbackStyle?: StyleProp<ViewStyle>;
  /** 'clear' is the most pronounced liquid-glass look (default); 'regular' is frostier. */
  glassStyle?: 'clear' | 'regular';
  tintColor?: string;
  interactive?: boolean;
};

/**
 * Liquid-glass surface with a graceful fallback. On iOS 26 it renders a real
 * `GlassView` (defaulting to the clearest, glassiest style and matching the
 * app's own light/dark theme); everywhere else it's a plain `View` carrying
 * `fallbackStyle`.
 */
export function Glass({
  children,
  style,
  fallbackStyle,
  glassStyle = 'clear',
  tintColor,
  interactive,
}: GlassProps) {
  const { isDark } = useTheme();
  if (glassOK) {
    return (
      <GlassView
        glassEffectStyle={glassStyle}
        isInteractive={interactive}
        tintColor={tintColor}
        colorScheme={isDark ? 'dark' : 'light'}
        style={style}
      >
        {children}
      </GlassView>
    );
  }
  return <View style={[style, fallbackStyle]}>{children}</View>;
}
