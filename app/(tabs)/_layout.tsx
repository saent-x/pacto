import { Tabs } from 'expo-router';
import { StyleSheet, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/hooks/useSession';

export default function TabLayout() {
  const C = useColors();
  const { mode } = useTheme();
  const { activeCouple } = useSession();

  // Don't render tabs (or their queries) when the user has no couple.
  // Show themed background while useProtectedRoute redirects to onboarding.
  if (!activeCouple) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: C.background }]} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.fog,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          height: 72,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            {Platform.OS === 'ios' ? (
              <BlurView
                intensity={35}
                tint={mode === 'dark' ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              >
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: mode === 'dark'
                        ? 'rgba(15, 13, 11, 0.45)'
                        : 'rgba(237, 232, 224, 0.4)',
                    },
                  ]}
                />
              </BlurView>
            ) : (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: mode === 'dark'
                      ? 'rgba(15, 13, 11, 0.9)'
                      : 'rgba(237, 232, 224, 0.92)',
                  },
                ]}
              />
            )}
            <View
              style={[
                styles.glassEdge,
                {
                  backgroundColor: mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'rgba(255, 255, 255, 0.35)',
                },
              ]}
            />
          </View>
        ),
        tabBarLabelStyle: { display: 'none' } as any,
        tabBarShowLabel: false,
      }}
    >
      {/* Visible tabs */}
      <Tabs.Screen
        name="home"
        listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              {focused && <View style={[styles.activeBar, { backgroundColor: C.primary }]} />}
              <View style={focused ? [styles.activeGlow, { backgroundColor: C.primaryMuted }] : undefined}>
                <Feather name="home" size={20} color={color} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="together"
        listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              {focused && <View style={[styles.activeBar, { backgroundColor: C.primary }]} />}
              <View style={focused ? [styles.activeGlow, { backgroundColor: C.primaryMuted }] : undefined}>
                <Feather name="heart" size={20} color={color} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              {focused && <View style={[styles.activeBar, { backgroundColor: C.primary }]} />}
              <View style={focused ? [styles.activeGlow, { backgroundColor: C.primaryMuted }] : undefined}>
                <Feather name="calendar" size={20} color={color} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              {focused && <View style={[styles.activeBar, { backgroundColor: C.primary }]} />}
              <View style={focused ? [styles.activeGlow, { backgroundColor: C.primaryMuted }] : undefined}>
                <Feather name="check-square" size={20} color={color} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="reminders"
        listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              {focused && <View style={[styles.activeBar, { backgroundColor: C.primary }]} />}
              <View style={focused ? [styles.activeGlow, { backgroundColor: C.primaryMuted }] : undefined}>
                <Feather name="bell" size={20} color={color} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              {focused && <View style={[styles.activeBar, { backgroundColor: C.primary }]} />}
              <View style={focused ? [styles.activeGlow, { backgroundColor: C.primaryMuted }] : undefined}>
                <Feather name="book-open" size={20} color={color} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              {focused && <View style={[styles.activeBar, { backgroundColor: C.primary }]} />}
              <View style={focused ? [styles.activeGlow, { backgroundColor: C.primaryMuted }] : undefined}>
                <Feather name="grid" size={18} color={color} />
              </View>
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
    height: 36,
    width: 52,
    paddingTop: 8,
  },
  activeBar: {
    position: 'absolute',
    top: -2,
    width: 24,
    height: 2.5,
    borderRadius: 1.5,
  },
  activeGlow: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
});
