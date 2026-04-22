import React, { useEffect } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/src/lib/theme';

function Shimmer({ style }: { style?: StyleProp<ViewStyle> }) {
  const { C } = useTheme();
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [v]);
  const anim = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 1], [0.35, 0.75]),
  }));
  return (
    <Animated.View
      testID="home-shimmer"
      style={[{ backgroundColor: C.card, borderRadius: 8 }, anim, style]}
    />
  );
}

export function HeroSkeleton() {
  const { C } = useTheme();
  return (
    <View
      testID="home-hero-skeleton"
      style={{
        borderRadius: 22,
        padding: 22,
        marginBottom: 14,
        height: 220,
        flexDirection: 'row',
        gap: 16,
        backgroundColor: C.card,
      }}
    >
      <Shimmer style={{ width: 150, height: 150, borderRadius: 75 }} />
      <View style={{ flex: 1, gap: 8 }}>
        <Shimmer style={{ width: '60%', height: 28 }} />
        <Shimmer style={{ width: '80%', height: 14, marginTop: 8 }} />
        <Shimmer style={{ width: '75%', height: 14 }} />
        <Shimmer style={{ width: '55%', height: 14 }} />
      </View>
    </View>
  );
}

export function DarkCardSkeleton({ height = 92 }: { height?: number }) {
  const { C } = useTheme();
  return (
    <View
      testID="home-dark-skeleton"
      style={{
        borderRadius: 22,
        padding: 16,
        marginBottom: 14,
        height,
        gap: 8,
        backgroundColor: C.card,
      }}
    >
      <Shimmer style={{ width: '40%', height: 12 }} />
      <Shimmer style={{ width: '90%', height: 14, marginTop: 6 }} />
      <Shimmer style={{ width: '60%', height: 14 }} />
    </View>
  );
}

export function TimelineItemSkeleton() {
  return (
    <View
      testID="home-timeline-skeleton"
      style={{ flexDirection: 'row', gap: 14, paddingVertical: 10, alignItems: 'center' }}
    >
      <Shimmer style={{ width: 12, height: 12, borderRadius: 6 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <Shimmer style={{ width: 60, height: 10 }} />
        <Shimmer style={{ width: '70%', height: 14 }} />
      </View>
      <Shimmer style={{ width: 30, height: 30, borderRadius: 10 }} />
    </View>
  );
}
