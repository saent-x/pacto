import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/src/hooks/useColors';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';
import { Button } from './Button';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const C = useColors();

  return (
    <View style={styles.container}>
      <View style={[styles.iconRing, { borderColor: C.dusk, backgroundColor: C.primaryMuted }]}>
        <Feather name={icon as any} size={24} color={C.primary} />
      </View>
      <Text style={[styles.title, { color: C.text }]}>{title}</Text>
      <Text style={[styles.description, { color: C.textTertiary }]}>{description}</Text>
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="outline"
          size="md"
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['4xl'],
  },
  iconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  title: {
    ...Typography.heading,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 260,
  },
  button: {
    marginTop: Spacing['3xl'],
    minWidth: 160,
  },
});
