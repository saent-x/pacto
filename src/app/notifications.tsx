import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { Id } from '@cvx/_generated/dataModel';
import { useColors } from '@/theme';
import { QScreen, SubBar, Serif, T, Kick, Div, Mono, Press } from '@/ui';
import { useSpace } from '@/features/account/SpaceProvider';
import { MemberAvatar } from '@/features/account/avatars';
import { fmtTime } from '@/lib/datetime';

// A derived "Updates" feed. There is no notifications table; we compose a few
// calm notes from live reminders and check-ins for the active space.
type Note = {
  id: string;
  title: string;
  sub: string;
  owner: Id<'users'> | null;
  subKind?: 'data';
  route: string;
};

export default function Notifications() {
  const C = useColors();
  const router = useRouter();
  const { spaceId, isShared, members } = useSpace();

  const skip = spaceId ? { spaceId } : 'skip';
  const reminders = useQuery(api.reminders.listReminders, skip);
  const checkins = useQuery(api.checkins.listCheckins, spaceId ? { spaceId, limit: 5 } : 'skip');

  const [now] = useState(() => Date.now());

  const memberById = useMemo(
    () => new Map(members.map((m) => [m.userId, m])),
    [members],
  );

  const notes = useMemo<Note[]>(() => {
    const out: Note[] = [];

    // Next upcoming reminder.
    const upcoming = (reminders ?? [])
      .filter((r) => !r.done && r.remindAt && r.remindAt >= now)
      .sort((a, b) => (a.remindAt ?? 0) - (b.remindAt ?? 0))[0];
    if (upcoming) {
      out.push({
        id: `rem-${upcoming._id}`,
        title: `Reminder · ${upcoming.title}`,
        sub: upcoming.whenLabel ?? fmtTime(upcoming.remindAt ?? now),
        owner: upcoming.assigneeUserId ?? upcoming.createdBy,
        subKind: 'data',
        route: `/new/reminder?id=${upcoming._id}`,
      });
    }

    // A gentle check-in nudge.
    out.push({
      id: 'checkin-nudge',
      title: 'How did today feel?',
      sub: (checkins ?? []).length > 0 ? 'Tap to check in again' : 'Tap to check in',
      owner: null,
      route: '/new/checkin',
    });

    return out;
  }, [reminders, checkins, now]);

  return (
    <QScreen
      loading={reminders === undefined || checkins === undefined}
      header={
        <SubBar kicker="Updates" />
      }
    >

      <Serif size={40} lh={1.05} style={{ marginTop: 8, marginBottom: 28 }}>
        Recent
      </Serif>

      {notes.map((n, i) => {
        const member = n.owner ? memberById.get(n.owner) : undefined;
        return (
          <View key={n.id}>
            {i > 0 && <Div style={{ backgroundColor: C.hair }} />}
            <Press
              onPress={() => router.push(n.route as any)}
              haptic
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 }}
            >
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 7,
                  backgroundColor: i === 0 ? C.accent : C.line,
                }}
              />
              <View style={{ flex: 1 }}>
                <T size={16} weight={500} numberOfLines={1}>
                  {n.title}
                </T>
                {n.subKind === 'data' ? (
                  <Mono size={11} weight={600} color={C.ink3} style={{ marginTop: 3 }}>
                    {n.sub}
                  </Mono>
                ) : (
                  <Kick color={C.ink3} style={{ marginTop: 3 }}>
                    {n.sub}
                  </Kick>
                )}
              </View>
              {isShared && member && <MemberAvatar member={member} size={26} />}
            </Press>
          </View>
        );
      })}

      <View style={{ alignItems: 'center', marginTop: 30, gap: 10 }}>
        <View style={{ width: 5, height: 5, borderRadius: 5, backgroundColor: C.line }} />
        <Serif size={19} italic color={C.ink3}>
          That&apos;s everything for now.
        </Serif>
      </View>
    </QScreen>
  );
}
