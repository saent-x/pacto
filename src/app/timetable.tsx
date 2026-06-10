import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { useColors } from '@/theme';
import { RADII, SHADOWS } from '@/theme/tokens';
import { QScreen, SubBar, QSection, Serif, T, Kick, RoundBtn, Press, Numeral, Div } from '@/ui';
import { useSpace } from '@/features/account/SpaceProvider';
import { MemberStack } from '@/features/account/avatars';
import { useNow } from '@/lib/useNow';
import { formatTimetableTimeLabel, timetableTimeMinutes } from '@/lib/timetableTime';

const shareLabel = (share?: string) => {
  const s = (share ?? '').toLowerCase();
  if (s === 'shared') return 'Shared';
  if (s === 'partner' || s === 'pair') return 'Partner';
  if (s === 'crew') return 'Crew';
  return 'Solo';
};

type TTItem = { time: string; title: string; dur?: string };

// Soonest upcoming step relative to the current time of day (wraps to tomorrow).
function nextStep(items: TTItem[], nowMin: number): { item: TTItem; delta: number } | null {
  let best: { item: TTItem; delta: number } | null = null;
  for (const it of items) {
    const tmin = timetableTimeMinutes(it.time, '9:00');
    let delta = tmin - nowMin;
    if (delta < 0) delta += 1440;
    if (!best || delta < best.delta) best = { item: it, delta };
  }
  return best;
}

export default function Timetable() {
  const C = useColors();
  const router = useRouter();
  const { space, spaceId, members, isShared } = useSpace();

  const skip = spaceId ? { spaceId } : 'skip';
  const timetables = useQuery(api.timetables.listTimetables, skip);

  const rows = timetables ?? [];
  const kicker = isShared && space ? `Timetable · ${space.name}` : 'Timetable';

  const now = useNow();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let globalNext: { item: TTItem; delta: number } | null = null;
  for (const t of rows) {
    const n = nextStep(t.items, nowMin);
    if (n && (!globalNext || n.delta < globalNext.delta)) globalNext = n;
  }
  const rhythmWord = rows.length === 1 ? 'rhythm' : 'rhythms';
  const nextHrs = globalNext ? Math.round(globalNext.delta / 60) : 0;
  const nextIn = globalNext
    ? globalNext.delta < 60
      ? `next in ${globalNext.delta} min`
      : `next in ${nextHrs} ${nextHrs === 1 ? 'hr' : 'hrs'}`
    : null;
  const leadLabel = nextIn ? `${rhythmWord} ·\n${nextIn}` : `${rhythmWord}\nthis week`;

  return (
    <QScreen
      loading={timetables === undefined}
      header={
        <SubBar
          kicker={kicker}
          right={
            <RoundBtn
              name="plus"
              fill={C.ink}
              color={C.bg}
              onPress={() => router.push('/new/timetable')}
              accessibilityLabel="New timetable"
            />
          }
        />
      }
    >
      {/* Lead stat */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginBottom: 34 }}>
        <Numeral size={rows.length > 99 ? 60 : rows.length > 9 ? 78 : 92} lh={0.86}>
          {rows.length}
        </Numeral>
        <View style={{ paddingBottom: 33 }}>
          <T size={17} weight={600} lh={1.25}>
            {leadLabel}
          </T>
        </View>
      </View>

      <QSection label={isShared ? 'Shared rhythms' : 'Your rhythms'} />

      {rows.map((t) => {
        const days = t.days ?? t.items.length;
        const n = nextStep(t.items as TTItem[], nowMin);
        const next = n ? `${n.item.title || 'Untitled'} · ${formatTimetableTimeLabel(n.item.time)}` : 'No steps yet';
        return (
          <Press
            key={t._id}
            onPress={() => router.push(`/timetable/${t._id}` as any)}
            haptic
            accessibilityLabel={`Open ${t.title} timetable`}
            style={{ borderRadius: RADII.card, marginBottom: 12 }}
          >
            <View
              style={[
                { backgroundColor: C.surface, borderRadius: RADII.card, padding: 22 },
                { boxShadow: SHADOWS.soft } as object,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <Serif size={26} numberOfLines={1}>
                    {t.title}
                  </Serif>
                  <Kick color={C.ink3} style={{ marginTop: 4 }}>
                    {`${t.items.length} ${t.items.length === 1 ? 'item' : 'items'} · ${days} ${days === 1 ? 'day' : 'days'}`}
                  </Kick>
                </View>
                {isShared ? (
                  <MemberStack members={members} size={26} max={4} />
                ) : (
                  <Kick color={C.ink3}>{shareLabel(t.share)}</Kick>
                )}
              </View>
              <Div style={{ backgroundColor: C.line, marginVertical: 16 }} />
              <Kick color={C.ink2} numberOfLines={1}>
                Next · {next}
              </Kick>
            </View>
          </Press>
        );
      })}
    </QScreen>
  );
}
