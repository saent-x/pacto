import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useColors } from '@/theme';
import { MOOD_FACE, moodById, type MoodId } from '@/constants/moods';

// A mood "container": a circle filled with the mood's own color, with a
// line-art mood glyph (mouth curve) in the middle.
export function MoodGlyph({
  mood,
  size = 30,
  active,
  dim,
  faceColor = '#FFFFFF',
  style,
}: {
  mood: MoodId | string;
  size?: number;
  active?: boolean;
  dim?: boolean;
  faceColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const C = useColors();
  const m = moodById(mood);
  if (!m) return null;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: m.color,
          alignItems: 'center',
          justifyContent: 'center',
        },
        dim ? { opacity: 0.55 } : null,
        style,
      ]}
    >
      {active && (
        <Animated.View
          pointerEvents="none"
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: size },
            { boxShadow: `0px 0px 0px 2px ${C.surface}, 0px 0px 0px 4px ${m.color}` } as object,
          ]}
        />
      )}
      <Svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <Path
          d={MOOD_FACE[m.id]}
          stroke={faceColor}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
