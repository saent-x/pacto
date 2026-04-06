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
import { GlassSection, GlassRow } from '@/src/components/ui';

const features: { icon: keyof typeof Feather.glyphMap; text: string; accentKey: string }[] = [
  { icon: 'calendar', text: 'Shared calendar & events', accentKey: 'reminders' },
  { icon: 'bell', text: 'Reminders that matter', accentKey: 'reminders' },
  { icon: 'check-square', text: 'Task lists for us', accentKey: 'tasks' },
  { icon: 'book-open', text: 'Journaling together', accentKey: 'journal' },
  { icon: 'heart', text: 'Love notes & check-ins', accentKey: 'error' },
  { icon: 'gift', text: 'Wishlists & surprises', accentKey: 'wishlists' },
  { icon: 'dollar-sign', text: 'Expense tracking', accentKey: 'expenses' },
  { icon: 'repeat', text: 'Rituals & habits', accentKey: 'plans' },
  { icon: 'flag', text: 'Milestones & countdowns', accentKey: 'milestones' },
];

export default function AboutScreen() {
  const C = useColors();
  const { mode } = useTheme();
  const router = useRouter();

  const glassBg = mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  const glassBorder = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  const getAccent = (key: string) => {
    const map: Record<string, string> = {
      reminders: C.reminders,
      tasks: C.tasks,
      journal: C.journal,
      error: C.error,
      wishlists: C.wishlists,
      expenses: C.expenses,
      plans: C.plans,
      milestones: C.milestones,
    };
    return map[key] ?? C.primary;
  };

  const navigate = (path: string) => () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(path as never);
  };

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
          {/* Logo + tagline */}
          <Animated.View entering={FadeIn.duration(600)} style={styles.logoSection}>
            <Text style={[styles.logo, { color: C.primary }]}>coupl</Text>
            <View style={[styles.goldRule, { backgroundColor: C.primary }]} />
            <Text style={[styles.tagline, { color: C.textSecondary }]}>
              A shared space for two people{'\n'}building something together.
            </Text>
          </Animated.View>

          {/* Features */}
          <Animated.View entering={FadeInDown.duration(400).delay(150)}>
            <Text style={[styles.sectionTitle, { color: C.primary }]}>What you can do</Text>
            <View style={styles.featureGrid}>
              {features.map((item, i) => (
                <Animated.View
                  key={item.text}
                  entering={FadeInDown.duration(300).delay(200 + i * 40)}
                  style={[styles.featureCard, { backgroundColor: glassBg, borderColor: glassBorder }]}
                >
                  <Feather name={item.icon} size={15} color={getAccent(item.accentKey)} />
                  <Text style={[styles.featureText, { color: C.text }]}>{item.text}</Text>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* Legal links */}
          <Animated.View entering={FadeInDown.duration(400).delay(500)}>
            <GlassSection header="Legal">
              <GlassRow icon="shield" iconColor={C.textTertiary} label="Privacy Policy" chevron onPress={navigate('/(tabs)/more/privacy')} />
              <GlassRow icon="file-text" iconColor={C.textTertiary} label="Terms of Service" chevron onPress={navigate('/(tabs)/more/terms')} last />
            </GlassSection>
          </Animated.View>

          {/* Footer */}
          <Animated.View entering={FadeInDown.duration(400).delay(600)} style={styles.footer}>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['2xl'],
    paddingBottom: 120,
    gap: Spacing['2xl'],
  },
  logoSection: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  logo: {
    ...Typography.display,
    fontSize: 52,
  },
  goldRule: {
    width: 24,
    height: 2,
    borderRadius: 1,
  },
  tagline: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  sectionTitle: {
    ...Typography.overline,
    letterSpacing: 2.4,
    fontSize: 11,
    marginBottom: Spacing.md,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  featureText: {
    ...Typography.small,
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.md,
  },
  version: {
    ...Typography.caption,
  },
  madeWith: {
    ...Typography.small,
  },
});
