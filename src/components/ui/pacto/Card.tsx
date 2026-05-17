import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle, Platform, type StyleProp, type PressableProps } from 'react-native';
import { PressScale } from '@/src/components/ui/PressScale';
import { useTheme } from '@/src/lib/theme';

type Props = {
  children: ReactNode;
  padded?: boolean;
  elevated?: boolean;
  glass?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: PressableProps['accessibilityLabel'];
  accessibilityHint?: PressableProps['accessibilityHint'];
  accessibilityRole?: PressableProps['accessibilityRole'];
};

/**
 * Soft rounded card. Hairline border, NO shadow by default — `elevated`
 * adds a subtle drop-shadow (and on iOS, optional liquid-glass surface via
 * `glass`). Used everywhere; the design treats Card as the default surface.
 *
 * Design source: /tmp/pacto-design/coupl-design-ii/project/components.jsx (Card)
 */
export function Card({
  children,
  padded = true,
  elevated = false,
  glass = false,
  onPress,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
}: Props) {
  const { C, mode } = useTheme();

  const baseStyle: ViewStyle = {
    backgroundColor: glass && Platform.OS === 'ios' ? 'transparent' : C.bgCard,
    borderRadius: 22,
    padding: padded ? 16 : 0,
    borderWidth: 1,
    borderColor: C.lineColor,
    overflow: 'hidden',
    ...(elevated && mode !== 'dark'
      ? { boxShadow: `0 14px 30px ${C.inkColor}14` }
      : null),
  };
  const containerStyle = StyleSheet.flatten([baseStyle, style]) as ViewStyle;

  const inner =
    glass && Platform.OS === 'ios' ? (
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor:
              mode === 'dark' ? '#282E42D9' : '#FFFDF8D9',
            pointerEvents: 'none',
          },
        ]}
      />
    ) : null;

  if (onPress) {
    return (
      <PressScale
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole={accessibilityRole}
        style={({ pressed }) => [
          containerStyle,
          pressed && Platform.OS === 'ios' ? { opacity: 0.7 } : null,
        ]}
      >
        {inner}
        {children}
      </PressScale>
    );
  }

  return (
    <View style={containerStyle}>
      {inner}
      {children}
    </View>
  );
}
