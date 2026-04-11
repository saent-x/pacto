import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useColors } from "@/src/hooks/useColors";
import { useSession } from "@/src/hooks/useSession";
import { useTheme } from "@/src/lib/theme";
import { Typography } from "@/src/constants/typography";
import { Spacing, BorderRadius } from "@/src/constants/spacing";

type FeatureItem = {
  id: string;
  label: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
  accentKey: string;
};

const FEATURES: FeatureItem[] = [
  {
    id: "love-notes",
    label: "Love Notes",
    subtitle: "Say something sweet",
    icon: "heart",
    route: "/(tabs)/together/love-notes",
    accentKey: "error",
  },
  {
    id: "check-ins",
    label: "Check-ins",
    subtitle: "Share how you feel",
    icon: "smile",
    route: "/(tabs)/together/check-ins",
    accentKey: "mood",
  },
  {
    id: "expenses",
    label: "Expenses",
    subtitle: "Track & settle",
    icon: "dollar-sign",
    route: "/(tabs)/together/expenses",
    accentKey: "expenses",
  },
  {
    id: "wishlists",
    label: "Wishlists",
    subtitle: "Drop hints",
    icon: "gift",
    route: "/(tabs)/together/wishlists",
    accentKey: "wishlists",
  },
  {
    id: "milestones",
    label: "Milestones",
    subtitle: "Moments that matter",
    icon: "flag",
    route: "/(tabs)/together/milestones",
    accentKey: "milestones",
  },
  {
    id: "plans",
    label: "Plans",
    subtitle: "Dream & do",
    icon: "map",
    route: "/(tabs)/together/plans",
    accentKey: "plans",
  },
];

function getAccent(
  key: string,
  C: ReturnType<typeof useColors>,
): { fg: string; bg: string } {
  const map: Record<string, { fg: string; bg: string }> = {
    expenses: { fg: C.expenses, bg: C.expensesLight },
    wishlists: { fg: C.wishlists, bg: C.wishlistsLight },
    error: { fg: C.error, bg: C.errorLight },
    milestones: { fg: C.milestones, bg: C.milestonesLight },
    mood: { fg: C.mood, bg: C.moodLight },
    primary: { fg: C.primary, bg: C.primaryMuted },
    plans: { fg: C.plans, bg: C.plansLight },
  };
  return map[key] ?? { fg: C.primary, bg: C.primaryMuted };
}

export default function TogetherScreen() {
  const C = useColors();
  const { mode } = useTheme();
  const router = useRouter();
  const { profile, activeCouple, refetch } = useSession();
  const partner = activeCouple?.partner ?? null;
  const coupleName = activeCouple?.couple?.name ?? "Your space";
  const [refreshing, setRefreshing] = useState(false);

  const glassBg =
    mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.06)";
  const glassBorder =
    mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.10)";

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const navigate = (route: string) => () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as never);
  };

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={styles.flex} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={C.primary}
            />
          }
        >
          {/* Header */}
          <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
            {/*<View style={styles.titleBlock}>
              <Text style={[styles.screenTitle, { color: C.textTertiary }]}>
                Together
              </Text>
            </View>*/}

            <View style={styles.topRow}>
              <View style={styles.titleBlock}>
                <Text style={[styles.helperLabel, { color: C.textTertiary }]}>
                  Together
                </Text>
              </View>
            </View>
            {/*<Text style={[styles.title, { color: C.text }]}>{coupleName}</Text>*/}
            {/*{partner && (
              <View style={[styles.coupleTag, { borderColor: glassBorder }]}>
                <Feather name="heart" size={10} color={C.primary} />
                <Text style={[styles.coupleTagText, { color: C.textSecondary }]}>
                  {(profile?.displayName?.split(' ')[0] ?? '?')} & {(partner.displayName?.split(' ')[0] ?? '?')}
                </Text>
              </View>
            )}*/}
          </Animated.View>

          {/* Warm intro card */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(60)}
            style={[
              styles.introCard,
              { backgroundColor: C.primaryMuted, borderColor: glassBorder },
            ]}
          >
            <Text style={[styles.introText, { color: C.textSecondary }]}>
              Your shared tools for everyday life together — from love notes to
              expense tracking.
            </Text>
          </Animated.View>

          <View style={styles.sectionHeader}>
            <View style={styles.topRow}>
              <View style={styles.titleBlock}>
                <Text style={[styles.subHelperLabel, { color: C.textTertiary }]}>
                  Shared spaces
                </Text>
              </View>
            </View>
            <Text style={[styles.sectionTitle, { color: C.text }]}>
              Everything you do together
            </Text>
          </View>

          <View style={styles.grid}>
            {FEATURES.map((feature, index) => {
              const accent = getAccent(feature.accentKey, C);
              return (
                <Animated.View
                  key={feature.id}
                  entering={FadeInDown.duration(350).delay(120 + index * 50)}
                  style={styles.gridItem}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={navigate(feature.route)}
                    style={[styles.card, { backgroundColor: C.card }]}
                  >
                    <View style={styles.cardLeft}>
                      <View
                        style={[
                          styles.iconCircle,
                          { backgroundColor: accent.bg },
                        ]}
                      >
                        <Feather
                          name={feature.icon}
                          size={18}
                          color={accent.fg}
                        />
                      </View>
                      <View style={styles.cardCopy}>
                        <View style={styles.topRow}>
                          <View style={styles.titleBlock}>
                            <Text style={[styles.helperLabel, { color: C.text }]}>
                              {feature.label}
                            </Text>
                          </View>
                        </View>
                        {/*<Text style={[styles.cardLabel, { color: C.text }]}>
                          {feature.label}
                        </Text>*/}
                        <Text
                          style={[styles.cardSub, { color: C.textSecondary }]}
                        >
                          {feature.subtitle}
                        </Text>
                      </View>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={18}
                      color={C.textTertiary}
                    />
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: 120,
    gap: Spacing.xl,
  },

  // Header
  header: {
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  greeting: {
    ...Typography.overline,
    letterSpacing: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  helperLabel: {
    ...Typography.bodyMedium,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subHelperLabel: {
    ...Typography.small,
    textTransform: "uppercase",
    letterSpacing: 1,
  }
  ,
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Typography.largeTitle,
  },
  coupleTag: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.xs,
  },
  coupleTagText: {
    ...Typography.small,
    letterSpacing: 0.3,
  },
  screenTitle: {
    ...Typography.title,
  },

  // Intro
  introCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  introText: {
    ...Typography.caption,
    lineHeight: 20,
  },

  sectionHeader: {
    gap: 4,
  },
  sectionEyebrow: {
    ...Typography.overline,
    letterSpacing: 1.5,
  },
  sectionTitle: {
    ...Typography.headingRegular,
  },

  grid: {
    gap: Spacing.sm,
  },
  gridItem: {
    width: "100%",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    padding: Spacing.lg,
    minHeight: 84,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: {
    flex: 1,
    gap: 2,
  },
  cardLabel: {
    ...Typography.headingRegular,
    fontSize: 19,
  },
  cardSub: {
    ...Typography.caption,
  },
});
