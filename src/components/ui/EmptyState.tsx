import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/src/hooks/useColors';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  /** @deprecated — use FAB instead. Kept for API compat but no longer rendered. */
  actionLabel?: string;
  /** @deprecated */
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
}: EmptyStateProps) {
  const C = useColors();

  return (
    <View style={styles.card}>
      <Text style={[styles.title, { color: C.textSecondary }]}>{title}</Text>
      <Text style={[styles.body, { color: C.textTertiary }]}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
    textAlign: 'center',
  },
  body: {
    ...Typography.body,
    textAlign: 'center',
  },
});
