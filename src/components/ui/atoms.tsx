import React, { useEffect } from 'react';
import {
  Pressable,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/src/lib/theme';
import { Icon, IconName } from './Icon';
import { PressScale } from './PressScale';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ───────── Avatar ─────────
export function Avatar({
  letter = 'M',
  size = 36,
  bg,
  color,
  border,
  style,
}: {
  letter?: string;
  size?: number;
  bg?: string;
  color?: string;
  border?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { C, F } = useTheme();
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg ?? C.peach,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: border ? 2 : 0,
          borderColor: border ?? 'transparent',
        },
        style,
      ]}
    >
      <Text
        style={{
          color: color ?? C.peachInk,
          fontFamily: F.display,
          fontSize: size * 0.44,
        }}
      >
        {letter}
      </Text>
    </View>
  );
}

// ───────── Overline ─────────
export function Overline({
  children,
  color,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const { C, F } = useTheme();
  return (
    <Text
      style={[
        {
          fontFamily: F.bodyBold,
          fontSize: 10,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: color ?? C.fog,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ───────── Display ─────────
export function Display({
  children,
  size = 34,
  color,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const { C, F } = useTheme();
  return (
    <Text
      style={[
        {
          fontFamily: F.displayBold,
          fontSize: size,
          color: color ?? C.bone,
          lineHeight: size * 0.95,
          letterSpacing: -1,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ───────── Cards ─────────
export function BlockCard({
  bg,
  ink,
  children,
  style,
  onPress,
  testID,
}: {
  bg?: string;
  ink?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  testID?: string;
}) {
  const { C } = useTheme();
  const Wrapper: any = onPress ? PressScale : View;
  return (
    <Wrapper
      onPress={onPress}
      testID={testID}
      style={[
        {
          backgroundColor: bg ?? C.peach,
          borderRadius: 22,
          padding: 18,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </Wrapper>
  );
}

export function DarkCard({
  children,
  style,
  onPress,
  border = true,
  padding = 18,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  border?: boolean;
  padding?: number;
}) {
  const { C } = useTheme();
  const Wrapper: any = onPress ? PressScale : View;
  return (
    <Wrapper
      onPress={onPress}
      style={[
        {
          backgroundColor: C.card,
          borderRadius: 22,
          padding,
          borderWidth: border ? 1 : 0,
          borderColor: C.line,
        },
        style,
      ]}
    >
      {children}
    </Wrapper>
  );
}

// ───────── Pill ─────────
export function Pill({
  children,
  bg,
  color,
  active = false,
  activeBg,
  activeColor,
  onPress,
  size = 'md',
  style,
  testID,
}: {
  children: React.ReactNode;
  bg?: string;
  color?: string;
  active?: boolean;
  activeBg?: string;
  activeColor?: string;
  onPress?: () => void;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { C, F } = useTheme();
  const padV = size === 'sm' ? 6 : 8;
  const padH = size === 'sm' ? 12 : 14;
  const fs = size === 'sm' ? 11 : 12;
  return (
    <PressScale
      onPress={onPress}
      hitSlop={8}
      testID={testID}
      style={[
        {
          backgroundColor: active ? activeBg ?? bg ?? C.goldSoft : 'transparent',
          borderWidth: active ? 0 : 1,
          borderColor: C.line,
          borderRadius: 999,
          paddingVertical: padV,
          paddingHorizontal: padH,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text
        style={{
          color: active ? activeColor ?? color ?? C.gold : C.mist,
          fontFamily: F.bodyBold,
          fontSize: fs,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        {children}
      </Text>
    </PressScale>
  );
}

export function Badge({
  children,
  bg,
  color,
  style,
}: {
  children: React.ReactNode;
  bg?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { C, F } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: bg ?? C.goldSoft,
          borderRadius: 999,
          paddingHorizontal: 9,
          paddingVertical: 4,
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: color ?? C.gold,
          fontFamily: F.bodyBold,
          fontSize: 10,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}
      >
        {children}
      </Text>
    </View>
  );
}

// ───────── Icon tile ─────────
export function IconTile({
  icon,
  bg,
  color,
  size = 36,
  radius = 11,
  iconSize,
}: {
  icon: IconName;
  bg?: string;
  color?: string;
  size?: number;
  radius?: number;
  iconSize?: number;
}) {
  const { C } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: bg ?? C.goldSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={iconSize ?? size * 0.5} color={color ?? C.gold} strokeWidth={2.2} />
    </View>
  );
}

// ───────── Buttons ─────────
export function PrimaryButton({
  children,
  onPress,
  disabled,
  icon,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const { C, F } = useTheme();
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          backgroundColor: disabled ? C.cardHi : C.gold,
          borderRadius: 999,
          height: 54,
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={18} color={disabled ? C.fog : C.peachInk} />}
      <Text
        style={{
          color: disabled ? C.fog : C.peachInk,
          fontFamily: F.displayBold,
          fontSize: 16,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        {children}
      </Text>
    </PressScale>
  );
}

export function RoundBtn({
  icon,
  onPress,
  bg,
  color,
  size = 40,
  border,
  iconSize,
  style,
}: {
  icon: IconName;
  onPress?: () => void;
  bg?: string;
  color?: string;
  size?: number;
  border?: string | null;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { C } = useTheme();
  const borderColor = border === null ? null : border ?? C.line;
  // Extend hit area to 40×40 minimum
  const hitPad = Math.max(0, (40 - size) / 2);
  return (
    <PressScale
      onPress={onPress}
      hitSlop={hitPad}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg ?? C.card,
          borderWidth: borderColor ? 1 : 0,
          borderColor: borderColor ?? 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Icon name={icon} size={iconSize ?? size * 0.45} color={color ?? C.bone} strokeWidth={2.2} />
    </PressScale>
  );
}

// ───────── Rings ─────────
export function ProgressRing({
  size = 90,
  stroke = 8,
  value = 0.82,
  colors,
  bg = 'rgba(255,255,255,0.2)',
  label,
  labelColor,
}: {
  size?: number;
  stroke?: number;
  value?: number;
  colors?: string[];
  bg?: string;
  label?: string;
  labelColor?: string;
}) {
  const { C, F } = useTheme();
  const cs = colors ?? [C.peach, C.butter, C.lavender];
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const id = `rg-${size}-${value}`;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            {cs.map((col, i) => (
              <Stop key={i} offset={`${(i / Math.max(1, cs.length - 1)) * 100}%`} stopColor={col} />
            ))}
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - value)}
          strokeLinecap="round"
        />
      </Svg>
      {label !== undefined && (
        <Text
          style={{
            position: 'absolute',
            fontFamily: F.displayBold,
            fontSize: size * 0.26,
            color: labelColor ?? C.peachInk,
            letterSpacing: -0.5,
            fontVariant: ['tabular-nums'],
          }}
        >
          {label}
        </Text>
      )}
    </View>
  );
}

export function TripleRing({
  size = 96,
  values = [0.82, 0.65, 0.9],
  colors,
  bg = 'rgba(0,0,0,0.25)',
  stroke,
  gap,
}: {
  size?: number;
  values?: number[];
  colors?: string[];
  bg?: string;
  stroke?: number;
  gap?: number;
}) {
  const { C } = useTheme();
  const cs = colors ?? [C.peach, C.butter, C.lavender];
  const s = stroke ?? Math.max(3, Math.round(size * 0.1));
  const g = gap ?? Math.max(1, Math.round(size * 0.03));
  const radii = [0, 1, 2].map((i) => (size - s) / 2 - i * (s + g));
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      {radii.map((r, i) => {
        const c = 2 * Math.PI * r;
        return (
          <React.Fragment key={i}>
            <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={s} />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={cs[i]}
              strokeWidth={s}
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

// ───────── AnimatedTripleRing (mount-stagger fill) ─────────
export function AnimatedTripleRing({
  size = 36,
  stroke = 3.5,
  gap = 1.5,
  values = [0, 0, 0] as [number, number, number],
  colors,
  bg = 'rgba(255,255,255,0.08)',
  delay = 0,
  duration = 500,
  enabled = true,
}: {
  size?: number;
  stroke?: number;
  gap?: number;
  values: [number, number, number];
  colors?: [string, string, string];
  bg?: string;
  delay?: number;
  duration?: number;
  enabled?: boolean;
}) {
  const { C } = useTheme();
  const cs = colors ?? [C.peach, C.gold, C.lavender];
  const reduced = useReducedMotion();
  const s = stroke;
  const g = gap;
  const r0 = (size - s) / 2;
  const r1 = r0 - (s + g);
  const r2 = r1 - (s + g);
  const c0 = 2 * Math.PI * r0;
  const c1 = 2 * Math.PI * r1;
  const c2 = 2 * Math.PI * r2;

  const p0 = useSharedValue(0);
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);

  useEffect(() => {
    const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
    const apply = (sv: ReturnType<typeof useSharedValue<number>>, v: number, ringDelay: number) => {
      if (!enabled || reduced) {
        sv.value = v;
      } else {
        sv.value = withDelay(delay + ringDelay, withTiming(v, { duration, easing: ease }));
      }
    };
    apply(p0, values[0], 0);
    apply(p1, values[1], 40);
    apply(p2, values[2], 80);
  }, [values, delay, duration, enabled, reduced, p0, p1, p2]);

  const a0 = useAnimatedProps(() => ({ strokeDashoffset: c0 * (1 - p0.value) }));
  const a1 = useAnimatedProps(() => ({ strokeDashoffset: c1 * (1 - p1.value) }));
  const a2 = useAnimatedProps(() => ({ strokeDashoffset: c2 * (1 - p2.value) }));

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r0} fill="none" stroke={bg} strokeWidth={s} />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={r0}
        fill="none"
        stroke={cs[0]}
        strokeWidth={s}
        strokeDasharray={`${c0} ${c0}`}
        strokeLinecap="round"
        animatedProps={a0}
      />
      <Circle cx={size / 2} cy={size / 2} r={r1} fill="none" stroke={bg} strokeWidth={s} />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={r1}
        fill="none"
        stroke={cs[1]}
        strokeWidth={s}
        strokeDasharray={`${c1} ${c1}`}
        strokeLinecap="round"
        animatedProps={a1}
      />
      <Circle cx={size / 2} cy={size / 2} r={r2} fill="none" stroke={bg} strokeWidth={s} />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={r2}
        fill="none"
        stroke={cs[2]}
        strokeWidth={s}
        strokeDasharray={`${c2} ${c2}`}
        strokeLinecap="round"
        animatedProps={a2}
      />
    </Svg>
  );
}

// ───────── Section header ─────────
export function SectionHeader({
  label,
  action,
}: {
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
        marginBottom: 12,
      }}
    >
      <Overline>{label}</Overline>
      {action}
    </View>
  );
}

// ───────── Wavy underline ─────────
export function WavyUnderline({
  width = 130,
  color,
  opacity = 0.75,
}: {
  width?: number;
  color?: string;
  opacity?: number;
}) {
  const { C } = useTheme();
  const c = color ?? C.gold;
  const d = `M0 4 Q ${width * 0.125} 0, ${width * 0.25} 4 T ${width * 0.5} 4 T ${width * 0.75} 4 T ${width} 4`;
  return (
    <Svg width={width} height={8} viewBox={`0 0 ${width} 8`} opacity={opacity}>
      <Path d={d} fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ───────── Unified screen header ─────────
export function ScreenHeader({
  eyebrow,
  title,
  accent,
  meta,
  action,
  underlineColor,
}: {
  eyebrow?: string;
  title: string;
  accent?: string;
  meta?: string;
  action?: React.ReactNode;
  underlineColor?: string;
}) {
  const { C, F } = useTheme();
  const ac = accent ?? C.gold;
  return (
    <View style={{ marginBottom: 18 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <View style={{ flex: 1 }}>
          {!!eyebrow && <Overline style={{ marginBottom: 8 }}>{eyebrow}</Overline>}
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 42,
              color: C.bone,
              letterSpacing: -1.2,
              lineHeight: 42 * 0.98,
            }}
          >
            {title}
            <Text style={{ color: ac }}>.</Text>
          </Text>
        </View>
        {action}
      </View>
      <View style={{ marginTop: 10 }}>
        <WavyUnderline width={96} color={underlineColor ?? ac} />
      </View>
      {!!meta && (
        <Text
          style={{
            marginTop: 10,
            fontSize: 11,
            color: C.mist,
            fontFamily: F.body,
            letterSpacing: 0.4,
          }}
        >
          {meta}
        </Text>
      )}
    </View>
  );
}

// ───────── Sticky date row (for sectioned lists) ─────────
export function StickyDate({
  label,
  count,
  color,
  collapsible,
  open,
  onToggle,
}: {
  label: string;
  count?: number;
  color?: string;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  const { C, F } = useTheme();
  const Wrapper: any = collapsible ? Pressable : View;
  return (
    <Wrapper
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: C.line,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color ?? C.gold }} />
      <Text
        style={{
          fontFamily: F.bodyBold,
          fontSize: 10,
          letterSpacing: 1.6,
          textTransform: 'uppercase',
          color: C.bone,
        }}
      >
        {label}
      </Text>
      {count != null && (
        <Text
          style={{ fontSize: 10, color: C.fog, fontFamily: F.bodyBold, flex: 1 }}
        >
          {count}
        </Text>
      )}
      {collapsible && (
        <Icon
          name={open ? 'chevronDown' : 'chevronRight'}
          size={14}
          color={C.fog}
        />
      )}
    </Wrapper>
  );
}

// ───────── Date-bucketed list (auto-collapse after N sections) ─────────
export function DateSectioned<T>({
  sections,
  maxOpen = 3,
  renderItem,
  defaultColor,
}: {
  sections: { label: string; color?: string; items: T[] }[];
  maxOpen?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  defaultColor?: string;
}) {
  const { C, F } = useTheme();
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  return (
    <View>
      {sections.map((s, i) => {
        const collapsible = i >= maxOpen;
        const open = !collapsible || expanded[s.label];
        const toggle = () => setExpanded((e) => ({ ...e, [s.label]: !e[s.label] }));
        return (
          <View key={s.label} style={{ marginBottom: 18 }}>
            <StickyDate
              label={s.label}
              count={s.items.length}
              color={s.color ?? defaultColor}
              collapsible={collapsible}
              open={open}
              onToggle={toggle}
            />
            {collapsible && !open ? (
              <Pressable
                onPress={toggle}
                style={{
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: C.line,
                  borderRadius: 14,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={{
                    color: C.mist,
                    fontFamily: F.bodyBold,
                    fontSize: 12,
                  }}
                >
                  Show {s.items.length} more
                </Text>
                <Icon name="chevronDown" size={14} color={C.mist} />
              </Pressable>
            ) : (
              <>
                <View style={{ gap: 10 }}>{s.items.map((it, j) => renderItem(it, j))}</View>
                {collapsible && (
                  <Pressable
                    onPress={toggle}
                    style={{
                      marginTop: 10,
                      paddingVertical: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: C.fog,
                        fontFamily: F.bodyBold,
                        fontSize: 11,
                        letterSpacing: 0.6,
                        textTransform: 'uppercase',
                      }}
                    >
                      Collapse
                    </Text>
                    <Icon name="chevronsUp" size={12} color={C.fog} />
                  </Pressable>
                )}
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ───────── Couple rings ─────────
export function CouplRings({
  size = 36,
  opacity = 1,
  a,
  b,
}: {
  size?: number;
  opacity?: number;
  a?: string;
  b?: string;
}) {
  const { C } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" opacity={opacity}>
      <Circle cx={15} cy={20} r={11} fill="none" stroke={a ?? C.peach} strokeWidth={2} />
      <Circle cx={25} cy={20} r={11} fill="none" stroke={b ?? C.lavender} strokeWidth={2} />
    </Svg>
  );
}
