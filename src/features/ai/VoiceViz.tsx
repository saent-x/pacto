import React from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  cancelAnimation,
  interpolate,
  Extrapolation,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';

// dBFS (~-160..0) → 0..1, with speech roughly in -50..-5.
export const normMeter = (db: number) => Math.max(0, Math.min(1, (db + 50) / 45));

/**
 * Expanding, fading ring(s) behind the mic button while `active` (a 0/1 shared
 * value). Driven entirely on the UI thread.
 */
export function PulseRing({
  active,
  size,
  color,
  rings = 2,
}: {
  active: SharedValue<number>;
  size: number;
  color: string;
  rings?: number;
}) {
  return (
    <>
      {Array.from({ length: rings }, (_, i) => (
        <Ring key={i} active={active} size={size} color={color} delay={(i * 600) / rings} />
      ))}
    </>
  );
}

function Ring({
  active,
  size,
  color,
  delay,
}: {
  active: SharedValue<number>;
  size: number;
  color: string;
  delay: number;
}) {
  const progress = useSharedValue(0);

  useAnimatedReaction(
    () => active.value,
    (held, prev) => {
      if (held === prev) return;
      if (held === 1) {
        progress.value = 0;
        progress.value = withDelay(
          delay,
          withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }), -1, false),
        );
      } else {
        cancelAnimation(progress);
        progress.value = withTiming(0, { duration: 220 });
      }
    },
  );

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 2.2], Extrapolation.CLAMP) }],
    opacity: interpolate(progress.value, [0, 0.12, 1], [0, 0.4, 0], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size,
          borderWidth: 2,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}

/**
 * Voice waveform. `level` is a 0..1 shared value.
 * - mode 'level': bars track the live mic amplitude (Whisper hold-to-talk).
 * - mode 'pulse': bars shimmer on a gentle loop (Realtime live listening).
 */
export function Waveform({
  level,
  active,
  color,
  mode = 'level',
  bars = 7,
  height = 26,
  width = 4,
  gap = 4,
}: {
  level: SharedValue<number>;
  active: SharedValue<number>;
  color: string;
  mode?: 'level' | 'pulse';
  bars?: number;
  height?: number;
  width?: number;
  gap?: number;
}) {
  // Per-bar weighting so the centre is tallest.
  const weights = React.useMemo(
    () => Array.from({ length: bars }, (_, i) => 0.45 + 0.55 * Math.sin((Math.PI * (i + 1)) / (bars + 1))),
    [bars],
  );

  return (
    <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      {weights.map((w, i) => (
        <Bar
          key={i}
          index={i}
          weight={w}
          level={level}
          active={active}
          color={color}
          mode={mode}
          maxH={height}
          width={width}
        />
      ))}
    </Animated.View>
  );
}

function Bar({
  index,
  weight,
  level,
  active,
  color,
  mode,
  maxH,
  width,
}: {
  index: number;
  weight: number;
  level: SharedValue<number>;
  active: SharedValue<number>;
  color: string;
  mode: 'level' | 'pulse';
  maxH: number;
  width: number;
}) {
  const minH = Math.max(3, width);
  const shimmer = useSharedValue(0);

  useAnimatedReaction(
    () => active.value,
    (on, prev) => {
      if (on === prev) return;
      if (mode === 'pulse' && on === 1) {
        shimmer.value = withDelay(
          index * 90,
          withRepeat(
            withSequence(
              withTiming(1, { duration: 380, easing: Easing.inOut(Easing.ease) }),
              withTiming(0.25, { duration: 380, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            true,
          ),
        );
      } else {
        cancelAnimation(shimmer);
        shimmer.value = withTiming(0, { duration: 180 });
      }
    },
  );

  const style = useAnimatedStyle(() => {
    const drive = mode === 'pulse' ? shimmer.value : level.value;
    const h = interpolate(drive * weight, [0, 1], [minH, maxH], Extrapolation.CLAMP);
    return {
      height: h,
      opacity: interpolate(active.value, [0, 1], [0.3, 1], Extrapolation.CLAMP),
    };
  });

  return (
    <Animated.View style={[{ width, borderRadius: width, backgroundColor: color }, style]} />
  );
}
