import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { useColors } from '../theme';
import { FONTS, RADII, SHADOWS } from '../theme/tokens';
import { Press } from './Press';
import { Icon, type IconName } from './Icon';
import { Serif, T, Kick } from './Text';
import { Glass, glassOK } from './Glass';

// RN 0.85 (new arch) supports the boxShadow style string; cast past the older types.
const shadow = (s: string): ViewStyle => ({ boxShadow: s }) as unknown as ViewStyle;

export function Card({
  children,
  onPress,
  pad = 20,
  radius = RADII.card,
  style,
}: {
  children?: React.ReactNode;
  onPress?: () => void;
  pad?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const C = useColors();
  const inner = (
    <View
      style={[
        { backgroundColor: C.surface, borderRadius: radius, padding: pad },
        shadow(SHADOWS.card),
        style,
      ]}
    >
      {children}
    </View>
  );
  return onPress ? <Press onPress={onPress}>{inner}</Press> : inner;
}

export function Avatar({
  letter = 'V',
  size = 34,
  accent,
}: {
  letter?: string;
  size?: number;
  accent?: boolean;
}) {
  const C = useColors();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: accent ? C.accent : C.ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: FONTS.display600,
          fontSize: size * 0.5,
          lineHeight: size * 0.62,
          color: accent ? C.onAccent : C.bg,
        }}
      >
        {letter}
      </Text>
    </View>
  );
}

export function Pill({
  children,
  active,
  onPress,
  style,
  icon,
  iconColor,
  leading,
}: {
  children?: React.ReactNode;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  icon?: IconName;
  iconColor?: string;
  leading?: React.ReactNode;
}) {
  const C = useColors();
  return (
    <Press onPress={onPress} haptic style={[{ borderRadius: RADII.pill }, style]}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 8,
          paddingLeft: leading ? 5 : 16,
          paddingRight: 16,
          borderRadius: RADII.pill,
          backgroundColor: active ? C.ink : 'transparent',
          borderWidth: 1,
          borderColor: active ? C.ink : C.line,
        }}
      >
        {leading}
        {icon && <Icon name={icon} size={13} color={iconColor ?? (active ? C.bg : C.ink2)} strokeWidth={2.2} />}
        <T size={13} weight={500} color={active ? C.bg : C.ink2} numberOfLines={1} style={{ letterSpacing: -0.1 }}>
          {children}
        </T>
      </View>
    </Press>
  );
}

export function Chip({
  label,
  variant = 'solid',
  color,
}: {
  label: string;
  variant?: 'solid' | 'outline';
  color?: string;
}) {
  const C = useColors();
  const solid = variant === 'solid';
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 9,
        borderRadius: RADII.pill,
        backgroundColor: solid ? (color ?? C.accent) : 'transparent',
        borderWidth: solid ? 0 : 1,
        borderColor: C.line,
      }}
    >
      <T
        size={10}
        allowFontScaling={false}
        color={solid ? C.onAccent : C.ink3}
        style={{
          fontFamily: FONTS.sans600,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </T>
    </View>
  );
}

