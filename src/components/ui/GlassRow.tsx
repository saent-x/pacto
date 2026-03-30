import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';

interface GlassRowProps {
  /** Row label */
  label: string;
  /** Secondary text below label */
  subtitle?: string;
  /** Right-side value text */
  value?: string;
  /** Left icon name (Feather) */
  icon?: keyof typeof Feather.glyphMap;
  /** Icon tint color */
  iconColor?: string;
  /** Icon background color */
  iconBg?: string;
  /** Shows chevron on right */
  chevron?: boolean;
  /** Shows a toggle switch instead */
  toggle?: boolean;
  /** Toggle value */
  toggleValue?: boolean;
  /** Toggle change handler */
  onToggle?: (value: boolean) => void;
  /** Row press handler */
  onPress?: () => void;
  /** Whether to show bottom divider */
  last?: boolean;
  /** Destructive style (red text) */
  destructive?: boolean;
  style?: ViewStyle;
}

/**
 * iOS Settings-style row for use inside GlassSection.
 * Supports icon, chevron, toggle, and destructive variants.
 */
export function GlassRow({
  label,
  subtitle,
  value,
  icon,
  iconColor,
  iconBg,
  chevron = false,
  toggle = false,
  toggleValue,
  onToggle,
  onPress,
  last = false,
  destructive = false,
  style,
}: GlassRowProps) {
  const C = useColors();
  const { mode } = useTheme();

  const dividerColor = mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const textColor = destructive ? C.error : C.text;
  const defaultIconBg = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  const content = (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dividerColor }, style]}>
      {icon && (
        <View style={[styles.iconWrap, { backgroundColor: iconBg || defaultIconBg }]}>
          <Feather name={icon} size={16} color={iconColor || C.primary} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: C.textTertiary }]}>{subtitle}</Text>}
      </View>
      {value && <Text style={[styles.value, { color: C.textTertiary }]}>{value}</Text>}
      {toggle && (
        <Switch
          value={toggleValue}
          onValueChange={(v) => {
            Haptics.selectionAsync();
            onToggle?.(v);
          }}
          trackColor={{ false: C.dim, true: C.primary }}
          thumbColor="#fff"
          ios_backgroundColor={C.dim}
        />
      )}
      {chevron && <Feather name="chevron-right" size={16} color={C.textTertiary} style={{ opacity: 0.5 }} />}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={() => {
          Haptics.selectionAsync();
          onPress();
        }}
        activeOpacity={0.6}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    minHeight: 48,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  label: {
    ...Typography.body,
    fontSize: 15,
  },
  subtitle: {
    ...Typography.small,
    marginTop: 1,
  },
  value: {
    ...Typography.body,
    fontSize: 15,
  },
});
