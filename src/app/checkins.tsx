import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { useColors } from '@/theme';
import {
  QScreen,
  SubBar,
  QSection,
  Mono,
  Numeral,
  Serif,
  T,
  Kick,
  Div,
  Press,
  RoundBtn,
  MoodGlyph,
  CollapsibleList,
} from '@/ui';
import { useSpace } from '@/features/account/SpaceProvider';
import { MemberAvatar } from '@/features/account/avatars';
import { moodById, moodColor } from '@/constants/moods';
import { fmtTime, startOfToday } from '@/lib/datetime';
import { QCornerMotif, QEmptyArt } from '@/art/motifs';

const DAY_MS = 86_400_000;
const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function Checkins() {
  const C = useColors();
  const router = useRouter();
  const { user, space, spaceId, members, isShared } = useSpace();

  const skip = spaceId ? { spaceId } : 'skip';
  // Raise the default 100-row cap so weekly stats and history stay complete.
  const checkins = useQuery(api.checkins.listCheckins, spaceId ? { spaceId, limit: 1000 } : 'skip');
  const pulse = useQuery(api.checkins.latestByMember, skip);

  const rows = checkins ?? [];

  const moodByUser = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of pulse ?? []) m.set(p.userId, p.mood);
    return m;
  }, [pulse]);

  const memberById = useMemo(
    () => new Map(members.map((mem) => [mem.userId, mem])),
    [members],
  );

  // This week's mood strip for the current user (Mon→Sun), latest check-in per day.
  const week = useMemo(() => {
    const todayMs = startOfToday();
    const dow = (new Date(todayMs).getDay() + 6) % 7; // 0 = Monday
    const monday = todayMs - dow * DAY_MS;
    const mine = (checkins ?? []).filter((c) => c.createdBy === user?.id);
    return WEEK_LABELS.map((label, i) => {
      const dayStart = monday + i * DAY_MS;
      const dayEnd = dayStart + DAY_MS;
      const onDay = mine.filter((c) => c._creationTime >= dayStart && c._creationTime < dayEnd);
      const mood = onDay.length ? onDay[0].mood : null; // listCheckins is newest-first
      return { label, mood, today: dayStart === todayMs, future: dayStart > todayMs };
    });
  }, [checkins, user]);

  const loggedDays = week.filter((d) => d.mood).length;
  const elapsedDays = week.filter((d) => !d.future).length;

  // History grouped by recency: Today · Yesterday · This week · Earlier.
  // Recent buckets keep time-of-day; older ones show the date instead.
  const history = useMemo(() => {
    const src = checkins ?? [];
    const today = startOfToday();
    const yesterday = today - DAY_MS;
    const dow = (new Date(today).getDay() + 6) % 7;
    const weekStart = today - dow * DAY_MS;
    const buckets: { label: string; dated: boolean; rows: typeof src }[] = [
      { label: 'Today', dated: false, rows: [] },
      { label: 'Yesterday', dated: false, rows: [] },
      { label: 'This week', dated: true, rows: [] },
      { label: 'Earlier', dated: true, rows: [] },
    ];
    for (const c of src) {
      const t = c._creationTime;
      if (t >= today) buckets[0].rows.push(c);
      else if (t >= yesterday) buckets[1].rows.push(c);
      else if (t >= weekStart) buckets[2].rows.push(c);
      else buckets[3].rows.push(c);
    }
    return buckets.filter((b) => b.rows.length > 0);
  }, [checkins]);

  return (
    <QScreen
      loading={checkins === undefined || pulse === undefined}
      motif={<QCornerMotif size={230} top={30} right={-80} />}
      header={
        <SubBar
          kicker={isShared && space ? `Check-ins · ${space.name}` : 'Check-ins'}
          right={
            <RoundBtn
              name="plus"
              fill={C.ink}
              color={C.bg}
              onPress={() => router.push('/new/checkin')}
              accessibilityLabel="New check-in"
            />
          }
        />
      }
    >

      {/* Lead stat */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginBottom: 34 }}>
        <Numeral size={loggedDays > 99 ? 60 : loggedDays > 9 ? 78 : 92} lh={0.86}>
          {loggedDays}
        </Numeral>
        <View style={{ paddingBottom: 33 }}>
          <T size={17} weight={600} lh={1.25}>
            {`of ${elapsedDays} logged\nthis week`}
          </T>
        </View>
      </View>

      {/* This week strip */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 30 }}>
        {week.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              {d.mood ? (
                <MoodGlyph mood={d.mood} size={30} />
              ) : (
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 30,
                    borderWidth: 1.5,
                    borderStyle: d.today ? 'solid' : 'dashed',
                    borderColor: d.today ? C.accent : C.line,
                    opacity: d.future ? 0.6 : 1,
                  }}
                />
              )}
            </View>
            <Kick color={d.today ? C.accent : C.ink3}>{d.label}</Kick>
          </View>
        ))}
      </View>

      {/* Today's pulse (shared) */}
      {isShared && (
        <View style={{ marginBottom: 34 }}>
          <QSection label="Today's pulse" />
          {members.map((mem, i) => {
            const moodId = moodByUser.get(mem.userId);
            const mood = moodById(moodId);
            return (
              <View key={mem.userId}>
                {i > 0 && <Div style={{ backgroundColor: C.hair }} />}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }}>
                  <MemberAvatar member={mem} size={28} />
                  <T size={16.5} weight={500} style={{ flex: 1 }} numberOfLines={1}>
                    {mem.isYou ? 'You' : mem.displayName}
                  </T>
                  {mood ? (
                    <>
                      <Kick color={C.ink2}>{mood.label}</Kick>
                      <MoodGlyph mood={mood.id} size={26} />
                    </>
                  ) : mem.isYou ? (
                    <Press
                      onPress={() => router.push('/new/checkin')}
                      haptic
                      hitSlop={{ top: 16, bottom: 16, left: 12, right: 12 }}
                    >
                      <Kick color={C.accent}>Check in →</Kick>
                    </Press>
                  ) : (
                    <Kick color={C.ink3}>—</Kick>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* History */}
      {rows.length === 0 ? (
        <>
          <QSection label="History" />
          <View style={{ paddingTop: 10, paddingBottom: 8, alignItems: 'center' }}>
            <QEmptyArt kind="calm" size={120} />
            <View style={{ marginTop: 14 }}>
              <Serif size={24} italic>
                How did today feel?
              </Serif>
            </View>
            <Press
              onPress={() => router.push('/new/checkin')}
              haptic
              hitSlop={10}
              accessibilityLabel="Check in"
              style={{ marginTop: 12 }}
            >
              <Kick color={C.accent}>Check in →</Kick>
            </Press>
          </View>
        </>
      ) : (
        history.map((sec) => (
          <View key={sec.label} style={{ marginBottom: 14 }}>
            <QSection label={sec.label} style={{ marginBottom: 8 }} />
            <CollapsibleList items={sec.rows} limit={5}>{(c, i) => {
              const mood = moodById(c.mood);
              const owner = memberById.get(c.createdBy);
              return (
                <View key={c._id}>
                  {i > 0 && <Div style={{ backgroundColor: C.hair }} />}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }}>
                    {isShared && owner ? (
                      <MemberAvatar member={owner} size={28} />
                    ) : (
                      <View style={{ width: 28, height: 28, borderRadius: 28, backgroundColor: moodColor(c.mood) }} />
                    )}
                    <T size={16.5} weight={500} style={{ flex: 1, minWidth: 0 }} numberOfLines={1}>
                      {mood?.label ?? c.mood}
                    </T>
                    {isShared && (
                      <View style={{ width: 20, height: 20, borderRadius: 20, backgroundColor: moodColor(c.mood) }} />
                    )}
                    <Mono size={16} weight={500} color={C.ink3}>
                      {sec.dated
                        ? new Date(c._creationTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : fmtTime(c._creationTime)}
                    </Mono>
                  </View>
                </View>
              );
            }}</CollapsibleList>
          </View>
        ))
      )}

    </QScreen>
  );
}
