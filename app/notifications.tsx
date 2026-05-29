import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ActionEmptyState,
  Bucket,
  BucketedList,
  PixelHero,
} from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import {
  useNotifications,
  type NotificationItem,
} from '@/src/hooks/useNotifications';
import { safeNotificationRoute } from '@/src/lib/notification-routes';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const { buckets: rawBuckets, isLoading, markAllRead } = useNotifications();

  // Mark all as read when leaving the screen.
  useEffect(() => {
    return () => {
      markAllRead().catch(() => undefined);
    };
  }, [markAllRead]);

  const totalUnread = useMemo(
    () =>
      rawBuckets.reduce(
        (acc, b) => acc + b.items.filter((i) => i.unread).length,
        0
      ),
    [rawBuckets]
  );

  const total = useMemo(
    () => rawBuckets.reduce((acc, b) => acc + b.items.length, 0),
    [rawBuckets]
  );

  const bucketsForList = useMemo<Bucket<NotificationItem>[]>(
    () =>
      rawBuckets.map((b) => ({
        label: b.label,
        dotColor:
          b.label === 'Today'
            ? C.accent
            : b.label === 'Yesterday'
            ? C.accent2
            : C.ink2,
        rows: b.items,
      })),
    [rawBuckets, C.accent, C.accent2, C.ink2]
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <PixelHero
          eyebrow={
            isLoading
              ? 'LOADING'
              : totalUnread > 0
              ? `${totalUnread} NEW · ${total} TOTAL`
              : 'ALL CAUGHT UP'
          }
          title="Notifications"
          caption={
            isLoading
              ? 'Catching up…'
              : total === 0
              ? "Nothing new — you'll see memories, check-ins, and reminders here."
              : 'Tap to mark read.'
          }
          size="md"
        />

        {isLoading ? null : total === 0 ? (
          <View style={styles.listWrap}>
            <ActionEmptyState
              icon="bell"
              title="Quiet right now"
              body="Your next memory, check-in, or reminder will land here."
              accent={C.accent}
            />
          </View>
        ) : (
          <View style={styles.listWrap}>
            <BucketedList
              buckets={bucketsForList}
              rowKey={(n) => n.id}
              renderRow={(n) => <NotificationRow notification={n} />}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function NotificationRow({
  notification,
}: {
  notification: NotificationItem;
}) {
  const { C } = useTheme();
  const [locallyRead, setLocallyRead] = useState(false);
  const showDot = notification.unread && !locallyRead;

  const handlePress = () => {
    if (notification.unread && !locallyRead) {
      Haptics.selectionAsync().catch(() => undefined);
      setLocallyRead(true);
    }
    const route = safeNotificationRoute(notification.route);
    if (route) {
      router.push(route as any);
    }
  };

  return (
    <PressScale
      onPress={handlePress}
      testID={`notification-row-${notification.id}`}
      style={styles.row}
    >
      <View
        style={[
          styles.iconTile,
          { backgroundColor: `${notification.color}22` },
        ]}
      >
        <Icon
          name={notification.icon}
          size={17}
          color={notification.color}
          strokeWidth={1.8}
        />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text
            style={[
              Typography.bodyMedium,
              { flex: 1, color: C.inkColor },
            ]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          {showDot ? (
            <View
              testID="notification-unread-dot"
              style={[
                styles.unreadDot,
                { backgroundColor: C.accent },
              ]}
            />
          ) : null}
        </View>
        <Text
          style={[Typography.caption, { color: C.ink2, marginTop: 2 }]}
          numberOfLines={2}
        >
          {notification.sub}
        </Text>
        <Text
          style={[
            Typography.eyebrowSm,
            { color: C.ink3, marginTop: 4, fontSize: 10 },
          ]}
        >
          {notification.time}
        </Text>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  listWrap: {
    paddingHorizontal: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
