import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useRef, useState } from "react";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { format } from "date-fns";
import * as Clipboard from "expo-clipboard";
import Svg, { Rect, Circle, Path } from "react-native-svg";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { MarkdownText } from "@/src/components/journal/MarkdownText";
import { TimelineFeed } from "@/src/components/home/TimelineFeed";
import { BorderRadius, Spacing } from "@/src/constants/spacing";
import {
  CHECK_IN_MOODS,
  getCheckInMoodMeta,
} from "@/src/constants/checkInMoods";
import { Typography } from "@/src/constants/typography";
import { useColors } from "@/src/hooks/useColors";
import { useCheckIns } from "@/src/hooks/useCheckIns";
import { useTheme } from "@/src/lib/theme";
import { useHomeTimeline } from "@/src/hooks/useHomeTimeline";
import {
  routeForMilestoneItem,
  routeForTimelineItem,
} from "@/src/lib/homeNavigation";
import { useSession } from "@/src/hooks/useSession";
import type { HomeView } from "@/src/lib/home/types";

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
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <Text style={{ fontSize: size * 0.38, fontWeight: "600", color }}>
          {letter}
        </Text>
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
  const { mode } = useTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const verseBg = mode === "dark" ? C.card : "rgba(184, 90, 66, 0.05)";
  const fullText = `"${text}"\n— ${reference}`;

  const handleCopy = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(fullText);
  }, [fullText]);

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({ message: fullText });
  }, [fullText]);

  const handleOpen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sheetRef.current?.present();
  }, []);

  return (
    <>
      <Animated.View entering={FadeInDown.duration(500).delay(200)}>
        <Pressable onPress={handleOpen}>
          <View style={styles.verse}>
            <View style={[styles.verseMark, { backgroundColor: C.primary }]} />
            <View style={[styles.verseBody, { backgroundColor: verseBg }]}>
              <Text style={[styles.verseText, { color: C.text }]} numberOfLines={3}>
                "{text}"
              </Text>
              <View style={styles.verseFooter}>
                <Text style={[styles.verseRef, { color: C.primary }]}>
                  {reference}
                </Text>
                <View style={styles.verseActions}>
                  <TouchableOpacity onPress={handleCopy} activeOpacity={0.6} style={[styles.verseActionBtn, { backgroundColor: C.primaryMuted }]}>
                    <Feather name="copy" size={13} color={C.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleShare} activeOpacity={0.6} style={[styles.verseActionBtn, { backgroundColor: C.primaryMuted }]}>
                    <Feather name="share" size={13} color={C.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>

      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        backgroundStyle={{ backgroundColor: C.card }}
        handleIndicatorStyle={{ backgroundColor: C.dim }}
      >
        <BottomSheetView style={styles.verseSheet}>
          <Text style={[styles.verseSheetText, { color: C.text }]}>
            "{text}"
          </Text>
          <Text style={[styles.verseSheetRef, { color: C.primary }]}>
            — {reference}
          </Text>
          <View style={styles.verseSheetActions}>
            <TouchableOpacity
              onPress={handleCopy}
              activeOpacity={0.7}
              style={[styles.verseSheetBtn, { backgroundColor: C.primaryMuted }]}
            >
              <Feather name="copy" size={16} color={C.primary} />
              <Text style={[styles.verseSheetBtnLabel, { color: C.primary }]}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShare}
              activeOpacity={0.7}
              style={[styles.verseSheetBtn, { backgroundColor: C.primaryMuted }]}
            >
              <Feather name="share" size={16} color={C.primary} />
              <Text style={[styles.verseSheetBtnLabel, { color: C.primary }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}

/* ─── Shared Memories ─── */

type MemoryItem = HomeView["memories"][number];

function MemoryMotif({ sourceTable, colors }: { sourceTable: string; colors: ReturnType<typeof useColors> }) {
  if (sourceTable === "loveNotes") {
    return (
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        {Array.from({ length: 5 }).map((_, row) =>
          Array.from({ length: 6 }).map((_, col) => {
            const x = col * 56 + (row % 2 === 0 ? 0 : 28);
            const y = row * 40 + 8;
            const opacity = ((row + col) % 3 === 0) ? 0.14 : 0.07;
            return (
              <Path
                key={`${row}-${col}`}
                d={`M${x + 16},${y + 8} C${x + 16},${y + 2} ${x + 10},${y} ${x + 6},${y + 4} C${x},${y + 10} ${x + 6},${y + 18} ${x + 16},${y + 22} C${x + 26},${y + 18} ${x + 32},${y + 10} ${x + 26},${y + 4} C${x + 22},${y} ${x + 16},${y + 2} ${x + 16},${y + 8} Z`}
                fill={colors.error}
                opacity={opacity}
              />
            );
          })
        )}
      </Svg>
    );
  }

  // Journal entries — circles + triangles
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      {Array.from({ length: 6 }).map((_, row) =>
        Array.from({ length: 8 }).map((_, col) => {
          const x = col * 48 + (row % 2 === 0 ? 0 : 24);
          const y = row * 32;
          const opacity = ((row + col) % 3 === 0) ? 0.12 : 0.06;
          return (row + col) % 2 === 0 ? (
            <Circle key={`${row}-${col}`} cx={x + 16} cy={y + 16} r={8} fill={colors.journal} opacity={opacity} />
          ) : (
            <Path key={`${row}-${col}`} d={`M${x + 8},${y + 4} L${x + 24},${y + 16} L${x + 8},${y + 28} Z`} fill={colors.journal} opacity={opacity} />
          );
        })
      )}
    </Svg>
  );
}

function SharedMemories({
  memories,
  isLoading,
}: {
  memories: MemoryItem[];
  isLoading: boolean;
}) {
  const C = useColors();
  const { mode } = useTheme();
  const memoryRouter = useRouter();
  const [index, setIndex] = useState(0);

  const glassBg =
    mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.06)";
  const glassBorder =
    mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.10)";
  const arrowBg =
    mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.10)";

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
          <Text style={[styles.memoryEyebrow, { color: C.journal }]}>
            Shared memories
          </Text>
          <Text style={[styles.memoryHeading, { color: C.text }]}>
            Our story
          </Text>
        </View>
        {count > 1 && (
          <View style={styles.memoryNav}>
            <TouchableOpacity
              onPress={goPrev}
              disabled={index === 0}
              style={[
                styles.memoryArrow,
                { backgroundColor: arrowBg, opacity: index === 0 ? 0.3 : 1 },
              ]}
            >
              <Feather name="chevron-left" size={16} color={C.text} />
            </TouchableOpacity>
            <Text style={[styles.memoryCounter, { color: C.textTertiary }]}>
              {index + 1}/{count}
            </Text>
            <TouchableOpacity
              onPress={goNext}
              disabled={index >= count - 1}
              style={[
                styles.memoryArrow,
                {
                  backgroundColor: arrowBg,
                  opacity: index >= count - 1 ? 0.3 : 1,
                },
              ]}
            >
              <Feather name="chevron-right" size={16} color={C.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Card */}
      {isLoading ? (
        <View
          style={[
            styles.memoryCard,
            { backgroundColor: glassBg, borderColor: glassBorder },
          ]}
        >
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
          style={[styles.memoryCard, { backgroundColor: glassBg }]}
        >
          {/* Background image area */}
          <View style={styles.memoryImageWrap}>
            {current.mediaUrls[0] ? (
              <Image
                source={{ uri: current.mediaUrls[0] }}
                style={styles.memoryBgImage}
              />
            ) : (
              <View style={[styles.memoryBgFallback, { backgroundColor: current.sourceTable === "loveNotes" ? C.errorLight : C.journalLight }]}>
                <MemoryMotif sourceTable={current.sourceTable} colors={C} />
              </View>
            )}
            {/* Date badge */}
            <View style={[styles.memoryDateBadge, { backgroundColor: mode === "dark" ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.85)" }]}>
              <Text style={[styles.memoryCardDate, { color: C.textTertiary }]}>
                {format(current.createdAt, "MMM d")}
              </Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.memoryContent}>
            <Text
              style={[styles.memoryCardTitle, { color: C.text }]}
              numberOfLines={1}
            >
              {current.title}
            </Text>
            <View style={styles.memoryCardBody}>
              <MarkdownText value={current.body} numberOfLines={2} />
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <View
          style={[
            styles.memoryCard,
            styles.memoryEmpty,
            { backgroundColor: glassBg, borderColor: glassBorder },
          ]}
        >
          <View
            style={[
              styles.memoryEmptyIcon,
              { backgroundColor: C.journalLight },
            ]}
          >
            <Feather name="book-open" size={22} color={C.journal} />
          </View>
          <Text style={[styles.memoryEmptyTitle, { color: C.text }]}>
            No shared memories yet
          </Text>
          <Text style={[styles.memoryEmptyBody, { color: C.textSecondary }]}>
            Write a journal entry and keep it shared — it'll appear here for
            both of you.
          </Text>
        </View>
      )}
    </View>
  );
}

const PULSE_MOODS: (typeof CHECK_IN_MOODS)[number]["id"][] = [
  "struggling", "down", "okay", "good", "happy",
];

function formatCheckInAge(timestamp: number) {
  const mins = Math.floor((Date.now() - timestamp) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function DailyPulseCard() {
  const C = useColors();
  const { mode } = useTheme();
  const { profile, activeCouple } = useSession();
  const { myTodayCheckIn, partnerTodayCheckIn, createOrUpdate, isSubmitting } = useCheckIns();
  const myMood = getCheckInMoodMeta(myTodayCheckIn?.mood);
  const partnerMood = getCheckInMoodMeta(partnerTodayCheckIn?.mood);
  const partner = activeCouple?.partner ?? null;
  const partnerName = partner?.displayName?.split(" ")[0] ?? "Partner";

  const pulseBg = mode === "dark" ? C.card : "rgba(106, 94, 154, 0.04)";
  const subtleBg = mode === "dark" ? C.surface : "rgba(0,0,0,0.04)";
  const latestTimestamp = myTodayCheckIn?.createdAt ?? partnerTodayCheckIn?.createdAt;
  const moods = CHECK_IN_MOODS.filter((m) => PULSE_MOODS.includes(m.id));

  const handleSelect = useCallback(
    async (moodId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await createOrUpdate({ mood: moodId, note: null, isPrivate: false });
    },
    [createOrUpdate],
  );

  const handleNudge = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "Nudge sent",
      `We'll remind ${partnerName} to check in.`,
      [{ text: "OK" }],
    );
  }, [partnerName]);

  const myInitial = (profile?.displayName?.trim()?.[0] ?? "?").toUpperCase();
  const partnerInitial = (partner?.displayName?.trim()?.[0] ?? "?").toUpperCase();

  return (
    <Animated.View entering={FadeInDown.duration(450).delay(240)}>
      <View style={[styles.pulseCard, { backgroundColor: pulseBg, borderColor: C.border }]}>
        {/* Header */}
        <View style={styles.pulseHeader}>
          <Text style={[styles.pulseEyebrow, { color: C.textTertiary }]}>
            HOW ARE YOU FEELING?
          </Text>
          {latestTimestamp ? (
            <Text style={[styles.pulseTimestamp, { color: C.textTertiary }]}>
              {formatCheckInAge(latestTimestamp)}
            </Text>
          ) : null}
        </View>

        {/* Status row — each person takes exactly half */}
        <View style={styles.pulseStatusRow}>
          <View style={styles.pulsePersonCol}>
            <View style={styles.pulseAvatarGroup}>
              <View style={[styles.pulseAvatar, { backgroundColor: C.primaryMuted, borderColor: C.primary }]}>
                <Text style={[styles.pulseAvatarLetter, { color: C.primary }]}>{myInitial}</Text>
              </View>
              {myMood ? (
                <View style={[styles.pulseMoodBadge, { backgroundColor: C.moodLight }]}>
                  <Feather name={myMood.icon} size={12} color={C.mood} />
                </View>
              ) : null}
            </View>
            <View style={styles.pulseLabelRow}>
              <View style={[styles.pulseDot, { backgroundColor: myMood ? C.mood : C.textTertiary }]} />
              <Text style={[styles.pulseStatusLabel, { color: C.text }]}>
                {myMood ? myMood.label : "Not set"}
              </Text>
            </View>
          </View>

          <View style={styles.pulsePersonCol}>
            <View style={styles.pulseAvatarGroup}>
              <View style={[styles.pulseAvatar, { backgroundColor: subtleBg, borderColor: C.border }]}>
                <Text style={[styles.pulseAvatarLetter, { color: C.textSecondary }]}>{partnerInitial}</Text>
              </View>
              {partnerMood ? (
                <View style={[styles.pulseMoodBadge, { backgroundColor: C.primaryMuted }]}>
                  <Feather name={partnerMood.icon} size={12} color={C.primary} />
                </View>
              ) : (
                <View style={[styles.pulseWaitingIcon, { borderColor: C.dim }]}>
                  <Feather name="clock" size={12} color={C.textTertiary} />
                </View>
              )}
            </View>
            <View style={styles.pulseLabelRow}>
              <View style={[styles.pulseDot, { backgroundColor: partnerMood ? C.primary : C.textTertiary }]} />
              <Text style={[styles.pulseStatusLabel, { color: partnerMood ? C.text : C.textTertiary }]}>
                {partnerMood ? partnerMood.label : "Waiting"}
              </Text>
              {!partnerMood && (
                <TouchableOpacity onPress={handleNudge} activeOpacity={0.6}>
                  <Text style={[styles.pulseNudge, { color: C.primary }]}>nudge</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.pulseDivider, { backgroundColor: C.divider }]} />

        {/* Mood picker — 5 options */}
        <View style={styles.pulseMoodRow}>
          {moods.map((mood) => {
            const isMine = myMood?.id === mood.id;
            return (
              <TouchableOpacity
                key={mood.id}
                activeOpacity={0.7}
                disabled={isSubmitting}
                onPress={() => handleSelect(mood.id)}
                style={[isSubmitting && { opacity: 0.55 }]}
              >
                <View
                  style={[
                    styles.pulseMoodCircle,
                    {
                      backgroundColor: isMine ? "transparent" : subtleBg,
                      borderColor: isMine ? C.mood : "transparent",
                    },
                  ]}
                >
                  <Feather
                    name={mood.icon}
                    size={18}
                    color={isMine ? C.mood : C.textTertiary}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.pulseHelper, { color: C.textTertiary }]}>
          Tap to update yours
        </Text>
      </View>
    </Animated.View>
  );
}

/* ─── Milestones ─── */

const MS_CARD_W = 110;
const MS_CARD_H = 80;
const MS_RADIUS = 10;
const MS_STROKE = 1.5;
const MS_MAX_DAYS = 30;

function MilestoneProgressBorder({
  daysUntil,
  trackColor,
  fillColor,
}: {
  daysUntil: number;
  trackColor: string;
  fillColor: string;
}) {
  const inset = MS_STROKE / 2;
  const w = MS_CARD_W - MS_STROKE;
  const h = MS_CARD_H - MS_STROKE;
  const r = MS_RADIUS - inset;
  const perimeter = 2 * (w + h) - 8 * r + 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(1, 1 - daysUntil / MS_MAX_DAYS));
  const filled = perimeter * progress;

  return (
    <Svg
      width={MS_CARD_W}
      height={MS_CARD_H}
      style={StyleSheet.absoluteFill}
    >
      <Rect
        x={inset}
        y={inset}
        width={w}
        height={h}
        rx={r}
        ry={r}
        fill="none"
        stroke={trackColor}
        strokeWidth={MS_STROKE}
      />
      {filled > 0 && (
        <Rect
          x={inset}
          y={inset}
          width={w}
          height={h}
          rx={r}
          ry={r}
          fill="none"
          stroke={fillColor}
          strokeWidth={MS_STROKE}
          strokeDasharray={`${filled} ${perimeter - filled}`}
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}

function MilestoneStrip({
  milestones,
  onPressMilestone,
}: {
  milestones: HomeView["milestones"];
  onPressMilestone: (milestone: HomeView["milestones"][number]) => void;
}) {
  const C = useColors();
  const { mode } = useTheme();
  if (milestones.length === 0) return null;

  const glassBg =
    mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)";
  const trackColor =
    mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(350)}>
      <Text style={[styles.sectionEyebrow, { color: C.textTertiary }]}>
        Counting down
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.milestoneScroll}
      >
        {(milestones as HomeView["milestones"]).map((m) => (
          <Pressable
            key={m.id}
            accessibilityRole="button"
            onPress={() => onPressMilestone(m)}
            style={({ pressed }) => [
              styles.milestoneCard,
              {
                backgroundColor: glassBg,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <MilestoneProgressBorder
              daysUntil={m.daysUntil}
              trackColor={trackColor}
              fillColor={C.primary}
            />
            <Text style={[styles.milestoneDays, { color: C.primary }]}>
              {m.daysUntil === 0 ? "Today" : `${m.daysUntil}d`}
            </Text>
            <Text
              style={[styles.milestoneTitle, { color: C.text }]}
              numberOfLines={1}
            >
              {m.title}
            </Text>
          </Pressable>
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

  const handleTimelineItemPress = useCallback(
    (item: HomeView["timeline"][number]) => {
      const route = routeForTimelineItem(item);
      if (!route) return;
      Haptics.selectionAsync();
      router.push(route as never);
    },
    [router],
  );

  const handleMilestonePress = useCallback(
    (milestone: HomeView["milestones"][number]) => {
      Haptics.selectionAsync();
      router.push(routeForMilestoneItem(milestone) as never);
    },
    [router],
  );

  const glassBorder =
    mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.10)";

  return (
    <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
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
          {/* ─── Header ─── */}
          <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerLeft}>
                <Text style={[styles.greeting, { color: C.textTertiary }]}>
                  {getGreeting()},
                </Text>
                <Text style={[styles.userName, { color: C.text }]}>
                  {profile?.displayName ?? "there"} {"\u{1F44B}"}
                </Text>
              </View>
              <View style={styles.avatarWrap}>
                <View pointerEvents="none" style={styles.ringsWrap}>
                  <View
                    style={[
                      styles.ring,
                      styles.ringL,
                      { borderColor: C.primary },
                    ]}
                  />
                  <View
                    style={[
                      styles.ring,
                      styles.ringR,
                      { borderColor: C.primary },
                    ]}
                  />
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
              <View
                style={[
                  styles.coupleTag,
                  { backgroundColor: C.primaryMuted, borderColor: C.border },
                ]}
              >
                <Feather name="heart" size={10} color={C.primary} />
                <Text style={[styles.coupleTagText, { color: C.text }]}>
                  {coupleName}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* ─── Timeline ─── */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <TimelineFeed
              isLoading={home.isLoading}
              timeline={home.timeline}
              onPressItem={handleTimelineItemPress}
            />
          </Animated.View>

          {/* ─── Daily Pulse ─── */}
          <DailyPulseCard />

          {/* ─── Milestones ─── */}
          <MilestoneStrip
            milestones={home.milestones}
            onPressMilestone={handleMilestonePress}
          />

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
            <SharedMemories
              memories={home.memories}
              isLoading={home.isLoading}
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
    ...Typography.body,
    fontSize: 15,
    color: undefined,
  },
  userName: {
    ...Typography.editorialLargeTitle,
    fontStyle: 'italic',
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
  },
  verseMark: {
    width: 3,
    borderRadius: 1.5,
  },
  verseBody: {
    flex: 1,
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  verseText: {
    ...Typography.editorial,
    fontSize: 18,
    lineHeight: 28,
  },
  verseFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  verseRef: {
    ...Typography.captionMedium,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  verseActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  verseActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  verseSheet: {
    padding: Spacing["2xl"],
    paddingBottom: 40,
    gap: Spacing.lg,
  },
  verseSheetText: {
    ...Typography.editorial,
    fontSize: 22,
    lineHeight: 34,
  },
  verseSheetRef: {
    ...Typography.captionMedium,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  verseSheetActions: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  verseSheetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  verseSheetBtnLabel: {
    ...Typography.captionMedium,
    fontSize: 14,
  },

  /* ── Daily pulse ── */
  pulseCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  pulseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pulseEyebrow: {
    ...Typography.overline,
    letterSpacing: 1.5,
  },
  pulseTimestamp: {
    ...Typography.captionMedium,
    fontSize: 12,
  },
  pulseStatusRow: {
    flexDirection: "row",
  },
  pulsePersonCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  pulseAvatarGroup: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  pulseAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseAvatarLetter: {
    fontSize: 14,
    fontWeight: "600",
  },
  pulseMoodBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseWaitingIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  pulseLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pulseStatusLabel: {
    ...Typography.captionMedium,
    fontSize: 13,
  },
  pulseNudge: {
    ...Typography.captionMedium,
    fontSize: 13,
  },
  pulseDivider: {
    height: StyleSheet.hairlineWidth,
  },
  pulseMoodRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  pulseMoodCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseHelper: {
    ...Typography.small,
    textAlign: "center",
    fontSize: 12,
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
    borderRadius: 12,
    overflow: "hidden",
  },
  memoryImageWrap: {
    height: 160,
    position: "relative",
  },
  memoryBgImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  memoryBgFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  memoryDateBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  memoryContent: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  memoryCardTitle: {
    ...Typography.captionMedium,
    fontSize: 16,
  },
  memoryCardDate: {
    ...Typography.small,
    fontSize: 11,
  },
  memoryCardBody: {
    maxHeight: 44,
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
    width: MS_CARD_W,
    height: MS_CARD_H,
    borderRadius: MS_RADIUS,
    padding: Spacing.lg,
    justifyContent: "center",
    gap: 4,
  },
  milestoneDays: {
    ...Typography.subheading,
    fontSize: 20,
  },
  milestoneTitle: {
    ...Typography.captionMedium,
    fontSize: 12,
  },
});
