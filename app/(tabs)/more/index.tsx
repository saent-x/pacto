import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/hooks/useSession';
import { useAuthActions } from '@/src/hooks/useAuthActions';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';
import { GlassSection, GlassRow, SegmentedControl } from '@/src/components/ui';

export default function MoreScreen() {
  const C = useColors();
  const { mode, toggle } = useTheme();
  const { signOut } = useAuthActions();
  const { profile, activeCouple, refetch } = useSession();
  const router = useRouter();
  const couple = activeCouple?.couple ?? null;
  const partner = activeCouple?.partner ?? null;
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const navigate = (path: string) => () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(path as never);
  };

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Profile header */}
        <View style={[styles.profileSection, { backgroundColor: C.background }]}>
          <View pointerEvents="none" style={styles.ringsWrap}>
            <View style={[styles.ring, styles.ringL, { borderColor: C.primary }]} />
            <View style={[styles.ring, styles.ringR, { borderColor: C.primary }]} />
          </View>

          <View style={styles.profileContent}>
            <View style={styles.avatarRow}>
              <View style={[styles.avatar, { backgroundColor: C.primaryMuted, borderColor: C.primary }]}>
                <Text style={[styles.avatarLetter, { color: C.primary }]}>
                  {(profile?.displayName?.[0] || '?').toUpperCase()}
                </Text>
              </View>
              {partner && (
                <>
                  <View style={[styles.avatarLink, { backgroundColor: C.primary }]} />
                  <View style={[styles.avatar, { backgroundColor: C.card, borderColor: C.border }]}>
                    <Text style={[styles.avatarLetter, { color: C.textSecondary }]}>
                      {(partner.displayName?.[0] || '?').toUpperCase()}
                    </Text>
                  </View>
                </>
              )}
            </View>
            <Text style={[styles.profileName, { color: C.text }]}>
              {profile?.displayName ?? 'Your profile'}
            </Text>
            {couple && (
              <Text style={[styles.profileCouple, { color: C.textTertiary }]}>{couple.name}</Text>
            )}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />
          }
        >
          {/* Appearance */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.sectionWrap}>
            <GlassSection header="Appearance">
              <View style={styles.segmentWrap}>
                <SegmentedControl
                  segments={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ]}
                  selected={mode}
                  onSelect={(val) => {
                    if (val !== mode) toggle();
                  }}
                />
              </View>
            </GlassSection>
          </Animated.View>

          {/* Account */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.sectionWrap}>
            <GlassSection header="Account">
              <GlassRow icon="user" label="Edit Profile" subtitle="Name, photo, email" chevron onPress={navigate('/(tabs)/more/edit-profile')} />
              <GlassRow icon="heart" iconColor={C.primary} label="Our Space" subtitle="Couple settings" chevron onPress={navigate('/(tabs)/more/couple-settings')} last />
            </GlassSection>
          </Animated.View>

          {/* Support */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.sectionWrap}>
            <GlassSection header="Support">
              <GlassRow icon="info" iconColor={C.textTertiary} label="About Coupl" value="v1.0.0" chevron onPress={navigate('/(tabs)/more/about')} last />
            </GlassSection>
          </Animated.View>

          {/* Sign out */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.sectionWrap}>
            <GlassSection>
              <GlassRow
                icon="log-out"
                iconColor={C.error}
                iconBg={C.errorLight}
                label="Sign Out"
                destructive
                last
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  signOut();
                }}
              />
            </GlassSection>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 120,
  },
  sectionWrap: {},

  // Profile
  profileSection: {
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.xl,
    overflow: 'hidden',
  },
  ringsWrap: {
    position: 'absolute',
    top: -20,
    right: 30,
    width: 100,
    height: 100,
  },
  ring: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    opacity: 0.06,
  },
  ringL: { top: 0, left: 0 },
  ringR: { top: 0, left: 25 },
  profileContent: { alignItems: 'center' },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 18, fontWeight: '600' },
  avatarLink: {
    width: 16,
    height: 2,
    borderRadius: 1,
    marginHorizontal: Spacing.sm,
  },
  profileName: { ...Typography.heading, marginBottom: Spacing.xs },
  profileCouple: { ...Typography.caption },

  // Segmented control padding
  segmentWrap: {
    padding: Spacing.md,
  },
});
