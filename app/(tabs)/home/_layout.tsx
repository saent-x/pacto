import { Stack } from 'expo-router';
import { useTheme } from '@/src/lib/theme';

export default function HomeLayout() {
  const { C } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTransparent: true,
        headerShadowVisible: false,
        headerBackground: () => null,
        headerTintColor: C.inkColor,
        contentStyle: { backgroundColor: C.bg },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: '',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
