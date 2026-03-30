import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useState } from "react";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { format } from "date-fns";
import { MarkdownText } from "@/src/components/journal/MarkdownText";
import { TimelineFeed } from "@/src/components/home/TimelineFeed";
import { BorderRadius, Spacing } from "@/src/constants/spacing";
import { Typography } from "@/src/constants/typography";
import { useColors } from "@/src/hooks/useColors";
import { useTheme } from "@/src/lib/theme";
import { useHomeTimeline, HomeQuickAction } from "@/src/hooks/useHomeTimeline";
import { useSession } from "@/src/hooks/useSession";
import type { HomeView } from "@/convex/timeline";

/* ─── Helpers ─── */

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ─── Avatar Token ─── */

function AvatarToken({
  name,
  avatarUrl,
  size = 44,
  bg,
  color,
  border,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  size?: number;
  bg: string;
  color: string;
  border: string;
}) {
  const letter = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        borderColor: border,
        backgroundColor: bg,
      }}
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: "100%", height: "100%" }} />
      ) : (
        <Text style={{ fontSize: size * 0.38, fontWeight: "600", color }}>{letter}</Text>
      )}
    </View>
  );
}

/* ─── Daily Verse ─── */

function DailyVerse({
  text,
  reference,
}: {
  text: string;
  reference: string;
  source: "remote" | "fallback";
}) {
  const C = useColors();
  return (
    <Animated.View entering={FadeInDown.duration(500).delay(200)}>
      <View style={styles.verse}>
        <View style={[styles.verseMark, { backgroundColor: C.primary }]} />
        <View style={styles.verseBody}>
          <Text style={[styles.verseText, { color: C.text }]}>"{text}"</Text>
          <Text style={[styles.verseRef, { color: C.primary }]}>{reference}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

/* ─── Shared Memories ─── */

type MemoryItem = HomeView["memories"][number];

function SharedMemories({ memories, isLoading }: { memories: MemoryItem[]; isLoading: boolean }) {
  const C = useColors();
  const { mode } = useTheme();
  const memoryRouter = useRouter();
  const [index, setIndex] = useState(0);

  const glassBg = mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const glassBorder = mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const arrowBg = mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  const count = memories.length;
  const current = count > 0 ? memories[Math.min(index, count - 1)] : null;

  const goPrev = () => {
    if (index > 0) {
      Haptics.selectionAsync();
      setIndex(index - 1);
    }
  };
  const goNext = () => {
    if (index < count - 1) {
      Haptics.selectionAsync();
      setIndex(index + 1);
    }
  };

  return (
    <View style={styles.memorySection}>
      {/* Header */}
      <View style={styles.memoryHeaderRow}>
        <View style={{ gap: 2 }}>
          <Text style={[styles.memoryEyebrow, { color: C.journal }]}>Shared memories</Text>
          <Text style={[styles.memoryHeading, { color: C.text }]}>Our story</Text>
        </View>
        {count > 1 && (
          <View style={styles.memoryNav}>
            <TouchableOpacity
              onPress={goPrev}
              disabled={index === 0}
              style={[styles.memoryArrow, { backgroundColor: arrowBg, opacity: index === 0 ? 0.3 : 1 }]}
            >
              <Feather name="chevron-left" size={16} color={C.text} />
            </TouchableOpacity>
            <Text style={[styles.memoryCounter, { color: C.textTertiary }]}>
              {index + 1}/{count}
            </Text>
            <TouchableOpacity
              onPress={goNext}
              disabled={index >= count - 1}
              style={[styles.memoryArrow, { backgroundColor: arrowBg, opacity: index >= count - 1 ? 0.3 : 1 }]}
            >
              <Feather name="chevron-right" size={16} color={C.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Card */}
      {isLoading ? (
        <View style={[styles.memoryCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <Text style={[styles.memoryLoadingText, { color: C.textSecondary }]}>
            Loading shared memories…
          </Text>
        </View>
      ) : current ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (current.sourceTable === "journalEntries") {
              memoryRouter.push(`/(tabs)/journal/${current.sourceId}` as any);
            }
          }}
          style={[styles.memoryCard, { backgroundColor: glassBg, borderColor: glassBorder }]}
        >
          <View style={styles.memoryCardHeader}>
            <Text style={[styles.memoryCardTitle, { color: C.text }]} numberOfLines={1}>
              {current.title}
            </Text>
            <Text style={[styles.memoryCardDate, { color: C.textTertiary }]}>
              {format(current.createdAt, "MMM d")}
            </Text>
          </View>
          {current.mediaUrls[0] ? (
            <Image
              source={{ uri: current.mediaUrls[0] }}
              style={[styles.memoryCardImage, { backgroundColor: C.card }]}
            />
          ) : null}
          <View style={styles.memoryCardBody}>
            <MarkdownText value={current.body} />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={[styles.memoryCard, styles.memoryEmpty, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <View style={[styles.memoryEmptyIcon, { backgroundColor: C.journalLight }]}>
            <Feather name="book-open" size={22} color={C.journal} />
          </View>
          <Text style={[styles.memoryEmptyTitle, { color: C.text }]}>No shared memories yet</Text>
          <Text style={[styles.memoryEmptyBody, { color: C.textSecondary }]}>
            Write a journal entry and keep it shared — it'll appear here for both of you.
          </Text>
        </View>
      )}
    </View>
  );
}

/* ─── Quick Nav ─── */

function QuickNav({
  actions,
  onPress,
}: {
  actions: HomeQuickAction[];
  onPress: (a: HomeQuickAction) => void;
}) {
  const C = useColors();
  const { mode } = useTheme();
  const glassBorder = mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.navRow}>
      {actions.map((a) => (
        <Pressable
          key={a.id}
          onPress={() => onPress(a)}
          style={({ pressed }) => [
            styles.navPill,
            {
              backgroundColor: a.background,
              borderColor: glassBorder,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name={a.icon} size={16} color={a.tint} />
          <Text style={[styles.navLabel, { color: C.text }]}>{a.label}</Text>
        </Pressable>
      ))}
    </Animated.View>
  );
}

/* ─── Milestones ─── */

function MilestoneStrip({ milestones }: { milestones: HomeView["milestones"] }) {
  const C = useColors();
  const { mode } = useTheme();
  if (milestones.length === 0) return null;

  const glassBg = mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const glassBorder = mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(350)}>
      <Text style={[styles.sectionEyebrow, { color: C.textTertiary }]}>Counting down</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.milestoneScroll}
      >
        {milestones.map((m) => (
          <View
            key={m.id}
            style={[styles.milestoneCard, { backgroundColor: glassBg, borderColor: glassBorder }]}
          >
            <Text style={[styles.milestoneDays, { color: C.primary }]}>
              {m.daysUntil === 0 ? "Today" : `${m.daysUntil}d`}
            </Text>
            <Text style={[styles.milestoneTitle, { color: C.text }]} numberOfLines={1}>
              {m.title}
            </Text>
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

/* ═══════════════════════════════════ HOME SCREEN ═══════════════════════════════════ */

export default function HomeScreen() {
  const C = useColors();
  const { mode } = useTheme();
  const router = useRouter();
  const home = useHomeTimeline({ previewDays: 7 });
  const { profile, activeCouple } = useSession();
  const partner = activeCouple?.partner ?? null;
  const coupleName = activeCouple?.couple?.name;
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await home.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [home]);

  const handleAction = useCallback(
    (action: HomeQuickAction) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(action.route as never);
    },
    [router],
  );

  const glassBorder = mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />
          }
        >
          {/* ─── Header ─── */}
          <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerLeft}>
                <Text style={[styles.greeting, { color: C.textTertiary }]}>{getGreeting()}</Text>
                <Text style={[styles.userName, { color: C.text }]}>
                  {profile?.displayName ?? "there"}
                </Text>
              </View>
              <View style={styles.avatarWrap}>
                <View pointerEvents="none" style={styles.ringsWrap}>
                  <View style={[styles.ring, styles.ringL, { borderColor: C.primary }]} />
                  <View style={[styles.ring, styles.ringR, { borderColor: C.primary }]} />
                </View>
                <View style={styles.avatarStack}>
                  <AvatarToken
                    name={profile?.displayName}
                    avatarUrl={profile?.avatarUrl}
                    size={46}
                    bg={C.primaryMuted}
                    color={C.primary}
                    border={C.primary}
                  />
                  <View style={styles.partnerOverlap}>
                    <AvatarToken
                      name={partner?.displayName ?? "?"}
                      avatarUrl={partner?.avatarUrl}
                      size={46}
                      bg={C.card}
                      color={C.textSecondary}
                      border={C.border}
                    />
                  </View>
                </View>
              </View>
            </View>
            {coupleName && (
              <View style={[styles.coupleTag, { borderColor: glassBorder }]}>
                <Feather name="heart" size={10} color={C.primary} />
                <Text style={[styles.coupleTagText, { color: C.textSecondary }]}>{coupleName}</Text>
              </View>
            )}
          </Animated.View>

          {/* ─── Daily Verse ─── */}
          {home.dailyVerse ? (
            <DailyVerse
              text={home.dailyVerse.text}
              reference={home.dailyVerse.reference}
              source={home.dailyVerse.source}
            />
          ) : null}

          {/* ─── Shared Memories ─── */}
          <Animated.View entering={FadeInDown.duration(500).delay(250)}>
            <SharedMemories memories={home.memories} isLoading={home.isLoading} />
          </Animated.View>

          {/* ─── Quick Nav ─── */}
          <QuickNav actions={home.quickActions} onPress={handleAction} />

          {/* ─── Milestones ─── */}
          <MilestoneStrip milestones={home.milestones} />

          {/* ─── Timeline ─── */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)}>
            <TimelineFeed
              isLoading={home.isLoading}
              timeline={home.timeline}
            />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ═══════════════════════════════════ STYLES ═══════════════════════════════════ */

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing["2xl"],
    paddingBottom: 120,
    gap: Spacing["xl"],
  },

  /* ── Header ── */
  header: {
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    ...Typography.overline,
    letterSpacing: 2,
  },
  userName: {
    ...Typography.largeTitle,
  },
  avatarWrap: {
    position: "relative",
    overflow: "visible",
  },
  ringsWrap: {
    position: "absolute",
    top: -40,
    left: -35,
    width: 160,
    height: 160,
  },
  ring: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    opacity: 0.07,
  },
  ringL: { top: 10, left: 0 },
  ringR: { top: 10, left: 40 },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  partnerOverlap: {
    marginLeft: -14,
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
  },
  coupleTagText: {
    ...Typography.small,
    letterSpacing: 0.3,
  },

  /* ── Daily Verse ── */
  verse: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  verseMark: {
    width: 3,
    borderRadius: 1.5,
  },
  verseBody: {
    flex: 1,
    gap: Spacing.sm,
  },
  verseText: {
    ...Typography.heading,
    fontSize: 18,
    lineHeight: 28,
  },
  verseRef: {
    ...Typography.captionMedium,
    fontSize: 12,
    letterSpacing: 0.5,
  },

  /* ── Shared Memories ── */
  memorySection: {
    gap: Spacing.md,
  },
  memoryHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  memoryEyebrow: {
    ...Typography.overline,
    letterSpacing: 2.4,
  },
  memoryHeading: {
    ...Typography.heading,
  },
  memoryNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  memoryArrow: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  memoryCounter: {
    ...Typography.small,
    fontSize: 11,
    minWidth: 28,
    textAlign: "center",
  },
  memoryCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  memoryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  memoryCardTitle: {
    ...Typography.heading,
    fontSize: 20,
    flex: 1,
  },
  memoryCardDate: {
    ...Typography.small,
  },
  memoryCardImage: {
    width: "100%",
    height: 160,
    borderRadius: BorderRadius.lg,
  },
  memoryCardBody: {
    maxHeight: 90,
    overflow: "hidden",
  },
  memoryLoadingText: {
    ...Typography.body,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
  memoryEmpty: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  memoryEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  memoryEmptyTitle: {
    ...Typography.subheading,
  },
  memoryEmptyBody: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 260,
  },

  /* ── Quick Nav ── */
  navRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  navPill: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.md,
    alignItems: "center",
    gap: 6,
  },
  navLabel: {
    ...Typography.small,
    fontSize: 11,
    fontFamily: Typography.subheading.fontFamily,
  },

  /* ── Milestones ── */
  sectionEyebrow: {
    ...Typography.overline,
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  milestoneScroll: {
    gap: Spacing.md,
    paddingRight: Spacing.md,
  },
  milestoneCard: {
    width: 110,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: 4,
  },
  milestoneDays: {
    ...Typography.heading,
    fontSize: 20,
  },
  milestoneTitle: {
    ...Typography.captionMedium,
    fontSize: 12,
  },
});
