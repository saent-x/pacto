import Constants from 'expo-constants';
import React from 'react';
import { RefreshControl, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/src/lib/theme';

const STATUS_BAR = Constants.statusBarHeight || 44;
const ENTER = FadeIn.duration(240);

export function Screen({
  children,
  style,
  scroll = true,
  bottom = 110,
  topPad,
  underHeader = false,
  refreshing,
  onRefresh,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scroll?: boolean;
  bottom?: number;
  topPad?: number;
  underHeader?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
}) {
  const defaultTop = underHeader ? 0 : 8;
  const tp = topPad ?? defaultTop;
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  if (scroll) {
    const refreshControl = onRefresh ? (
      <RefreshControl
        refreshing={!!refreshing}
        onRefresh={onRefresh}
        tintColor={C.gold}
        colors={[C.gold]}
      />
    ) : undefined;
    return (
      <Animated.ScrollView
        entering={ENTER}
        style={{ flex: 1, backgroundColor: C.ink }}
        contentInsetAdjustmentBehavior={underHeader ? 'never' : 'automatic'}
        automaticallyAdjustContentInsets={!underHeader}
        contentContainerStyle={[
          {
            paddingTop: underHeader ? STATUS_BAR + tp : tp,
            paddingHorizontal: 18,
            paddingBottom: bottom,
          },
          style,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        {children}
      </Animated.ScrollView>
    );
  }
  return (
    <Animated.View
      entering={ENTER}
      style={[
        {
          flex: 1,
          backgroundColor: C.ink,
          paddingTop: (underHeader ? STATUS_BAR : insets.top) + tp,
          paddingHorizontal: 18,
          paddingBottom: bottom,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
