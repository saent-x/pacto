import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { IconTile, Overline } from '@/src/components/ui/atoms';
import { Screen } from '@/src/components/ui/Screen';
import { useTheme } from '@/src/lib/theme';
import { useNotifications, type NotificationItem } from '@/src/hooks/useNotifications';

export default function Notifications() {
  const { C, F } = useTheme();
  const { buckets, isLoading, markAllRead } = useNotifications();

  useEffect(() => {
    return () => {
      markAllRead().catch(() => undefined);
    };
  }, [markAllRead]);

  if (isLoading) {
    return (
      <Screen>
        <View testID="notifications-loading" style={{ paddingTop: 48, alignItems: 'center' }}>
          <Text style={{ fontFamily: F.body, fontSize: 13, color: C.mist }}>Loading…</Text>
        </View>
      </Screen>
    );
  }

  if (buckets.length === 0) {
    return (
      <Screen>
        <View testID="notifications-empty" style={{ paddingTop: 64, alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: F.serif,
              fontSize: 28,
              fontStyle: 'italic',
              color: C.bone,
              letterSpacing: -0.6,
              marginBottom: 10,
            }}
          >
            quiet.
          </Text>
          <Text
            style={{
              fontFamily: F.body,
              fontSize: 13,
              color: C.mist,
              textAlign: 'center',
              maxWidth: 240,
              lineHeight: 19,
            }}
          >
            Nothing new to read. Your next note, check-in, or reminder will land here.
          </Text>
        </View>
      </Screen>
    );
  }

  let flat = 0;
  return (
    <Screen>
      {buckets.map((bucket, bi) => (
        <View key={bucket.label} testID={`notifications-bucket-${bucket.label}`}>
          <Overline style={{ marginTop: bi === 0 ? 0 : 24, marginBottom: 12, paddingLeft: 4 }}>
            {bucket.label}
          </Overline>
          <View style={{ gap: 10 }}>
            {bucket.items.map((n) => {
              const idx = flat++;
              return <Row key={n.id} n={n} index={idx} />;
            })}
          </View>
        </View>
      ))}
    </Screen>
  );
}

function Row({ n, index }: { n: NotificationItem; index: number }) {
  const { C, F } = useTheme();
  const [locallyRead, setLocallyRead] = useState(false);
  const showDot = n.unread && !locallyRead;

  const handlePress = () => {
    if (n.unread && !locallyRead) {
      Haptics.selectionAsync().catch(() => undefined);
      setLocallyRead(true);
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 40)
        .duration(280)
        .springify()
        .damping(18)}
      testID={`notification-row-${n.id}`}
    >
      <Pressable onPress={handlePress}>
        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            padding: 14,
            borderRadius: 18,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            alignItems: 'flex-start',
          }}
        >
          <IconTile icon={n.icon} bg={`${n.color}22`} color={n.color} size={38} iconSize={17} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text
                style={{ flex: 1, fontSize: 14, color: C.bone, fontFamily: F.bodyBold }}
                numberOfLines={1}
              >
                {n.title}
              </Text>
              {showDot && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(200)}
                  testID="notification-unread-dot"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: C.gold,
                  }}
                />
              )}
            </View>
            <Text style={{ fontSize: 12, color: C.mist, marginTop: 2, fontFamily: F.body }}>
              {n.sub}
            </Text>
            <Text
              style={{
                fontSize: 10,
                color: C.fog,
                marginTop: 4,
                fontFamily: F.bodyBold,
                letterSpacing: 0.6,
              }}
            >
              {n.time}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
