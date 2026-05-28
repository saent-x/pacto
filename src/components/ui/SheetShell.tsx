import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Pill } from './atoms';
import { Icon, IconName } from './Icon';
import { PressScale } from './PressScale';
import { PulsingDot } from './pacto/PulsingDot';
import { shouldAppendAccentDot } from './titlePunctuation';

export function SheetShell({
  eyebrow,
  eyebrowColor,
  title,
  children,
  footer,
  showClose = true,
  topPadding = 18,
  bottomPadding = 28,
}: {
  eyebrow?: string;
  eyebrowColor?: string;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showClose?: boolean;
  topPadding?: number;
  bottomPadding?: number;
}) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const headerAccent = eyebrowColor ?? C.accent;
  const scrollTopPadding = Math.max(topPadding, insets.top + 12);
  const scrollBottomPadding = footer ? 12 : Math.max(bottomPadding, insets.bottom + 16);
  const footerBottomPadding = Math.max(20, bottomPadding, insets.bottom + 16);
  const header = (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
        gap: 16,
      }}
    >
      <View style={{ flex: 1 }}>
        {!!eyebrow && (
          <Text style={[Typography.eyebrowSm, { color: headerAccent }]}>
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
            {shouldAppendAccentDot(title) ? <PulsingDot color={headerAccent} /> : null}
          </Text>
        )}
      </View>
      {showClose ? (
        <PressScale
          onPress={() => router.back()}
          hitSlop={8}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: C.bgSoft,
            borderWidth: 1,
            borderColor: C.line2 ?? C.lineColor,
          }}
        >
          <Icon name="x" size={18} color={C.inkColor} />
        </PressScale>
      ) : null}
    </View>
  );
  // Plain View column. Native formSheet with fit-to-content measures this
  // view's intrinsic height and sizes the sheet to match. Nested ScrollView
  // breaks intrinsic sizing — body collapses to 0. If individual screens need
  // scrolling, they can wrap their children in a ScrollView themselves.
  return (
    <View style={{ backgroundColor: C.bg }}>
      <View
        style={{
          padding: 20,
          paddingTop: scrollTopPadding,
          paddingBottom: scrollBottomPadding,
          gap: 2,
        }}
      >
        {header}
        {children}
      </View>
      {footer ? (
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: footerBottomPadding,
            backgroundColor: C.bg,
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
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
    <View style={[{ marginTop: first ? 0 : 24 }, style]}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          paddingHorizontal: 2,
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
        color: C.inkColor,
        fontFamily: F.displayBold,
        fontSize: 22,
        paddingVertical: 6,
        borderBottomWidth: 2,
        borderBottomColor: value ? (accent ?? C.accent) : C.lineColor,
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
        backgroundColor: C.bgCard,
        borderWidth: 1,
        borderColor: C.lineColor,
        borderRadius: 20,
        padding: 14,
        color: C.inkColor,
        fontSize: 14,
        fontFamily: F.body,
      }}
    />
  );
}

export type IconOption<K extends string = string> = {
  key: K;
  icon: IconName;
  label?: string;
};

