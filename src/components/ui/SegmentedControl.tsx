import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SegmentedControlProps<T extends string> {
  segments: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  /** Accent color for the active segment (defaults to theme primary) */
  tint?: string;
}

/**
 * iOS-native-looking segmented control with glass material.
 */
export function SegmentedControl<T extends string>({
  segments,
  selected,
  onSelect,
  tint,
}: SegmentedControlProps<T>) {
  const C = useColors();
  const { mode } = useTheme();
  const accent = tint || C.primary;

  const trackBg = mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.10)';
  const thumbBg = mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.85)';
  const thumbBorder = mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)';

  return (
    <View style={[styles.track, { backgroundColor: trackBg }]}>
      {segments.map((seg) => {
        const active = seg.value === selected;
        return (
          <TouchableOpacity
            key={seg.value}
            onPress={() => {
              if (seg.value !== selected) {
                Haptics.selectionAsync();
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                onSelect(seg.value);
              }
            }}
            activeOpacity={0.7}
            style={[
              styles.segment,
              active && [styles.activeSegment, { backgroundColor: thumbBg, borderColor: thumbBorder }],
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: active ? accent : C.textTertiary },
                active && styles.activeText,
              ]}
            >
              {seg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 2,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  activeSegment: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    ...Typography.captionMedium,
    fontSize: 13,
  },
  activeText: {
    fontFamily: Typography.subheading.fontFamily,
  },
});
