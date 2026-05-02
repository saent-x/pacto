import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle, Platform, type StyleProp } from 'react-native';
import { PressScale } from '@/src/components/ui/PressScale';
import { useTheme } from '@/src/lib/theme';

type Props = {
  children: ReactNode;
  padded?: boolean;
  elevated?: boolean;
  glass?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Soft 18px-radius card. Hairline border, NO shadow by default — `elevated`
 * adds a subtle drop-shadow (and on iOS, optional liquid-glass surface via
 * `glass`). Used everywhere; the design treats Card as the default surface.
 *
 * Design source: /tmp/pacto-design/coupl-design-ii/project/components.jsx (Card)
 */
export function Card({ children, padded = true, elevated = false, glass = false, onPress, style }: Props) {
  const { C, mode } = useTheme();

  const baseStyle: ViewStyle = {
    backgroundColor: glass && Platform.OS === 'ios' ? 'transparent' : C.bgCard,
    borderRadius: 16,
    padding: padded ? 14 : 0,
    borderWidth: 1,
    borderColor: C.lineColor,
    overflow: 'hidden',
    ...(elevated && Platform.select({
      ios: { shadowColor: '#2A241B', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12 },
      android: { elevation: 2 },
    }) as ViewStyle),
  };
  const containerStyle = StyleSheet.flatten([baseStyle, style]) as ViewStyle;

  const inner =
    glass && Platform.OS === 'ios' ? (
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor:
              mode === 'dark' ? 'rgba(57,50,43,0.72)' : 'rgba(255,255,255,0.72)',
          },
        ]}
      />
    ) : null;

  if (onPress) {
    return (
      <PressScale
        onPress={onPress}
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
