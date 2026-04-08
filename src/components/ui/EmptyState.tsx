import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/src/hooks/useColors';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';

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
    <View
      style={[
        styles.card,
        { backgroundColor: C.card, borderColor: C.border },
      ]}
    >
      <Text style={[styles.title, { color: C.text }]}>{title}</Text>
      <Text style={[styles.body, { color: C.textSecondary }]}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
  },
  body: {
    ...Typography.body,
  },
});
