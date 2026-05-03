import { Stack } from 'expo-router';
import { FeatureRouteGuard } from '@/src/components/features/FeatureRouteGuard';
import { HeaderBrand } from '@/src/components/ui/pacto';
import { useTheme } from '@/src/lib/theme';

export default function MemoriesLayout() {
  return (
    <FeatureRouteGuard featureId="memoryFeed">
      <MemoriesStack />
    </FeatureRouteGuard>
  );
}

function MemoriesStack() {
  const { C } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.bg },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          headerTransparent: true,
          headerShadowVisible: false,
          headerBackground: () => null,
          headerTintColor: C.inkColor,
          title: '',
          headerTitleAlign: 'center',
          headerTitle: () => <HeaderBrand eyebrow="MEMORIES" title="memories" />,
        }}
      />
    </Stack>
  );
}
