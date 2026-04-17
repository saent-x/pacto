import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';

interface GlassSectionProps {
  /** Optional section header — displayed as iOS-style uppercase label */
  header?: string;
  /** Optional footer text */
  footer?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * iOS-style grouped inset section.
 * Wraps children in a rounded glass card with optional header/footer.
 * Children should be GlassRow components separated by hairline dividers.
 */
export function GlassSection({ header, footer, children, style }: GlassSectionProps) {
  const C = useColors();
  const { mode } = useTheme();

  const cardBg = mode === 'dark' ? 'rgba(255,255,255,0.05)' : C.card;
  const borderColor = mode === 'dark' ? 'rgba(255,255,255,0.07)' : C.border;

  return (
    <View style={[styles.container, style]}>
      {header && (
        <Text style={[styles.header, { color: C.textTertiary }]}>{header}</Text>
      )}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        {children}
      </View>
      {footer && (
        <Text style={[styles.footer, { color: C.textTertiary }]}>{footer}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  header: {
    ...Typography.small,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  footer: {
    ...Typography.small,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
});
