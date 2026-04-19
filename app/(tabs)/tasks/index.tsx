import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Display, Overline, Pill, ProgressRing } from '@/src/components/ui/atoms';
import { Icon } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { useTheme } from '@/src/lib/theme';
import { TASK_LISTS } from '@/src/lib/tasks-data';

const FILTERS = ['All', 'Mine', "Sofia's", 'Shared', 'Travel', 'Home', 'Date', 'Work'] as const;

export default function TasksList() {
  const { C, F } = useTheme();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const lists = useMemo(() => {
    if (filter === 'All') return TASK_LISTS;
    if (filter === 'Mine') return TASK_LISTS.filter((l) => l.who === 'Mine');
    if (filter === "Sofia's") return TASK_LISTS.filter((l) => l.who === "Sofia's");
    if (filter === 'Shared') return TASK_LISTS.filter((l) => l.who === 'Both');
    return TASK_LISTS.filter((l) => l.cat === filter);
  }, [filter]);
  const totalDone = TASK_LISTS.reduce((a, l) => a + l.done, 0);
  const totalAll = TASK_LISTS.reduce((a, l) => a + l.total, 0);

  return (
    <Screen>
      <View
        style={{
          marginBottom: 16,
          backgroundColor: C.mint,
          borderRadius: 22,
          padding: 22,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Overline color="rgba(15,44,26,0.7)">Getting done</Overline>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 6 }}>
              <Display size={54} color={C.mintInk}>{`${totalDone}`}</Display>
              <Text
                style={{
                  fontSize: 22,
                  fontFamily: F.displayBold,
                  color: 'rgba(15,44,26,0.55)',
                  marginBottom: 8,
                }}
              >
                /{totalAll}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: 'rgba(15,44,26,0.75)',
                marginTop: 4,
                fontFamily: F.body,
              }}
            >
              across {TASK_LISTS.length} lists · doing great.
            </Text>
          </View>
          <ProgressRing
            size={80}
            stroke={8}
            value={totalDone / totalAll}
            colors={[C.mintInk, C.mintInk]}
            bg="rgba(15,44,26,0.2)"
            label={`${Math.round((100 * totalDone) / totalAll)}%`}
            labelColor={C.mintInk}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
          {FILTERS.map((f) => (
            <Pill
              key={f}
              active={filter === f}
              activeBg={C.tasks}
              activeColor="#fff"
              onPress={() => setFilter(f)}
            >
              {f}
            </Pill>
          ))}
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {lists.map((l) => {
          const color = (C as any)[l.colorKey] as string;
          const ink = (C as any)[`${l.colorKey}Ink`] as string;
          const pct = l.total === 0 ? 0 : l.done / l.total;
          return (
            <Pressable
              key={l.id}
              onPress={() => router.push(`/tasks/${l.id}` as any)} // route: tasks/[listId]
              style={{
                width: '48%',
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
                <Icon name={l.icon} size={18} color={ink} />
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
                  {l.name}
                </Text>
                <View
                  style={{
                    height: 4,
                    backgroundColor: 'rgba(0,0,0,0.12)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${pct * 100}%`,
                      height: '100%',
                      backgroundColor: ink,
                    }}
                  />
                </View>
                <View
                  style={{
                    marginTop: 8,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: F.bodyBold,
                      letterSpacing: 1,
                      color: ink,
                      opacity: 0.6,
                    }}
                  >
                    {l.done}/{l.total}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: F.bodyBold,
                      letterSpacing: 1,
                      color: ink,
                      opacity: 0.6,
                    }}
                  >
                    {Math.round(pct * 100)}%
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
