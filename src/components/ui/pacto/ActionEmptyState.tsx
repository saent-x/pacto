import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

type Props = {
  icon: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  accent?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ActionEmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  accent,
  children,
  style,
}: Props) {
  const { C } = useTheme();
  const active = accent ?? C.accent;
  return (
    <View style={[styles.wrap, { borderColor: C.lineColor, backgroundColor: C.bgCard }, style]}>
      <View style={[styles.icon, { backgroundColor: C.bgSoft }]}>
        <Icon name={icon} size={20} color={active} />
      </View>
      <Text style={[Typography.subheading, { color: C.inkColor, textAlign: 'center' }]}>
        {title}
      </Text>
      {body ? (
        <Text style={[Typography.caption, { color: C.ink2, textAlign: 'center', maxWidth: 280 }]}>
          {body}
        </Text>
      ) : null}
      {children}
      {actionLabel && onAction ? (
        <PressScale
          onPress={onAction}
          style={[styles.action, { backgroundColor: active }]}
          accessibilityRole="button"
        >
          <Icon name="plus" size={14} color={C.bg} />
          <Text style={[Typography.buttonLabel, { color: C.bg }]}>{actionLabel}</Text>
        </PressScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: {
    minHeight: 40,
    marginTop: 4,
    borderRadius: 999,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
});
