import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';

type Mode = 'solo' | 'pair' | 'crew';
type Scope = 'mine' | 'partner' | 'shared';

type Props = {
  scope: Scope;
  mode: Mode;
  partnerName?: string | null;
};

/**
 * mine / partner / shared dot+label. Hidden in solo mode (returns null).
 *
 * Design source: /tmp/pacto-design/coupl-design-ii/project/components.jsx (ScopeChip)
 */
export function ScopeChip({ scope, mode, partnerName }: Props) {
  const { C } = useTheme();
  if (mode === 'solo') return null;

  const map: Record<Scope, { label: string; color: string }> = {
    mine: { label: 'mine', color: C.accent },
    partner: {
      label: (partnerName?.split(' ')[0] || 'partner').toLowerCase(),
      color: C.accent2,
    },
    shared: { label: 'shared', color: C.accent3 },
  };
  const it = map[scope] ?? map.shared;

  return (
    <View style={[styles.container, { backgroundColor: C.bgSoft, borderColor: C.lineColor }]}>
      <View style={[styles.dot, { backgroundColor: it.color }]} />
      <Text style={[styles.label, Typography.pillLabel, { color: it.color }]}>{it.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    gap: 4,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  label: {
    fontSize: 10.5,
  },
});
