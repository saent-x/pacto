import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { Id } from '@cvx/_generated/dataModel';
import { useColors } from '@/theme';
import { QScreen, TopBar, QSection, Serif, T, Kick, Div, Icon, Pill, RoundBtn, Press, Mono, CollapsibleList } from '@/ui';
import { useSpace } from '@/features/account/SpaceProvider';
import { MemberAvatar } from '@/features/account/avatars';
import { fmtTimeBare, weekdayName } from '@/lib/datetime';
import { useToday } from '@/lib/useNow';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.getTime();
};
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const mondayIdx = (d: Date) => (d.getDay() + 6) % 7;

export default function Calendar() {
  const C = useColors();
  const router = useRouter();
  const { spaceId, space, isShared, members } = useSpace();

  const today = useToday();
  const todayIdx = mondayIdx(today);

  // `anchor` is any day in the displayed week; `selIdx` is the chosen weekday.
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [selIdx, setSelIdx] = useState(todayIdx);

  const week = useMemo(() => {
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() - mondayIdx(anchor));
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [anchor]);

  const sel = week[selIdx] ?? week[0];
  const selIsToday = sameDay(sel, today);
  const isCurrentWeek = week.some((d) => sameDay(d, today));

  const shiftWeek = (delta: number) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + delta * 7);
    setAnchor(d);
  };
  const goToday = () => {
    const now = new Date();
    setAnchor(now);
    setSelIdx(mondayIdx(now));
  };

  const events = useQuery(
    api.calendar.listEvents,
    spaceId ? { spaceId, from: startOfDay(sel), to: endOfDay(sel) } : 'skip',
  );
  // Day taps and week swipes re-key the query and Convex returns undefined while it
  // round-trips — hold the last resolved rows (render-phase state adjustment, ref-free
  // for the compiler) so the screen never blanks mid-interaction. Keyed by spaceId so
  // a space switch never flashes another space's events.
  const [held, setHeld] = useState<{ spaceId: typeof spaceId; rows: typeof events }>({ spaceId, rows: undefined });
  if (held.spaceId !== spaceId) {
    setHeld({ spaceId, rows: undefined });
  } else if (events !== undefined && held.rows !== events) {
    setHeld({ spaceId, rows: events });
  }
  const data = events ?? (held.spaceId === spaceId ? held.rows : undefined);
  const rows = (data ?? []).slice().sort((a, b) => a.startsAt - b.startsAt);

  const memberById = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);

  return (
    <QScreen
      loading={data === undefined}
      header={
        <TopBar
          left={<Kick>{`${MONTHS[sel.getMonth()]} ${sel.getFullYear()}${isShared && space ? ` · ${space.name}` : ''}`}</Kick>}
          right={<RoundBtn name="plus" fill={C.ink} color={C.bg} accessibilityLabel="New event" onPress={() => router.push(`/new/event?day=${startOfDay(sel)}`)} />}
        />
      }
    >

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <Serif size={42}>{weekdayName(sel)}</Serif>
          <Kick style={{ marginTop: 6 }}>
            {`${MONTHS[sel.getMonth()]} ${sel.getDate()}${selIsToday ? ' · Today' : ''}`}
          </Kick>
        </View>
        {!isCurrentWeek && (
          <Pill onPress={goToday}>Today</Pill>
        )}
      </View>

      {/* Week strip with prev/next navigation */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 30 }}>
        <Press onPress={() => shiftWeek(-1)} hitSlop={10} accessibilityLabel="Previous week" style={{ paddingRight: 4 }}>
          <Icon name="chevronLeft" size={20} color={C.ink3} strokeWidth={2} />
        </Press>
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
          {week.map((d, i) => {
            const on = i === selIdx;
            const isToday = sameDay(d, today);
            return (
              <Press
                key={i}
                onPress={() => setSelIdx(i)}
                accessibilityLabel={d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                accessibilityState={{ selected: on }}
                style={{ flex: 1, alignItems: 'center', gap: 6 }}
              >
                <Kick color={C.ink3} style={{ fontSize: 10.5, letterSpacing: 0.5 }}>
                  {LETTERS[i]}
                </Kick>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 34,
                    backgroundColor: on ? C.accent : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Mono size={20} color={on ? C.onAccent : C.ink}>
                    {d.getDate()}
                  </Mono>
                </View>
                {isToday && !on && <View style={{ width: 4, height: 4, borderRadius: 4, backgroundColor: C.accent }} />}
              </Press>
            );
          })}
        </View>
        <Press onPress={() => shiftWeek(1)} hitSlop={10} accessibilityLabel="Next week" style={{ paddingLeft: 4 }}>
          <Icon name="chevronRight" size={20} color={C.ink3} strokeWidth={2} />
        </Press>
      </View>

      {/* Dim (not blank) while a re-keyed day query is in flight */}
      <View style={{ opacity: events === undefined ? 0.5 : 1 }}>
        <QSection
          label={
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Mono size={11} weight={600} color={C.ink3} ls={1.2}>
                {rows.length}
              </Mono>
              <Kick>{rows.length === 1 ? 'event' : 'events'}</Kick>
            </View>
          }
        />
        {rows.length === 0 ? (
          <T size={15} color={C.ink2}>
            No events for this day.
          </T>
        ) : (
          <CollapsibleList items={rows} limit={6}>
            {(e, i) => {
            const owner = e.assigneeUserId ? memberById.get(e.assigneeUserId) : memberById.get(e.createdBy as Id<'users'>);
            return (
              <View key={e._id}>
                {i > 0 && <Div style={{ backgroundColor: C.hair }} />}
                <Press
                  onPress={() => router.push(`/new/event?id=${e._id}`)}
                  haptic
                  style={{ flexDirection: 'row', gap: 18, paddingVertical: 16, alignItems: 'flex-start' }}
                >
                  <Mono size={19} weight={500} color={C.ink2} style={{ width: 56 }}>
                    {fmtTimeBare(e.startsAt)}
                  </Mono>
                  <View style={{ flex: 1 }}>
                    <T size={17} weight={500} numberOfLines={1}>
                      {e.title}
                    </T>
                    {!!e.loc && (
                      <Kick color={C.ink3} style={{ marginTop: 2 }}>
                        {e.loc}
                      </Kick>
                    )}
                  </View>
                  {isShared && owner && <MemberAvatar member={owner} size={26} />}
                </Press>
              </View>
            );
          }}
          </CollapsibleList>
        )}
      </View>
    </QScreen>
  );
}
