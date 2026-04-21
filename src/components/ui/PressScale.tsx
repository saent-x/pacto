import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Scale 0.96 on press — tactile feedback per interface-polish rules.
// Spring with bounce 0 for instant, non-bouncy response.
export function PressScale({
  children,
  style,
  disabled,
  static: staticMode = false,
  ...rest
}: PressableProps & {
  style?: StyleProp<ViewStyle>;
  static?: boolean;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = (e: any) => {
    if (!staticMode && !disabled) {
      scale.value = withTiming(0.96, { duration: 90, easing: Easing.out(Easing.quad) });
    }
    rest.onPressIn?.(e);
  };

  const onPressOut = (e: any) => {
    if (!staticMode) {
      scale.value = withSpring(1, { damping: 18, stiffness: 280, mass: 0.5 });
    }
    rest.onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[style as any, animStyle]}
    >
      {children as any}
    </AnimatedPressable>
  );
}
