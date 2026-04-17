// src/components/ui/ConfettiBurst.tsx
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useColors } from '@/src/hooks/useColors';

interface ConfettiBurstProps {
  colors?: string[];
  particleCount?: number;
  duration?: number;
}

interface ParticleConfig {
  startX: number;
  velocityX: number;
  velocityY: number;
  size: number;
  color: string;
  rotation: number;
  delay: number;
  isCircle: boolean;
}

function Particle({ config, duration }: { config: ParticleConfig; duration: number }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    const easing = Easing.out(Easing.quad);
    translateX.value = withDelay(
      config.delay,
      withTiming(config.velocityX, { duration, easing }),
    );
    translateY.value = withDelay(
      config.delay,
      withTiming(config.velocityY, { duration, easing: Easing.in(Easing.quad) }),
    );
    opacity.value = withDelay(
      config.delay,
      withTiming(0, { duration: duration * 0.8, easing }),
    );
    rotate.value = withDelay(
      config.delay,
      withTiming(config.rotation, { duration, easing }),
    );
  }, [config, duration, translateX, translateY, opacity, rotate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: config.startX,
          top: 0,
          width: config.size,
          height: config.isCircle ? config.size : config.size * 1.6,
          borderRadius: config.isCircle ? config.size / 2 : 1,
          backgroundColor: config.color,
        },
        animatedStyle,
      ]}
    />
  );
}

export function ConfettiBurst({
  colors: colorsProp,
  particleCount = 35,
  duration = 2500,
}: ConfettiBurstProps) {
  const C = useColors();
  const { width } = useWindowDimensions();
  const defaultColors = [C.primary as string, C.error as string, C.cream as string];
  const particleColors = colorsProp ?? defaultColors;

  // Clean up invisible particle nodes after animation completes
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration + 300);
    return () => clearTimeout(timer);
  }, [duration]);

  const particles = useMemo<ParticleConfig[]>(() => {
    const result: ParticleConfig[] = [];
    const centerX = width / 2;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.random() - 0.5) * Math.PI;
      const speed = 80 + Math.random() * 200;
      result.push({
        startX: centerX + (Math.random() - 0.5) * 40,
        velocityX: Math.sin(angle) * speed,
        velocityY: 200 + Math.random() * 300,
        size: 2 + Math.random() * 4,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        rotation: Math.random() * 360,
        delay: Math.random() * 200,
        isCircle: Math.random() > 0.4,
      });
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <Animated.View style={styles.overlay} pointerEvents="none">
      {particles.map((config, i) => (
        <Particle key={i} config={config} duration={duration} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});
