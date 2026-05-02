import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

type Props = {
  icon?: IconName;
  title: string;
  subtitle?: string;
  meta?: string;
  accent?: string;
  onPress?: () => void;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function SectionActionRow({
  icon,
  title,
  subtitle,
  meta,
  accent,
  onPress,
  right,
  style,
  testID,
}: Props) {
  const { C } = useTheme();
  const color = accent ?? C.accent;
  return (
    <PressScale
      testID={testID}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.row,
        { backgroundColor: C.bgCard, borderColor: C.lineColor },
        style,
      ]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {icon ? (
        <View style={[styles.icon, { backgroundColor: C.bgSoft }]}>
          <Icon name={icon} size={17} color={color} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[Typography.bodyMedium, { color: C.inkColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[Typography.caption, { color: C.ink2, marginTop: 2 }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta ? (
        <Text style={[Typography.monoMedium, { color: C.ink3, fontSize: 12 }]} numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
      {right ?? (onPress ? <Icon name="chevronRight" size={16} color={C.ink3} /> : null)}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
