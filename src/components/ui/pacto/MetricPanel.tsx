import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import type { IconName } from '@/src/components/ui/Icon';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { Card } from './Card';
import { HeroPactoBadge } from './HeroPactoBadge';

export type MetricSegment = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  eyebrow: string;
  value: string | number;
  unit?: string;
  caption?: string;
  icon?: IconName;
  accent?: string;
  segments?: MetricSegment[];
  mutedWhenZero?: boolean;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function MetricPanel({
  eyebrow,
  value,
  unit,
  caption,
  icon,
  accent,
  segments,
  mutedWhenZero,
  right,
  style,
}: Props) {
  const { C } = useTheme();
  const zeroish =
    typeof value === 'number'
      ? value === 0
      : String(value).replace(/[^0-9.-]/g, '') === '0';
  const bg = mutedWhenZero && zeroish ? C.bgCard : accent ?? C.accentSoft;
  const ink = C.inkColor;
  const segs = segments?.filter((s) => s.value > 0) ?? [];
  const total = Math.max(1, segs.reduce((acc, s) => acc + s.value, 0));

  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: bg,
          borderColor: zeroish ? C.lineColor : 'transparent',
          overflow: 'visible',
        },
        style,
      ]}
    >
      {right ?? (icon ? <HeroPactoBadge style={styles.badge} /> : null)}
      <View style={styles.top}>
        <View style={{ flex: 1, paddingRight: icon || right ? 40 : 0 }}>
          <Text style={[Typography.eyebrow, { color: C.ink2 }]}>{eyebrow}</Text>
          <View style={styles.valueRow}>
            <Text
              style={[styles.value, { color: ink }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
            >
              {value}
            </Text>
            {unit ? <Text style={[Typography.bodyMedium, { color: C.ink2, marginBottom: 7 }]}>{unit}</Text> : null}
          </View>
          {caption ? (
            <Text style={[Typography.caption, { color: C.ink2, marginTop: 4 }]}>{caption}</Text>
          ) : null}
        </View>
      </View>
      {segs.length ? (
        <>
          <View style={styles.bar}>
            {segs.map((s) => (
              <View
                key={s.label}
                style={{
                  flex: Math.max(4, Math.round((s.value / total) * 100)),
                  backgroundColor: s.color,
                  borderRadius: 3,
                  height: 6,
                }}
              />
            ))}
          </View>
          <View style={styles.labels}>
            {segs.map((s) => (
              <Text key={s.label} style={[Typography.eyebrowSm, { color: C.ink3 }]}>
                {s.label.toUpperCase()} {s.value}
              </Text>
            ))}
          </View>
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: -6,
    zIndex: 3,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  value: {
    fontFamily: Typography.pixelFont,
    fontSize: 50,
    lineHeight: 52,
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  bar: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 16,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
});
