import { router, Stack } from 'expo-router';
import { Avatar, AvatarPair, CrewStack, HeaderBrand } from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { HeaderLeft } from '@/src/components/ui/HeaderLeft';
import { NavAddBtn } from '@/src/components/ui/NavAddBtn';
import { PressScale } from '@/src/components/ui/PressScale';
import {
  type FeatureId,
  isFeatureSupportedForMode,
} from '@/src/lib/features/registry';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/lib/session';

export default function UsLayout() {
  const { C } = useTheme();
  const { user, partner, mode, isFeatureEnabled } = useSession();
  const isSolo = mode === 'solo';
  const spaceLabel = isSolo ? 'ME' : mode === 'crew' ? 'CREW' : 'US';
  const myFirstName = (user?.displayName ?? user?.email?.split('@')[0] ?? 'You')
    .split(' ')[0]
    .toUpperCase();
  const partnerFirstName = (partner?.displayName ?? '').split(' ')[0]?.charAt(0).toUpperCase();
  const eyebrow = spaceLabel;
  const moduleEnabled = (featureId: FeatureId) =>
    isFeatureSupportedForMode(featureId, mode) && isFeatureEnabled(featureId);

  // Shared header style for module sub-screens (legacy primitives, retained per
  // Phase 7 plan — module rebuilds happen later).
  const baseModule = {
    headerShown: true,
    headerShadowVisible: false,
    headerTransparent: true,
    headerBackground: () => null,
    headerStyle: { backgroundColor: 'transparent' },
    headerTintColor: C.inkColor,
    headerBackTitle: '',
    headerTitleAlign: 'center' as const,
    headerLeft: () => <HeaderLeft mode="back" />,
    title: '',
  };

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
          headerTitle: () => <HeaderBrand eyebrow={eyebrow} title={spaceLabel.toLowerCase()} />,
          headerLeft: () => (
            <PressScale
              onPress={() => router.push('/notifications' as any)}
              hitSlop={12}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="bell" size={22} color={C.inkColor} strokeWidth={2.2} />
            </PressScale>
          ),
          headerRight: () => (
            <PressScale
              onPress={() => router.push('/sheets/profile' as any)}
              style={{ minWidth: 40, height: 40, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
            >
              {isSolo ? (
                <Avatar
                  person={{
                    initial: myFirstName.charAt(0),
                    color: C.accent,
                    avatarUrl: user?.avatarUrl,
                  }}
                  size={30}
                />
              ) : mode === 'crew' ? (
                <CrewStack size={26} />
              ) : (
                <AvatarPair
                  a={{
                    initial: myFirstName.charAt(0),
                    color: C.accent,
                    avatarUrl: user?.avatarUrl,
                  }}
                  b={{
                    initial: partnerFirstName ?? 'P',
                    color: C.accent2,
                    avatarUrl: partner?.avatarUrl,
                  }}
                  size={28}
                />
              )}
            </PressScale>
          ),
        }}
      />
      <Stack.Screen
        name="notes"
        options={{
          ...baseModule,
          headerTitle: () => (
            <HeaderBrand eyebrow={spaceLabel} title="notes" />
          ),
          headerRight: () => (moduleEnabled('memories') ? <NavAddBtn href="/sheets/new-note" /> : null),
        }}
      />
      <Stack.Screen
        name="checkins"
        options={{
          ...baseModule,
          headerTitle: () => (
            <HeaderBrand eyebrow={spaceLabel} title="check-ins" />
          ),
          headerRight: () => (moduleEnabled('checkins') ? <NavAddBtn href="/sheets/new-checkin" /> : null),
        }}
      />
      <Stack.Screen
        name="expenses"
        options={{
          ...baseModule,
          headerTitle: () => (
            <HeaderBrand eyebrow={spaceLabel} title="expenses" />
          ),
          headerRight: () => <NavAddBtn href="/sheets/new-expense" />,
        }}
      />
      <Stack.Screen
        name="wishlists"
        options={{
          ...baseModule,
          headerTitle: () => (
            <HeaderBrand eyebrow={spaceLabel} title="wishlist" />
          ),
          headerRight: () => (moduleEnabled('wishlist') ? <NavAddBtn href="/sheets/new-wish" /> : null),
        }}
      />
      <Stack.Screen
        name="milestones"
        options={{
          ...baseModule,
          headerTitle: () => (
            <HeaderBrand eyebrow={spaceLabel} title="milestones" />
          ),
          headerRight: () => (moduleEnabled('memories') ? <NavAddBtn href="/sheets/new-milestone" /> : null),
        }}
      />
      <Stack.Screen
        name="plans"
        options={{
          ...baseModule,
          headerTitle: () => (
            <HeaderBrand eyebrow={spaceLabel} title="goals" />
          ),
          headerRight: () => (moduleEnabled('goals') ? <NavAddBtn href="/sheets/new-plan" /> : null),
        }}
      />
      <Stack.Screen
        name="journal"
        options={{
          ...baseModule,
          headerTitle: () => (
            <HeaderBrand eyebrow={spaceLabel} title="journal" />
          ),
          headerRight: () => (moduleEnabled('journal') ? <NavAddBtn href="/sheets/new-entry" icon="edit" /> : null),
        }}
      />
      <Stack.Screen
        name="timetables/index"
        options={{
          ...baseModule,
          headerTitle: () => (
            <HeaderBrand eyebrow={spaceLabel} title="timetable" />
          ),
          headerRight: () => (moduleEnabled('timetable') ? <NavAddBtn href="/sheets/new-timetable" /> : null),
        }}
      />
      <Stack.Screen
        name="timetables/[id]"
        options={{
          ...baseModule,
          headerTitle: () => (
            <HeaderBrand eyebrow={spaceLabel} title="week" />
          ),
        }}
      />
      <Stack.Screen
        name="tasks"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="reminders"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
