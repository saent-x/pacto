import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  TextInput,
  View,
  ViewStyle,
  TextStyle,
  type ImageSourcePropType,
} from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Icon, IconName } from './Icon';
import { PressScale } from './PressScale';

export function SheetShell({
  eyebrow,
  eyebrowColor,
  title,
  children,
  footer,
}: {
  eyebrow?: string;
  eyebrowColor?: string;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { C } = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
        }}
      >
        <View style={{ flex: 1 }}>
          {!!eyebrow && (
            <Text style={[Typography.eyebrowSm, { color: eyebrowColor ?? C.accent }]}>
              {eyebrow}
            </Text>
          )}
          {!!title && (
            <Text
              style={[
                {
                  fontFamily: Typography.pixelFont,
                  fontSize: 28,
                  lineHeight: 32,
                  color: C.inkColor,
                  letterSpacing: 0,
                  textTransform: 'uppercase',
                  marginTop: eyebrow ? 4 : 0,
                },
              ]}
            >
              {title}
              <Text style={{ color: eyebrowColor ?? C.accent }}>.</Text>
            </Text>
          )}
        </View>
        <PressScale
          onPress={() => router.back()}
          hitSlop={8}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: C.bgCard,
            borderWidth: 1,
            borderColor: C.lineColor,
          }}
        >
          <Icon name="x" size={18} color={C.inkColor} />
        </PressScale>
      </View>
      {children}
      {footer && <View style={{ marginTop: 28 }}>{footer}</View>}
    </ScrollView>
  );
}

export function SheetSection({
  title,
  right,
  first,
  children,
  style,
}: {
  title: string;
  right?: React.ReactNode;
  first?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { C } = useTheme();
  return (
    <View style={[{ marginTop: first ? 0 : 22 }, style]}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export function SheetRow({
  gap = 10,
  children,
  style,
}: {
  gap?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ flexDirection: 'row', gap }, style]}>{children}</View>;
}

export function SheetLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const { C } = useTheme();
  return (
    <Text style={[Typography.eyebrowSm, { color: C.ink3 }, style]}>
      {children}
    </Text>
  );
}

export function SheetTitleField({
  value,
  onChangeText,
  placeholder,
  accent,
  testID,
  autoFocus,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  accent?: string;
  testID?: string;
  autoFocus?: boolean;
}) {
  const { C, F } = useTheme();
  return (
    <TextInput
      testID={testID}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.fog}
      autoFocus={autoFocus}
      style={{
        color: C.bone,
        fontFamily: F.displayBold,
        fontSize: 22,
        paddingVertical: 6,
        borderBottomWidth: 2,
        borderBottomColor: value ? (accent ?? C.gold) : C.line,
      }}
    />
  );
}

export function SheetTextArea({
  value,
  onChangeText,
  placeholder,
  testID,
  minHeight = 80,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  testID?: string;
  minHeight?: number;
}) {
  const { C, F } = useTheme();
  return (
    <TextInput
      testID={testID}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.fog}
      multiline
      textAlignVertical="top"
      style={{
        minHeight,
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 14,
        padding: 14,
        color: C.bone,
        fontSize: 14,
        fontFamily: F.body,
      }}
    />
  );
}

export type IconOption<K extends string = string> = {
  key: K;
  icon: IconName;
};

export function SheetIconGrid<K extends string>({
  options,
  selected,
  onChange,
  accent,
  testIDPrefix,
}: {
  options: readonly IconOption<K>[];
  selected: K;
  onChange: (key: K) => void;
  accent: string;
  testIDPrefix: string;
}) {
  const { C } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {options.map((o) => {
        const sel = selected === o.key;
        return (
          <PressScale
            key={o.key}
            testID={`${testIDPrefix}-${o.key}`}
            onPress={() => {
              Haptics.selectionAsync().catch(() => undefined);
              onChange(o.key);
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: sel ? `${accent}33` : C.card,
              borderWidth: 1,
              borderColor: sel ? accent : C.line,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={o.icon} size={18} color={sel ? accent : C.mist} />
          </PressScale>
        );
      })}
    </View>
  );
}

export function SheetColorGrid<K extends string>({
  colors,
  selected,
  onChange,
  testIDPrefix,
}: {
  colors: readonly { key: K; value: string }[];
  selected: K;
  onChange: (key: K) => void;
  testIDPrefix: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
      {colors.map((c) => (
        <PressScale
          key={c.key}
          testID={`${testIDPrefix}-${c.key}`}
          onPress={() => {
            Haptics.selectionAsync().catch(() => undefined);
            onChange(c.key);
          }}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: c.value,
            borderWidth: 3,
            borderColor: selected === c.key ? 'rgba(255,255,255,0.3)' : 'transparent',
          }}
        />
      ))}
    </View>
  );
}

