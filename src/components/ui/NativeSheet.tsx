/**
 * NativeSheet — thin wrapper around iOS `formSheet` presentation
 * (via react-native-screens) with Android gorhom fallback.
 *
 * iOS 26+: adopts the system "liquid glass" material automatically
 * when presented as `formSheet`. Nothing to configure.
 *
 * Use as an expo-router route:
 *   app/(tabs)/_layout.tsx adds a sibling route group for sheets,
 *   each sheet screen sets `presentation: 'formSheet'` in its options.
 *
 * For in-place sheets triggered by ref, keep using ThemedSheet.
 * This component is the canonical target for Phase-5 sheet conversion.
 */
import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';

/** Screen options for an iOS formSheet route (liquid-glass on iOS 26). */
export const formSheetOptions = {
  presentation: 'formSheet' as const,
  sheetAllowedDetents: [0.5, 0.92] as const,
  sheetInitialDetentIndex: 0,
  sheetGrabberVisible: true,
  sheetCornerRadius: 28,
  sheetExpandsWhenScrolledToEdge: true,
  headerShown: false,
  contentStyle: { backgroundColor: 'transparent' },
};

/** Inner container for a formSheet route — adds a blur layer on Android. */
export function NativeSheetContainer({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  const C = useColors();
  const { mode } = useTheme();

  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.root, { backgroundColor: C.card }, style]}>
        {children}
      </View>
    );
  }

  // Android: simulate glass with BlurView + scrim
  return (
    <View style={[styles.root, style]}>
      <BlurView
        intensity={40}
        tint={mode === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor:
              mode === 'dark' ? 'rgba(22,19,17,0.85)' : 'rgba(255,255,255,0.9)',
          },
        ]}
      />
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
  },
});
