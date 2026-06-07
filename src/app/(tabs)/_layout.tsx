import { View } from 'react-native';
import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import { useColors } from '@/theme';
import { GlassTabBar } from '@/ui/GlassTabBar';
import { AIDock } from '@/features/ai/AIDock';

export default function TabsLayout() {
  const C = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Tabs>
        <TabSlot />
        {/* AI overlay sits below the tab bar so the AI button stays on top + tappable */}
        <AIDock />
        <GlassTabBar />
        <TabList style={{ display: 'none' }}>
          <TabTrigger name="index" href="/" />
          <TabTrigger name="tools" href="/tools" />
          <TabTrigger name="calendar" href="/calendar" />
        </TabList>
      </Tabs>
    </View>
  );
}
