import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { alphaColor } from '@/src/lib/color';
import { useTheme } from '@/src/lib/theme';

type Props = {
  icon: IconName;
  title: string;
  subtitle?: string;
  accent?: string;
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function QuickAction({
  icon,
  title,
  subtitle,
  accent,
  onPress,
  accessibilityLabel,
  style,
}: Props) {
  const { C, mode } = useTheme();
  const active = accent ?? C.accent;
  const surface = mode === 'dark' ? C.bgCard : C.bgSoft;
  const border = mode === 'dark' ? C.lineColor : C.line2;

  return (
    <PressScale
      onPress={onPress}
      haptic="impact"
      pressedScale={0.96}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={[
        styles.wrap,
        {
          backgroundColor: surface,
          borderColor: border,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.icon,
          {
            backgroundColor: alphaColor(active, 0.14),
            borderColor: alphaColor(active, 0.34),
          },
        ]}
      >
        <Icon name={icon} size={17} color={active} />
      </View>
      <View style={styles.text}>
        <Text style={[Typography.captionMedium, { color: C.inkColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[Typography.eyebrowSm, { color: C.ink3, marginTop: 2 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
});
