import { Stack } from 'expo-router';
import { HeaderBrand } from '@/src/components/ui/HeaderBrand';
import { HeaderLeft } from '@/src/components/ui/HeaderLeft';
import { NavAddBtn } from '@/src/components/ui/NavAddBtn';
import { useTheme } from '@/src/lib/theme';
import { pastels } from '@/src/lib/tokens';

export default function TasksLayout() {
  const { C } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: C.ink },
        headerTintColor: C.bone,
        contentStyle: { backgroundColor: C.ink },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          headerTransparent: true,
          headerShadowVisible: false,
          headerBackground: () => null,
          title: '',
          headerStyle: { backgroundColor: 'transparent' },
          headerTitle: () => (
            <HeaderBrand eyebrow="04 · Tasks" title="TASKS" accent={pastels.tasks} />
          ),
          headerTitleAlign: 'center',
          headerLeft: () => <HeaderLeft mode="back" />,
          headerRight: () => <NavAddBtn href="/sheets/new-list" />,
        }}
      />
    </Stack>
  );
}
