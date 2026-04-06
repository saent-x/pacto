import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';

const sections = [
  {
    icon: 'database' as const,
    title: 'What We Collect',
    body: 'Only what you provide: display name, email, and content you create (journal entries, love notes, check-ins, tasks, wishlists, expenses, milestones, plans, reminders). No location data, contacts, or device tracking.',
  },
  {
    icon: 'lock' as const,
    title: 'How We Use Your Data',
    body: 'Solely to sync content between you and your partner. We never sell, share, or monetize your data. No advertising. No analytics profiling.',
  },
  {
    icon: 'server' as const,
    title: 'Data Storage',
    body: 'Stored securely on Convex with encrypted connections (TLS). Auth tokens live in your device\u2019s secure keychain \u2014 never in plain storage.',
  },
  {
    icon: 'eye' as const,
    title: 'Your Partner',
    body: 'Content in your couple space is visible to your partner unless marked private. Private entries, check-ins, and notes are yours alone.',
  },
  {
    icon: 'clock' as const,
    title: 'Data Retention',
    body: 'Kept while your account is active. Delete your account from Settings to permanently remove your profile and all authored content.',
  },
  {
    icon: 'shield' as const,
    title: 'Your Rights',
    body: 'Access, correct, or delete your personal data at any time. Contact us through the app for data export requests.',
  },
  {
    icon: 'alert-circle' as const,
    title: 'Children & Changes',
    body: 'Coupl is not for anyone under 13. We may update this policy; continued use after changes constitutes acceptance.',
  },
];

export default function PrivacyPolicyScreen() {
  const C = useColors();
  const { mode } = useTheme();
  const router = useRouter();

  const glassBg = mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  const glassBorder = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); router.back(); }}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-left" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.text }]}>Privacy Policy</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <Animated.View entering={FadeIn.duration(600)} style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: C.primaryMuted }]}>
              <Feather name="shield" size={28} color={C.primary} />
            </View>
            <Text style={[styles.heroTitle, { color: C.text }]}>
              Your privacy matters
            </Text>
            <Text style={[styles.heroSub, { color: C.textSecondary }]}>
              Coupl is built for intimacy, not surveillance. Here's exactly what we do with your data.
            </Text>
            <Text style={[styles.lastUpdated, { color: C.textTertiary }]}>
              Last updated April 2026
            </Text>
          </Animated.View>

          {/* Sections */}
          {sections.map((section, i) => (
            <Animated.View
              key={section.title}
              entering={FadeInDown.duration(400).delay(100 + i * 60)}
              style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder }]}
            >
              <View style={[styles.cardIcon, { backgroundColor: C.primaryMuted }]}>
                <Feather name={section.icon} size={16} color={C.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: C.text }]}>{section.title}</Text>
                <Text style={[styles.cardBody, { color: C.textSecondary }]}>{section.body}</Text>
              </View>
            </Animated.View>
          ))}

          <Animated.View entering={FadeInDown.duration(400).delay(600)} style={styles.footer}>
            <Text style={[styles.footerText, { color: C.textTertiary }]}>
              Questions about your data? Reach out through the app.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.subheading,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 120,
    gap: Spacing.md,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.md,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    ...Typography.heading,
    textAlign: 'center',
  },
  heroSub: {
    ...Typography.body,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  lastUpdated: {
    ...Typography.small,
    marginTop: Spacing.xs,
  },
  card: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  cardTitle: {
    ...Typography.captionMedium,
    fontSize: 14,
  },
  cardBody: {
    ...Typography.caption,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  footerText: {
    ...Typography.small,
    textAlign: 'center',
  },
});
