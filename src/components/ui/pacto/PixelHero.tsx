import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';

type Props = {
  eyebrow?: string;
  title: string;
  caption?: string;
  size?: 'sm' | 'md' | 'lg';
  right?: ReactNode;
};

/**
 * The "Maya & Jordan" hero pattern. Used uniformly on tab screens that retain
 * an in-body hero (Us, Calendar, Tasks, Reminders).
 *
 * Eyebrow (Geist Mono uppercase) → pixel-font display title → optional caption
 * (Geist body) → optional right-slot (PactoMark, avatar, action).
 *
 * Design source: /tmp/pacto-design/coupl-design-ii/project/screens.jsx (SoftHero)
 */
export function PixelHero({ eyebrow, title, caption, size = 'md', right }: Props) {
  const { C } = useTheme();
  const titleStyle = {
    sm: Typography.pixelHeroSm,
    md: Typography.pixelHero,
    lg: Typography.pixelHeroLg,
  }[size];

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        {eyebrow ? (
          <Text style={[Typography.eyebrow, { color: C.ink3, marginBottom: 6 }]}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={[titleStyle, { color: C.inkColor }]} numberOfLines={2}>
          {title}
        </Text>
        {caption ? (
          <Text style={[Typography.body, { color: C.ink2, marginTop: 6 }]} numberOfLines={2}>
            {caption}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  right: {
    flexShrink: 0,
  },
});
