import { router, Stack } from 'expo-router';
import { FeatureRouteGuard } from '@/src/components/features/FeatureRouteGuard';
import { HeaderBrand } from '@/src/components/ui/pacto';
import { PressScale } from '@/src/components/ui/PressScale';
import { MemoriesIcon } from '@/src/components/ui/pacto/memories/MemoriesIcon';
import { PactoMark } from '@/src/components/ui/pacto/memories/PactoMark';
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
          // Brand row lives in the native header: menu | PactoMark | +
          headerTitle: () => <PactoMark size={28} />,
          headerLeft: () => (
            <PressScale
              hitSlop={12}
              onPress={() => undefined}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MemoriesIcon name="menu" size={20} color={C.inkColor} stroke={1.8} />
            </PressScale>
          ),
          headerRight: () => (
            <PressScale
              hitSlop={12}
              onPress={() => router.push('/sheets/memory-composer' as any)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MemoriesIcon name="plus" size={22} color={C.inkColor} stroke={1.8} />
            </PressScale>
          ),
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
