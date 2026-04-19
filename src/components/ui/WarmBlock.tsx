/**
 * Warm Block atoms — signature design language for Coupl.
 *
 * Pastel slab cards, chunky display type, triple ring, gold rule,
 * wavy underline, icon tiles. Use these everywhere.
 */
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  type ViewStyle, type TextStyle, type StyleProp,
} from 'react-native';
import Svg, {
  Circle, Path, Defs, LinearGradient as SvgGradient, Stop,
} from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { Pastels, pastelTint } from '@/src/constants/pastels';

/* ─── Overline ─── */

export function Overline({
  children,
  color,
  style,
}: { children: React.ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  const C = useColors();
  return (
    <Text style={[styles.overline, { color: color ?? C.fog }, style]}>
      {children}
    </Text>
  );
}

/* ─── Display ─── */

export function Display({
  children,
  size = 38,
  color,
  style,
}: {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const C = useColors();
  const base =
    size === 'sm' ? Typography.displayChunkySm
    : size === 'md' ? Typography.displayChunky
    : size === 'lg' ? Typography.displayChunkyLg
    : size === 'xl' ? Typography.displayChunkyXl
    : { ...Typography.displayChunky, fontSize: size, lineHeight: size };
  return (
    <Text style={[base, { color: color ?? C.text }, style]}>
      {children}
    </Text>
  );
}

/* ─── Pastel Block Card ─── */

export type Pastel = 'peach' | 'lavender' | 'butter' | 'mint' | 'rose' | 'sky';

export function BlockCard({
  pastel = 'peach',
  bg,
  ink,
  children,
  style,
  onPress,
}: {
  pastel?: Pastel;
  bg?: string;
  ink?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const paletteBg = bg ?? Pastels[pastel];
  const paletteInk = ink ?? Pastels[`${pastel}Ink` as keyof typeof Pastels];
  const content = (
    <View
      style={[
        styles.blockCard,
        { backgroundColor: paletteBg },
        style,
      ]}
    >
      {/* children can use paletteInk via context, but for now we pass via style in caller */}
      {children}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
      >
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

/* ─── Dark / Glass Card (surface card) ─── */

export function GlassCard({
  children,
  style,
  padding = Spacing.xl,
  border = true,
  blur = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  border?: boolean;
  blur?: boolean;
}) {
  const C = useColors();
  const { mode } = useTheme();

  if (blur && Platform.OS === 'ios') {
    return (
      <BlurView
        tint={mode === 'dark' ? 'dark' : 'light'}
        intensity={30}
        style={[
          styles.glassCard,
          {
            padding,
            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            borderWidth: border ? StyleSheet.hairlineWidth : 0,
          },
          style,
        ]}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <View
      style={[
        styles.glassCard,
        {
          backgroundColor: C.card,
          padding,
          borderColor: C.border,
          borderWidth: border ? StyleSheet.hairlineWidth : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ─── DarkCard (alias of GlassCard — canonical elevated surface) ─── */

export const DarkCard = GlassCard;

/* ─── Round icon button ─── */

export function RoundBtn({
  icon,
  onPress,
  size = 40,
  bg,
  color,
  border = true,
  style,
  iconSize,
}: {
  icon: keyof typeof Feather.glyphMap;
  onPress?: () => void;
  size?: number;
  bg?: string;
  color?: string;
  border?: boolean;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
}) {
  const C = useColors();
  return (
    <TouchableOpacity
      onPress={() => {
        if (onPress) {
          Haptics.selectionAsync();
          onPress();
        }
      }}
      activeOpacity={0.75}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg ?? C.card,
          borderWidth: border ? 1 : 0,
          borderColor: C.line ?? C.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Feather name={icon} size={iconSize ?? size * 0.45} color={color ?? C.text} strokeWidth={2.2 as any} />
    </TouchableOpacity>
  );
}

/* ─── Pill button ─── */

export function Pill({
  children,
  onPress,
  active = false,
  color,
  bg,
  size = 'md',
  icon,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  active?: boolean;
  color?: string;
  bg?: string;
  size?: 'sm' | 'md';
  icon?: keyof typeof Feather.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const C = useColors();
  const paletteColor = active ? (color ?? Pastels.gold) : C.textSecondary;
  const paletteBg = active ? (bg ?? Pastels.goldSoft) : 'transparent';
  const border = active ? 'transparent' : C.border;

  return (
    <TouchableOpacity
      onPress={() => {
        if (onPress) {
          Haptics.selectionAsync();
          onPress();
        }
      }}
      activeOpacity={0.7}
      style={[
        styles.pill,
        size === 'sm' ? styles.pillSm : styles.pillMd,
        { backgroundColor: paletteBg, borderColor: border },
        style,
      ]}
    >
      {icon && <Feather name={icon} size={size === 'sm' ? 11 : 12} color={paletteColor} />}
      <Text
        style={[
          styles.pillText,
          { fontSize: size === 'sm' ? 11 : 12, color: paletteColor },
        ]}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}

/* ─── Icon tile ─── */

export function IconTile({
  icon,
  color = Pastels.gold,
  bg,
  size = 36,
  radius = 11,
}: {
  icon: keyof typeof Feather.glyphMap;
  color?: string;
  bg?: string;
  size?: number;
  radius?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: bg ?? pastelTint(color, 0.14),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Feather name={icon} size={size * 0.5} color={color} />
    </View>
  );
}

/* ─── Gold rule (brand accent underline) ─── */

export function GoldRule({ width = 28, color = Pastels.gold, style }: { width?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width, height: 2, borderRadius: 1, backgroundColor: color }, style]} />;
}

/* ─── Wavy underline (decorative, under names/titles) ─── */

export function WavyUnderline({ width = 130, color = Pastels.gold, opacity = 0.8 }: { width?: number; color?: string; opacity?: number }) {
  const h = 8;
  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} opacity={opacity}>
      <Path
        d={`M0 4 Q ${width * 0.125} 0, ${width * 0.25} 4 T ${width * 0.5} 4 T ${width * 0.75} 4 T ${width} 4`}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/* ─── Triple ring (signature hero element) ─── */

export function TripleRing({
  size = 108,
  values = [0.82, 0.68, 0.95],
  colors = [Pastels.peachInk, Pastels.gold, Pastels.lavender],
  trackColor = 'rgba(0,0,0,0.18)',
  strokeWidth = 7,
  gap = 4,
}: {
  size?: number;
  values?: [number, number, number];
  colors?: [string, string, string];
  trackColor?: string;
  strokeWidth?: number;
  gap?: number;
}) {
  const radii = [0, 1, 2].map((i) => (size - strokeWidth) / 2 - i * (strokeWidth + gap));
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      {radii.map((r, i) => {
        const c = 2 * Math.PI * r;
        return (
          <React.Fragment key={i}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={trackColor}
              strokeWidth={strokeWidth}
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={colors[i]}
              strokeWidth={strokeWidth}
              strokeDasharray={`${c} ${c}`}
              strokeDashoffset={c * (1 - values[i])}
              strokeLinecap="round"
            />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

/* ─── Progress ring (single) ─── */

export function ProgressRing({
  size = 90,
  value = 0.82,
  strokeWidth = 8,
  colors = [Pastels.peach, Pastels.butter, Pastels.lavender],
  trackColor = 'rgba(255,255,255,0.18)',
  children,
}: {
  size?: number;
  value?: number;
  strokeWidth?: number;
  colors?: string[];
  trackColor?: string;
  children?: React.ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const gradId = `progressring-${size}-${Math.round(value * 100)}`;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            {colors.map((col, i) => (
              <Stop key={i} offset={`${(i / (colors.length - 1)) * 100}%`} stopColor={col} />
            ))}
          </SvgGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - value)}
          strokeLinecap="round"
        />
      </Svg>
      {children && (
        <View
          style={{
            position: 'absolute',
            inset: 0 as any,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children}
        </View>
      )}
    </View>
  );
}

/* ─── Section header (overline label + optional action) ─── */

export function SectionHeader({
  label,
  action,
  style,
}: {
  label: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Overline>{label}</Overline>
      {action}
    </View>
  );
}

/* ─── Avatar (initial) ─── */

export function Avatar({
  letter,
  size = 36,
  bg = Pastels.peach,
  color = Pastels.peachInk,
  border,
  style,
}: {
  letter: string;
  size?: number;
  bg?: string;
  color?: string;
  border?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: border ? 2 : 0,
          borderColor: border,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: Typography.displayFont,
          fontWeight: '700',
          fontSize: size * 0.44,
          color,
        }}
      >
        {(letter || '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  overline: {
    ...Typography.overline,
    fontFamily: Typography.sansMedium,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  blockCard: {
    borderRadius: 22,
    padding: 18,
    overflow: 'hidden',
    position: 'relative',
  },

  glassCard: {
    borderRadius: 22,
    overflow: 'hidden',
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillMd: { paddingHorizontal: 14, paddingVertical: 8 },
  pillSm: { paddingHorizontal: 12, paddingVertical: 6 },
  pillText: {
    fontFamily: Typography.sansSemiBold,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: Spacing.md,
  },
});
