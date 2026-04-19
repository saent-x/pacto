import { router, Stack } from 'expo-router';
import { Pressable } from 'react-native';
import { Avatar } from '@/src/components/ui/atoms';
import { HeaderBrand } from '@/src/components/ui/HeaderBrand';
import { HeaderLeft } from '@/src/components/ui/HeaderLeft';
import { NavAddBtn } from '@/src/components/ui/NavAddBtn';
import { useTheme } from '@/src/lib/theme';
import { pastels } from '@/src/lib/tokens';

export default function UsLayout() {
  const { C } = useTheme();
  const base = {
    headerShown: true,
    headerShadowVisible: false,
    headerTransparent: true,
    headerBackground: () => null,
    headerStyle: { backgroundColor: 'transparent' },
    headerTintColor: C.bone,
    headerBackTitle: '',
    headerTitleAlign: 'center' as const,
    headerLeft: () => <HeaderLeft mode="back" />,
    title: '',
  };
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
          ...base,
          headerTitle: () => <HeaderBrand eyebrow="Day 847 together" title="US" />,
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
      <Stack.Screen
        name="notes"
        options={{
          ...base,
          headerTitle: () => (
            <HeaderBrand eyebrow="US · NOTES" title="Love notes" accent={pastels.rose} size={22} />
          ),
          headerRight: () => <NavAddBtn href="/sheets/new-note" />,
        }}
      />
      <Stack.Screen
        name="checkins"
        options={{
          ...base,
          headerTitle: () => (
            <HeaderBrand eyebrow="US · CHECK-INS" title="How we are" accent={pastels.butter} size={22} />
          ),
          headerRight: () => <NavAddBtn href="/sheets/new-checkin" />,
        }}
      />
      <Stack.Screen
        name="expenses"
        options={{
          ...base,
          headerTitle: () => (
            <HeaderBrand eyebrow="US · EXPENSES" title="Shared" accent={pastels.mint} size={22} />
          ),
          headerRight: () => <NavAddBtn href="/sheets/new-expense" />,
        }}
      />
      <Stack.Screen
        name="wishlists"
        options={{
          ...base,
          headerTitle: () => (
            <HeaderBrand
              eyebrow="US · WISHLISTS"
              title="Drop hints"
              accent={pastels.lavender}
              size={22}
            />
          ),
          headerRight: () => <NavAddBtn href="/sheets/new-wish" />,
        }}
      />
      <Stack.Screen
        name="milestones"
        options={{
          ...base,
          headerTitle: () => (
            <HeaderBrand eyebrow="US · MILESTONES" title="Moments" accent={pastels.peach} size={22} />
          ),
          headerRight: () => <NavAddBtn href="/sheets/new-milestone" />,
        }}
      />
      <Stack.Screen
        name="plans"
        options={{
          ...base,
          headerTitle: () => (
            <HeaderBrand eyebrow="US · PLANS" title="Dream & do" accent={pastels.sky} size={22} />
          ),
          headerRight: () => <NavAddBtn href="/sheets/new-plan" />,
        }}
      />
      <Stack.Screen
        name="journal"
        options={{
          ...base,
          headerTitle: () => (
            <HeaderBrand eyebrow="US · JOURNAL" title="Journal" accent={pastels.journal} size={22} />
          ),
          headerRight: () => <NavAddBtn href="/sheets/new-entry" icon="edit" />,
        }}
      />
      <Stack.Screen
        name="timetables/index"
        options={{
          ...base,
          headerTitle: () => (
            <HeaderBrand eyebrow="US · TIMETABLES" title="Rhythms" accent={pastels.peach} size={22} />
          ),
          headerRight: () => <NavAddBtn href="/sheets/new-timetable" />,
        }}
      />
      <Stack.Screen
        name="timetables/[id]"
        options={{
          ...base,
          headerTitle: () => (
            <HeaderBrand eyebrow="US · TIMETABLE" title="Week" accent={pastels.peach} size={22} />
          ),
        }}
      />
    </Stack>
  );
}
