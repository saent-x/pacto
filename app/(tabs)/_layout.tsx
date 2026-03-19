import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/src/hooks/useColors';

export default function TabLayout() {
  const C = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.fog,
        tabBarStyle: {
          backgroundColor: C.coal,
          borderTopWidth: 0,
          elevation: 0,
          height: 84,
          paddingTop: 12,
        },
        tabBarLabelStyle: { display: 'none' } as any,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Feather name="home" size={20} color={color} />
              {focused && <View style={[styles.activeBar, { backgroundColor: C.primary }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Feather name="bell" size={20} color={color} />
              {focused && <View style={[styles.activeBar, { backgroundColor: C.primary }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Feather name="check-square" size={20} color={color} />
              {focused && <View style={[styles.activeBar, { backgroundColor: C.primary }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Feather name="book-open" size={20} color={color} />
              {focused && <View style={[styles.activeBar, { backgroundColor: C.primary }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Feather name="grid" size={20} color={color} />
              {focused && <View style={[styles.activeBar, { backgroundColor: C.primary }]} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    width: 48,
  },
  activeBar: {
    position: 'absolute',
    top: -12,
    width: 20,
    height: 2,
    borderRadius: 1,
  },
});
