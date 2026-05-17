import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import type { MemoryTopic } from '@/src/hooks/memories/useMemoryTopics';

interface Props {
  topics: MemoryTopic[];
  selected: string;
  onSelect: (topicId: string) => void;
}

/**
 * Horizontal scroll of pill chips. Mirrors the design's topic strip
 * (For you / Just us / Just me / #tag…). The selected chip flips to
 * `--ink` background with `--bg` text; idle chips use `--bg-card` with
 * an `--line` border.
 */
export function TopicChipStrip({ topics, selected, onSelect }: Props) {
  const { C } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {topics.map((t) => {
        const isActive = t.id === selected;
        return (
          <PressScale
            key={t.id}
            onPress={() => onSelect(t.id)}
            style={[
              styles.chip,
              {
                borderColor: isActive ? C.inkColor : C.lineColor,
                backgroundColor: isActive ? C.inkColor : C.bgSoft,
              },
            ]}
          >
            <Text
              style={[
                Typography.body,
                {
                  color: isActive ? C.bg : C.ink2,
                  fontSize: 13,
                  fontWeight: '500',
                },
              ]}
            >
              {t.label}
            </Text>
            {t.count != null && t.count > 0 ? (
              <Text
                style={[
                  styles.count,
                  { color: isActive ? C.bg : C.ink3 },
                ]}
              >
                {t.count}
              </Text>
            ) : null}
          </PressScale>
        );
      })}
      <View style={{ width: 12 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 18,
    paddingTop: 0,
    paddingBottom: 14,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  count: {
    fontFamily: 'GeistMono_400Regular',
    fontSize: 11,
    opacity: 0.7,
  },
});
