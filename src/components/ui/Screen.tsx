import Constants from 'expo-constants';
import React from 'react';
import { RefreshControl, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/lib/theme';

const STATUS_BAR = Constants.statusBarHeight || 44;

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
      <ScrollView
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
      </ScrollView>
    );
  }
  return (
    <View
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
    </View>
  );
}