export function Bar({
  value = 0,
  h = 4,
  color,
  track,
  style,
}: {
  value?: number;
  h?: number;
  color?: string;
  track?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const C = useColors();
  return (
    <View style={[{ height: h, borderRadius: h, backgroundColor: track ?? C.line, overflow: 'hidden' }, style]}>
      <View
        style={{
          width: `${Math.min(100, Math.max(0, value * 100))}%`,
          height: '100%',
          borderRadius: h,
          backgroundColor: color ?? C.accent,
        }}
      />
    </View>
  );
}

export function Div({ style }: { style?: StyleProp<ViewStyle> }) {
  const C = useColors();
  return <View style={[{ height: 1, backgroundColor: C.line }, style]} />;
}

export function RoundBtn({
  name,
  onPress,
  size = 42,
  fill,
  color,
  line = true,
  iconSize,
  glass = true,
  tint,
  accessibilityLabel,
}: {
  name: IconName;
  onPress?: () => void;
  size?: number;
  fill?: string;
  color?: string;
  line?: boolean;
  iconSize?: number;
  /** Liquid-glass surface on iOS 26 (default). Set false to force the solid look. */
  glass?: boolean;
  tint?: string;
  /** VoiceOver label — required for these icon-only controls to be accessible. */
  accessibilityLabel?: string;
}) {
  const C = useColors();
  const icon = <Icon name={name} size={iconSize ?? 19} color={color ?? C.ink} strokeWidth={1.8} />;
  const dims = {
    width: size,
    height: size,
    borderRadius: size,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  } as const;
  // Expand the touch target to >=44pt (HIG) without growing the visual size.
  const hitSlop = Math.max(0, Math.ceil((44 - size) / 2));

  // Glass-by-default header button: interactive liquid glass + the tab bar's
  // selection haptic + press scale. A provided `fill` becomes the glass tint
  // (e.g. ink-tinted primary "+"); secondary buttons get clear glass.
  if (glass && glassOK) {
    return (
      <Press
        onPress={onPress}
        scale={0.9}
        haptic
        hitSlop={hitSlop}
        accessibilityLabel={accessibilityLabel}
        style={{ borderRadius: size }}
      >
        <Glass interactive tintColor={tint ?? fill} style={dims}>
          {icon}
        </Glass>
      </Press>
    );
  }

  return (
    <Press
      onPress={onPress}
      scale={0.9}
      haptic
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      style={{ borderRadius: size }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: fill ?? 'transparent',
          borderWidth: line && !fill ? 1 : 0,
          borderColor: C.line,
        }}
      >
        {icon}
      </View>
    </Press>
  );
}

export function PrimaryBtn({
  children,
  onPress,
  icon,
  disabled,
  bg,
  fg,
  style,
}: {
  children?: React.ReactNode;
  onPress?: () => void;
  icon?: IconName;
  disabled?: boolean;
  bg?: string;
  fg?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const C = useColors();
  const background = disabled ? C.surface2 : (bg ?? C.accent);
  const foreground = disabled ? C.ink2 : (fg ?? C.onAccent);
  return (
    <Press onPress={disabled ? undefined : onPress} disabled={disabled} haptic style={[{ borderRadius: RADII.button }, style]}>
      <View
        style={{
          minHeight: 54,
          borderRadius: RADII.button,
          backgroundColor: background,
          borderWidth: disabled ? 1 : 0,
          borderColor: C.line,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
          paddingHorizontal: 18,
        }}
      >
        {icon && <Icon name={icon} size={18} color={foreground} strokeWidth={2.1} />}
        <T size={16} weight={600} color={foreground} style={{ letterSpacing: -0.2 }}>
          {children}
        </T>
      </View>
    </Press>
  );
}

export function GhostBtn({
  children,
  onPress,
  icon,
  style,
}: {
  children?: React.ReactNode;
  onPress?: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const C = useColors();
  return (
    <Press onPress={onPress} haptic style={[{ borderRadius: RADII.button }, style]}>
      <View
        style={[
          {
            minHeight: 52,
            borderRadius: RADII.button,
            backgroundColor: C.surface,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            paddingHorizontal: 18,
          },
          shadow(SHADOWS.ghost),
        ]}
      >
        {icon && <Icon name={icon} size={18} color={C.ink} strokeWidth={1.9} />}
        <T size={15.5} weight={600} color={C.ink} style={{ letterSpacing: -0.2 }}>
          {children}
        </T>
      </View>
    </Press>
  );
}

export function Stat({
  value,
  label,
  size = 64,
  accent,
}: {
  value: React.ReactNode;
  label: string;
  size?: number;
  accent?: boolean;
}) {
  const C = useColors();
  return (
    <View>
      <Serif size={size} color={accent ? C.accent : C.ink} lh={0.95}>
        {value}
      </Serif>
      <Kick style={{ marginTop: 4 }}>{label}</Kick>
    </View>
  );
}

export function MoodDot({ v, size = 30, style }: { v: number; size?: number; style?: StyleProp<ViewStyle> }) {
  const C = useColors();
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size, backgroundColor: C.accent, opacity: 0.25 + v * 0.75 },
        style,
      ]}
    />
  );
}
