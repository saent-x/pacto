import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  LinearTransition,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Icon } from '@/src/components/ui/Icon';
import {
  SWIPE_ACTION_GAP,
  SWIPE_ACTION_WIDTH,
  SWIPE_ANIMATION_OPTIONS,
  SWIPE_ROW_RADIUS,
  SwipeActionButton,
  SwipeActionRail,
} from '@/src/components/ui/pacto/SwipeableRow';
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
  const reduced = useReducedMotion();
  const checkScale = useSharedValue(1);
  const prevDone = useRef(done);
  useEffect(() => {
    if (prevDone.current !== done && done && !reduced) {
      checkScale.value = withSequence(
        withTiming(1.18, { duration: 100, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 150, easing: Easing.inOut(Easing.cubic) }),
      );
    }
    prevDone.current = done;
  }, [done, reduced, checkScale]);
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));
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

  const completeReminder = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    onToggle();
    swipeRef.current?.close();
  };

  const renderLeftActions = (progress: SharedValue<number>) => (
    <SwipeActionRail side="left">
      <SwipeActionButton
        testID={`${rootTestID}-complete-action`}
        progress={progress}
        side="left"
        icon="check"
        color={C.mint}
        iconColor={C.mintInk}
        accessibilityLabel={done ? 'Mark reminder open' : 'Complete reminder'}
        onPress={completeReminder}
      />
    </SwipeActionRail>
  );

  const renderRightActions = (progress: SharedValue<number>) => (
    <SwipeActionRail
      side="right"
      width={SWIPE_ACTION_WIDTH * 2 + SWIPE_ACTION_GAP}
      style={{ paddingRight: 8 }}
    >
      <View style={{ flexDirection: 'row', gap: SWIPE_ACTION_GAP }}>
        <SwipeActionButton
          testID={`${rootTestID}-snooze-action`}
          progress={progress}
          side="right"
          icon="clock"
          color={C.sky}
          iconColor={C.skyInk}
          accessibilityLabel="Snooze reminder"
          onPress={() => {
            Haptics.selectionAsync().catch(() => undefined);
            onSnooze();
            swipeRef.current?.close();
          }}
        />
        <SwipeActionButton
          testID={`${rootTestID}-delete-action`}
          progress={progress}
          side="right"
          icon="trash"
          color={C.error}
          iconColor={C.bgCard}
          accessibilityLabel="Delete reminder"
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
            onDelete();
            swipeRef.current?.close();
          }}
        />
      </View>
    </SwipeActionRail>
  );

  return (
    <Animated.View
      testID={rootTestID}
      entering={ZoomIn.duration(180)}
      layout={LinearTransition.springify().damping(18).stiffness(180)}
      style={{
        borderRadius: SWIPE_ROW_RADIUS,
        backgroundColor: 'transparent',
        overflow: 'visible',
      }}
    >
      <ReanimatedSwipeable
        ref={swipeRef}
        friction={1.18}
        overshootFriction={8}
        overshootLeft
        overshootRight
        leftThreshold={SWIPE_ACTION_WIDTH * 0.56}
        rightThreshold={(SWIPE_ACTION_WIDTH * 2 + SWIPE_ACTION_GAP) * 0.5}
        animationOptions={SWIPE_ANIMATION_OPTIONS}
        containerStyle={{
          borderRadius: SWIPE_ROW_RADIUS,
          backgroundColor: 'transparent',
          overflow: 'visible',
        }}
        childrenContainerStyle={{
          borderRadius: SWIPE_ROW_RADIUS,
          backgroundColor: 'transparent',
          overflow: 'hidden',
        }}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        onSwipeableOpen={(direction) => {
          if (direction === 'left') {
            completeReminder();
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
            borderRadius: SWIPE_ROW_RADIUS,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            overflow: 'hidden',
          }}
        >
          <Animated.View style={checkStyle}>
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
              {done ? <Icon name="check" size={14} color={C.bgCard} strokeWidth={3} /> : null}
            </Pressable>
          </Animated.View>
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
