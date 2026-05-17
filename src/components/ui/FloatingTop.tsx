import Constants from 'expo-constants';
import React from 'react';
import { View } from 'react-native';

const STATUS_BAR = Constants.statusBarHeight || 44;

export function FloatingTop({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        position: 'absolute',
        top: STATUS_BAR + 6,
        right: 16,
        zIndex: 10,
        pointerEvents: 'box-none',
      }}
    >
      {children}
    </View>
  );
}
