import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import { useColors } from '../theme';
import { Serif, T } from '../ui';

// Faint concentric motif for screen corners — quiet decoration behind big numerals.
export function QCornerMotif({
  size = 260,
  top = -70,
  right = -90,
  opacity = 0.55,
  style,
}: {
  size?: number;
  top?: number;
  right?: number;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const C = useColors();
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', top, right, width: size, height: size, opacity }, style]}>
      <Svg viewBox="0 0 260 260" width="100%" height="100%">
        <Circle cx={170} cy={90} r={118} fill="none" stroke={C.line} strokeWidth={1.1} />
        <Circle cx={170} cy={90} r={82} fill="none" stroke={C.line} strokeWidth={1.1} />
        <Circle cx={170} cy={90} r={46} fill="none" stroke={C.line} strokeWidth={1.1} />
        <Circle cx={170} cy={90} r={6} fill={C.accent} opacity={0.5} />
      </Svg>
    </View>
  );
}

export type EmptyKind = 'tasks' | 'calm' | 'reminders';

// Empty-state illustration — a calm horizon with a single kept mark.
export function QEmptyArt({ kind = 'tasks', size = 150 }: { kind?: EmptyKind; size?: number }) {
  const C = useColors();
  const acc = C.accent;
  const ink = C.ink3;
  const soft = C.line;
  return (
    <Svg viewBox="0 0 160 130" width={size} height={(size * 130) / 160}>
      {kind === 'tasks' && (
        <G strokeLinecap="round" strokeLinejoin="round">
          <Circle cx={80} cy={58} r={40} fill="none" stroke={soft} strokeWidth={1.4} />
          <Path d="M62 58 l13 13 l23 -26" fill="none" stroke={acc} strokeWidth={2.6} />
          <Line x1={30} y1={112} x2={130} y2={112} stroke={ink} strokeWidth={1.4} />
          <Circle cx={44} cy={26} r={3.5} fill={acc} />
          <Circle cx={120} cy={34} r={2.5} fill={ink} opacity={0.5} />
        </G>
      )}
      {kind === 'calm' && (
        <G strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20 96 C 55 96 55 54 80 54 C 105 54 105 96 140 96" fill="none" stroke={acc} strokeWidth={2.4} />
          <Line x1={24} y1={112} x2={136} y2={112} stroke={soft} strokeWidth={1.4} />
          <Circle cx={80} cy={40} r={14} fill="none" stroke={ink} strokeWidth={1.6} />
          <Circle cx={80} cy={40} r={4} fill={acc} />
        </G>
      )}
      {kind === 'reminders' && (
        <G strokeLinecap="round" strokeLinejoin="round">
          <Circle cx={80} cy={56} r={38} fill="none" stroke={soft} strokeWidth={1.4} />
          <Path d="M80 40 v18 l12 8" fill="none" stroke={acc} strokeWidth={2.6} />
          <Line x1={30} y1={112} x2={130} y2={112} stroke={ink} strokeWidth={1.4} />
        </G>
      )}
    </Svg>
  );
}

// Empty state block — illustration + title + sub.
export function QEmpty({ kind, title, sub }: { kind: EmptyKind; title: string; sub?: string }) {
  const C = useColors();
  return (
    <View style={{ paddingTop: 34, paddingBottom: 20, alignItems: 'center' }}>
      <QEmptyArt kind={kind} size={150} />
      <View style={{ marginTop: 18 }}>
        <Serif size={26} italic color={C.ink}>
          {title}
        </Serif>
      </View>
      {sub ? (
        <View style={{ marginTop: 8, maxWidth: 230 }}>
          <T size={14} weight={450} color={C.ink3} lh={1.5} style={{ textAlign: 'center' }}>
            {sub}
          </T>
        </View>
      ) : null}
    </View>
  );
}
