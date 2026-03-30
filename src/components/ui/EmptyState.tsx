import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  /** @deprecated — use FAB instead. Kept for API compat but no longer rendered. */
  actionLabel?: string;
  /** @deprecated */
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
}: EmptyStateProps) {
  const C = useColors();
  const { mode } = useTheme();

  const glowBg = mode === 'dark' ? 'rgba(212,160,84,0.04)' : 'rgba(184,90,66,0.03)';
  const ringColor = mode === 'dark' ? 'rgba(212,160,84,0.12)' : 'rgba(184,90,66,0.08)';

  return (
    <View style={styles.container}>
      {/* Decorative rings */}
      <View style={styles.ringGroup}>
        <View style={[styles.outerRing, { borderColor: ringColor }]} />
        <View style={[styles.middleRing, { backgroundColor: glowBg }]} />
        <View style={[styles.iconCircle, { backgroundColor: C.primaryMuted }]}>
          <Feather name={icon as any} size={26} color={C.primary} />
        </View>
      </View>

      <Text style={[styles.title, { color: C.text }]}>{title}</Text>
      <Text style={[styles.description, { color: C.textTertiary }]}>{description}</Text>

      {/* Subtle hint that the FAB is the action */}
      <View style={styles.hintRow}>
        <View style={[styles.hintDot, { backgroundColor: C.primary }]} />
        <Text style={[styles.hintText, { color: C.textTertiary }]}>
          Tap + to get started
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['4xl'],
    gap: Spacing.md,
  },

  // Decorative concentric rings
  ringGroup: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  outerRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
  },
  middleRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    ...Typography.heading,
    fontSize: 20,
    textAlign: 'center',
  },
  description: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 260,
  },

  // FAB hint
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    opacity: 0.5,
  },
  hintDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  hintText: {
    ...Typography.small,
    letterSpacing: 0.3,
  },
});