function labelFromIconKey(key: string) {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return words.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function SheetIconGrid<K extends string>({
  options,
  selected,
  onChange,
  accent,
  testIDPrefix,
  defaultOption,
  collapseAfter = 6,
}: {
  options: readonly IconOption<K>[];
  selected: K;
  onChange: (key: K) => void;
  accent: string;
  testIDPrefix: string;
  defaultOption?: IconOption<K>;
  collapseAfter?: number;
}) {
  const { C, F } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const merged = defaultOption
    ? [defaultOption, ...options.filter((o) => o.key !== defaultOption.key)]
    : options;
  const overflow = merged.length > collapseAfter;
  const selectedHidden = overflow && merged.findIndex((o) => o.key === selected) >= collapseAfter;
  const showAll = expanded || selectedHidden;
  const visible = !overflow || showAll ? merged : merged.slice(0, collapseAfter);
  return (
    <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
      {visible.map((o) => {
        const sel = selected === o.key;
        const label = o.label ?? labelFromIconKey(String(o.key));
        return (
          <PressScale
            key={o.key}
            testID={`${testIDPrefix}-${o.key}`}
            accessibilityLabel={label}
            accessibilityState={{ selected: sel }}
            onPress={() => {
              Haptics.selectionAsync().catch(() => undefined);
              onChange(o.key);
            }}
            style={{
              width: 64,
              alignItems: 'center',
              paddingVertical: 4,
              gap: 6,
            }}
          >
            <Icon
              name={o.icon}
              size={26}
              color={sel ? accent : C.fog}
              style={{ opacity: sel ? 1 : 0.7 }}
            />
            <Text
              numberOfLines={2}
              style={{
                color: sel ? C.inkColor : C.ink3,
                fontFamily: F.bodyBold,
                fontSize: 10,
                lineHeight: 12,
                textAlign: 'center',
              }}
            >
              {label}
            </Text>
            <View
              style={{
                height: 2,
                width: 22,
                borderRadius: 1,
                marginTop: 2,
                backgroundColor: sel ? accent : 'transparent',
              }}
            />
          </PressScale>
        );
      })}
      {overflow && !selectedHidden ? (
        <PressScale
          testID={`${testIDPrefix}-toggle`}
          accessibilityLabel={showAll ? 'Show fewer icons' : 'Show more icons'}
          onPress={() => {
            Haptics.selectionAsync().catch(() => undefined);
            setExpanded((e) => !e);
          }}
          style={{
            width: 64,
            alignItems: 'center',
            paddingVertical: 4,
            gap: 6,
          }}
        >
          <Icon name={showAll ? 'minus' : 'plus'} size={22} color={C.ink3} />
          <Text
            numberOfLines={1}
            style={{
              color: C.ink3,
              fontFamily: F.bodyBold,
              fontSize: 10,
              lineHeight: 12,
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}
          >
            {showAll ? 'Less' : 'More'}
          </Text>
          <View style={{ height: 2, width: 22, marginTop: 2 }} />
        </PressScale>
      ) : null}
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
  const { C } = useTheme();
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
            borderColor: selected === c.key ? C.inkColor : 'transparent',
          }}
        />
      ))}
    </View>
  );
}

export type IconLabelOption<K extends string = string> = {
  key: K;
  icon?: IconName;
  image?: ImageSourcePropType;
  priorityLevel?: 'low' | 'med' | 'high';
  label: string;
  color: string;
};

