import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '@/src/lib/theme';
import { HeaderBrand } from './HeaderBrand';
import { HeaderLeft } from './HeaderLeft';

export function TabStackLayout({
  eyebrow,
  title,
  accent,
  headerRight,
}: {
  eyebrow?: string;
  title: string;
  accent?: string;
  headerRight?: () => React.ReactNode;
}) {
  const { C } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerShadowVisible: false,
        headerBackground: () => null,
        headerTintColor: C.bone,
        contentStyle: { backgroundColor: C.ink },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: '',
          headerStyle: { backgroundColor: 'transparent' },
          headerTitle: () => <HeaderBrand eyebrow={eyebrow} title={title} accent={accent} />,
          headerTitleAlign: 'center',
          headerLeft: () => <HeaderLeft mode="back" />,
          headerRight,
        }}
      />
    </Stack>
  );
}
