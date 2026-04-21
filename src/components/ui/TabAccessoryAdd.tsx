import { router, usePathname } from 'expo-router';
import { useMemo } from 'react';
import { ActionSheetIOS, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon } from './Icon';
import { useTheme } from '@/src/lib/theme';

// Map bottom-tab / route context to the "primary" create sheet for that tab.
// Unknown paths fall through to a picker.
function resolvePrimarySheet(pathname: string): string | null {
  if (pathname.startsWith('/tasks')) return '/sheets/new-task';
  if (pathname.startsWith('/reminders')) return '/sheets/new-reminder';
  if (pathname.startsWith('/calendar')) return '/sheets/new-plan';
  if (pathname.startsWith('/us/notes')) return '/sheets/new-note';
  if (pathname.startsWith('/us/checkins')) return '/sheets/new-checkin';
  if (pathname.startsWith('/us/expenses')) return '/sheets/new-expense';
  if (pathname.startsWith('/us/wishlists')) return '/sheets/new-wish';
  if (pathname.startsWith('/us/milestones')) return '/sheets/new-milestone';
  if (pathname.startsWith('/us/plans')) return '/sheets/new-plan';
  if (pathname.startsWith('/us/journal')) return '/sheets/new-entry';
  if (pathname.startsWith('/us/timetables')) return '/sheets/new-timetable';
  return null;
}

const PICKER_ITEMS: Array<{ label: string; href: string }> = [
  { label: 'New task', href: '/sheets/new-task' },
  { label: 'New reminder', href: '/sheets/new-reminder' },
  { label: 'New note', href: '/sheets/new-note' },
  { label: 'New plan', href: '/sheets/new-plan' },
  { label: 'New check-in', href: '/sheets/new-checkin' },
  { label: 'New expense', href: '/sheets/new-expense' },
  { label: 'New milestone', href: '/sheets/new-milestone' },
  { label: 'New wish', href: '/sheets/new-wish' },
  { label: 'New journal entry', href: '/sheets/new-entry' },
  { label: 'New timetable', href: '/sheets/new-timetable' },
];

function openPicker() {
  if (Platform.OS !== 'ios') {
    // Android: fall back to the tasks sheet (TODO: BottomSheet picker on Android)
    router.push('/sheets/new-task' as any);
    return;
  }
  const options = [...PICKER_ITEMS.map((i) => i.label), 'Cancel'];
  const cancelButtonIndex = options.length - 1;
  ActionSheetIOS.showActionSheetWithOptions(
    { options, cancelButtonIndex, title: 'Create' },
    (idx) => {
      if (idx === cancelButtonIndex) return;
      const item = PICKER_ITEMS[idx];
      if (item) router.push(item.href as any);
    }
  );
}

export function TabAccessoryAdd() {
  const { C } = useTheme();
  const pathname = usePathname();

  const target = useMemo(() => resolvePrimarySheet(pathname), [pathname]);

  const onPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (target) router.push(target as any);
    else openPicker();
  };

  const onLongPress = () => {
    // Long-press always opens the picker, regardless of tab context.
    Haptics.selectionAsync();
    openPicker();
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: C.gold, transform: [{ scale: pressed ? 0.94 : 1 }] },
        ]}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Create"
        accessibilityHint={
          target ? 'Opens the create form for this tab' : 'Opens a picker of things to create'
        }
      >
        <Icon name="plus" size={22} color={C.peachInk} strokeWidth={2.6} />
      </Pressable>
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
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    // iOS 26 Liquid Glass applies outer treatment automatically inside BottomAccessory.
    // We provide the pastel fill + icon only.
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
});
