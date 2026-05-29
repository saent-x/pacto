import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { PulsingDot } from './PulsingDot';
import { shouldAppendAccentDot } from '../titlePunctuation';

type Props = {
  eyebrow?: string;
  title: string;
  accent?: string;
  align?: 'center' | 'left';
  size?: number;
};

/**
 * Native-header title block — eyebrow (Geist Mono uppercase) above a
 * compact pixel-font title with an accent-colored period suffix.
 *
 * Matches the legacy HeaderBrand convention: render an accent trailing dot
 * unless the supplied title already carries terminal punctuation.
 */
export function HeaderBrand({ eyebrow, title, accent, align = 'center', size = 22 }: Props) {
  const { C } = useTheme();
  const acc = accent ?? C.accent;
  return (
    <View style={[styles.wrap, align === 'left' ? styles.left : styles.center]}>
      {eyebrow ? (
        <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>{eyebrow}</Text>
      ) : null}
      <Text
        numberOfLines={1}
        style={[
          {
            fontFamily: Typography.pixelFont,
            color: C.inkColor,
            fontSize: size,
            lineHeight: size + 2,
            letterSpacing: 0,
            textTransform: 'uppercase',
            marginTop: eyebrow ? 2 : 0,
          },
        ]}
      >
        {title}
        {shouldAppendAccentDot(title) ? <PulsingDot color={acc} /> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 4,
  },
  center: {
    alignItems: 'center',
  },
  left: {
    alignItems: 'flex-start',
  },
});
