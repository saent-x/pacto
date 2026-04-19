import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { useTheme } from '@/src/lib/theme';
import {
  DEMO_TIMETABLES,
  TEMPLATES,
  shareBadge,
  tmplByKey,
  type Timetable,
} from '@/src/lib/timetables-data';

export default function TimetablesHub() {
  const { C, F } = useTheme();
  const tables = DEMO_TIMETABLES;

  return (
    <Screen>
      {/* Rhythm of the week */}
      <View
        style={{
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 26,
          padding: 22,
          marginBottom: 18,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <View
          style={{
            position: 'absolute',
            right: 12,
            top: 14,
            flexDirection: 'row',
            gap: 4,
            opacity: 0.35,
          }}
        >
          {[0.3, 0.6, 0.4, 0.8, 0.5, 0.9, 0.6].map((h, i) => (
            <View
              key={i}
              style={{ width: 5, height: 44 * h, backgroundColor: C.gold, borderRadius: 3 }}
            />
          ))}
        </View>
        <Text
          style={{
            fontSize: 10,
            color: C.fog,
            fontFamily: F.bodyBold,
            letterSpacing: 1.4,
          }}
        >
          THIS WEEK
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 40,
              color: C.bone,
              letterSpacing: -1.2,
              lineHeight: 40,
            }}
          >
            56
          </Text>
          <Text style={{ fontSize: 12, color: C.mist, fontFamily: F.body }}>items scheduled</Text>
        </View>
        <View style={{ marginTop: 14, flexDirection: 'row', gap: 20 }}>
          {[
            { n: '4', l: 'TIMETABLES' },
            { n: '2', l: 'SHARED' },
            { n: '12h', l: 'TOGETHER' },
          ].map((s) => (
            <View key={s.l}>
              <Text
                style={{
                  fontFamily: F.displayBold,
                  fontSize: 18,
                  color: C.bone,
                  lineHeight: 18,
                }}
              >
                {s.n}
              </Text>
              <Text
                style={{
                  fontSize: 9,
                  color: C.fog,
                  fontFamily: F.bodyBold,
                  letterSpacing: 1,
                  marginTop: 3,
                }}
              >
                {s.l}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Your rhythms list */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          paddingHorizontal: 4,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            color: C.fog,
            fontFamily: F.bodyBold,
            letterSpacing: 1.4,
          }}
        >
          YOUR RHYTHMS · {tables.length}
        </Text>
        <Pressable
          onPress={() => router.push('/sheets/new-timetable' as any)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: C.goldSoft,
          }}
        >
          <Icon name="plus" size={12} color={C.gold} strokeWidth={2.5} />
          <Text
            style={{
              color: C.gold,
              fontSize: 11,
              fontFamily: F.bodyBold,
              letterSpacing: 0.6,
            }}
          >
            NEW
          </Text>
        </Pressable>
      </View>

      <View style={{ gap: 10 }}>
        {tables.map((t) => (
          <TimetableCard key={t.id} t={t} onPress={() => router.push(`/us/timetables/${t.id}` as any)} />
        ))}
      </View>

      {/* Templates horizontal strip */}
      <View style={{ marginTop: 28 }}>
        <Text
          style={{
            fontSize: 10,
            color: C.fog,
            fontFamily: F.bodyBold,
            letterSpacing: 1.4,
            marginBottom: 10,
            paddingHorizontal: 4,
          }}
        >
          START FROM A TEMPLATE
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 10, paddingRight: 12 }}>
            {TEMPLATES.slice(0, 5).map((t) => (
              <Pressable
                key={t.key}
                onPress={() => router.push('/sheets/new-timetable' as any)}
                style={{
                  width: 132,
                  backgroundColor: t.color,
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingTop: 16,
                  paddingBottom: 14,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: `${t.ink}22`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Icon name={t.icon} size={16} color={t.ink} strokeWidth={2.2} />
                </View>
                <Text
                  style={{
                    fontFamily: F.displayBold,
                    fontSize: 14,
                    color: t.ink,
                    letterSpacing: -0.2,
                    marginBottom: 3,
                  }}
                >
                  {t.label}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: t.ink,
                    opacity: 0.7,
                    fontFamily: F.body,
                    lineHeight: 14,
                  }}
                >
                  {t.sample}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

function TimetableCard({ t, onPress }: { t: Timetable; onPress: () => void }) {
  const { C, F } = useTheme();
  const tmpl = tmplByKey(t.template);
  const badge = shareBadge(t.share);
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 20,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: tmpl.color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={tmpl.icon} size={22} color={tmpl.ink} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              backgroundColor: badge.bg,
            }}
          >
            <Text
              style={{
                color: badge.color,
                fontSize: 8.5,
                fontFamily: F.bodyBold,
                letterSpacing: 1,
              }}
            >
              {badge.label}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 9,
              color: C.ash,
              fontFamily: F.bodyBold,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
            }}
          >
            {t.updated}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: F.displayBold,
            fontSize: 15,
            color: C.bone,
            letterSpacing: -0.2,
          }}
        >
          {t.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <Icon name="clock" size={11} color={C.fog} />
          <Text numberOfLines={1} style={{ fontSize: 11, color: C.mist, fontFamily: F.body }}>
            {t.next}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ fontFamily: F.displayBold, fontSize: 18, color: C.gold, lineHeight: 18 }}>
          {t.items}
        </Text>
        <Icon name="chevronRight" size={14} color={C.fog} />
      </View>
    </Pressable>
  );
}
