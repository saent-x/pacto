import { router, Stack } from 'expo-router';
import { Avatar, HeaderBrand } from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/lib/session';

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Morning';
  if (h < 18) return 'Afternoon';
  return 'Evening';
}

export default function HomeLayout() {
  const { C } = useTheme();
  const { user, partner, mode } = useSession();
  const firstName = (user?.displayName ?? user?.email?.split('@')[0] ?? 'You').split(' ')[0];
  const eyebrow = greetingFor(new Date());

  return (
    <Stack
      screenOptions={{
        headerShown: true,
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
          headerTitleAlign: 'center',
          headerTitle: () => <HeaderBrand eyebrow={eyebrow} title={firstName.toLowerCase()} />,
          headerLeft: () => (
            <PressScale
              onPress={() => router.push('/notifications' as any)}
              hitSlop={12}
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="bell" size={22} color={C.inkColor} strokeWidth={2.2} />
            </PressScale>
          ),
          headerRight: () => (
            <PressScale
              onPress={() => router.push('/sheets/profile' as any)}
              hitSlop={10}
              style={{
                minWidth: 40,
                height: 40,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Avatar
                person={{
                  initial: firstName.charAt(0).toUpperCase(),
                  color: C.accent,
                  avatarUrl: user?.avatarUrl,
                }}
                size={30}
              />
              {mode !== 'solo' && partner ? (
                <Avatar
                  person={{
                    initial: (partner.displayName ?? 'P').charAt(0).toUpperCase(),
                    color: C.accent2,
                    avatarUrl: partner.avatarUrl,
                  }}
                  size={30}
                  ring={C.bg}
                  style={{ marginLeft: -10 }}
                />
              ) : null}
            </PressScale>
          ),
        }}
      />
    </Stack>
  );
}
