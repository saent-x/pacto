import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { StyleSheet, ViewStyle } from 'react-native';

/**
 * Inline pulsing full-stop. Drops in as the trailing accent dot after a
 * pixel-font headline ("Wishlists." / "Milestones.").
 *
 * Lives inside a parent <Text> as an inline animated <Text> child.
 */
export function PulsingDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.Text style={[{ color }, animatedStyle]}>.</Animated.Text>;
}

export function PulsingStatusDot({
  color,
  size = 7,
  style,
}: {
  color: string;
  size?: number;
  style?: ViewStyle;
}) {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 1;
      scale.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.38, { duration: 760, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 760, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(0.78, { duration: 760, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 760, easing: Easing.out(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [opacity, reducedMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.statusDot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  statusDot: {
    flexShrink: 0,
  },
});
