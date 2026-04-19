import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Avatar,
  Badge,
  BlockCard,
  DarkCard,
  Display,
  IconTile,
  Overline,
  Pill,
  SectionHeader,
  TripleRing,
} from "@/src/components/ui/atoms";
import { Icon, IconName } from "@/src/components/ui/Icon";
import { Screen } from "@/src/components/ui/Screen";
import { useTheme } from "@/src/lib/theme";

type Mood = "great" | "good" | "okay" | "low" | "rough";

export default function HomeRoute() {
  const { C, F } = useTheme();
  const [mood, setMood] = useState<Mood | null>("good");
  const [selectedDay, setSelectedDay] = useState(17);
  const partnerMood = "Sofia · great";

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
  const selectedMood = moods.find((m) => m.key === mood);

  const week = [
    { n: "MON", d: 14 },
    { n: "TUE", d: 15 },
    { n: "WED", d: 16 },
    { n: "THU", d: 17, isToday: true },
    { n: "FRI", d: 18 },
    { n: "SAT", d: 19 },
    { n: "SUN", d: 20 },
  ];

  const timeline: {
    time: string;
    title: string;
    type: "reminder" | "plan" | "task";
    done?: boolean;
    color: string;
  }[] = [
    {
      time: "09:30",
      title: "Morning coffee together",
      type: "reminder",
      done: true,
      color: C.lavender,
    },
    {
      time: "12:00",
      title: "Lunch with Sofia's parents",
      type: "plan",
      color: C.peach,
    },
    { time: "18:00", title: "Pick up groceries", type: "task", color: C.mint },
    {
      time: "21:00",
      title: "Anniversary planning",
      type: "plan",
      color: C.gold,
    },
  ];

  const explore: { icon: IconName; label: string; color: string }[] = [
    { icon: "star", label: "Wishlists", color: C.wish },
    { icon: "compass", label: "Plans", color: C.plans },
    { icon: "clipboard", label: "Checklists", color: C.sky },
    { icon: "creditCard", label: "Expenses", color: C.rose },
    { icon: "flag", label: "Milestones", color: C.journal },
  ];

  return (
    <Screen>

      {/* Date pill */}
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
          style={{
            fontSize: 10,
            fontFamily: F.bodyBold,
            letterSpacing: 1.2,
            color: C.mist,
            textTransform: "uppercase",
          }}
        >
          THU · 17 APR · DAY 847 TOGETHER
        </Text>
      </View>

      {/* HERO — Today's Rings */}
      <BlockCard
        bg={C.peach}
        ink={C.peachInk}
        onPress={() => router.push("/sheets/rings-history" as any)}
        style={{ marginBottom: 14, padding: 22 }}
      >
        <View style={{ position: "absolute", top: 12, right: 12, zIndex: 1 }}>
          <Badge bg="rgba(58,31,20,0.15)" color={C.peachInk}>
            +12% WK
          </Badge>
        </View>
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
            <TripleRing
              size={150}
              stroke={12}
              gap={3}
              values={[0.82, 0.68, 0.95]}
              colors={[C.peachInk, C.gold, C.lavender]}
              bg="rgba(58,31,20,0.15)"
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
                style={{
                  fontFamily: F.displayBold,
                  fontSize: 26,
                  color: C.peachInk,
                }}
              >
                82<Text style={{ fontSize: 16 }}>%</Text>
              </Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Display size={28} color={C.peachInk}>
              CRUSH IT
            </Display>
            <View style={{ marginTop: 12, gap: 8 }}>
              {[
                { lbl: "CONNECT", v: "3/4", dot: C.peachInk },
                { lbl: "SHARED", v: "7/10", dot: C.gold },
                { lbl: "PRESENT", v: "9/9", dot: C.lavender },
              ].map((r) => (
                <View
                  key={r.lbl}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
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
          </View>
        </View>
      </BlockCard>

      {/* Mood row */}
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Avatar
              letter="S"
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
              {partnerMood}
            </Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 6,
          }}
        >
          {moods.map((m) => {
            const sel = mood === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => setMood(sel ? null : m.key)}
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
                <Icon name={m.icon} size={18} color={sel ? m.color : C.fog} />
              </Pressable>
            );
          })}
        </View>
        {selectedMood && (
          <View
            style={{
              marginTop: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: selectedMood.bg,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Icon
              name={selectedMood.icon}
              size={14}
              color={selectedMood.color}
            />
            <Text style={{ fontSize: 12, color: C.bone }}>
              Logged —{" "}
              <Text
                style={{
                  color: selectedMood.color,
                  fontFamily: F.bodyBold,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {selectedMood.key}
              </Text>
            </Text>
          </View>
        )}
      </DarkCard>

      {/* Week calendar */}
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
          <Text style={{ fontFamily: F.display, fontSize: 15, color: C.bone }}>
            April 2026
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
                key={d.d}
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
                {d.isToday && !sel && (
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: C.gold,
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </DarkCard>

      {/* Verse card */}
      <DarkCard
        style={{ marginBottom: 14, padding: 16, flexDirection: "row", gap: 14 }}
      >
        <View style={{ width: 2, backgroundColor: C.gold, borderRadius: 1 }} />
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
            "Do not be anxious about anything, but in every situation, by prayer
            and petition, present your requests to God."
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
            Philippians 4:6–7
          </Text>
        </View>
      </DarkCard>

      {/* Timeline */}
      <SectionHeader label={`Today · ${timeline.length} items`} />
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
        {timeline.map((item, i) => (
          <View
            key={i}
            style={{ flexDirection: "row", gap: 14, paddingVertical: 10 }}
          >
            <View
              style={{
                position: "absolute",
                left: -20,
                top: 14,
                width: 15,
                height: 15,
                borderRadius: 8,
                backgroundColor: item.done ? C.success : item.color,
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
                  {item.time}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: item.done ? C.fog : C.bone,
                    textDecorationLine: item.done ? "line-through" : "none",
                    marginTop: 2,
                  }}
                >
                  {item.title}
                </Text>
              </View>
              <IconTile
                icon={
                  item.type === "task"
                    ? "checkSquare"
                    : item.type === "plan"
                      ? "compass"
                      : "bell"
                }
                bg={`${item.color}26`}
                color={item.color}
                size={30}
                iconSize={14}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Explore together */}
      <View style={{ marginTop: 18 }}>
        <SectionHeader label="Explore together" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {explore.map((p) => (
            <Pressable
              key={p.label}
              onPress={() => router.push("/us")}
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
          ))}
        </View>
      </View>
    </Screen>
  );
}
