import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { Id } from '@cvx/_generated/dataModel';
import { useColors } from '@/theme';
import {
  QScreen,
  SubBar,
  QSection,
  Mono,
  Numeral,
  T,
  Kick,
  Icon,
  Press,
  RoundBtn,
  CollapsibleList,
} from '@/ui';
import { useSpace } from '@/features/account/SpaceProvider';
import { MemberAvatar } from '@/features/account/avatars';
import { fmtTime } from '@/lib/datetime';
import { QCornerMotif } from '@/art/motifs';
import { confirmDelete } from '@/lib/confirm';
import { priorityColor } from '@/constants/priority';

type Reminder = {
  _id: Id<'reminders'>;
  title: string;
  remindAt?: number;
  whenLabel?: string;
  repeat?: string;
  done: boolean;
  priority?: string;
  assigneeUserId?: Id<'users'>;
  createdBy: Id<'users'>;
};

export default function Reminders() {
  const C = useColors();
  const router = useRouter();
  const { spaceId, isShared, members, space } = useSpace();
  const skip = spaceId ? { spaceId } : 'skip';

  const reminders = useQuery(api.reminders.listReminders, skip) as Reminder[] | undefined;
  const toggle = useMutation(api.reminders.toggleReminder);
  const removeReminder = useMutation(api.reminders.removeReminder);

  const memberById = useMemo(
    () => new Map(members.map((m) => [m.userId, m])),
    [members],
  );

  const rows = reminders ?? [];
  const open = rows.filter((r) => !r.done);
  const done = rows.filter((r) => r.done);

  const deleteReminder = (r: Reminder) =>
    confirmDelete({
      title: 'Delete reminder?',
      message: `"${r.title}" will be removed.`,
      onConfirm: () => removeReminder({ reminderId: r._id }),
    });

  const QCheck = ({ on, onPress }: { on: boolean; onPress: () => void }) => (
    <Press onPress={onPress} scale={0.85} haptic hitSlop={8}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 24,
          borderWidth: 1.6,
          borderColor: on ? C.accent : C.line,
          backgroundColor: on ? C.accent : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {on && <Icon name="check" size={13} color={C.onAccent} strokeWidth={3} />}
      </View>
    </Press>
  );

  const QReminderRow = ({ r }: { r: Reminder }) => {
    const uid = r.assigneeUserId ?? r.createdBy;
    const member = memberById.get(uid);
    const when = r.remindAt ? fmtTime(r.remindAt) : (r.whenLabel ?? '');
    const whenIsTime = !!r.remindAt;
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingVertical: 14,
          opacity: r.done ? 0.5 : 1,
        }}
      >
        <QCheck on={r.done} onPress={() => toggle({ reminderId: r._id })} />
        <Press onPress={() => router.push(`/new/reminder?id=${r._id}`)} style={{ flex: 1, gap: 4 }}>
          <T
            size={16.5}
            weight={500}
            numberOfLines={1}
            style={r.done ? { textDecorationLine: 'line-through', opacity: 0.45 } : undefined}
          >
            {r.title}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {!!when && (
              whenIsTime ? (
                <Mono size={11} weight={600} color={C.ink3}>{when}</Mono>
              ) : (
                <Kick color={C.ink3}>{when}</Kick>
              )
            )}
            {!!when && !!r.repeat && <Dot c={C.ink4} />}
            {!!r.repeat && <Kick color={C.ink3}>{r.repeat}</Kick>}
            {isShared && member && (
              <>
                <Dot c={C.ink4} />
                <Kick color={member.isYou ? C.accent : C.ink3}>
                  {member.isYou ? 'You' : member.displayName.split(' ')[0]}
                </Kick>
              </>
            )}
          </View>
        </Press>
        <Icon name="flag" size={15} color={priorityColor(r.priority)} strokeWidth={2} />
        {isShared && member && <MemberAvatar member={member} size={28} />}
        <Press onPress={() => deleteReminder(r)} haptic hitSlop={8} accessibilityLabel={`Delete ${r.title}`}>
          <Icon name="x" size={16} color={C.ink4} strokeWidth={2} />
        </Press>
      </View>
    );
  };

  return (
    <QScreen
      loading={reminders === undefined}
      motif={<QCornerMotif size={230} top={30} right={-80} />}
      header={
        <SubBar
          kicker={isShared && space ? `Reminders · ${space.name}` : 'Reminders'}
          right={
            <RoundBtn name="plus" fill={C.ink} color={C.bg} onPress={() => router.push('/new/reminder')} />
          }
        />
      }
    >

      {/* Lead stat */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginBottom: 34 }}>
        <Numeral size={open.length > 99 ? 60 : open.length > 9 ? 78 : 92} lh={0.86}>
          {open.length}
        </Numeral>
        <View style={{ paddingBottom: 33 }}>
          <T size={17} weight={600} lh={1.25}>
            {`reminders\n${isShared ? 'shared' : 'set'}`}
          </T>
        </View>
      </View>

      {/* Upcoming */}
      <QSection label="Upcoming" />
      {open.length === 0 ? (
        <T size={15} weight={450} color={C.ink3}>
          Nothing on the horizon. A clear mind.
        </T>
      ) : (
        <CollapsibleList items={open} limit={6}>{(r) => <QReminderRow key={r._id} r={r} />}</CollapsibleList>
      )}

      {/* Done */}
      {done.length > 0 && (
        <View style={{ marginTop: 26 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
            <Kick>Done ·</Kick>
            <Mono size={11} weight={600} lh={1}>
              {done.length}
            </Mono>
          </View>
          <CollapsibleList items={done} limit={5}>{(r) => (
            <QReminderRow key={r._id} r={r} />
          )}</CollapsibleList>
        </View>
      )}
    </QScreen>
  );
}

function Dot({ c }: { c: string }) {
  return <View style={{ width: 3, height: 3, borderRadius: 3, backgroundColor: c }} />;
}
