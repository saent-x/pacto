// src/components/tasks/TaskRow.tsx
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
  withSequence,
  withTiming,
} from 'react-native-reanimated';
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
  onLongPress,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  testID,
}: {
  task: Task;
  listColor: string;
  state?: RowState;
  onToggle: () => void;
  onLongPress?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  testID?: string;
}) {
  const { C, F } = useTheme();
  const prioColor: Record<string, string> = {
    high: C.error,
    med: C.butter,
    low: C.ash,
    none: C.ash,
  };
  const prioKey = task.priority >= 3 ? 'high' : task.priority === 2 ? 'med' : task.priority === 1 ? 'low' : 'none';
  const dueChip = formatDueChip(task.due_date);
  const reduced = useReducedMotion();
  const checkScale = useSharedValue(1);
  const prevDone = useRef(task.is_completed);
  useEffect(() => {
    if (prevDone.current !== task.is_completed && task.is_completed && !reduced) {
      checkScale.value = withSequence(
        withTiming(1.18, { duration: 100, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 150, easing: Easing.inOut(Easing.cubic) }),
      );
    }
    prevDone.current = task.is_completed;
  }, [task.is_completed, reduced, checkScale]);
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <Animated.View
      entering={ZoomIn.duration(180)}
      layout={LinearTransition.springify().damping(18).stiffness(180)}
      testID={testID}
      style={{ transform: [{ scale: state === 'reordering' ? 1.03 : 1 }] }}
    >
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={350}
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
        <Animated.View style={checkStyle}>
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
        </Animated.View>
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
        {state === 'reordering' && (onMoveUp || onMoveDown) ? (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pressable
              testID={`${testID ?? 'task-row'}-move-up`}
              onPress={() => {
                Haptics.selectionAsync().catch(() => undefined);
                onMoveUp?.();
              }}
              disabled={!canMoveUp || !onMoveUp}
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: canMoveUp && onMoveUp ? `${listColor}33` : 'transparent',
                opacity: canMoveUp && onMoveUp ? 1 : 0.3,
              }}
            >
              <Icon name="chevronsUp" size={14} color={listColor} strokeWidth={2.5} />
            </Pressable>
            <Pressable
              testID={`${testID ?? 'task-row'}-move-down`}
              onPress={() => {
                Haptics.selectionAsync().catch(() => undefined);
                onMoveDown?.();
              }}
              disabled={!canMoveDown || !onMoveDown}
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: canMoveDown && onMoveDown ? `${listColor}33` : 'transparent',
                opacity: canMoveDown && onMoveDown ? 1 : 0.3,
              }}
            >
              <Icon name="chevronDown" size={14} color={listColor} strokeWidth={2.5} />
            </Pressable>
          </View>
        ) : prioKey !== 'none' ? (
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
    </Animated.View>
  );
}