export type IconLabelOption<K extends string = string> = {
  key: K;
  icon: IconName;
  image?: ImageSourcePropType;
  label: string;
  color: string;
};

export function SheetIconLabelPicker<K extends string>({
  options,
  selected,
  onChange,
  testIDPrefix,
  iconOnly = false,
}: {
  options: readonly IconLabelOption<K>[];
  selected: K;
  onChange: (key: K) => void;
  testIDPrefix: string;
  iconOnly?: boolean;
}) {
  const { C, F } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', gap: iconOnly ? 10 : 8, paddingRight: 12 }}>
        {options.map((o) => {
          const sel = selected === o.key;
          return (
            <PressScale
              key={o.key}
              testID={`${testIDPrefix}-${o.key}`}
              onPress={() => {
                Haptics.selectionAsync().catch(() => undefined);
                onChange(o.key);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: iconOnly ? 0 : 8,
                width: iconOnly ? 54 : undefined,
                height: iconOnly ? 54 : undefined,
                paddingVertical: iconOnly ? 0 : 10,
                paddingHorizontal: iconOnly ? 0 : 14,
                borderRadius: iconOnly ? 14 : 999,
                backgroundColor: sel ? `${o.color}26` : 'transparent',
                borderWidth: 1,
                borderColor: sel ? o.color : C.line,
              }}
            >
              {o.image ? (
                <Image
                  source={o.image}
                  style={{
                    width: iconOnly ? 42 : 24,
                    height: iconOnly ? 42 : 24,
                    opacity: sel ? 1 : 0.62,
                  }}
                  resizeMode="contain"
                />
              ) : (
                <Icon name={o.icon} size={iconOnly ? 24 : 14} color={sel ? o.color : C.fog} />
              )}
              {!iconOnly ? (
                <Text
                  style={{
                    color: sel ? o.color : C.mist,
                    fontFamily: F.bodyBold,
                    fontSize: 12,
                  }}
                >
                  {o.label}
                </Text>
              ) : null}
            </PressScale>
          );
        })}
      </View>
    </ScrollView>
  );
}

export type SegmentOption<K extends string = string> = {
  key: K;
  label: string;
  disabled?: boolean;
};

export function SheetSegment<K extends string>({
  options,
  selected,
  onChange,
  accent,
  testIDPrefix,
}: {
  options: readonly SegmentOption<K>[];
  selected: K;
  onChange: (key: K) => void;
  accent?: string;
  testIDPrefix: string;
}) {
  const { C, F } = useTheme();
  const fill = accent ?? C.bone;
  const fillInk = accent ? `${accent}26` : C.bone;
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 14,
        padding: 4,
        gap: 4,
      }}
    >
      {options.map((o) => {
        const sel = selected === o.key;
        return (
          <PressScale
            key={o.key}
            testID={`${testIDPrefix}-${o.key}`}
            disabled={o.disabled}
            onPress={() => {
              if (o.disabled) return;
              Haptics.selectionAsync().catch(() => undefined);
              onChange(o.key);
            }}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: sel ? (accent ? fillInk : fill) : 'transparent',
              alignItems: 'center',
              opacity: o.disabled ? 0.4 : 1,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: F.bodyBold,
                color: sel ? (accent ?? C.ink) : C.mist,
              }}
            >
              {o.label}
            </Text>
          </PressScale>
        );
      })}
    </View>
  );
}

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const formatDate = (d: Date) => `${MONTH[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
const formatTime = (d: Date) => {
  const h = d.getHours();
  const m = pad(d.getMinutes());
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m} ${suffix}`;
};

