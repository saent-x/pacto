import React from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';
import { useColors } from '../theme';
import { FONTS, monoFamily, sansFamily } from '../theme/tokens';

type Common = {
  children?: React.ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
} & Pick<TextProps, 'onPress' | 'ellipsizeMode' | 'allowFontScaling' | 'selectable'>;

// Editorial display. (`lineHeight` is absolute px in RN.)
export function Serif({
  children,
  size = 40,
  italic,
  color,
  lh = 1.12,
  style,
  numberOfLines,
  ...rest
}: Common & { size?: number; italic?: boolean; lh?: number }) {
  const C = useColors();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          // Editorial display = Instrument Serif (matches the design system + build decision).
          fontFamily: FONTS.editorialSerif,
          fontStyle: italic ? 'italic' : 'normal',
          fontSize: size,
          // Instrument Serif clips its ascenders in RN at tight line heights — clamp like Numeral.
          lineHeight: Math.round(size * Math.max(lh, 1.04)),
          letterSpacing: size > 40 ? -0.5 : 0,
          color: color ?? C.ink,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

// Editorial numeral — Instrument Serif (the loaded serif face is a single regular
// weight, so this is reserved for big standalone numbers, matching the Today hero).
export function Numeral({
  children,
  size = 64,
  color,
  lh = 1.05,
  style,
  numberOfLines,
  ...rest
}: Common & { size?: number; lh?: number }) {
  const C = useColors();
  // Instrument Serif clips its ascenders in RN when lineHeight < ~1.03×fontSize,
  // so clamp to a safe floor regardless of the requested (visually tighter) value.
  const lineHeight = Math.round(size * Math.max(lh, 1.04));
  return (
    <Text
      allowFontScaling={false}
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: FONTS.editorialSerif,
          fontSize: size,
          lineHeight,
          letterSpacing: 0,
          color: color ?? C.ink,
          includeFontPadding: false,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

// Grotesk title / body.
export function T({
  children,
  size = 16,
  weight = 500,
  color,
  lh = 1.3,
  ls = -0.2,
  style,
  numberOfLines,
  ...rest
}: Common & { size?: number; weight?: number; lh?: number; ls?: number }) {
  const C = useColors();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: sansFamily(weight),
          fontSize: size,
          lineHeight: Math.round(size * lh),
          letterSpacing: ls,
          color: color ?? C.ink,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function Mono({
  children,
  size = 14,
  weight = 500,
  color,
  lh = 1.2,
  ls = -0.1,
  style,
  numberOfLines,
  ...rest
}: Common & { size?: number; weight?: number; lh?: number; ls?: number }) {
  const C = useColors();
  const resolvedLh = size >= 48 ? Math.max(lh, 1.08) : lh;
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: monoFamily(weight),
          fontSize: size,
          lineHeight: Math.round(size * resolvedLh),
          letterSpacing: ls,
          color: color ?? C.ink,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

// Kicker / overline.
export function Kick({
  children,
  color,
  style,
  numberOfLines = 1,
  ...rest
}: Common) {
  const C = useColors();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: FONTS.sans600,
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: color ?? C.ink3,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
