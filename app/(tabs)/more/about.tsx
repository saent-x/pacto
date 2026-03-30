import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColors } from '@/src/hooks/useColors';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';

export default function AboutScreen() {
  const C = useColors();
  const router = useRouter();

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
          <Text style={[styles.headerTitle, { color: C.text }]}>About Coupl</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(500)} style={styles.logoSection}>
            <Text style={[styles.logo, { color: C.primary }]}>coupl</Text>
            <Text style={[styles.tagline, { color: C.textSecondary }]}>
              A shared space for two people building something together.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.primary }]}>What is Coupl?</Text>
            <Text style={[styles.body, { color: C.textSecondary }]}>
              Coupl is a private space for couples to share their life — from daily reminders and tasks to love notes,
              wishlists, and shared memories. Everything stays between you and your partner.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(150)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.primary }]}>Features</Text>
            {[
              { icon: 'calendar', text: 'Shared calendar & events' },
              { icon: 'bell', text: 'Reminders that matter' },
              { icon: 'check-square', text: 'Task lists for us' },
              { icon: 'book-open', text: 'Journaling together' },
              { icon: 'heart', text: 'Love notes & check-ins' },
              { icon: 'gift', text: 'Wishlists & surprises' },
              { icon: 'dollar-sign', text: 'Expense tracking' },
              { icon: 'repeat', text: 'Rituals & habits' },
              { icon: 'flag', text: 'Milestones & countdowns' },
            ].map((item, i) => (
              <View key={i} style={styles.featureRow}>
                <Feather name={item.icon as any} size={16} color={C.primary} />
                <Text style={[styles.featureText, { color: C.text }]}>{item.text}</Text>
              </View>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.footer}>
            <Text style={[styles.version, { color: C.textTertiary }]}>Version 1.0.0</Text>
            <Text style={[styles.madeWith, { color: C.textTertiary }]}>
              Made with love for couples everywhere
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
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['3xl'],
    paddingBottom: 120,
    gap: Spacing['3xl'],
  },
  logoSection: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  logo: {
    ...Typography.display,
    fontSize: 56,
  },
  tagline: {
    ...Typography.body,
    textAlign: 'center',
    maxWidth: 280,
  },
  section: {
    gap: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.overline,
    letterSpacing: 2.4,
    fontSize: 11,
  },
  body: {
    ...Typography.body,
    lineHeight: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 6,
  },
  featureText: {
    ...Typography.body,
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.xl,
  },
  version: {
    ...Typography.caption,
  },
  madeWith: {
    ...Typography.small,
  },
});
