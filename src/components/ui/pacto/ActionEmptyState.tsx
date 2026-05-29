import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

type Props = {
  icon: IconName;
  eyebrow?: string;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: IconName;
  accent?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ActionEmptyState({
  icon,
  eyebrow = 'Open space',
  title,
  body,
  actionLabel,
  onAction,
  actionIcon = 'plus',
  accent,
  children,
  style,
  testID,
}: Props) {
  const { C } = useTheme();
  const active = accent ?? C.accent;

  return (
    <View
      testID={testID}
      style={[styles.wrap, { borderColor: C.lineColor, backgroundColor: C.bgCard }, style]}
    >
      <View style={styles.header}>
        <Icon name={icon} size={20} color={active} strokeWidth={2.1} />
        <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>{eyebrow}</Text>
      </View>

      <Text style={[Typography.pixelHeroSm, styles.title, { color: C.inkColor }]}>
        {title}
      </Text>
      {body ? (
        <Text style={[Typography.body, styles.body, { color: C.ink2 }]}>
          {body}
        </Text>
      ) : null}
      {children ? <View style={styles.children}>{children}</View> : null}
      {actionLabel && onAction ? (
        <PressScale
          onPress={onAction}
          style={[styles.action, { backgroundColor: C.inkColor }]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Icon name={actionIcon} size={14} color={C.bg} strokeWidth={2.4} />
          <Text style={[Typography.buttonLabel, { color: C.bg }]}>{actionLabel}</Text>
        </PressScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  title: {
    marginTop: 4,
  },
  body: {
    maxWidth: 310,
  },
  children: {
    marginTop: 4,
  },
  action: {
    minHeight: 44,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 999,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
