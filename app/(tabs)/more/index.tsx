import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { useAuthStore } from '@/src/stores/authStore';
import { useCoupleStore } from '@/src/stores/coupleStore';

export default function MoreScreen() {
  const C = useColors();
  const { mode, toggle } = useTheme();
  const signOut = useAuthStore((s) => s.signOut);
  const couple = useCoupleStore((s) => s.couple);
  const profile = useAuthStore((s) => s.profile);
  const partner = useCoupleStore((s) => s.partner);

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>

        {/* Static profile header */}
        <View style={[styles.profileSection, { backgroundColor: C.surface }]}>
          <View pointerEvents="none" style={styles.profileRings}>
            <View style={[styles.profileRing, styles.profileRingL, { borderColor: C.primary }]} />
            <View style={[styles.profileRing, styles.profileRingR, { borderColor: C.primary }]} />
          </View>

          <View style={styles.profileContent}>
            <View style={styles.avatarRow}>
              <View style={[styles.avatar, { backgroundColor: C.primaryMuted, borderColor: C.primary }]}>
                <Text style={[styles.avatarLetter, { color: C.primary }]}>
                  {(profile?.display_name?.[0] || '?').toUpperCase()}
                </Text>
              </View>
              {partner && (
                <>
                  <View style={[styles.avatarLink, { backgroundColor: C.primary }]} />
                  <View style={[styles.avatar, { backgroundColor: C.card, borderColor: C.border }]}>
                    <Text style={[styles.avatarLetter, { color: C.textSecondary }]}>
                      {(partner.display_name?.[0] || '?').toUpperCase()}
                    </Text>
                  </View>
                </>
              )}
            </View>
            <Text style={[styles.profileName, { color: C.text }]}>
              {profile?.display_name}
            </Text>
            {couple && (
              <Text style={[styles.profileCouple, { color: C.textTertiary }]}>
                {couple.name}
              </Text>
            )}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: C.background }}
        >
          {/* Appearance */}
          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>Appearance</Text>
            <View style={styles.themeRow}>
              <TouchableOpacity
                onPress={mode === 'light' ? undefined : toggle}
                style={[
                  styles.themeOption,
                  { borderColor: mode === 'light' ? C.primary : C.border,
                    backgroundColor: mode === 'light' ? C.primaryMuted : 'transparent' },
                ]}
                activeOpacity={0.7}
              >
                <Feather name="sun" size={18} color={mode === 'light' ? C.primary : C.textTertiary} />
                <Text style={[styles.themeLabel, { color: mode === 'light' ? C.primary : C.textTertiary }]}>Light</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={mode === 'dark' ? undefined : toggle}
                style={[
                  styles.themeOption,
                  { borderColor: mode === 'dark' ? C.primary : C.border,
                    backgroundColor: mode === 'dark' ? C.primaryMuted : 'transparent' },
                ]}
                activeOpacity={0.7}
              >
                <Feather name="moon" size={18} color={mode === 'dark' ? C.primary : C.textTertiary} />
                <Text style={[styles.themeLabel, { color: mode === 'dark' ? C.primary : C.textTertiary }]}>Dark</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Settings rows */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>Settings</Text>
            {([
              { icon: 'user' as const, label: 'Edit Profile', desc: 'Name, photo, email' },
              { icon: 'heart' as const, label: 'Couple Settings', desc: 'Invite code, anniversary' },
              { icon: 'bell' as const, label: 'Notifications', desc: 'Reminders, partner activity' },
              { icon: 'shield' as const, label: 'Privacy', desc: 'Journal visibility, data' },
            ] as const).map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.settingRow,
                  { borderBottomColor: C.border },
                  i === 3 && styles.settingRowLast,
                ]}
                activeOpacity={0.7}
              >
                <View style={[styles.settingIcon, { backgroundColor: C.primaryMuted }]}>
                  <Feather name={item.icon} size={16} color={C.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingName, { color: C.text }]}>{item.label}</Text>
                  <Text style={[styles.settingDesc, { color: C.textTertiary }]}>{item.desc}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={C.dusk} />
              </TouchableOpacity>
            ))}
          </Animated.View>

          {/* Support */}
          <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>Support</Text>
            {([
              { icon: 'help-circle' as const, label: 'Help & FAQ' },
              { icon: 'message-circle' as const, label: 'Send Feedback' },
              { icon: 'info' as const, label: 'About Coupl' },
            ] as const).map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.supportRow,
                  { borderBottomColor: C.border },
                  i === 2 && styles.settingRowLast,
                ]}
                activeOpacity={0.7}
              >
                <Feather name={item.icon} size={17} color={C.textSecondary} />
                <Text style={[styles.supportLabel, { color: C.text }]}>{item.label}</Text>
                <Feather name="chevron-right" size={15} color={C.dusk} />
              </TouchableOpacity>
            ))}
          </Animated.View>

          {/* Sign out */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.signOutWrap}>
            <TouchableOpacity onPress={signOut} style={styles.signOutBtn} activeOpacity={0.7}>
              <Feather name="log-out" size={15} color={C.error} />
              <Text style={[styles.signOutText, { color: C.error }]}>Sign Out</Text>
            </TouchableOpacity>
            <Text style={[styles.version, { color: C.textTertiary }]}>Coupl v1.0.0</Text>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingTop: Spacing.xl, paddingBottom: Spacing['4xl'] },

  // Profile
  profileSection: {
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  profileRings: {
    position: 'absolute',
    top: -20,
    right: 30,
    width: 100,
    height: 100,
  },
  profileRing: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    opacity: 0.06,
  },
  profileRingL: { top: 0, left: 0 },
  profileRingR: { top: 0, left: 25 },
  profileContent: {
    alignItems: 'center',
  },
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

  // Sections
  section: {
    marginBottom: Spacing['2xl'],
  },
  sectionLabel: {
    ...Typography.overline,
    paddingHorizontal: Spacing['2xl'],
    marginBottom: Spacing.md,
  },

  // Theme
  themeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  themeLabel: { ...Typography.captionMedium },

  // Settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingRowLast: { borderBottomWidth: 0 },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: { flex: 1 },
  settingName: { ...Typography.subheading, fontSize: 15, marginBottom: 1 },
  settingDesc: { ...Typography.small },

  // Support
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  supportLabel: { ...Typography.body, flex: 1 },

  // Sign out
  signOutWrap: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  signOutText: { ...Typography.captionMedium },
  version: { ...Typography.small },
});
