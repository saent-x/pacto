// src/components/tasks/TaskRow.tsx
import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { LinearTransition, ZoomIn } from 'react-native-reanimated';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Icon } from '@/src/components/ui/Icon';
import { useTheme } from '@/src/lib/theme';
import type { Task } from '@/src/types/database';
import { formatDueChip } from './buckets';

export type RowState = 'idle' | 'reordering';

export function TaskRow({
  task,
  listColor,
  state = 'idle',
  onToggle,
  onDelete,
  onLongPress,
  testID,
}: {
  task: Task;
  listColor: string;
  state?: RowState;
  onToggle: () => void;
  onDelete: () => void;
  onLongPress?: () => void;
  testID?: string;
}) {
  const { C, F } = useTheme();
  const swipeRef = useRef<SwipeableMethods>(null);
  const prioColor: Record<string, string> = {
    high: C.error,
    med: C.butter,
    low: C.ash,
    none: C.ash,
  };
  const prioKey = task.priority >= 3 ? 'high' : task.priority === 2 ? 'med' : task.priority === 1 ? 'low' : 'none';
  const dueChip = formatDueChip(task.due_date);

  const renderRightActions = () => (
    <View
      testID={`${testID ?? 'task-row'}-delete-action`}
      style={{
        width: 96,
        backgroundColor: C.error,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
      }}
    >
      <Icon name="trash" size={18} color="#fff" />
    </View>
  );

  const renderLeftActions = () => (
    <View
      testID={`${testID ?? 'task-row'}-complete-action`}
      style={{
        width: 96,
        backgroundColor: C.mint,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
      }}
    >
      <Icon name="check" size={20} color={C.mintInk} strokeWidth={3} />
    </View>
  );

  return (
    <Animated.View
      entering={ZoomIn.duration(180)}
      layout={LinearTransition.springify().damping(18).stiffness(180)}
      testID={testID}
      style={{ transform: [{ scale: state === 'reordering' ? 1.03 : 1 }] }}
    >
      <ReanimatedSwipeable
        ref={swipeRef}
        friction={2}
        overshootLeft={false}
        overshootRight={false}
        leftThreshold={64}
        rightThreshold={64}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        onSwipeableOpen={(direction) => {
          swipeRef.current?.close();
          if (direction === 'left') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
            onToggle();
          } else if (direction === 'right') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
            onDelete();
          }
        }}
      >
        <Pressable
          onLongPress={onLongPress}
          delayLongPress={500}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            paddingVertical: 13,
            paddingHorizontal: 14,
            borderRadius: 16,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: state === 'reordering' ? listColor : C.line,
          }}
        >
          <Pressable
            testID={`${testID ?? 'task-row'}-checkbox`}
            onPress={() => {
              Haptics.selectionAsync().catch(() => undefined);
              onToggle();
            }}
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: task.is_completed ? 0 : 1.5,
              borderColor: C.ash,
              backgroundColor: task.is_completed ? listColor : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {task.is_completed ? (
              <Icon name="check" size={12} color={C.ink} strokeWidth={3} />
            ) : null}
          </Pressable>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 14,
              color: task.is_completed ? C.fog : C.bone,
              fontFamily: F.body,
              textDecorationLine: task.is_completed ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </Text>
          {dueChip ? (
            <Text
              style={{
                fontSize: 10,
                color: C.fog,
                fontFamily: F.bodyBold,
                letterSpacing: 0.6,
                backgroundColor: C.cardHi,
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: 6,
              }}
            >
              {dueChip}
            </Text>
          ) : null}
          {prioKey !== 'none' ? (
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: prioColor[prioKey],
              }}
            />
          ) : null}
        </Pressable>
      </ReanimatedSwipeable>
    </Animated.View>
  );
}
