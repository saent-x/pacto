import { Tabs } from 'expo-router/js-tabs';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Image, Platform, type ColorValue, type ImageSourcePropType } from 'react-native';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/lib/session';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';

const TAB_ICONS: Record<'home' | 'me' | 'us' | 'calendar' | 'memories', ImageSourcePropType> = {
  home: require('../../assets/images/tabs/tab-home.png'),
  me: require('../../assets/images/tabs/tab-me.png'),
  us: require('../../assets/images/tabs/tab-us.png'),
  calendar: require('../../assets/images/tabs/tab-calendar.png'),
  memories: require('../../assets/images/tabs/tab-memories.png'),
};

function WebTabIcon({ color, source }: { color: ColorValue; source: ImageSourcePropType }) {
  return (
    <Image
      source={source}
      style={{ width: 24, height: 24 }}
      resizeMode="contain"
      tintColor={color}
    />
  );
}

export default function TabsLayout() {
  const { C } = useTheme();
  const { isSolo } = useSession();
  const calendarGate = useFeatureGate('calendar');
  const memoryFeedGate = useFeatureGate('memoryFeed');

  if (Platform.OS === 'web') {
    const tabOptions = (title: string, source: ImageSourcePropType) => ({
      title,
      tabBarIcon: ({ color }: { color: ColorValue }) => <WebTabIcon color={color} source={source} />,
    });

    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: C.inkColor,
          tabBarInactiveTintColor: C.ink2,
          tabBarStyle: {
            backgroundColor: C.bg,
            borderTopColor: 'transparent',
            height: 68,
            paddingTop: 8,
            paddingBottom: 10,
          },
        }}
      >
        <Tabs.Screen name="home" options={tabOptions('Home', TAB_ICONS.home)} />
        <Tabs.Screen name="us" options={tabOptions(isSolo ? 'Me' : 'Us', isSolo ? TAB_ICONS.me : TAB_ICONS.us)} />
        <Tabs.Screen
          name="memories"
          options={{
            ...tabOptions('Memories', TAB_ICONS.memories),
            href: memoryFeedGate.enabled ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            ...tabOptions('Calendar', TAB_ICONS.calendar),
            href: calendarGate.enabled ? undefined : null,
          }}
        />
      </Tabs>
    );
  }

  return (
    <NativeTabs
      labelStyle={{ fontFamily: 'Geist_600SemiBold', fontSize: 11 }}
      iconColor={{ default: C.ink2, selected: C.inkColor }}
      tintColor={C.inkColor}
      labelVisibilityMode="unlabeled"
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label hidden>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={TAB_ICONS.home} renderingMode="template" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="us">
        <NativeTabs.Trigger.Label hidden>{isSolo ? 'Me' : 'Us'}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={isSolo ? TAB_ICONS.me : TAB_ICONS.us} renderingMode="template" />
      </NativeTabs.Trigger>

      {memoryFeedGate.enabled ? (
        <NativeTabs.Trigger name="memories">
          <NativeTabs.Trigger.Label hidden>Memories</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={TAB_ICONS.memories} renderingMode="template" />
        </NativeTabs.Trigger>
      ) : null}

      {calendarGate.enabled ? (
        <NativeTabs.Trigger name="calendar">
          <NativeTabs.Trigger.Label hidden>Calendar</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={TAB_ICONS.calendar} renderingMode="template" />
        </NativeTabs.Trigger>
      ) : null}
    </NativeTabs>
  );
}
