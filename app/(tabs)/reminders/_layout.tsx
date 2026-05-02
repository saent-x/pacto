import { router, Stack } from 'expo-router';
import { FeatureRouteGuard } from '@/src/components/features/FeatureRouteGuard';
import { HeaderBrand } from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { NavAddBtn } from '@/src/components/ui/NavAddBtn';
import { PressScale } from '@/src/components/ui/PressScale';
import { useTheme } from '@/src/lib/theme';

export default function RemindersLayout() {
  return (
    <FeatureRouteGuard featureId="recurring">
      <RemindersStack />
    </FeatureRouteGuard>
  );
}

function RemindersStack() {
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
          headerTitle: () => <HeaderBrand eyebrow="REMIND" title="reminders" />,
          headerLeft: () => (
            <PressScale
              onPress={() => router.push('/notifications' as any)}
              hitSlop={12}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="bell" size={22} color={C.inkColor} strokeWidth={2.2} />
            </PressScale>
          ),
          headerRight: () => <NavAddBtn href="/sheets/new-reminder" />,
        }}
      />
    </Stack>
  );
}
