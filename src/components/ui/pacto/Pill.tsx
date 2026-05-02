import { ReactNode } from 'react';
import { StyleSheet, Text, ViewStyle, View } from 'react-native';
import { PressScale } from '@/src/components/ui/PressScale';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';

type Props = {
  children: ReactNode;
  active?: boolean;
  color?: string;
  size?: 'sm' | 'md';
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
};

/**
 * Soft chip with optional active state. Inverts color on active.
 * Used for filter rows, scope tags, status indicators.
 *
 * Design source: /tmp/pacto-design/coupl-design-ii/project/components.jsx (Pill)
 */
export function Pill({ children, active, color, size = 'sm', onPress, style, testID }: Props) {
  const { C } = useTheme();
  const padY = size === 'sm' ? 4 : 7;
  const padX = size === 'sm' ? 10 : 14;
  const fontSize = size === 'sm' ? 11 : 12.5;

  const accent = color ?? C.accent;
  const containerStyle: ViewStyle = {
    paddingVertical: padY,
    paddingHorizontal: padX,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: active ? accent : C.lineColor,
    backgroundColor: active ? accent : C.bgSoft,
    alignSelf: 'flex-start',
    ...style,
  };

  const labelColor = active ? C.bg : (color ?? C.ink2);
  const content = (
    <Text style={{ ...Typography.pillLabel, fontSize, color: labelColor }}>
      {children}
    </Text>
  );

  if (onPress) {
    return (
      <PressScale
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [containerStyle, pressed ? { opacity: 0.7 } : null]}
      >
        {content}
      </PressScale>
    );
  }
  return <View testID={testID} style={containerStyle}>{content}</View>;
}
