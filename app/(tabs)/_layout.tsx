import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/lib/session';

export default function TabsLayout() {
  const { C } = useTheme();
  const { isSolo } = useSession();
  return (
    <NativeTabs
      labelStyle={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11 }}
      tintColor={C.gold}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" drawable="ic_menu_compass" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="us">
        <NativeTabs.Trigger.Label>{isSolo ? 'Me' : 'Us'}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={isSolo ? 'person.fill' : 'heart.fill'} drawable="ic_menu_share" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" drawable="ic_menu_my_calendar" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="tasks">
        <NativeTabs.Trigger.Label>Tasks</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="checklist" drawable="ic_menu_agenda" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="reminders">
        <NativeTabs.Trigger.Label>Reminders</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bell.fill" drawable="ic_popup_reminder" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
