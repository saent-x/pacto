import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { formatDistanceToNowStrict } from 'date-fns';
import { Icon } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import {
  RowActionMenu,
  type ActionMenuPayload,
} from '@/src/components/ui/RowActionMenu';
import { confirmDestructive } from '@/src/lib/confirm';
import { useSession } from '@/src/hooks/useSession';
import { useTimetables, type TimetableRow } from '@/src/hooks/useTimetables';
import { useTheme } from '@/src/lib/theme';
import { TEMPLATES, shareBadge, tmplByKey } from '@/src/lib/timetables-data';

// solo-mode: PARTNER'S + SHARED stat columns hidden — neither applies without a partner
export default function TimetablesHub() {
  const { C, F } = useTheme();
  const { isSolo } = useSession();
  const { timetables, isLoading, remove } = useTimetables();

  const buildTimetableMenu = useCallback(
    (t: TimetableRow): ActionMenuPayload => ({
      title: t.title,
      subtitle: t.template,
      actions: [
        {
          key: 'edit',
          label: 'Edit',
          icon: 'edit',
          onPress: () => router.push(`/sheets/new-timetable?id=${t.id}` as any),
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: 'trash',
          destructive: true,
          onPress: () => {
            confirmDestructive(
              'Delete timetable?',
              `"${t.title}" and all its items will be removed.`,
              () => remove(t.id),
            );
          },
        },
      ],
    }),
    [remove],
  );

  const stats = useMemo(() => {
    const itemsScheduled = timetables.reduce((s, t) => s + t.itemsCount, 0);
    const shared = timetables.filter((t) => t.share === 'shared').length;
    const partner = timetables.filter((t) => t.share === 'partner').length;
    return { itemsScheduled, shared, partner };
  }, [timetables]);

  if (isLoading && timetables.length === 0) return <HubSkeleton />;

  if (timetables.length === 0) {
    return (
      <Screen>
        <Pressable
          onPress={() => router.push('/sheets/new-timetable' as any)}
          style={{
            marginTop: 8,
            padding: 24,
            borderRadius: 22,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: C.line,
            alignItems: 'center',
            gap: 8,
            marginBottom: 28,
          }}
        >
          <Icon name="grid" size={22} color={C.fog} />
          <Text style={{ fontFamily: F.displayBold, fontSize: 16, color: C.mist }}>
            No rhythms yet
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: C.fog,
              fontFamily: F.body,
              textAlign: 'center',
            }}
          >
            Build a weekly cadence — meals, workouts, morning rituals.
          </Text>
        </Pressable>
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
              <TemplateCard key={t.key} t={t} />
            ))}
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Animated.View
        entering={FadeInDown.duration(420)}
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
            {stats.itemsScheduled}
          </Text>
          <Text style={{ fontSize: 12, color: C.mist, fontFamily: F.body }}>
            item{stats.itemsScheduled === 1 ? '' : 's'} scheduled
          </Text>
        </View>
        <View style={{ marginTop: 14, flexDirection: 'row', gap: 20 }}>
          {(isSolo
            ? [{ n: String(timetables.length), l: 'TIMETABLES' }]
            : [
                { n: String(timetables.length), l: 'TIMETABLES' },
                { n: String(stats.shared), l: 'SHARED' },
                { n: String(stats.partner), l: "PARTNER'S" },
              ]
          ).map((s) => (
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
      </Animated.View>

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
          YOUR RHYTHMS · {timetables.length}
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
        {timetables.map((t, i) => (
          <Animated.View
            key={t.id}
            entering={FadeInDown.delay(Math.min(i, 10) * 60 + 80).duration(400)}
          >
            <RowActionMenu {...buildTimetableMenu(t)}>
              <TimetableCard
                t={t}
                onPress={() => router.push(`/us/timetables/${t.id}` as any)}
              />
            </RowActionMenu>
          </Animated.View>
        ))}
      </View>

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
              <TemplateCard key={t.key} t={t} />
            ))}
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

function TimetableCard({
  t,
  onPress,
}: {
  t: TimetableRow;
  onPress: () => void;
}) {
  const { C, F } = useTheme();
  const tmpl = tmplByKey(t.template);
  const badge = shareBadge(t.share);
  const updatedLabel = t.updatedAt
    ? `${formatDistanceToNowStrict(new Date(t.updatedAt))} ago`
    : '';
  return (
    <Pressable
      testID={`timetable-row-${t.id}`}
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
          {updatedLabel ? (
            <Text
              style={{
                fontSize: 9,
                color: C.ash,
                fontFamily: F.bodyBold,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
              }}
            >
              {updatedLabel}
            </Text>
          ) : null}
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
            {t.itemsCount} item{t.itemsCount === 1 ? '' : 's'}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ fontFamily: F.displayBold, fontSize: 18, color: C.gold, lineHeight: 18 }}>
          {t.itemsCount}
        </Text>
        <Icon name="chevronRight" size={14} color={C.fog} />
      </View>
    </Pressable>
  );
}

function TemplateCard({ t }: { t: (typeof TEMPLATES)[number] }) {
  const { F } = useTheme();
  return (
    <Pressable
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
  );
}

function HubSkeleton() {
  const { C } = useTheme();
  return (
    <Screen>
      <Animated.View
        entering={FadeIn.duration(300)}
        style={{
          height: 168,
          borderRadius: 26,
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.line,
          opacity: 0.55,
          marginBottom: 22,
        }}
      />
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          entering={FadeIn.delay(60 + i * 60).duration(300)}
          style={{
            height: 72,
            borderRadius: 20,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            opacity: 0.55,
            marginBottom: 10,
          }}
        />
      ))}
    </Screen>
  );
}
