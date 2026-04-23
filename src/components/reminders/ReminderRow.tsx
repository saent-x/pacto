import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { LinearTransition, ZoomIn } from 'react-native-reanimated';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Icon } from '@/src/components/ui/Icon';
import { useTheme } from '@/src/lib/theme';
import type { Reminder } from '@/src/types/database';
import { formatWhenChip, isOverdue } from './buckets';

type Props = {
  reminder: Reminder;
  youId: string | null;
  partnerId: string | null;
  onToggle: () => void;
  onSnooze: () => void;
  onDelete: () => void;
  testID?: string;
};

export function ReminderRow({
  reminder,
  youId,
  partnerId,
  onToggle,
  onSnooze,
  onDelete,
  testID,
}: Props) {
  const { C, F } = useTheme();
  const swipeRef = useRef<SwipeableMethods>(null);
  const rootTestID = testID ?? `reminder-row-${reminder.id}`;

  const done = reminder.is_completed;
  const overdue = isOverdue(reminder.due_at, done);
  const whoLabel =
    reminder.assigned_to == null
      ? 'SHARED'
      : reminder.assigned_to === youId
        ? 'YOU'
        : reminder.assigned_to === partnerId
          ? 'PARTNER'
          : 'ASSIGNED';
  const prioColor =
    reminder.priority >= 3 ? C.error : reminder.priority === 2 ? C.butter : C.ash;
  const when = formatWhenChip(reminder.due_at);

  const renderLeftActions = () => (
    <View
      testID={`${rootTestID}-complete-action`}
      style={{
        width: 96,
        backgroundColor: C.mint,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
      }}
    >
      <Icon name="check" size={20} color={C.mintInk} strokeWidth={3} />
    </View>
  );

  const renderRightActions = () => (
    <View style={{ flexDirection: 'row', marginLeft: 8, gap: 6 }}>
      <Pressable
        testID={`${rootTestID}-snooze-action`}
        onPress={() => {
          Haptics.selectionAsync().catch(() => undefined);
          onSnooze();
          swipeRef.current?.close();
        }}
        style={{
          width: 64,
          backgroundColor: C.sky,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="clock" size={18} color={C.skyInk} strokeWidth={3} />
      </Pressable>
      <Pressable
        testID={`${rootTestID}-delete-action`}
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
          onDelete();
          swipeRef.current?.close();
        }}
        style={{
          width: 64,
          backgroundColor: C.error,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="trash" size={18} color="#fff" />
      </Pressable>
    </View>
  );

  return (
    <Animated.View
      testID={rootTestID}
      entering={ZoomIn.duration(180)}
      layout={LinearTransition.springify().damping(18).stiffness(180)}
    >
      <ReanimatedSwipeable
        ref={swipeRef}
        friction={2}
        overshootLeft={false}
        overshootRight={false}
        leftThreshold={64}
        rightThreshold={80}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        onSwipeableOpen={(direction) => {
          if (direction === 'left') {
            swipeRef.current?.close();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
            onToggle();
          }
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 18,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
          }}
        >
          <Pressable
            testID={`${rootTestID}-checkbox`}
            onPress={() => {
              Haptics.selectionAsync().catch(() => undefined);
              onToggle();
            }}
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              borderWidth: done ? 0 : 1.5,
              borderColor: C.ash,
              backgroundColor: done ? C.reminders : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {done ? <Icon name="check" size={14} color="#fff" strokeWidth={3} /> : null}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 14,
                fontFamily: F.body,
                color: done ? C.fog : C.bone,
                textDecorationLine: done ? 'line-through' : 'none',
              }}
            >
              {reminder.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Icon name="clock" size={10} color={overdue ? C.error : C.fog} />
              <Text
                style={{
                  fontSize: 10,
                  color: overdue ? C.error : C.fog,
                  fontFamily: F.bodyBold,
                  letterSpacing: 0.4,
                }}
              >
                {when}
              </Text>
              <Text style={{ color: C.ash }}>·</Text>
              <Text
                style={{
                  fontSize: 10,
                  color: C.mist,
                  fontFamily: F.bodyBold,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}
              >
                {whoLabel}
              </Text>
            </View>
          </View>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: prioColor,
            }}
          />
        </View>
      </ReanimatedSwipeable>
    </Animated.View>
  );
}
