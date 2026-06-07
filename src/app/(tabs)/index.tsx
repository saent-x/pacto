import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { Id } from '@cvx/_generated/dataModel';
import { useColors } from '@/theme';
import { FONTS } from '@/theme/tokens';
import { T, Kick, Chip, RoundBtn, Press, Div, Icon, MoodGlyph, Glass, Mono, Numeral, ActivityHeatmap, buildActivity } from '@/ui';
import { useSpace } from '@/features/account/SpaceProvider';
import { MemberAvatar, MemberStack } from '@/features/account/avatars';
import { displayNameForGreeting } from '@/features/account/displayName';
import { MOODS, moodById } from '@/constants/moods';
import { dateLabel, fmtTimeBare, isToday } from '@/lib/datetime';
import { usePullRefresh } from '@/lib/usePullRefresh';

type Row = {
  id: string;
  kind: 'reminder' | 'task' | 'event';
  title: string;
  ts: number;
  done: boolean;
  attr: Id<'users'> | null;
};

// Dynamic ?id= hrefs aren't statically verifiable by expo-router's typed routes.
const editRoute = (r: Row): any =>
  r.kind === 'task' ? `/new/task?id=${r.id}` : r.kind === 'reminder' ? `/new/reminder?id=${r.id}` : `/new/event?id=${r.id}`;