export function SheetIconLabelPicker<K extends string>({
  options,
  selected,
  onChange,
  testIDPrefix,
  iconOnly = false,
  defaultOption,
  collapseAfter = 6,
}: {
  options: readonly IconLabelOption<K>[];
  selected: K;
  onChange: (key: K) => void;
  testIDPrefix: string;
  iconOnly?: boolean;
  defaultOption?: IconLabelOption<K>;
  collapseAfter?: number;
}) {
  const { C, F } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const merged = defaultOption
    ? [defaultOption, ...options.filter((o) => o.key !== defaultOption.key)]
    : options;
  const overflow = !iconOnly && merged.length > collapseAfter;
  const selectedHidden = overflow && merged.findIndex((o) => o.key === selected) >= collapseAfter;
  const showAll = expanded || selectedHidden;
  const visible = !overflow || showAll ? merged : merged.slice(0, collapseAfter);
  const content = (
    <View
      style={{
        flexDirection: 'row',
        gap: iconOnly ? 18 : 8,
        flexWrap: 'wrap',
        rowGap: 8,
      }}
    >
      {visible.map((o) => {
        const sel = selected === o.key;
        if (iconOnly) {
          const glyph = o.priorityLevel ? (
            <SheetPriorityGlyph
              testID={`${testIDPrefix}-glyph-${o.key}`}
              level={o.priorityLevel}
              color={sel ? o.color : C.fog}
              mutedColor={C.lineColor}
              size="lg"
            />
          ) : o.image ? (
            <Image
              source={o.image}
              style={{ width: 42, height: 42, opacity: sel ? 1 : 0.62 }}
              resizeMode="contain"
            />
          ) : o.icon ? (
            <Icon name={o.icon} size={24} color={sel ? o.color : C.fog} />
          ) : null;
          return (
            <PressScale
              key={o.key}
              testID={`${testIDPrefix}-${o.key}`}
              accessibilityLabel={o.label}
              accessibilityState={{ selected: sel }}
              onPress={() => {
                Haptics.selectionAsync().catch(() => undefined);
                onChange(o.key);
              }}
              style={{
                width: 54,
                height: 54,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: sel ? `${o.color}26` : 'transparent',
                borderWidth: 1,
                borderColor: sel ? o.color : C.lineColor,
              }}
            >
              {glyph}
            </PressScale>
          );
        }
        // Non-iconOnly: bordered pill toggle (priority / segment style).
        const leading = o.priorityLevel ? (
          <SheetPriorityGlyph
            testID={`${testIDPrefix}-glyph-${o.key}`}
            level={o.priorityLevel}
            color={sel ? o.color : C.fog}
            mutedColor={C.lineColor}
            size="sm"
          />
        ) : o.image ? (
          <Image
            source={o.image}
            style={{ width: 20, height: 20, opacity: sel ? 1 : 0.62 }}
            resizeMode="contain"
          />
        ) : o.icon ? (
          <Icon name={o.icon} size={14} color={sel ? o.color : C.fog} />
        ) : null;
        return (
          <PressScale
            key={o.key}
            testID={`${testIDPrefix}-${o.key}`}
            accessibilityLabel={o.label}
            accessibilityState={{ selected: sel }}
            onPress={() => {
              Haptics.selectionAsync().catch(() => undefined);
              onChange(o.key);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: leading ? 8 : 0,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 999,
              backgroundColor: sel ? `${o.color}26` : 'transparent',
              borderWidth: 1,
              borderColor: sel ? o.color : C.lineColor,
            }}
          >
            {leading}
            <Text
              style={{
                color: sel ? o.color : C.ink2,
                fontFamily: F.bodyBold,
                fontSize: 12,
              }}
            >
              {o.label}
            </Text>
          </PressScale>
        );
      })}
      {overflow && !selectedHidden ? (
        <PressScale
          testID={`${testIDPrefix}-toggle`}
          accessibilityLabel={showAll ? 'Show fewer options' : 'Show more options'}
          onPress={() => {
            Haptics.selectionAsync().catch(() => undefined);
            setExpanded((e) => !e);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: C.lineColor,
          }}
        >
          <Icon name={showAll ? 'minus' : 'plus'} size={14} color={C.ink3} />
          <Text
            numberOfLines={1}
            style={{
              color: C.ink3,
              fontFamily: F.bodyBold,
              fontSize: 12,
            }}
          >
            {showAll ? 'Less' : 'More'}
          </Text>
        </PressScale>
      ) : null}
    </View>
  );
  return content;
}

function SheetPriorityGlyph({
  level,
  color,
  mutedColor,
  size,
  testID,
}: {
  level: 'low' | 'med' | 'high';
  color: string;
  mutedColor: string;
  size: 'sm' | 'lg';
  testID?: string;
}) {
  const activeBars = level === 'low' ? 1 : level === 'med' ? 2 : 3;
  const scale = size === 'lg' ? 1 : 0.72;
  return (
    <View
      testID={testID}
      style={{
        height: 26 * scale,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 4 * scale,
      }}
    >
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: 5 * scale,
            height: (10 + i * 6) * scale,
            borderRadius: 999,
            backgroundColor: i < activeBars ? color : mutedColor,
            opacity: i < activeBars ? 1 : 0.55,
          }}
        />
      ))}
    </View>
  );
}

