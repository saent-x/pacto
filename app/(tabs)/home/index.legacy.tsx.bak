import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  Avatar,
  BlockCard,
  DarkCard,
  Display,
  IconTile,
  Overline,
  Pill,
  SectionHeader,
  AnimatedTripleRing,
} from "@/src/components/ui/atoms";
import { Icon, IconName } from "@/src/components/ui/Icon";
import { Screen } from "@/src/components/ui/Screen";
import {
  DarkCardSkeleton,
  HeroSkeleton,
  TimelineItemSkeleton,
} from "@/src/components/ui/skeletons/HomeSkeletons";
import { useCheckIns, getLocalDateKey } from "@/src/hooks/useCheckIns";
import { useHomeTimeline } from "@/src/hooks/useHomeTimeline";
import { useSession } from "@/src/hooks/useSession";
import { routeForTimelineItem } from "@/src/lib/homeNavigation";
import type { TimelineItem } from "@/src/lib/home/types";
import { useTheme } from "@/src/lib/theme";
import { toLocalDateKey } from "@/src/lib/togetherDateFilter";

type Mood = "great" | "good" | "okay" | "low" | "rough";
const MOOD_KEYS: Mood[] = ["great", "good", "okay", "low", "rough"];
const isMood = (s: string | null | undefined): s is Mood =>
  !!s && (MOOD_KEYS as string[]).includes(s);

const DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTH_SHORT = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];
const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function timeLabel(occursAt: number | null): string {
  if (!occursAt) return "";
  const d = new Date(occursAt);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function iconForTimeline(type: TimelineItem["type"]): IconName {
  switch (type) {
    case "task":
      return "checkSquare";
    case "plan":
    case "event":
    case "ritual":
      return "compass";
    case "memory":
      return "star";
    case "reminder":
    default:
      return "bell";
  }
}

// solo-mode: partner mood pill hidden, TOGETHER ring relabelled TODAY, day-count suffix dropped
export default function HomeRoute() {
  const { C, F } = useTheme();
  const { activeCouple, isSolo, space } = useSession();
  const {
    timeline,
    todaySummary,
    dailyVerse,
    error: homeError,
    isLoading: homeLoading,
    refetch: refetchHome,
  } = useHomeTimeline({ previewDays: 1 });
  const {
    myTodayCheckIn,
    partnerTodayCheckIn,
    createOrUpdate,
    refetch: refetchCheckIns,
  } = useCheckIns();

  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  useEffect(() => {
    setSelectedMood(isMood(myTodayCheckIn?.mood) ? myTodayCheckIn!.mood as Mood : null);
  }, [myTodayCheckIn?.mood]);

  const todayDate = useMemo(() => new Date(), []);
  const [selectedDay, setSelectedDay] = useState(todayDate.getDate());

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const start = Date.now();
    try {
      await Promise.allSettled([refetchHome(), refetchCheckIns()]);
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 400)
        await new Promise((r) => setTimeout(r, 400 - elapsed));
      setRefreshing(false);
    }
  }, [refetchHome, refetchCheckIns]);

  const moods: { key: Mood; icon: IconName; color: string; bg: string }[] = [
    { key: "great", icon: "sun", color: C.mint, bg: "rgba(168,216,185,0.18)" },
    { key: "good", icon: "cloud", color: C.sky, bg: "rgba(159,196,220,0.18)" },
    {
      key: "okay",
      icon: "minus",
      color: C.butter,
      bg: "rgba(242,216,106,0.18)",
    },
    {
      key: "low",
      icon: "drizzle",
      color: C.rose,
      bg: "rgba(216,155,168,0.18)",
    },
    { key: "rough", icon: "zap", color: C.peach, bg: "rgba(244,166,140,0.18)" },
  ];
  const selectedMoodMeta = moods.find((m) => m.key === selectedMood);

  const handleMoodPress = useCallback(
    async (key: Mood) => {
      const next = selectedMood === key ? null : key;
      const previous = selectedMood;
      setSelectedMood(next);
      try {
        await createOrUpdate({
          mood: next,
          note: null,
          isPrivate: false,
        });
      } catch (err) {
        console.warn("[home] mood save failed", err);
        setSelectedMood(previous);
      }
    },
    [selectedMood, createOrUpdate],
  );

  const week = useMemo(() => {
    const d = new Date(todayDate);
    const dayIdx = (d.getDay() + 6) % 7;
    const start = new Date(d);
    start.setDate(d.getDate() - dayIdx);
    return Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(start);
      dd.setDate(start.getDate() + i);
      return {
        n: DAY_NAMES[i],
        d: dd.getDate(),
        isToday: dd.toDateString() === todayDate.toDateString(),
      };
    });
  }, [todayDate]);

  const myMoodSet = !!myTodayCheckIn?.mood;
  const partnerMoodSet = !!partnerTodayCheckIn?.mood;
  const rings = useMemo(() => {
    const together = isSolo
      ? myMoodSet
        ? 1
        : 0
      : ((myMoodSet ? 1 : 0) + (partnerMoodSet ? 1 : 0)) / 2;
    const plans = todaySummary?.plans.total
      ? todaySummary.plans.done / todaySummary.plans.total
      : 0;
    const focus = todaySummary?.focus.total
      ? todaySummary.focus.done / todaySummary.focus.total
      : 0;
    return { together, plans, focus };
  }, [isSolo, myMoodSet, partnerMoodSet, todaySummary]);

  const ringAvg = (rings.together + rings.plans + rings.focus) / 3;
  const ringPct = Math.round(ringAvg * 100);
  const isRingsEmpty =
    rings.together === 0 && rings.plans === 0 && rings.focus === 0;
  const ringTitle = isRingsEmpty
    ? "START STRONG"
    : ringAvg < 0.5
      ? "KEEP GOING"
      : "CRUSH IT";

  const todayKey = getLocalDateKey();
  const timelineToday = useMemo(
    () =>
      timeline.filter((item) => {
        if (item.occursAt === null) return false;
        return toLocalDateKey(item.occursAt) === todayKey;
      }),
    [timeline, todayKey],
  );

  const timelineColor = useCallback(
    (t: TimelineItem["type"]) => {
      switch (t) {
        case "reminder":
          return C.lavender;
        case "plan":
        case "event":
        case "ritual":
          return C.peach;
        case "task":
          return C.mint;
        case "memory":
        default:
          return C.gold;
      }
    },
    [C.lavender, C.peach, C.mint, C.gold],
  );

  const dayCount = useMemo(() => {
    const anchorRaw = space?.anniversary ?? null;
    if (!anchorRaw) return null;
    const anchor = Date.parse(anchorRaw);
    if (Number.isNaN(anchor)) return null;
    const diff = Math.floor((Date.now() - anchor) / 86400000);
    return diff > 0 ? diff : null;
  }, [space?.anniversary]);

  const partnerName = activeCouple?.partner?.displayName ?? null;
  const partnerInitial = partnerName?.[0]?.toUpperCase() ?? "P";
  const partnerMoodText = useMemo(() => {
    if (isSolo) return null;
    if (!partnerName) return null;
    if (partnerTodayCheckIn?.mood) {
      return `${partnerName} · ${partnerTodayCheckIn.mood}`;
    }
    return `${partnerName} · not yet`;
  }, [isSolo, partnerName, partnerTodayCheckIn?.mood]);

  const explore: {
    icon: IconName;
    label: string;
    color: string;
    route: string;
  }[] = [
    { icon: "star", label: "Wishlists", color: C.wish, route: "/us/wishlists" },
    { icon: "compass", label: "Plans", color: C.plans, route: "/us/plans" },
    { icon: "clipboard", label: "Us", color: C.sky, route: "/us" },
    {
      icon: "creditCard",
      label: "Expenses",
      color: C.rose,
      route: "/us/expenses",
    },
    {
      icon: "flag",
      label: "Milestones",
      color: C.journal,
      route: "/us/milestones",
    },
  ];

  const showSkeletons =
    homeLoading &&
    timelineToday.length === 0 &&
    !myTodayCheckIn &&
    !partnerTodayCheckIn;

  const dateLine = (() => {
    const dow = DAY_NAMES[(todayDate.getDay() + 6) % 7];
    const day = todayDate.getDate();
    const mon = MONTH_SHORT[todayDate.getMonth()];
    const prefix = `${dow} · ${day} ${mon}`;
    if (!dayCount) return prefix;
    return isSolo ? `${prefix} · DAY ${dayCount}` : `${prefix} · DAY ${dayCount} TOGETHER`;
  })();

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      {homeError ? (
        <Animated.View entering={FadeInDown.duration(240)}>
          <Pressable onPress={onRefresh}>
            <BlockCard
              bg={C.rose}
              ink={C.ink}
              style={{ marginBottom: 14, padding: 14 }}
            >
              <Overline color="rgba(0,0,0,0.6)">Couldn't load home</Overline>
              <Text
                style={{ color: C.ink, fontFamily: F.body, marginTop: 4 }}
                testID="home-error-retry"
              >
                Tap to retry
              </Text>
            </BlockCard>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* Date pill */}
      <Animated.View
        entering={FadeInDown.delay(0).duration(420).springify().damping(18)}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 6,
            marginBottom: 18,
            alignSelf: "center",
          }}
        >
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: C.mint,
            }}
          />
          <Text
            testID="home-date-pill"
            style={{
              fontSize: 10,
              fontFamily: F.bodyBold,
              letterSpacing: 1.2,
              color: C.mist,
              textTransform: "uppercase",
            }}
          >
            {dateLine}
          </Text>
        </View>
      </Animated.View>

      {/* HERO — Today's Rings */}
      {showSkeletons ? (
        <HeroSkeleton />
      ) : (
        <Animated.View
          entering={FadeInDown.delay(80).duration(420).springify().damping(18)}
        >
          <BlockCard
            testID="home-hero"
            bg={C.peach}
            ink={C.peachInk}
            onPress={() => router.push("/sheets/rings-history" as any)}
            style={{ marginBottom: 14, padding: 22 }}
          >
            <Overline color="rgba(58,31,20,0.65)">Today's rings</Overline>
            <View
              style={{
                flexDirection: "row",
                gap: 16,
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <View>
                <AnimatedTripleRing
                  size={150}
                  stroke={12}
                  gap={3}
                  values={[rings.together, rings.plans, rings.focus]}
                  colors={[C.peachInk, C.gold, C.lavender]}
                  bg="rgba(58,31,20,0.15)"
                  delay={200}
                  duration={900}
                />
                <View
                  style={{
                    position: "absolute",
                    width: 150,
                    height: 150,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    testID="home-ring-pct"
                    style={{
                      fontFamily: F.displayBold,
                      fontSize: 26,
                      color: C.peachInk,
                    }}
                  >
                    {ringPct}
                    <Text style={{ fontSize: 16 }}>%</Text>
                  </Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Display size={28} color={C.peachInk}>
                  {ringTitle}
                </Display>
                <View style={{ marginTop: 12, gap: 8 }}>
                  {[
                    {
                      lbl: isSolo ? "TODAY" : "TOGETHER",
                      v: isSolo
                        ? myMoodSet
                          ? "1/1"
                          : "0/1"
                        : `${(myMoodSet ? 1 : 0) + (partnerMoodSet ? 1 : 0)}/2`,
                      dot: C.peachInk,
                    },
                    {
                      lbl: "PLANS",
                      v: todaySummary
                        ? `${todaySummary.plans.done}/${todaySummary.plans.total}`
                        : "0/0",
                      dot: C.gold,
                    },
                    {
                      lbl: "FOCUS",
                      v: todaySummary
                        ? `${todaySummary.focus.done}/${todaySummary.focus.total}`
                        : "0/0",
                      dot: C.lavender,
                    },
                  ].map((r) => (
                    <View
                      key={r.lbl}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <View
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 4,
                          backgroundColor: r.dot,
                        }}
                      />
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 11,
                          fontFamily: F.bodyBold,
                          letterSpacing: 0.6,
                          color: "rgba(58,31,20,0.85)",
                        }}
                      >
                        {r.lbl}
                      </Text>
                      <Text
                        style={{
                          fontFamily: F.displayBold,
                          fontSize: 12,
                          color: C.peachInk,
                        }}
                      >
                        {r.v}
                      </Text>
                    </View>
                  ))}
                </View>
                {isRingsEmpty ? (
                  <Text
                    testID="home-rings-empty"
                    style={{
                      marginTop: 10,
                      fontSize: 11,
                      color: "rgba(58,31,20,0.75)",
                      fontFamily: F.body,
                    }}
                  >
                    No activity yet today
                  </Text>
                ) : null}
              </View>
            </View>
          </BlockCard>
        </Animated.View>
      )}

      {/* Mood row */}
      {showSkeletons ? (
        <DarkCardSkeleton height={132} />
      ) : (
        <Animated.View
          entering={FadeInDown.delay(140).duration(420).springify().damping(18)}
        >
          <DarkCard style={{ marginBottom: 14, padding: 16 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Overline>How are you today?</Overline>
              {partnerMoodText ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Avatar
                    letter={partnerInitial}
                    size={18}
                    bg={C.lavender}
                    color={C.lavenderInk}
                  />
                  <Text
                    style={{
                      fontSize: 10,
                      color: C.mist,
                      letterSpacing: 0.6,
                      fontFamily: F.bodyBold,
                      textTransform: "uppercase",
                    }}
                  >
                    {partnerMoodText}
                  </Text>
                </View>
              ) : null}
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 6,
              }}
            >
              {moods.map((m) => {
                const sel = selectedMood === m.key;
                return (
                  <Pressable
                    key={m.key}
                    testID={`home-mood-${m.key}`}
                    onPress={() => handleMoodPress(m.key)}
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      backgroundColor: sel ? m.bg : "transparent",
                      borderWidth: sel ? 0 : 1,
                      borderColor: C.line,
                      alignItems: "center",
                      justifyContent: "center",
                      transform: [{ scale: sel ? 1.05 : 1 }],
                    }}
                  >
                    <Icon
                      name={m.icon}
                      size={18}
                      color={sel ? m.color : C.fog}
                    />
                  </Pressable>
                );
              })}
            </View>
            {selectedMoodMeta ? (
              <View
                style={{
                  marginTop: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: selectedMoodMeta.bg,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Icon
                  name={selectedMoodMeta.icon}
                  size={14}
                  color={selectedMoodMeta.color}
                />
                <Text style={{ fontSize: 12, color: C.bone }}>
                  Logged —{" "}
                  <Text
                    style={{
                      color: selectedMoodMeta.color,
                      fontFamily: F.bodyBold,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {selectedMoodMeta.key}
                  </Text>
                </Text>
              </View>
            ) : null}
          </DarkCard>
        </Animated.View>
      )}

      {/* Week calendar */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(420).springify().damping(18)}
      >
        <DarkCard style={{ marginBottom: 14, padding: 14 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
              paddingHorizontal: 4,
            }}
          >
            <Text
              style={{ fontFamily: F.display, fontSize: 15, color: C.bone }}
            >
              {MONTH_LONG[todayDate.getMonth()]} {todayDate.getFullYear()}
            </Text>
            <Pill size="sm" active bg={C.goldSoft} color={C.gold}>
              TODAY
            </Pill>
          </View>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {week.map((d) => {
              const sel = selectedDay === d.d;
              return (
                <Pressable
                  key={`${d.n}-${d.d}`}
                  testID={`home-day-${d.d}`}
                  onPress={() => setSelectedDay(d.d)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: sel ? C.gold : "transparent",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontFamily: F.bodyBold,
                      letterSpacing: 1,
                      color: sel ? C.peachInk : C.fog,
                    }}
                  >
                    {d.n}
                  </Text>
                  <Text
                    style={{
                      fontFamily: F.displayBold,
                      fontSize: 18,
                      color: sel ? C.peachInk : d.isToday ? C.gold : C.bone,
                    }}
                  >
                    {d.d}
                  </Text>
                  {d.isToday && !sel ? (
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: C.gold,
                      }}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </DarkCard>
      </Animated.View>

      {/* Verse card */}
      <Animated.View
        entering={FadeInDown.delay(260).duration(420).springify().damping(18)}
      >
        <DarkCard
          style={{
            marginBottom: 14,
            padding: 16,
            flexDirection: "row",
            gap: 14,
          }}
        >
          <View
            style={{ width: 2, backgroundColor: C.gold, borderRadius: 1 }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: F.serif,
                fontStyle: "italic",
                fontSize: 14,
                lineHeight: 21,
                color: C.bone,
              }}
            >
              "{dailyVerse.text}"
            </Text>
            <Text
              style={{
                marginTop: 8,
                fontSize: 11,
                color: C.gold,
                fontFamily: F.bodyBold,
                letterSpacing: 0.6,
              }}
            >
              {dailyVerse.reference}
            </Text>
          </View>
        </DarkCard>
      </Animated.View>

      {/* Timeline */}
      <Animated.View
        entering={FadeInDown.delay(320).duration(420).springify().damping(18)}
      >
        <SectionHeader
          label={`Today · ${timelineToday.length} ${timelineToday.length === 1 ? "item" : "items"}`}
        />
      </Animated.View>
      {showSkeletons ? (
        <View>
          {[0, 1, 2, 3].map((i) => (
            <TimelineItemSkeleton key={i} />
          ))}
        </View>
      ) : timelineToday.length === 0 ? (
        <Animated.View
          entering={FadeInDown.delay(360).duration(420).springify().damping(18)}
        >
          <Pressable
            testID="home-timeline-empty"
            onPress={() => router.push("/sheets/new-plan" as any)}
          >
            <DarkCard style={{ padding: 16, marginBottom: 14 }}>
              <Text
                style={{ color: C.bone, fontFamily: F.body, fontSize: 14 }}
              >
                Nothing scheduled today
              </Text>
              <Text
                style={{
                  marginTop: 6,
                  color: C.gold,
                  fontFamily: F.bodyBold,
                  fontSize: 12,
                  letterSpacing: 0.4,
                }}
              >
                + Add a plan
              </Text>
            </DarkCard>
          </Pressable>
        </Animated.View>
      ) : (
        <View style={{ position: "relative", paddingLeft: 20 }}>
          <View
            style={{
              position: "absolute",
              left: 7,
              top: 10,
              bottom: 10,
              width: 1.5,
              backgroundColor: C.line,
            }}
          />
          {timelineToday.map((item, i) => {
            const color = timelineColor(item.type);
            const done = false;
            const route = routeForTimelineItem(item);
            return (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(360 + i * 40)
                  .duration(380)
                  .springify()
                  .damping(18)}
              >
                <Pressable
                  testID={`home-timeline-${item.type}-${item.sourceId}`}
                  onPress={() => {
                    if (route) router.push(route as any);
                  }}
                  style={{
                    flexDirection: "row",
                    gap: 14,
                    paddingVertical: 10,
                  }}
                >
                  <View
                    style={{
                      position: "absolute",
                      left: -20,
                      top: 14,
                      width: 15,
                      height: 15,
                      borderRadius: 8,
                      backgroundColor: done ? C.success : color,
                      borderWidth: 3,
                      borderColor: C.ink,
                    }}
                  />
                  <View
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 10,
                          color: C.fog,
                          fontFamily: F.bodyBold,
                          letterSpacing: 1,
                        }}
                      >
                        {timeLabel(item.occursAt)}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: C.bone,
                          marginTop: 2,
                        }}
                      >
                        {item.title}
                      </Text>
                    </View>
                    <IconTile
                      icon={iconForTimeline(item.type)}
                      bg={`${color}26`}
                      color={color}
                      size={30}
                      iconSize={14}
                    />
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      )}

      {/* Explore together */}
      <Animated.View
        entering={FadeInDown.delay(480).duration(420).springify().damping(18)}
        style={{ marginTop: 18 }}
      >
        <SectionHeader label="Explore together" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {explore.map((p, i) => (
            <Animated.View
              key={p.label}
              entering={FadeInDown.delay(500 + i * 30)
                .duration(380)
                .springify()
                .damping(18)}
            >
              <Pressable
                testID={`home-explore-${p.label.toLowerCase()}`}
                onPress={() => router.push(p.route as any)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: `${p.color}1f`,
                  borderWidth: 1,
                  borderColor: `${p.color}33`,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <Icon name={p.icon} size={12} color={p.color} />
                <Text
                  style={{
                    color: p.color,
                    fontFamily: F.bodyBold,
                    fontSize: 12,
                    letterSpacing: 0.3,
                  }}
                >
                  {p.label}
                </Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </Animated.View>

    </Screen>
  );
}