export default function Today() {
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, space, spaceId, members, isShared, you } = useSpace();

  const skip = spaceId ? { spaceId } : 'skip';
  const tasks = useQuery(api.tasks.listTasks, skip);
  const reminders = useQuery(api.reminders.listReminders, skip);
  // Stable window (lazy state so Date.now() doesn't re-subscribe each render): recent + next 30 days.
  const [win] = useState(() => {
    const now = Date.now();
    return { from: now - 12 * 3600_000, to: now + 30 * 86_400_000 };
  });
  const events = useQuery(api.calendar.listEvents, spaceId ? { spaceId, from: win.from, to: win.to } : 'skip');
  const pulse = useQuery(api.checkins.latestByMember, skip);
  const checkins = useQuery(api.checkins.listCheckins, skip);
  const createCheckin = useMutation(api.checkins.createCheckin);

  // Hold the screen on a spinner until every query the page reads has resolved,
  // so the hero count, mood row, agenda, and heatmap never flash partial data.
  const ready =
    tasks !== undefined &&
    reminders !== undefined &&
    events !== undefined &&
    pulse !== undefined &&
    checkins !== undefined;
  const { refreshing, onRefresh } = usePullRefresh();
  const greetingName = displayNameForGreeting(user?.displayName, user?.email);
  const selfDisplayName = greetingName === 'you' ? 'You' : greetingName;
  const displayMembers = useMemo(
    () => members.map((m) => (m.isYou ? { ...m, displayName: selfDisplayName } : m)),
    [members, selfDisplayName],
  );

  const memberById = useMemo(() => {
    const m = new Map<string, (typeof members)[number]>();
    for (const mem of displayMembers) m.set(mem.userId, mem);
    return m;
  }, [displayMembers]);

  // All open commitments (broad), sorted by time — surfaces everything, not just today-due.
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const r of reminders ?? [])
      out.push({ id: r._id, kind: 'reminder', title: r.title, ts: r.remindAt ?? Number.MAX_SAFE_INTEGER, done: r.done, attr: r.assigneeUserId ?? r.createdBy });
    for (const t of tasks ?? [])
      out.push({ id: t._id, kind: 'task', title: t.title, ts: t.dueAt ?? Number.MAX_SAFE_INTEGER, done: t.done, attr: t.assigneeUserId ?? t.createdBy });
    for (const e of events ?? [])
      out.push({ id: e._id, kind: 'event', title: e.title, ts: e.startsAt, done: false, attr: e.assigneeUserId ?? e.createdBy });
    return out.sort((a, b) => a.ts - b.ts);
  }, [reminders, tasks, events]);

  const open = rows.filter((r) => !r.done);

  const myMoodToday = useMemo(() => {
    const mine = (pulse ?? []).find((p) => p.userId === user?.id);
    return mine ? moodById(mine.mood) : undefined;
  }, [pulse, user]);

  // Activity heatmap — single-hue intensity from real "kept" signals over the
  // trailing 17 weeks (check-ins + done tasks/reminders + events).
  const activity = useMemo(() => {
    const ts: number[] = [];
    for (const c of checkins ?? []) ts.push(c._creationTime);
    for (const t of tasks ?? []) if (t.done) ts.push(t.dueAt ?? t._creationTime);
    for (const r of reminders ?? []) if (r.done) ts.push(r.remindAt ?? r._creationTime);
    for (const e of events ?? []) ts.push(e.startsAt);
    return buildActivity(ts);
  }, [checkins, tasks, reminders, events]);

  const AGENDA_LIMIT = 4;
  const [showAll, setShowAll] = useState(false);
  const agendaRows = showAll ? open : open.slice(0, AGENDA_LIMIT);
  const agendaCount = open.length;
  const agendaWord = agendaCount === 1 ? 'thing' : 'things';
  const agendaPlace = 'The day';
  const countSize = agendaCount > 99 ? 60 : agendaCount > 9 ? 78 : 92;

  // Collapsing header pill.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(scrollY.value, [0, 90], [1, 0.82], Extrapolation.CLAMP) }],
    opacity: interpolate(scrollY.value, [0, 120], [1, 0.92], Extrapolation.CLAMP),
  }));

  const scrollContent = (
    <Animated.ScrollView
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={C.accent}
          colors={[C.accent]}
          progressViewOffset={insets.top + 50}
        />
      }
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 70, paddingBottom: 112 }}
    >
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginTop: 0, marginBottom: 34 }}>
          <Numeral size={countSize} lh={0.86}>
            {agendaCount}
          </Numeral>
          <View style={{ paddingBottom: 33 }}>
            <T size={17} weight={600} lh={1.25}>
              {`${agendaWord} on\n${isShared ? 'the day' : 'your day'}`}
            </T>
          </View>
        </View>

        <View style={{ marginBottom: 38 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
            <T size={19} weight={600} lh={1.2} numberOfLines={1} style={{ flex: 1 }}>
              How&apos;s today?
            </T>
            <Kick color={myMoodToday ? C.accent : C.ink3}>
              {myMoodToday ? myMoodToday.label : 'Not yet'}
            </Kick>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            {MOODS.map((m) => {
              const on = myMoodToday?.id === m.id;
              return (
                <Press key={m.id} onPress={() => spaceId && createCheckin({ spaceId, mood: m.id })} style={{ flex: 1, alignItems: 'center', gap: 10 }} haptic>
                  <MoodGlyph mood={m.id} size={42} active={on} />
                  <Kick color={on ? C.ink : C.ink3} style={{ fontSize: 10, letterSpacing: 0.4 }}>
                    {m.label}
                  </Kick>
                </Press>
              );
            })}
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Kick>{agendaPlace}</Kick>
        </View>

        {agendaRows.length === 0 ? (
          <View style={{ paddingVertical: 20 }}>
            <T size={16.5} weight={500} lh={1.3} color={C.ink2}>
              Nothing open for the day.
            </T>
          </View>
        ) : (
          agendaRows.map((r, i) => {
            const m = r.attr ? memberById.get(r.attr) : null;
            const dated = r.ts !== Number.MAX_SAFE_INTEGER;
            const when = !dated
              ? '—'
              : isToday(r.ts)
                ? fmtTimeBare(r.ts)
                : new Date(r.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const showAvatar = dated && isShared && !!m;
            const typeLabel = { reminder: 'Reminder', task: 'Task', event: 'Event' }[r.kind];
            return (
              <View key={r.id}>
                {i > 0 && <Div style={{ backgroundColor: C.hair }} />}
                <Press onPress={() => router.push(editRoute(r))} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16 }} haptic>
                  <View style={{ width: 56, alignItems: 'flex-start' }}>
                    <Text
                      allowFontScaling={false}
                      numberOfLines={1}
                      style={{
                        fontFamily: FONTS.editorialSerif,
                        fontSize: 18,
                        lineHeight: 24,
                        letterSpacing: 0,
                        color: dated ? C.ink3 : C.accent,
                        includeFontPadding: false,
                      }}
                    >
                      {when}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T size={16.5} weight={500} lh={1.2} numberOfLines={2}>
                      {r.title}
                    </T>
                  </View>
                  <View style={{ minWidth: 48, alignItems: 'flex-end' }}>
                    {showAvatar ? (
                      <MemberAvatar member={m} size={26} />
                    ) : (
                      <Chip label={typeLabel} variant="outline" />
                    )}
                  </View>
                </Press>
              </View>
            );
          })
        )}
        {open.length > AGENDA_LIMIT && (
          <Press onPress={() => setShowAll((v) => !v)} haptic style={{ alignSelf: 'flex-start', paddingVertical: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {showAll ? (
                <T size={14} weight={600} color={C.accent}>
                  Show less
                </T>
              ) : (
                <>
                  <T size={14} weight={600} color={C.accent}>
                    Show
                  </T>
                  <Mono size={14} weight={600} color={C.accent}>
                    {open.length - AGENDA_LIMIT}
                  </Mono>
                  <T size={14} weight={600} color={C.accent}>
                    more
                  </T>
                </>
              )}
              <Icon name={showAll ? 'chevronUp' : 'chevronDown'} size={14} color={C.accent} strokeWidth={2.4} />
            </View>
          </Press>
        )}

        <ActivityHeatmap levels={activity.levels} weekStartMs={activity.weekStartMs} />
    </Animated.ScrollView>
  );

  // Fixed, transparent header: reminders (left) · glass pill (center) · profile (right).
  // Rendered in both states so the chrome stays put while the data loads.
  const floatingHeader = (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: insets.top + 8,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        <RoundBtn name="bell" onPress={() => router.push('/notifications')} />
      </View>

      <Animated.View style={pillStyle}>
        <Press onPress={() => router.push('/spaces')} haptic scale={0.92} style={{ borderRadius: 999 }}>
          <Glass
            interactive
            glassStyle="clear"
            fallbackStyle={{ backgroundColor: C.surface }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 12,
              height: 32,
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <Mono size={10.5} weight={600} color={C.ink3} ls={1.2}>
              {dateLabel()}
            </Mono>
            <Kick color={C.ink4}>·</Kick>
            <Kick color={C.accent}>{isShared && space ? space.name : 'Just me'}</Kick>
            <Icon name="chevronDown" size={11} color={C.accent} strokeWidth={2.2} />
          </Glass>
        </Press>
      </Animated.View>

      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Press onPress={() => router.push('/profile')} haptic scale={0.92} style={{ borderRadius: 999 }}>
          <Glass interactive fallbackStyle={{ backgroundColor: C.surface }} style={{ padding: 4, borderRadius: 999, overflow: 'hidden' }}>
            {isShared ? (
              <MemberStack members={displayMembers} size={32} max={3} />
            ) : (
              <MemberAvatar member={you ? { ...you, displayName: selfDisplayName } : { displayName: selfDisplayName, isYou: true }} size={38} />
            )}
          </Glass>
        </Press>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {ready ? (
        scrollContent
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} />
        </View>
      )}
      {floatingHeader}
    </View>
  );
}