export type SegmentOption<K extends string = string> = {
  key: K;
  label: string;
  icon?: IconName;
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
  const selectedColor = accent ?? C.accent;
  const anyIcons = options.some((o) => !!o.icon);
  if (!anyIcons) {
    return (
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {options.map((o) => {
          const sel = selected === o.key;
          return (
            <Pill
              key={o.key}
              testID={`${testIDPrefix}-${o.key}`}
              active={sel}
              activeBg={`${selectedColor}33`}
              activeColor={C.inkColor}
              color={C.ink2}
              onPress={o.disabled ? undefined : () => onChange(o.key)}
              style={o.disabled ? { opacity: 0.4 } : undefined}
            >
              {o.label}
            </Pill>
          );
        })}
      </View>
    );
  }
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      {options.map((o) => {
        const sel = selected === o.key;
        return (
          <PressScale
            key={o.key}
            testID={`${testIDPrefix}-${o.key}`}
            accessibilityLabel={o.label}
            accessibilityState={{ selected: sel }}
            onPress={
              o.disabled
                ? undefined
                : () => {
                    Haptics.selectionAsync().catch(() => undefined);
                    onChange(o.key);
                  }
            }
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: o.icon ? 6 : 0,
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 999,
                backgroundColor: sel ? `${selectedColor}33` : 'transparent',
                borderWidth: 1,
                borderColor: sel ? selectedColor : C.lineColor,
              },
              o.disabled ? { opacity: 0.4 } : null,
            ]}
          >
            {o.icon ? (
              <Icon name={o.icon} size={14} color={sel ? selectedColor : C.ink2} />
            ) : null}
            <Text
              style={{
                color: sel ? C.inkColor : C.ink2,
                fontFamily: F.bodyBold,
                fontSize: 12,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
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
const formatDateInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const formatTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  minimumDate,
}: {
  mode: 'date' | 'time';
  value: Date;
  onChange: (d: Date) => void;
  accent: string;
  pressTestID?: string;
  minimumDate?: Date;
}) {
  const { C, F, mode: themeMode } = useTheme();
  const label = mode === 'date' ? formatDate(value) : formatTime(value);

  const applyPicked = (picked?: Date) => {
    if (!picked) return;
    const next = new Date(value);
    if (mode === 'date') {
      next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    } else {
      next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    }
    onChange(next);
  };

  const handlePickerChange = (_e: DateTimePickerEvent, picked?: Date) => {
    applyPicked(picked);
  };

  const openAndroidPicker = () => {
    Haptics.selectionAsync().catch(() => undefined);
    DateTimePickerAndroid.open({
      value,
      mode,
      display: 'default',
      is24Hour: mode === 'time',
      minimumDate: mode === 'date' ? minimumDate : undefined,
      onChange: (event, picked) => {
        if (event.type !== 'set') return;
        applyPicked(picked);
      },
    });
  };

  const handleWebChange = (event: any) => {
    const raw = event?.target?.value;
    if (!raw) return;
    const next = new Date(value);
    if (mode === 'date') {
      const [year, month, day] = raw.split('-').map(Number);
      if (!year || !month || !day) return;
      next.setFullYear(year, month - 1, day);
    } else {
      const [hours, minutes] = raw.split(':').map(Number);
      if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return;
      next.setHours(hours, minutes, 0, 0);
    }
    onChange(next);
  };

  const fieldStyle: ViewStyle = {
    backgroundColor: 'transparent',
    paddingVertical: 6,
    paddingHorizontal: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 36,
  };

  if (Platform.OS === 'android') {
    return (
      <PressScale
        testID={pressTestID}
        accessibilityLabel={mode === 'date' ? `Choose date, ${label}` : `Choose time, ${label}`}
        onPress={openAndroidPicker}
        style={[fieldStyle, { flex: 1 }]}
      >
        <Icon name={mode === 'date' ? 'calendar' : 'clock'} size={16} color={accent} />
        <Text style={{ flex: 1, color: C.inkColor, fontSize: 13, fontFamily: F.bodyBold }}>{label}</Text>
      </PressScale>
    );
  }

  return (
    <View testID={pressTestID} style={[fieldStyle, { flex: 1 }]}>
      <Icon name={mode === 'date' ? 'calendar' : 'clock'} size={16} color={accent} />
      {Platform.OS === 'web' ? (
        React.createElement('input', {
          'data-testid': pressTestID ? `${pressTestID}-picker-control` : undefined,
          'aria-label': mode === 'date' ? 'Select date' : 'Select time',
          type: mode === 'date' ? 'date' : 'time',
          value: mode === 'date' ? formatDateInput(value) : formatTimeInput(value),
          min: mode === 'date' && minimumDate ? formatDateInput(minimumDate) : undefined,
          onChange: handleWebChange,
          style: {
            flex: 0,
            width: mode === 'date' ? 150 : 110,
            boxSizing: 'border-box',
            border: 0,
            outline: 0,
            backgroundColor: 'transparent',
            color: C.inkColor,
            fontFamily: F.bodyBold,
            fontSize: 16,
            padding: 0,
            colorScheme: themeMode === 'dark' ? 'dark' : 'light',
          },
        })
      ) : (
        <DateTimePicker
          testID={pressTestID ? `${pressTestID}-picker-control` : undefined}
          value={value}
          mode={mode}
          display="compact"
          onChange={handlePickerChange}
          themeVariant={themeMode === 'dark' ? 'dark' : 'light'}
          minimumDate={minimumDate}
          style={{ alignSelf: 'flex-start', width: mode === 'date' ? 156 : 116 }}
        />
      )}
    </View>
  );
}

export function SheetDateField(props: {
  value: Date;
  onChange: (d: Date) => void;
  accent: string;
  pressTestID?: string;
  minimumDate?: Date;
}) {
  return <DateTimeFieldImpl mode="date" {...props} />;
}

export function SheetTimeField(props: {
  value: Date;
  onChange: (d: Date) => void;
  accent: string;
  pressTestID?: string;
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
  const STEP = 5;
  const MAX = 24 * 60;
  const clamp = (n: number) => Math.max(0, Math.min(MAX, Math.round(n)));
  const step = (delta: number) => {
    Haptics.selectionAsync().catch(() => undefined);
    onChange(clamp(minutes + delta));
  };
  const buttonStyle: ViewStyle = {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: C.lineColor,
  };
  return (
    <View
      testID={pressTestID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        paddingVertical: 6,
      }}
    >
      <PressScale
        testID={pressTestID ? `${pressTestID}-minus` : undefined}
        accessibilityLabel="Decrease duration"
        onPress={() => step(-STEP)}
        hitSlop={8}
        style={buttonStyle}
      >
        <Icon name="minus" size={16} color={minutes > 0 ? accent : C.fog} />
      </PressScale>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <Text
          style={{
            color: C.inkColor,
            fontFamily: F.displayBold,
            fontSize: 20,
          }}
        >
          {minutes}
        </Text>
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
      <PressScale
        testID={pressTestID ? `${pressTestID}-plus` : undefined}
        accessibilityLabel="Increase duration"
        onPress={() => step(STEP)}
        hitSlop={8}
        style={buttonStyle}
      >
        <Icon name="plus" size={16} color={accent} />
      </PressScale>
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
    backgroundColor: interpolateColor(progress.value, [0, 1], [C.lineColor, accent]),
  }));
  return (
    <View
      style={{
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: value ? `${accent}10` : C.bgCard,
        borderWidth: 1,
        borderColor: value ? accent : C.lineColor,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
      >
        <Icon name={icon} size={16} color={value ? accent : C.fog} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: C.inkColor, fontFamily: F.bodyBold }}>{label}</Text>
        {!!sublabel && (
          <Text style={{ fontSize: 11, color: C.ink3, marginTop: 2, fontFamily: F.body }}>
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
                backgroundColor: C.bgCard,
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
        backgroundColor: C.bgCard,
        borderWidth: 1,
        borderColor: C.lineColor,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Icon name={icon} size={16} color={C.ink3} />
      <Text style={{ flex: 1, fontSize: 12, color: C.ink2, fontFamily: F.body, lineHeight: 17 }}>
        {children}
      </Text>
    </View>
  );
}
