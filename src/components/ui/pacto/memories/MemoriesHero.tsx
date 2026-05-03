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
        <Text style={[Typography.eyebrow, { color: C.ink3 }]} numberOfLines={1}>
          {eyebrow}
        </Text>
        <Text
          style={[Typography.pixelHero, { color: C.inkColor, marginTop: 6 }]}
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
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 14,
    gap: 14,
  },
  col: { flex: 1, minWidth: 0 },
  right: { flexShrink: 0, marginTop: 2 },
  caption: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
});
