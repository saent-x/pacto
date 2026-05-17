import Constants from 'expo-constants';
import { ReactNode } from 'react';
import { RefreshControl, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/src/lib/theme';

const STATUS_BAR = Constants.statusBarHeight || 44;

type Props = {
  children: ReactNode;
  scroll?: boolean;
  underHeader?: boolean;
  topOffset?: number;
  horizontalPadding?: number;
  bottomOffset?: number;
  sectionGap?: number;
  style?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
};

export function ScreenScaffold({
  children,
  scroll = true,
  underHeader = true,
  topOffset = 60,
  horizontalPadding = 18,
  bottomOffset = 120,
  style,
  refreshing,
  onRefresh,
}: Props) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const top = underHeader ? insets.top + topOffset : topOffset;
  const contentStyle = [
    {
      paddingTop: top,
      paddingHorizontal: horizontalPadding,
      paddingBottom: bottomOffset,
      backgroundColor: C.bg,
    },
    style,
  ];

  if (!scroll) {
    return (
      <Animated.View
        entering={FadeIn.duration(220)}
        style={[
          {
            flex: 1,
            backgroundColor: C.bg,
            paddingTop: (underHeader ? STATUS_BAR : insets.top) + topOffset,
            paddingHorizontal: horizontalPadding,
            paddingBottom: bottomOffset,
          },
          style,
        ]}
      >
        {children}
      </Animated.View>
    );
  }

  return (
    <Animated.ScrollView
      entering={FadeIn.duration(220)}
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={contentStyle}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={C.accent}
            colors={[C.accent]}
          />
        ) : undefined
      }
    >
      {children}
    </Animated.ScrollView>
  );
}
