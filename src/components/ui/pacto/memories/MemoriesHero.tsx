import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

interface Props {
  eyebrow: string;
  title: string;
  caption?: string;
  rightSlot?: ReactNode;
}

/**
 * Hero block for the Memories feed. Mirrors the design's `SoftHero` —
 * eyebrow (mono uppercase) → display title → soft caption, with an
 * optional right-anchored slot (avatar / pair / crew stack).
 */
export function MemoriesHero({ eyebrow, title, caption, rightSlot }: Props) {
  const { C } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.col}>
        <Text style={[Typography.eyebrow, { color: C.accent }]} numberOfLines={1}>
          {eyebrow}
        </Text>
        <Text
          style={[Typography.pixelHero, styles.title, { color: C.inkColor }]}
          numberOfLines={2}
        >
          {title}
        </Text>
        {caption ? (
          <Text style={[styles.caption, { color: C.ink3 }]} numberOfLines={3}>
            {caption}
          </Text>
        ) : null}
      </View>
      {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 18,
    gap: 14,
  },
  col: { flex: 1, minWidth: 0 },
  right: { flexShrink: 0, marginTop: 2 },
  title: {
    marginTop: 6,
  },
  caption: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
});
