import { Stack } from 'expo-router';
import React from 'react';
import { HeaderBrand } from '@/src/components/ui/HeaderBrand';
import { HeaderLeft } from '@/src/components/ui/HeaderLeft';
import { NavAddBtn } from '@/src/components/ui/NavAddBtn';
import { CalendarProvider, useCalendar } from '@/src/lib/calendar/context';
import { useTheme } from '@/src/lib/theme';

function CalendarHeaderTitle() {
  const { monthLabel } = useCalendar();
  return <HeaderBrand eyebrow={monthLabel} title="CAL" />;
}

function CalendarStack() {
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
          headerTitle: () => <CalendarHeaderTitle />,
          headerTitleAlign: 'center',
          headerLeft: () => <HeaderLeft mode="back" />,
          headerRight: () => <NavAddBtn href="/sheets/new-reminder" />,
        }}
      />
    </Stack>
  );
}

export default function CalendarLayout() {
  return (
    <CalendarProvider>
      <CalendarStack />
    </CalendarProvider>
  );
}
