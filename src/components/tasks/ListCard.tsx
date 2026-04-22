import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Icon } from '@/src/components/ui/Icon';
import { useTheme } from '@/src/lib/theme';
import type { ListRow } from '@/src/hooks/useTaskLists';

export function ListCard({
  list,
  index = 0,
  onPress,
  testID,
}: {
  list: ListRow;
  index?: number;
  onPress: () => void;
  testID?: string;
}) {
  const { C, F } = useTheme();
  const color = (C as any)[list.colorKey] as string;
  const ink = (C as any)[`${list.colorKey}Ink`] as string;
  const pct = list.total === 0 ? 0 : list.done / list.total;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40).duration(360).springify().damping(18)}
      style={{ width: '48%' }}
    >
      <Pressable
        testID={testID ?? `task-list-card-${list.id}`}
        onPress={onPress}
        style={{
          backgroundColor: color,
          borderRadius: 22,
          paddingHorizontal: 16,
          paddingTop: 18,
          paddingBottom: 16,
          minHeight: 136,
          justifyContent: 'space-between',
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: 'rgba(0,0,0,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={list.icon} size={18} color={ink} />
        </View>
        <View>
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 18,
              color: ink,
              letterSpacing: -0.4,
              lineHeight: 20,
              marginBottom: 10,
            }}
          >
            {list.name}
          </Text>
          <View
            style={{
              height: 4,
              backgroundColor: 'rgba(0,0,0,0.12)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: ink }} />
          </View>
          <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={labelStyle(F, ink)}>{list.done}/{list.total}</Text>
            <Text style={labelStyle(F, ink)}>{Math.round(pct * 100)}%</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function labelStyle(F: { bodyBold: string }, ink: string) {
  return {
    fontSize: 10,
    fontFamily: F.bodyBold,
    letterSpacing: 1,
    color: ink,
    opacity: 0.6,
  } as const;
}

export function ListCardSkeleton({ index = 0 }: { index?: number }) {
  const { C } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40).duration(360)}
      style={{
        width: '48%',
        minHeight: 136,
        borderRadius: 22,
        backgroundColor: C.cardHi,
        opacity: 0.6,
      }}
    />
  );
}
