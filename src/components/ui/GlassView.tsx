import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/src/lib/theme';

interface GlassViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Blur intensity (default 25) */
  intensity?: number;
  /** Tint override — otherwise auto from theme */
  tint?: 'light' | 'dark';
  /** Show a subtle top highlight edge */
  highlight?: boolean;
  /** Background opacity multiplier (0–1, default 1) */
  opacity?: number;
}

/**
 * Liquid glass container — translucent blur with subtle border highlight.
 * Gracefully degrades on Android to a semi-transparent surface.
 */
export function GlassView({
  children,
  style,
  intensity = 25,
  tint: tintOverride,
  highlight = true,
  opacity = 1,
}: GlassViewProps) {
  const { C, mode } = useTheme();
  const tint = tintOverride ?? mode;

  const bgColor =
    mode === 'dark'
      ? `rgba(16, 21, 37, ${0.55 * opacity})`
      : `rgba(255, 250, 242, ${0.52 * opacity})`;

  const borderColor =
    mode === 'dark'
      ? `rgba(255, 255, 255, ${0.08 * opacity})`
      : `rgba(255, 255, 255, ${0.45 * opacity})`;

  const highlightColor =
    mode === 'dark'
      ? `rgba(255, 255, 255, ${0.04 * opacity})`
      : `rgba(255, 255, 255, ${0.25 * opacity})`;

  if (Platform.OS === 'android') {
    // Android: fallback to semi-transparent background (no native blur)
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: mode === 'dark'
              ? `rgba(16, 21, 37, ${0.86 * opacity})`
              : `rgba(255, 250, 242, ${0.88 * opacity})`,
            borderColor,
          },
          style,
        ]}
      >
        {highlight && <View style={[styles.highlight, { backgroundColor: highlightColor }]} />}
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      style={[styles.container, { borderColor }, style]}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }]} />
      {highlight && <View style={[styles.highlight, { backgroundColor: highlightColor }]} />}
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
});
