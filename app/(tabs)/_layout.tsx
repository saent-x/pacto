import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/lib/session';

const TAB_ICONS = {
  home: require('../../assets/images/tabs/tab-home.png'),
  me: require('../../assets/images/tabs/tab-me.png'),
  us: require('../../assets/images/tabs/tab-us.png'),
  calendar: require('../../assets/images/tabs/tab-calendar.png'),
  tasks: require('../../assets/images/tabs/tab-tasks.png'),
  reminders: require('../../assets/images/tabs/tab-reminders.png'),
};

export default function TabsLayout() {
  const { C } = useTheme();
  const { isSolo } = useSession();
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

      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label hidden>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={TAB_ICONS.calendar} renderingMode="template" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="tasks">
        <NativeTabs.Trigger.Label hidden>Tasks</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={TAB_ICONS.tasks} renderingMode="template" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="reminders">
        <NativeTabs.Trigger.Label hidden>Reminders</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={TAB_ICONS.reminders} renderingMode="template" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
