import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

type EntityKind = 'milestone' | 'plan' | 'checkIn' | 'expense' | 'wishlistItem';

const ICONS: Record<EntityKind, IconName> = {
  milestone: 'flag',
  plan: 'compass', // 'target' not in icon set; compass used as nearest substitute
  checkIn: 'messageCircle',
  expense: 'dollarSign',
  wishlistItem: 'gift',
};

const ROUTES: Record<EntityKind, (id: string) => string> = {
  milestone: () => '/(tabs)/us/milestones',
  plan: () => '/(tabs)/us/plans',
  checkIn: () => '/(tabs)/us/checkins',
  expense: () => '/(tabs)/us/expenses',
  wishlistItem: () => '/(tabs)/us/wishlists',
};

export function EntityRefCard({ type, refId, label }: { type: EntityKind; refId: string; label?: string }) {
  const { C } = useTheme();
  return (
    <PressScale onPress={() => router.push(ROUTES[type](refId) as any)} style={[styles.card, { backgroundColor: C.bgSoft }]}>
      <Icon name={ICONS[type]} size={18} color={C.inkColor} />
      <Text style={[Typography.body, { color: C.inkColor, marginLeft: 8 }]}>{label ?? type}</Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10 },
});
