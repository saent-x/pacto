import { router, usePathname } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useMemo } from 'react';
import { ActionSheetIOS, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/lib/session';
import { Icon } from './Icon';
import { PressScale } from './PressScale';

type Item = { label: string; href: string; coupleOnly?: boolean };

const ITEMS: Item[] = [
  { label: 'New task', href: '/sheets/new-task' },
  { label: 'New reminder', href: '/sheets/new-reminder' },
  { label: 'New note', href: '/sheets/new-note' },
  { label: 'New journal entry', href: '/sheets/new-entry' },
  { label: 'New timetable', href: '/sheets/new-timetable' },
  { label: 'New check-in', href: '/sheets/new-checkin', coupleOnly: true },
  { label: 'New expense', href: '/sheets/new-expense', coupleOnly: true },
  { label: 'New plan', href: '/sheets/new-plan', coupleOnly: true },
  { label: 'New milestone', href: '/sheets/new-milestone', coupleOnly: true },
  { label: 'New wish', href: '/sheets/new-wish', coupleOnly: true },
];

function primaryHrefForPath(pathname: string): string | null {
  if (pathname.startsWith('/tasks')) return '/sheets/new-task';
  if (pathname.startsWith('/reminders')) return '/sheets/new-reminder';
  if (pathname.startsWith('/calendar')) return '/sheets/new-reminder';
  if (pathname.startsWith('/us/notes')) return '/sheets/new-note';
  if (pathname.startsWith('/us/journal')) return '/sheets/new-entry';
  if (pathname.startsWith('/us/timetables')) return '/sheets/new-timetable';
  if (pathname.startsWith('/us/checkins')) return '/sheets/new-checkin';
  if (pathname.startsWith('/us/expenses')) return '/sheets/new-expense';
  if (pathname.startsWith('/us/plans')) return '/sheets/new-plan';
  if (pathname.startsWith('/us/milestones')) return '/sheets/new-milestone';
  if (pathname.startsWith('/us/wishlists')) return '/sheets/new-wish';
  return null;
}

export function TabAccessoryAdd() {
  const { C } = useTheme();
  const { isSolo } = useSession();
  const pathname = usePathname();
  const placement = NativeTabs.BottomAccessory.usePlacement();
  const inline = placement === 'inline';

  const options = useMemo(() => {
    const filtered = ITEMS.filter((i) => (isSolo ? !i.coupleOnly : true));
    const primary = primaryHrefForPath(pathname);
    if (!primary) return filtered;
    const idx = filtered.findIndex((i) => i.href === primary);
    if (idx <= 0) return filtered;
    const copy = filtered.slice();
    const [top] = copy.splice(idx, 1);
    copy.unshift(top);
    return copy;
  }, [pathname, isSolo]);

  const openPicker = () => {
    const labels = [...options.map((o) => o.label), 'Cancel'];
    const cancelButtonIndex = labels.length - 1;
    ActionSheetIOS.showActionSheetWithOptions(
      { options: labels, cancelButtonIndex, title: 'Create' },
      (idx) => {
        if (idx === cancelButtonIndex) return;
        const item = options[idx];
        if (item) router.push(item.href as any);
      }
    );
  };

  const onPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openPicker();
  };

  const size = inline
    ? { width: 44, height: 36, borderRadius: 18 }
    : { width: 50, height: 50, borderRadius: 25 };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <PressScale
        onPress={onPress}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Create"
        accessibilityHint="Opens a picker of things to create"
        style={[styles.fab, size, { backgroundColor: C.gold }]}
      >
        <Icon
          name="plus"
          size={inline ? 20 : 22}
          color={C.peachInk}
          strokeWidth={2.6}
        />
      </PressScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 14,
  },
  fab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