function DateTimeFieldImpl({
  mode,
  value,
  onChange,
  accent,
  pressTestID,
  open,
  onPress,
  minimumDate,
}: {
  mode: 'date' | 'time';
  value: Date;
  onChange: (d: Date) => void;
  accent: string;
  pressTestID?: string;
  open: boolean;
  onPress: () => void;
  minimumDate?: Date;
}) {
  const { C, F } = useTheme();
  const label = mode === 'date' ? formatDate(value) : formatTime(value);
  const handlePickerChange = (_e: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS !== 'ios') onPress();
    if (!picked) return;
    const next = new Date(value);
    if (mode === 'date') {
      next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    } else {
      next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    }
    onChange(next);
  };
  return (
    <View style={{ flex: 1 }}>
      <PressScale
        testID={pressTestID}
        onPress={() => {
          Haptics.selectionAsync().catch(() => undefined);
          onPress();
        }}
        style={{
          backgroundColor: open ? C.cardHi : C.card,
          borderWidth: 1,
          borderColor: open ? accent : C.line,
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Icon name={mode === 'date' ? 'calendar' : 'clock'} size={16} color={accent} />
        <Text style={{ flex: 1, color: C.bone, fontSize: 13, fontFamily: F.bodyBold }}>{label}</Text>
      </PressScale>
      {open ? (
        <View
          testID={pressTestID ? `${pressTestID}-picker` : undefined}
          style={{
            marginTop: 10,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          <DateTimePicker
            testID={pressTestID ? `${pressTestID}-picker-control` : undefined}
            value={value}
            mode={mode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handlePickerChange}
            themeVariant="dark"
            minimumDate={minimumDate}
          />
        </View>
      ) : null}
    </View>
  );
}

export function SheetDateField(props: {
  value: Date;
  onChange: (d: Date) => void;
  accent: string;
  pressTestID?: string;
  open: boolean;
  onPress: () => void;
  minimumDate?: Date;
}) {
  return <DateTimeFieldImpl mode="date" {...props} />;
}

export function SheetTimeField(props: {
  value: Date;
  onChange: (d: Date) => void;
  accent: string;
  pressTestID?: string;
  open: boolean;
  onPress: () => void;
}) {
  return <DateTimeFieldImpl mode="time" {...props} />;
}

export function SheetDurationField({
  minutes,
  onChange,
  accent,
  pressTestID,
}: {
  minutes: number;
  onChange: (n: number) => void;
  accent: string;
  pressTestID?: string;
}) {
  const { C, F } = useTheme();
  const text = minutes > 0 ? String(minutes) : '';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: minutes > 0 ? accent : C.line,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 14,
      }}
    >
      <Icon name="clock" size={16} color={accent} />
      <TextInput
        testID={pressTestID}
        value={text}
        onChangeText={(t) => {
          const cleaned = t.replace(/[^0-9]/g, '');
          const n = cleaned ? Math.min(Number(cleaned), 24 * 60) : 0;
          onChange(n);
        }}
        placeholder="0"
        placeholderTextColor={C.fog}
        inputMode="numeric"
        maxLength={4}
        style={{
          flex: 1,
          color: C.bone,
          fontFamily: F.displayBold,
          fontSize: 18,
          padding: 0,
        }}
      />
      <Text
        style={{
          fontSize: 10,
          fontFamily: F.bodyBold,
          letterSpacing: 0.8,
          color: C.fog,
        }}
      >
        MIN
      </Text>
    </View>
  );
}

export function SheetToggleRow({
  icon,
  label,
  sublabel,
  value,
  onChange,
  accent,
  pressTestID,
}: {
  icon: IconName;
  label: string;
  sublabel?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  accent: string;
  pressTestID?: string;
}) {
  const { C, F } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      progress.value = value ? 1 : 0;
      return;
    }
    progress.value = withTiming(value ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, reduced, progress]);
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * 18 }],
  }));
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [C.line, accent]),
  }));
  return (
    <View
      style={{
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: value ? `${accent}10` : C.card,
        borderWidth: 1,
        borderColor: value ? accent : C.line,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Icon name={icon} size={16} color={value ? accent : C.fog} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, color: C.bone, fontFamily: F.bodyBold }}>{label}</Text>
        {!!sublabel && (
          <Text style={{ fontSize: 11, color: C.fog, marginTop: 2, fontFamily: F.body }}>
            {sublabel}
          </Text>
        )}
      </View>
      <Pressable
        testID={pressTestID}
        onPress={() => {
          Haptics.selectionAsync().catch(() => undefined);
          onChange(!value);
        }}
      >
        <Animated.View
          style={[
            {
              width: 44,
              height: 26,
              borderRadius: 13,
              justifyContent: 'center',
            },
            trackStyle,
          ]}
        >
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 3,
                left: 3,
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: '#fff',
              },
              thumbStyle,
            ]}
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

export function SheetPreviewCard({
  bg,
  ink,
  children,
  style,
}: {
  bg: string;
  ink: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: 22,
          paddingVertical: 16,
          paddingHorizontal: 18,
          marginBottom: 22,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SheetInfoCard({
  icon,
  children,
}: {
  icon: IconName;
  children: React.ReactNode;
}) {
  const { C, F } = useTheme();
  return (
    <View
      style={{
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Icon name={icon} size={16} color={C.fog} />
      <Text style={{ flex: 1, fontSize: 12, color: C.mist, fontFamily: F.body, lineHeight: 17 }}>
        {children}
      </Text>
    </View>
  );
}
