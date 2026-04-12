// src/components/ui/OrbitalRings.tsx
import { useEffect } from 'react';
import { StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { useColors } from '@/src/hooks/useColors';

interface OrbitalRingsProps {
  variant: 'orbiting' | 'approaching';
}

const RING_SIZE = 60;
const ORBIT_RADIUS = 30;
const CONTAINER_HEIGHT = 160;

export function OrbitalRings({ variant }: OrbitalRingsProps) {
  const C = useColors();
  const progress = useSharedValue(0);

  useEffect(() => {
    const duration = variant === 'orbiting' ? 6000 : 8000;
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [progress, variant]);

  const ring1Style = useAnimatedStyle(() => {
    if (variant === 'orbiting') {
      const angle = progress.value * Math.PI * 2;
      return {
        transform: [
          { translateX: Math.cos(angle) * ORBIT_RADIUS },
          { translateY: Math.sin(angle) * (ORBIT_RADIUS * 0.6) },
        ],
      };
    }
    // approaching: start apart, drift together, drift apart
    const t = progress.value;
    const curveOffset = Math.sin(t * Math.PI) * 12;
    return {
      transform: [
        { translateX: -40 + 34 * t },
        { translateY: -14 + 14 * t + curveOffset },
      ],
    };
  });

  const ring2Style = useAnimatedStyle(() => {
    if (variant === 'orbiting') {
      const angle = progress.value * Math.PI * 2 + Math.PI;
      return {
        transform: [
          { translateX: Math.cos(angle) * ORBIT_RADIUS },
          { translateY: Math.sin(angle) * (ORBIT_RADIUS * 0.6) },
        ],
      };
    }
    const t = progress.value;
    const curveOffset = Math.sin(t * Math.PI) * -12;
    return {
      transform: [
        { translateX: 40 - 34 * t },
        { translateY: 14 - 14 * t + curveOffset },
      ],
    };
  });

  const shadowStyle = Platform.select({
    ios: {
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
    default: {},
  });

  return (
    <Animated.View entering={FadeIn.duration(800)} style={styles.container}>
      <Animated.View
        style={[
          styles.ring,
          { borderColor: C.primary },
          shadowStyle,
          ring1Style,
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          { borderColor: C.primary },
          shadowStyle,
          ring2Style,
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: CONTAINER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
  },
});
