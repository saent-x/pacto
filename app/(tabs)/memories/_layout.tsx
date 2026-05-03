import { router, Stack } from 'expo-router';
import { FeatureRouteGuard } from '@/src/components/features/FeatureRouteGuard';
import { HeaderBrand } from '@/src/components/ui/pacto';
import { NavAddBtn } from '@/src/components/ui/NavAddBtn';
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
  const baseHeader = {
    headerShown: true,
    headerTransparent: true,
    headerShadowVisible: false,
    headerBackground: () => null,
    headerTintColor: C.inkColor,
    title: '',
    headerTitleAlign: 'center' as const,
  };

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen
        name="index"
        options={{
          ...baseHeader,
          headerTitle: () => <HeaderBrand eyebrow="MEMORIES" title="memories" />,
          headerRight: () => <NavAddBtn href="/sheets/memory-composer" />,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{ ...baseHeader, headerTitle: () => <HeaderBrand eyebrow="MEMORY" title="thread" /> }}
      />
      <Stack.Screen
        name="profile/[userId]"
        options={{ ...baseHeader, headerTitle: () => <HeaderBrand eyebrow="MEMBER" title="profile" /> }}
      />
    </Stack>
  );
}
