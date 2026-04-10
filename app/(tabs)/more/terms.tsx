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
    icon: 'check-circle' as const,
    title: 'Acceptance',
    body: 'By using Coupl, you agree to these terms. If you do not agree, do not use the app.',
  },
  {
    icon: 'user' as const,
    title: 'Eligibility',
    body: 'You must be at least 13 years old. By creating an account, you confirm you meet this requirement.',
  },
  {
    icon: 'key' as const,
    title: 'Your Account',
    body: 'You\u2019re responsible for your account security. Don\u2019t share credentials beyond the couple pairing feature.',
  },
  {
    icon: 'heart' as const,
    title: 'Acceptable Use',
    body: 'Use Coupl only as a private couples space. No harassment, threats, illegal content, or harm to others.',
  },
  {
    icon: 'edit-3' as const,
    title: 'Content Ownership',
    body: 'You own everything you create. We only store and transmit it to provide the service \u2014 nothing more.',
  },
  {
    icon: 'zap' as const,
    title: 'Service Availability',
    body: 'We strive for uptime but don\u2019t guarantee uninterrupted service. Features may change with reasonable notice.',
  },
  {
    icon: 'trash-2' as const,
    title: 'Account Termination',
    body: 'Delete your account any time from Settings. We may suspend accounts that violate these terms.',
  },
  {
    icon: 'alert-triangle' as const,
    title: 'Limitation of Liability',
    body: 'Coupl is provided \u201cas is\u201d without warranties. We\u2019re not liable for damages from your use of the app.',
  },
  {
    icon: 'refresh-cw' as const,
    title: 'Changes to Terms',
    body: 'We may update these terms. Continued use after changes constitutes acceptance.',
  },
];

export default function TermsScreen() {
  const C = useColors();
  const { mode } = useTheme();
  const router = useRouter();

  const glassBg = mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)';
  const glassBorder = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.10)';

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
          <Text style={[styles.headerTitle, { color: C.text }]}>Terms of Service</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <Animated.View entering={FadeIn.duration(600)} style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: C.primaryMuted }]}>
              <Feather name="file-text" size={28} color={C.primary} />
            </View>
            <Text style={[styles.heroTitle, { color: C.text }]}>
              Terms of Service
            </Text>
            <Text style={[styles.heroSub, { color: C.textSecondary }]}>
              Simple, fair terms for using Coupl as your shared space.
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

          <Animated.View entering={FadeInDown.duration(400).delay(700)} style={styles.footer}>
            <Text style={[styles.footerText, { color: C.textTertiary }]}>
              Questions? Contact us through the app.
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
