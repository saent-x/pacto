import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { PressScale } from '@/src/components/ui/PressScale';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { Typography } from '@/src/constants/typography';
import { alphaColor } from '@/src/lib/color';

export type Tone = {
  bg: string;
  ink: string;
  muted: string;
  border?: string;
};

type Props = {
  tone: Tone;
  title: string;
  icon?: IconName;
  stat?: string | number;
  statLabel?: string;
  dotsFilled?: number;
  dotsTotal?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  topRight?: ReactNode;
};

/**
 * 2-col grid tile with solid color bg, big numeric stat, label, and an
 * optional dot-progress strip. Designed for module/task grids inspired by
 * the editorial habit-tracker reference.
 */
export function ColorTile({
  tone,
  title,
  icon,
  stat,
  statLabel,
  dotsFilled = 0,
  dotsTotal = 0,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  disabled,
  style,
  topRight,
}: Props) {
  const dotOnColor = alphaColor(tone.ink, 0.85);
  const dotOffColor = alphaColor(tone.ink, 0.18);

  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      haptic="impact"
      pressedScale={0.97}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[
        styles.tile,
        {
          backgroundColor: tone.bg,
          borderColor: tone.border ?? alphaColor(tone.ink, 0.14),
          opacity: disabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      <View style={styles.top}>
        <Text
          style={[styles.title, { color: tone.ink }]}
          numberOfLines={2}
        >
          {title}
        </Text>
        {topRight ? (
          topRight
        ) : icon ? (
          <Icon name={icon} size={23} color={alphaColor(tone.ink, 0.85)} strokeWidth={2.2} />
        ) : null}
      </View>

      <View style={styles.middle}>
        {stat !== undefined && stat !== null ? (
          <Text
            style={[
              {
                fontFamily: Typography.pixelFont,
                color: tone.ink,
                fontSize: 32,
                lineHeight: 34,
                letterSpacing: 0,
                fontVariant: ['tabular-nums'],
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {stat}
          </Text>
        ) : null}
        {statLabel ? (
          <Text
            style={[
              Typography.eyebrowSm,
              { color: tone.muted, fontSize: 9, letterSpacing: 1.5, marginTop: 4 },
            ]}
            numberOfLines={1}
          >
            {statLabel}
          </Text>
        ) : null}
      </View>

      {dotsTotal > 0 ? (
        <View style={styles.dots}>
          {Array.from({ length: dotsTotal }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i < dotsFilled ? dotOnColor : dotOffColor },
              ]}
            />
          ))}
        </View>
      ) : null}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '48%',
    minHeight: 144,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontFamily: Typography.geistSemiBoldFont,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0,
    flexShrink: 1,
  },
  middle: {
    marginTop: 12,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
