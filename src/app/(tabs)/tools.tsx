import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { useColors } from '@/theme';
import { RADII, SHADOWS } from '@/theme/tokens';
import {
  QScreen,
  TopBar,
  QSection,
  Numeral,
  T,
  Kick,
  Icon,
  Press,
  Div,
  type IconName,
} from '@/ui';
import { QCornerMotif } from '@/art/motifs';
import { useSpace } from '@/features/account/SpaceProvider';
import { MemberAvatar, MemberStack } from '@/features/account/avatars';

const DAY_MS = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Tools() {
  const C = useColors();
  const router = useRouter();
  const { space, spaceId, members, isShared, you, user } = useSpace();
  const skip = spaceId ? { spaceId } : 'skip';

  const tasks = useQuery(api.tasks.listTasks, skip);
  const reminders = useQuery(api.reminders.listReminders, skip);
  // Explicit limit so the streak isn't capped by the server's 100-row default.
  const checkins = useQuery(api.checkins.listCheckins, spaceId ? { spaceId, limit: 1000 } : 'skip');
  const timetables = useQuery(api.timetables.listTimetables, skip);

  const openTasks = (tasks ?? []).filter((t) => !t.done).length;
  const openReminders = (reminders ?? []).filter((r) => !r.done).length;
  const keptCheckins = (checkins ?? []).length;

  // Lead: days since the space began + current check-in streak.
  const [nowTs] = useState(() => Date.now());
  const daysSince = space ? Math.max(0, Math.floor((nowTs - space.createdAt) / DAY_MS)) : 0;
  const sinceDate = space ? `${MONTHS[new Date(space.createdAt).getMonth()]} ${new Date(space.createdAt).getDate()}` : '';
  const sinceLabel =
    space?.type === 'pair' ? 'days together' : space?.type === 'crew' ? 'days as a crew' : 'days solo';
  const streakLabel =
    space?.type === 'crew' ? 'crew streak' : space?.type === 'pair' ? 'shared streak' : 'day streak';

  const streak = useMemo(() => {
    const days = new Set<number>();
    for (const c of checkins ?? []) {
      const d = new Date(c._creationTime);
      d.setHours(0, 0, 0, 0);
      days.add(d.getTime());
    }
    // Walk back a calendar day at a time (re-anchoring to midnight, since a fixed
    // -24h step lands on 23:00/01:00 across DST and misses the day keys).
    const cur = new Date();
    cur.setHours(0, 0, 0, 0);
    if (!days.has(cur.getTime())) {
      // today not logged yet — don't break the streak
      cur.setDate(cur.getDate() - 1);
      cur.setHours(0, 0, 0, 0);
    }
    let n = 0;
    while (days.has(cur.getTime())) {
      n += 1;
      cur.setDate(cur.getDate() - 1);
      cur.setHours(0, 0, 0, 0);
    }
    return n;
  }, [checkins]);

  const rhythms = (timetables ?? []).length;
  const TOOLS: { label: string; icon: IconName; value: number; unit: string; route: string }[] = [
    { label: 'Check-ins', icon: 'message', value: keptCheckins, unit: keptCheckins === 1 ? 'entry' : 'entries', route: '/checkins' },
    { label: 'Timetable', icon: 'grid', value: rhythms, unit: rhythms === 1 ? 'rhythm' : 'rhythms', route: '/timetable' },
    { label: 'Tasks', icon: 'checkSquare', value: openTasks, unit: 'open', route: '/tasks' },
    { label: 'Reminders', icon: 'bell', value: openReminders, unit: 'set', route: '/reminders' },
  ];

  return (
    <QScreen
      loading={tasks === undefined || reminders === undefined || checkins === undefined || timetables === undefined}
      motif={<QCornerMotif size={250} top={20} right={-80} />}
      header={
        <TopBar
          right={
            <Press onPress={() => router.push('/profile')} haptic accessibilityLabel="Profile">
              {isShared ? (
                <MemberStack members={members} size={34} max={3} />
              ) : (
                <MemberAvatar member={you ?? { displayName: user?.displayName ?? 'You', isYou: true }} size={42} />
              )}
            </Press>
          }
        />
      }
    >
      {/* Lead — days since the pact began + streak */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <View style={{ flexShrink: 1 }}>
          <Numeral size={72} lh={1.0}>
            {daysSince}
          </Numeral>
          <Kick style={{ marginTop: 8 }} numberOfLines={1}>
            {sinceDate ? `${sinceLabel} · since ${sinceDate}` : sinceLabel}
          </Kick>
        </View>
        <View style={{ alignItems: 'flex-end', paddingBottom: 6 }}>
          <Numeral size={34} color={C.accent}>
            {streak}
          </Numeral>
          <Kick style={{ marginTop: 2 }}>{streakLabel}</Kick>
        </View>
      </View>

      {/* Members card (shared) */}
      {isShared && space && (
        <Press onPress={() => router.push('/profile')} haptic style={{ marginBottom: 22 }}>
          <View
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 13,
                paddingHorizontal: 16,
                borderRadius: RADII.cardSm,
                backgroundColor: C.surface,
              },
              { boxShadow: SHADOWS.soft } as object,
            ]}
          >
            <MemberStack members={members} size={30} max={5} />
            <View style={{ flex: 1 }}>
              <T size={15} weight={600}>
                {space.name}
              </T>
              <Kick color={C.ink3} style={{ marginTop: 2 }}>
                {`${members.length} member${members.length === 1 ? '' : 's'}`}
              </Kick>
            </View>
            <Icon name="chevronRight" size={16} color={C.ink4} />
          </View>
        </Press>
      )}

      {/* Quick add */}
      <View style={{ flexDirection: 'row', gap: 9, marginBottom: 34 }}>
        {([
          { label: 'Task', route: '/new/task' },
          { label: 'Reminder', route: '/new/reminder' },
          { label: 'Timetable', route: '/new/timetable' },
        ] as const).map((q) => (
          <Press key={q.label} onPress={() => router.push(q.route as never)} haptic style={{ flex: 1, borderRadius: 999 }}>
            <View
              style={[
                {
                  height: 46,
                  borderRadius: 999,
                  backgroundColor: C.surface,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                },
                { boxShadow: SHADOWS.soft } as object,
              ]}
            >
              <Icon name="plus" size={15} color={C.ink2} strokeWidth={2} />
              <T size={14} weight={600}>{q.label}</T>
            </View>
          </Press>
        ))}
      </View>

      {/* Tools list */}
      <QSection label={`Tools · ${TOOLS.length}`} />
      {TOOLS.map((t, i) => (
        <View key={t.label}>
          {i > 0 && <Div style={{ backgroundColor: C.hair }} />}
          <Press onPress={() => router.push(t.route as never)} haptic>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 17 }}>
              <Icon name={t.icon} size={20} color={C.ink2} strokeWidth={1.8} />
              <T size={17} weight={500} style={{ flex: 1 }}>
                {t.label}
              </T>
              <View style={{ minWidth: 30, alignItems: 'flex-end' }}>
                <Numeral size={26}>{t.value}</Numeral>
              </View>
              <View style={{ width: 64 }}>
                <Kick color={C.ink4} numberOfLines={1}>
                  {t.unit}
                </Kick>
              </View>
              <Icon name="chevronRight" size={16} color={C.ink4} />
            </View>
          </Press>
        </View>
      ))}
    </QScreen>
  );
}
