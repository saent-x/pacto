import { router, Stack } from 'expo-router';
import { Pressable } from 'react-native';
import { Avatar } from '@/src/components/ui/atoms';
import { HeaderBrand } from '@/src/components/ui/HeaderBrand';
import { HeaderLeft } from '@/src/components/ui/HeaderLeft';
import { useTheme } from '@/src/lib/theme';

export default function HomeLayout() {
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
          headerTitle: () => <HeaderBrand eyebrow="Good morning" title="MATTIA" />,
          headerTitleAlign: 'center',
          headerLeft: () => <HeaderLeft mode="home" />,
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/sheets/profile' as any)}
              style={{ flexDirection: 'row' }}
            >
              <Avatar letter="M" size={30} bg={C.peach} color={C.peachInk} />
              <Avatar
                letter="S"
                size={30}
                bg={C.lavender}
                color={C.lavenderInk}
                border={C.ink}
                style={{ marginLeft: -10 }}
              />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
