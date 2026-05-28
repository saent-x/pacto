/**
 * SubscreenHero — pastel slab hero for Together sub-screens.
 *
 * Big chunky metric on the left, contextual meta on the right.
 * Drop into LoveNotes / Checkins / Wishlists / Milestones / Plans.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlockCard, Overline } from './WarmBlock';
import { Pastels, type PastelKey } from '@/src/constants/pastels';
import { Typography } from '@/src/constants/typography';
import { alphaColor } from '@/src/lib/color';

type PastelName = 'peach' | 'lavender' | 'butter' | 'mint' | 'rose' | 'sky';

export function SubscreenHero({
  pastel,
  eyebrow,
  metric,
  unit,
  subtitle,
  icon,
  rightSlot,
}: {
  pastel: PastelName;
  /** Small uppercase label */
  eyebrow: string;
  /** Big chunky number or short phrase */
  metric: string;
  /** Small sub-unit next to metric (e.g. "%" or "DAYS") */
  unit?: string;
  /** Second line of context below the metric */
  subtitle?: string;
  /** Feather icon shown in top-right of hero */
  icon?: keyof typeof Feather.glyphMap;
  /** Custom right-side slot that replaces the icon (e.g. mini chart) */
  rightSlot?: React.ReactNode;
}) {
  const ink = Pastels[`${pastel}Ink` as PastelKey] as string;
  return (
    <BlockCard pastel={pastel} style={styles.card}>
      <View style={styles.topRow}>
        <Overline color={alphaColor(ink, 0.55)}>{eyebrow}</Overline>
        {rightSlot
          ? rightSlot
          : icon
            ? (
              <View style={[styles.iconBubble, { backgroundColor: alphaColor(ink, 0.14) }]}>
                <Feather name={icon} size={14} color={ink} />
              </View>
            )
            : null}
      </View>

      <View style={styles.metricRow}>
        <Text style={[styles.metric, { color: ink }]}>{metric}</Text>
        {unit && <Text style={[styles.unit, { color: ink }]}>{unit}</Text>}
      </View>

      {subtitle && (
        <Text style={[styles.subtitle, { color: alphaColor(ink, 0.65) }]}>{subtitle}</Text>
      )}
    </BlockCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 22,
    marginHorizontal: 16,
    marginTop: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
    gap: 6,
  },
  metric: {
    fontFamily: Typography.displayFont,
    fontSize: 56,
    lineHeight: 56,
    letterSpacing: 0,
    fontWeight: '800',
  },
  unit: {
    fontFamily: Typography.displayFont,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 6,
    fontFamily: Typography.sansMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
});
