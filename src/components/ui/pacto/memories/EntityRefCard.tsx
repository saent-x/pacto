import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { format, parseISO, isValid, isToday, isYesterday } from 'date-fns';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Checkbox } from '@/src/components/ui/pacto/Checkbox';
import { PriorityDot } from '@/src/components/ui/pacto/PriorityDot';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { alphaColor } from '@/src/lib/color';
import { getCheckInStateMeta } from '@/src/constants/checkInStates';
import { useEntityRef, type EntityRefKind } from '@/src/hooks/memories/useEntityRef';
import { normalizePriority } from '@/src/lib/priority';

type Props = {
  type: EntityRefKind;
  refId: string;
  spaceId?: string | null;
  /** When all 3 are provided, skips the live entity fetch. */
  title?: string;
  meta?: string;
  priority?: string;
};

const ROUTES: Record<EntityRefKind, (id: string, entity?: any) => string> = {
  task: (id, entity) => {
    const listId = firstRel(entity?.list)?.id ?? entity?.list_id ?? null;
    return listId ? `/(tabs)/us/tasks/${listId}?taskId=${id}` : '/(tabs)/us/tasks';
  },
  reminder: (id) => `/(tabs)/us/reminders?reminderId=${id}`,
  plan: () => '/(tabs)/us/plans',
  checkIn: () => '/(tabs)/us/checkins',
  timetable: (id) => `/(tabs)/us/timetables/${id}`,
  journal: () => '/(tabs)/us/journal',
};

export function entityRefRoute(type: EntityRefKind, id: string, entity?: any): string {
  return ROUTES[type](id, entity);
}

function firstRel(value: any): any | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const FALLBACK_LABELS: Record<EntityRefKind, string> = {
  task: 'Task',
  reminder: 'Reminder',
  plan: 'Target',
  checkIn: 'Check-in',
  timetable: 'Timetable',
  journal: 'Journal entry',
};

function priorityLevel(p: unknown): 'none' | 'low' | 'med' | 'high' {
  const priority = normalizePriority(p);
  if (priority >= 3) return 'high';
  if (priority === 2) return 'med';
  if (priority === 1) return 'low';
  return 'none';
}

function safeDateFormat(value: string | undefined | null, fmt: string): string | null {
  if (!value) return null;
  try {
    const d = parseISO(value);
    return isValid(d) ? format(d, fmt) : null;
  } catch {
    return null;
  }
}

function safeNumericDate(value: unknown): Date | null {
  if (typeof value !== 'number' || value <= 0 || !Number.isFinite(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/**
 * Embed reference to a tracked entity (task / reminder / plan / etc).
 * Each type renders with the same row structure as its source screen so
 * embeds read consistently with the rest of the app.
 */
export function EntityRefCard({ type, refId, spaceId, title, meta, priority }: Props) {
  const { C } = useTheme();
  const skipFetch = title !== undefined && meta !== undefined && priority !== undefined;
  const { entity } = useEntityRef(skipFetch ? null : type, skipFetch ? null : refId, spaceId);

  const onOpen = () => router.push(entityRefRoute(type, refId, entity) as any);

  return (
    <PressScale
      onPress={onOpen}
      haptic="impact"
      pressedScale={0.98}
      accessibilityLabel={`Open ${FALLBACK_LABELS[type]}`}
      style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.lineColor }]}
    >
      {renderRow(type, entity ?? {}, C, { title, meta, priority })}
    </PressScale>
  );
}

function renderRow(
  type: EntityRefKind,
  e: any,
  C: any,
  override: { title?: string; meta?: string; priority?: string },
) {
  switch (type) {
    case 'task':
      return <TaskRow e={e} C={C} />;
    case 'reminder':
      return <ReminderRow e={e} C={C} />;
    case 'plan':
      return <PlanRow e={e} C={C} />;
    case 'checkIn':
      return <CheckInRow e={e} C={C} />;
    case 'timetable':
      return <TimetableRow e={e} C={C} />;
    case 'journal':
      return <JournalRow e={e} C={C} />;
  }
}

