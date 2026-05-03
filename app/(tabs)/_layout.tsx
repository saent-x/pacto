import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/lib/session';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';

const TAB_ICONS = {
  home: require('../../assets/images/tabs/tab-home.png'),
  me: require('../../assets/images/tabs/tab-me.png'),
  us: require('../../assets/images/tabs/tab-us.png'),
  calendar: require('../../assets/images/tabs/tab-calendar.png'),
  memories: require('../../assets/images/tabs/tab-reminders.png'), // reuse asset until a memories icon ships
};

export default function TabsLayout() {
  const { C } = useTheme();
  const { isSolo } = useSession();
  const calendarGate = useFeatureGate('calendar');
  const memoryFeedGate = useFeatureGate('memoryFeed');

  return (
    <NativeTabs
      labelStyle={{ fontFamily: 'Geist_500Medium', fontSize: 11 }}
      iconColor={{ default: C.inkColor, selected: C.inkColor }}
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
