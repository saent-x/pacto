import { useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { format, isValid, parseISO } from 'date-fns';
import { FeatureRouteGuard } from '@/src/components/features/FeatureRouteGuard';
import { Icon, type IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import {
  BucketedList,
  Checkbox,
  PriorityDot,
  type Bucket,
} from '@/src/components/ui/pacto';
import { useEntityAttachment, type AttachableEntity } from '@/src/hooks/memories/useEntityAttachment';
import { addMemoryDraftAttachment } from '@/src/hooks/memories/useMemoryComposer';

const TYPES: AttachableEntity[] = [
  'task',
  'reminder',
  'plan',
  'checkIn',
  'timetable',
  'journal',
];
const LABELS: Record<AttachableEntity, string> = {
  task: 'Tasks',
  reminder: 'Reminders',
  plan: 'Targets',
  checkIn: 'Check-ins',
  timetable: 'Timetables',
  journal: 'Journal',
};
const ICONS: Record<AttachableEntity, IconName> = {
  task: 'checkSquare',
  reminder: 'bell',
  plan: 'flag',
  checkIn: 'heart',
  timetable: 'repeat',
  journal: 'book',
};

export default function MemoryAttachEntitySheet() {
  return (
    <FeatureRouteGuard featureId="memoryFeed">
      <MemoryAttachEntityContent />
    </FeatureRouteGuard>
  );
}

function MemoryAttachEntityContent() {
  const { C } = useTheme();
  const [type, setType] = useState<AttachableEntity>('task');
  const { entities } = useEntityAttachment(type);
  const buckets: Bucket<any>[] = entities.length
    ? [{ label: LABELS[type], dotColor: C.accent2, rows: entities }]
    : [];

  return (
    <SheetShell eyebrow="MEMORY" title="Attach">
      <Text style={[Typography.caption, { color: C.ink2, marginBottom: 14 }]}>
        Choose one item to connect this post to. It will appear inline in the thread.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {TYPES.map((t) => {
          const active = t === type;
          return (
            <PressScale
              key={t}
              onPress={() => setType(t)}
              haptic="impact"
              pressedScale={0.96}
              style={[
                styles.chip,
                {
                  borderColor: active ? C.inkColor : C.line2 ?? C.lineColor,
                  backgroundColor: active ? C.inkColor : C.bgCard,
                },
              ]}
            >
              <Icon
                name={ICONS[t]}
                size={14}
                color={active ? C.bg : C.ink2}
                strokeWidth={active ? 2.4 : 2}
              />
              <Text
                style={[
                  Typography.captionMedium,
                  {
                    color: active ? C.bg : C.ink2,
                  },
                ]}
                numberOfLines={1}
              >
                {LABELS[t]}
              </Text>
            </PressScale>
          );
        })}
        <View style={{ width: 12 }} />
      </ScrollView>

      <View style={styles.listWrap}>
        {buckets.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: C.bgCard, borderColor: C.lineColor }]}>
            <Text style={[Typography.caption, { color: C.ink3 }]}>Nothing to attach yet.</Text>
          </View>
        ) : (
          <BucketedList
            buckets={buckets}
            rowKey={(item: any) => item.id}
            spacing={12}
            renderRow={(item: any) => (
              <AttachRow
                item={item}
                type={type}
                onPress={() => {
                  addMemoryDraftAttachment({ type, refId: item.id });
                  router.back();
                }}
              />
            )}
          />
        )}
      </View>
    </SheetShell>
  );
}

function AttachRow({
  item,
  type,
  onPress,
}: {
  item: any;
  type: AttachableEntity;
  onPress: () => void;
}) {
  const { C } = useTheme();
  const summary = summarizeAttachItem(type, item);
  const isCheckable = type === 'task' || type === 'reminder';
  const checked = !!(item.isCompleted ?? item.is_completed);

  return (
    <PressScale
      onPress={onPress}
      haptic="impact"
      pressedScale={0.98}
      accessibilityLabel={`Attach ${LABELS[type]}: ${summary.title}`}
      style={[styles.row, { backgroundColor: C.bgCard }]}
    >
      {isCheckable ? (
        <View pointerEvents="none" style={styles.checkWrap}>
          <Checkbox checked={checked} onChange={() => undefined} />
        </View>
      ) : (
        <View style={[styles.iconTile, { backgroundColor: C.bgSoft }]}>
          <Icon name={ICONS[type]} size={17} color={C.ink2} strokeWidth={2} />
        </View>
      )}

      <View style={styles.rowBody}>
        <Text
          style={[
            Typography.bodyMedium,
            {
              color: checked ? C.ink3 : C.inkColor,
              textDecorationLine: checked ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}
        >
          {summary.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[Typography.mono, { color: C.ink3, fontSize: 11 }]}>
            {summary.meta}
          </Text>
          <PriorityDot level={priorityLevel(item.priority)} />
        </View>
      </View>
    </PressScale>
  );
}

function summarizeAttachItem(type: AttachableEntity, item: any): { title: string; meta: string } {
  switch (type) {
    case 'task':
      return {
        title: item.title ?? 'Task',
        meta: item.isCompleted ? 'Done' : item.dueDate ? `Due ${dateLabel(item.dueDate)}` : 'Open',
      };
    case 'reminder':
      return {
        title: item.title ?? 'Reminder',
        meta: item.isCompleted ? 'Done' : item.dueAt ? whenLabel(item.dueAt) : 'Pending',
      };
    case 'plan':
      return {
        title: item.title ?? 'Target',
        meta: item.targetDate ? `Target ${dateLabel(item.targetDate)}` : item.status ?? 'Open',
      };
    case 'checkIn':
      return {
        title: item.mood ? String(item.mood) : 'Check-in',
        meta: item.checkInDate ? dateLabel(item.checkInDate) : 'Check-in',
      };
    case 'timetable':
      return {
        title: item.title ?? 'Timetable',
        meta: item.template ? String(item.template).toUpperCase() : 'Timetable',
      };
    case 'journal':
      return {
        title: item.title ?? (typeof item.body === 'string' ? item.body.slice(0, 48) : 'Journal entry'),
        meta: item.entryDate ? dateLabel(item.entryDate) : 'Journal',
      };
  }
}

function priorityLevel(p: number | undefined | null): 'none' | 'low' | 'med' | 'high' {
  if (p == null) return 'none';
  if (p >= 3) return 'high';
  if (p === 2) return 'med';
  if (p === 1) return 'low';
  return 'none';
}

function dateLabel(value: string): string {
  try {
    const d = parseISO(value);
    return isValid(d) ? format(d, 'EEE') : value;
  } catch {
    return value;
  }
}

function whenLabel(value: number | string): string {
  const d = typeof value === 'number' ? new Date(value) : parseISO(value);
  if (!isValid(d)) return 'Pending';
  return format(d, 'EEE h:mm a');
}

const styles = StyleSheet.create({
  chipRow: {
    paddingHorizontal: 4,
    paddingBottom: 14,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  empty: {
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderWidth: 1,
    borderRadius: 18,
  },
  listWrap: {
    paddingHorizontal: 2,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  checkWrap: {
    paddingTop: 1,
  },
  iconTile: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
    flexWrap: 'wrap',
  },
});