// ─── Task ──────────────────────────────────────────────────────────────────
function TaskRow({ e, C }: { e: any; C: any }) {
  const done = !!(e.isCompleted ?? e.is_completed);
  const dueLabel = safeDateFormat(e.dueDate ?? e.due_date, 'MMM d');
  return (
    <>
      <View style={styles.nonInteractive}>
        <Checkbox checked={done} onChange={() => undefined} />
      </View>
      <View style={styles.body}>
        <Text
          style={[
            Typography.bodyMedium,
            {
              color: done ? C.ink3 : C.inkColor,
              textDecorationLine: done ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}
        >
          {e.title ?? FALLBACK_LABELS.task}
        </Text>
        <View style={styles.metaRow}>
          {dueLabel ? (
            <Text style={[Typography.mono, { color: C.ink3, fontSize: 11 }]}>{dueLabel}</Text>
          ) : null}
          <PriorityDot level={priorityLevel(e.priority)} />
        </View>
      </View>
    </>
  );
}

// ─── Reminder ──────────────────────────────────────────────────────────────
function ReminderRow({ e, C }: { e: any; C: any }) {
  const done = !!(e.isCompleted ?? e.is_completed);
  let dueLabel: string | null = null;
  const due = e.dueAt ?? e.due_at;
  if (typeof due === 'number' && due > 0) {
    try { dueLabel = format(new Date(due), 'MMM d · h:mm a'); } catch { dueLabel = null; }
  }
  const recurrence = e.recurrence;
  return (
    <>
      <View style={styles.nonInteractive}>
        <Checkbox checked={done} onChange={() => undefined} />
      </View>
      <View style={styles.body}>
        <Text
          style={[
            Typography.bodyMedium,
            {
              color: done ? C.ink3 : C.inkColor,
              textDecorationLine: done ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}
        >
          {e.title ?? FALLBACK_LABELS.reminder}
        </Text>
        <View style={styles.metaRow}>
          {dueLabel ? (
            <Text style={[Typography.mono, { color: C.ink3, fontSize: 11 }]}>{dueLabel}</Text>
          ) : null}
          {recurrence && recurrence !== 'none' ? (
            <View style={styles.metaItem}>
              <Icon name="repeat" size={11} color={C.ink3} strokeWidth={2} />
              <Text style={[Typography.mono, { color: C.ink3, fontSize: 10 }]}>{recurrence}</Text>
            </View>
          ) : null}
          <PriorityDot level={priorityLevel(e.priority)} />
        </View>
      </View>
    </>
  );
}

// ─── Plan / Target ─────────────────────────────────────────────────────────
function PlanRow({ e, C }: { e: any; C: any }) {
  const status = e.status ?? 'active';
  const done = status === 'done';
  const targetLabel = safeDateFormat(e.targetDate ?? e.target_date, 'MMM d, yyyy');
  return (
    <>
      <View style={[styles.iconTile, { backgroundColor: C.accent2Soft }]}>
        <Icon name={(e.icon as IconName) ?? 'flag'} size={16} color={C.accent2} strokeWidth={2.2} />
      </View>
      <View style={styles.body}>
        <View style={styles.headRow}>
          <Text
            style={[
              Typography.bodyMedium,
              {
                color: done ? C.ink3 : C.inkColor,
                flex: 1,
                textDecorationLine: done ? 'line-through' : 'none',
              },
            ]}
            numberOfLines={1}
          >
            {e.title ?? FALLBACK_LABELS.plan}
          </Text>
          {!done ? (
            <View
              style={[
                styles.statusMark,
                {
                  backgroundColor:
                    status === 'active' ? C.accent : status === 'planning' ? C.accent2 : C.ink3,
                  borderColor:
                    status === 'active' ? C.accent : status === 'planning' ? C.accent2 : C.lineColor,
                },
              ]}
            />
          ) : null}
          <PriorityDot level={priorityLevel(e.priority)} />
        </View>
        {e.description ? (
          <Text style={[Typography.caption, { color: C.ink2, marginTop: 2 }]} numberOfLines={2}>
            {e.description}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {targetLabel ? (
            <Text style={[Typography.mono, { color: C.ink3, fontSize: 11 }]}>{targetLabel}</Text>
          ) : null}
          {e.category ? (
            <Text style={[Typography.eyebrowSm, { color: C.ink3, fontSize: 9.5 }]}>
              · {String(e.category).toUpperCase()}
            </Text>
          ) : null}
        </View>
      </View>
    </>
  );
}

// ─── Check-in ──────────────────────────────────────────────────────────────
function CheckInRow({ e, C }: { e: any; C: any }) {
  const mood = getCheckInStateMeta(e.mood);
  const ts = e.createdAt ?? e.created_at;
  const date = safeNumericDate(ts);
  const timeLabel = date ? format(date, 'EEE · h:mm a') : null;
  return (
    <>
      <View style={[styles.moodTile, { backgroundColor: mood.color }]}>
        <Icon name={mood.icon} size={18} color={C.inkColor} />
      </View>
      <View style={styles.body}>
        <Text
          style={{
            fontFamily: Typography.geistSemiBoldFont,
            fontSize: 14,
            color: C.inkColor,
            textTransform: 'capitalize',
          }}
          numberOfLines={1}
        >
          {mood.label}
        </Text>
        {e.note ? (
          <Text
            style={[Typography.caption, { color: C.ink2, marginTop: 2 }]}
            numberOfLines={2}
          >
            {e.note}
          </Text>
        ) : null}
        {timeLabel ? (
          <Text style={[Typography.mono, { color: C.ink3, fontSize: 11, marginTop: 4 }]}>
            {timeLabel}
          </Text>
        ) : null}
      </View>
    </>
  );
}

// ─── Timetable ─────────────────────────────────────────────────────────────
function TimetableRow({ e, C }: { e: any; C: any }) {
  const updatedDate = safeNumericDate(e.updatedAt);
  const updatedLabel = updatedDate ? format(updatedDate, 'MMM d') : null;
  return (
    <>
      <View style={[styles.iconTile, { backgroundColor: C.accent2Soft }]}>
        <Icon name="grid" size={16} color={C.accent2} strokeWidth={2.2} />
      </View>
      <View style={styles.body}>
        <Text
          style={[Typography.bodyMedium, { color: C.inkColor }]}
          numberOfLines={1}
        >
          {e.title ?? FALLBACK_LABELS.timetable}
        </Text>
        <View style={styles.metaRow}>
          {e.template ? (
            <Text style={[Typography.eyebrowSm, { color: C.accent2, fontSize: 9.5 }]}>
              {String(e.template).toUpperCase()}
            </Text>
          ) : null}
          {e.share ? (
            <Text
              style={[
                Typography.eyebrowSm,
                { color: e.share === 'solo' ? C.ink3 : C.accent, fontSize: 9.5 },
              ]}
            >
              · {String(e.share).toUpperCase()}
            </Text>
          ) : null}
          {updatedLabel ? (
            <Text style={[Typography.mono, { color: C.ink3, fontSize: 11 }]}>
              · {updatedLabel}
            </Text>
          ) : null}
        </View>
      </View>
      <Icon name="chevronRight" size={14} color={C.ink3} strokeWidth={2.2} />
    </>
  );
}

// ─── Journal entry ─────────────────────────────────────────────────────────
function JournalRow({ e, C }: { e: any; C: any }) {
  const previewText =
    (typeof e.title === 'string' && e.title.trim()) ||
    (typeof e.body === 'string' ? e.body.split('\n')[0] : '') ||
    '(empty)';
  const ts = e.createdAt ?? e.created_at;
  let dateLabel: string | null = null;
  const d = safeNumericDate(ts);
  if (d) {
    dateLabel = isToday(d)
      ? format(d, 'h:mm a')
      : isYesterday(d)
        ? 'Yesterday'
        : format(d, 'MMM d · h:mm a');
  }
  return (
    <>
      <View style={[styles.authorDot, { backgroundColor: C.accent }]} />
      <View style={styles.body}>
        <View style={styles.headRow}>
          <Text style={[Typography.bodyMedium, { color: C.inkColor, flex: 1 }]} numberOfLines={1}>
            {previewText}
          </Text>
          {e.isPrivate ? (
            <Icon name="lock" size={11} color={C.ink3} strokeWidth={2.2} />
          ) : null}
        </View>
        {e.title && e.body ? (
          <Text style={[Typography.caption, { color: C.ink2, marginTop: 2 }]} numberOfLines={2}>
            {e.body}
          </Text>
        ) : null}
        {dateLabel ? (
          <Text style={[Typography.mono, { color: C.ink3, fontSize: 11, marginTop: 4 }]}>
            {dateLabel}
          </Text>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  body: { flex: 1, minWidth: 0 },
  nonInteractive: {
    pointerEvents: 'none',
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusMark: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
  moodTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  authorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  donePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
});
