/**
 * HeroRingsCard — Warm Block signature hero on Home.
 *
 * Peach pastel slab with a triple progress ring and three stat rows
 * (Connect / Shared / Present). Values derived from today's counts.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlockCard, TripleRing, Overline, Display } from '@/src/components/ui';
import { Pastels } from '@/src/constants/pastels';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';

type Props = {
  /** 0..1 — e.g. % of today's check-ins completed */
  connect: { done: number; total: number };
  /** 0..1 — e.g. % of today's shared tasks/reminders done */
  shared: { done: number; total: number };
  /** 0..1 — e.g. % of mood/presence marked today */
  present: { done: number; total: number };
};

function clamp01(n: number) {
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function ratio({ done, total }: { done: number; total: number }) {
  return total === 0 ? 0 : clamp01(done / total);
}

function motto(avg: number) {
  if (avg >= 0.85) return 'CRUSH IT';
  if (avg >= 0.55) return 'ON TRACK';
  if (avg >= 0.25) return 'KEEP GOING';
  return 'FRESH START';
}

export function HeroRingsCard({ connect, shared, present }: Props) {
  const r1 = ratio(connect);
  const r2 = ratio(shared);
  const r3 = ratio(present);
  const avg = (r1 + r2 + r3) / 3;
  const pct = Math.round(avg * 100);

  const trendLabel = `+${Math.max(0, pct - 70)}% WK`;
  const ink = Pastels.peachInk;

  return (
    <BlockCard pastel="peach" style={styles.card}>
      {/* Trend badge */}
      <View style={[styles.badge, { backgroundColor: 'rgba(58,31,20,0.15)' }]}>
        <Feather name="trending-up" size={10} color={ink} strokeWidth={2.5 as any} />
        <Text style={[styles.badgeText, { color: ink }]}>{trendLabel}</Text>
      </View>

      <Overline color="rgba(58,31,20,0.65)">Today&apos;s rings</Overline>

      <View style={styles.row}>
        <View style={styles.ringWrap}>
          <TripleRing
            size={108}
            values={[r1, r2, r3]}
            colors={[ink, Pastels.gold, Pastels.lavender]}
            trackColor="rgba(58,31,20,0.15)"
          />
          <View style={styles.ringCenter} pointerEvents="none">
            <Text style={[styles.pctNum, { color: ink }]}>
              {pct}
              <Text style={[styles.pctSym, { color: ink }]}>%</Text>
            </Text>
          </View>
        </View>

        <View style={styles.statCol}>
          <Display size="sm" color={ink} style={styles.motto}>
            {motto(avg)}
          </Display>
          <View style={styles.statList}>
            <StatRow label="CONNECT" value={`${connect.done}/${connect.total}`} dot={ink} ink={ink} />
            <StatRow label="SHARED" value={`${shared.done}/${shared.total}`} dot={Pastels.gold} ink={ink} />
            <StatRow label="PRESENT" value={`${present.done}/${present.total}`} dot={Pastels.lavender} ink={ink} />
          </View>
        </View>
      </View>
    </BlockCard>
  );
}

function StatRow({ label, value, dot, ink }: { label: string; value: string; dot: string; ink: string }) {
  return (
    <View style={styles.statRow}>
      <View style={[styles.statDot, { backgroundColor: dot }]} />
      <Text style={[styles.statLabel, { color: 'rgba(58,31,20,0.85)' }]}>{label}</Text>
      <Text style={[styles.statValue, { color: ink }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 22,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: Typography.sansSemiBold,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
  },
  ringWrap: {
    width: 108,
    height: 108,
    position: 'relative',
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctNum: {
    fontFamily: Typography.displayFont,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -1,
  },
  pctSym: {
    fontSize: 16,
    fontFamily: Typography.displayFont,
    fontWeight: '800',
  },
  statCol: {
    flex: 1,
  },
  motto: {
    fontFamily: Typography.displayFont,
  },
  statList: {
    marginTop: 12,
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statLabel: {
    flex: 1,
    fontFamily: Typography.sansSemiBold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  statValue: {
    fontFamily: Typography.displayFont,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
