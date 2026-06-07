import { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { api } from '@cvx/_generated/api';
import { Id } from '@cvx/_generated/dataModel';
import { useColors } from '@/theme';
import { T, Kick, Icon, Press, RoundBtn, Numeral, QScreen, SubBar } from '@/ui';
import { confirmDelete } from '@/lib/confirm';
import {
  formatTimetableDurationMinutes,
  formatTimetableTimeLabel,
  formatTimetableTimeLabelMinutes,
  normalizeTimetableDuration,
  normalizeTimetableTime,
  timetableDurationMinutes,
  timetableTimeMinutes,
  TIMETABLE_DURATION_DEFAULT_MINUTES,
} from '@/lib/timetableTime';

type Item = { time: string; title: string; dur?: string };
type Colors = ReturnType<typeof useColors>;
type StepState = 'past' | 'current' | 'upcoming';

function relTimeHint(deltaMin: number) {
  let d = deltaMin;
  if (d < 0) d += 24 * 60;
  if (d < 1) return 'now';
  if (d < 60) return `starts in ${d} min`;
  const h = Math.floor(d / 60);
  const m = d % 60;
  return m ? `starts in ${h}h ${m}m` : `starts in ${h}h`;
}

// One step on the rail. Fades/slides in on mount (staggered by index). Past steps
// recede, the in-progress step leads, and the rail segment beneath scales with duration.
function TimelineStep({
  index,
  time,
  title,
  durLabel,
  relHint,
  state,
  barH,
  isLast,
  onPress,
  onDelete,
  C,
}: {
  index: number;
  time: string;
  title: string;
  durLabel: string;
  relHint?: string;
  state: StepState;
  barH: number;
  isLast: boolean;
  onPress: () => void;
  onDelete: () => void;
  C: Colors;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(index * 50, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const aStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * 10 }],
  }));

  const past = state === 'past';
  const current = state === 'current';
  const timeColor = past ? C.ink4 : current ? C.accent : C.ink2;
  const titleColor = past ? C.ink3 : C.ink;
  const dotColor = past ? C.ink4 : C.accent;
  const barColor = past ? C.hair : current ? C.accent : C.accentSoft;

  return (
    <Animated.View style={aStyle}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {/* Tap the step body to edit it in the sheet. */}
        <Press onPress={onPress} haptic style={{ flex: 1, flexDirection: 'row', gap: 16 }}>
          <Numeral size={15} color={timeColor} numberOfLines={1} style={{ width: 74, textAlign: 'right' }}>
            {time}
          </Numeral>
          <View style={{ width: 13, alignItems: 'center', paddingTop: 5 }}>
            {current ? (
              <View style={{ width: 13, height: 13, borderRadius: 13, borderWidth: 3.5, borderColor: C.accent, backgroundColor: C.bg }} />
            ) : (
              <View style={{ width: 9, height: 9, borderRadius: 9, backgroundColor: dotColor }} />
            )}
            {!isLast && <View style={{ flex: 1, width: 3, borderRadius: 3, backgroundColor: barColor, marginTop: 5 }} />}
          </View>
          <View style={{ flex: 1, minHeight: isLast ? undefined : barH, paddingBottom: isLast ? 4 : 26 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T size={17} weight={600} numberOfLines={1} color={titleColor} style={{ flexShrink: 1 }}>
                {title}
              </T>
              {current && <Kick color={C.accent}>Now</Kick>}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
              <Kick color={past ? C.ink4 : C.ink3}>{durLabel}</Kick>
              {!!relHint && (
                <Kick color={C.accent} style={{ marginLeft: 7 }}>
                  {`· ${relHint}`}
                </Kick>
              )}
            </View>
          </View>
        </Press>
        {/* Delete affordance — sibling Press so it never triggers the edit tap. */}
        <Press onPress={onDelete} haptic hitSlop={8} accessibilityLabel={`Delete ${title}`} style={{ paddingTop: 5, paddingLeft: 10 }}>
          <Icon name="x" size={17} color={C.ink4} strokeWidth={2} />
        </Press>
      </View>
    </Animated.View>
  );
}

// The current-time line — a softly pulsing ring on the rail with the clock time.
function NowMarker({ label, C }: { label: string; C: Colors }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.4 }],
    opacity: 1 - pulse.value * 0.45,
  }));
  return (
    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center', marginVertical: 16 }}>
      <Numeral size={13} color={C.accent} numberOfLines={1} style={{ width: 74, textAlign: 'right' }}>
        {label}
      </Numeral>
      <View style={{ width: 13, alignItems: 'center' }}>
        <Animated.View
          style={[
            { width: 11, height: 11, borderRadius: 11, borderWidth: 2, borderColor: C.accent, backgroundColor: C.bg },
            ringStyle,
          ]}
        />
      </View>
      <View style={{ flex: 1, height: 1.5, backgroundColor: C.accent, borderRadius: 1 }} />
    </View>
  );
}

export default function TimetableDetail() {
  const C = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ttId = id as Id<'timetables'>;
  const tt = useQuery(api.timetables.getTimetable, id ? { timetableId: ttId } : 'skip');
  const update = useMutation(api.timetables.updateTimetable);
  const remove = useMutation(api.timetables.removeTimetable);

  const title = tt?.title ?? '';
  const items: Item[] = (tt?.items ?? []).map((it) => ({
    time: normalizeTimetableTime(it.time),
    title: it.title,
    dur: normalizeTimetableDuration(it.dur ?? ''),
  }));

  const totalMins = items.reduce((s, it) => s + timetableDurationMinutes(it.dur, TIMETABLE_DURATION_DEFAULT_MINUTES), 0);
  const totalHrs = Math.round(totalMins / 60);
  const dayCount = tt?.days ?? items.length;
  const defaultDur = formatTimetableDurationMinutes(TIMETABLE_DURATION_DEFAULT_MINUTES);

  // Current clock → per-step state + the "now" line position.
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowLabel = formatTimetableTimeLabelMinutes(nowMin);
  const stepStateOf = (it: Item): StepState => {
    const start = timetableTimeMinutes(it.time, '9:00');
    const end = start + timetableDurationMinutes(it.dur, TIMETABLE_DURATION_DEFAULT_MINUTES);
    if (start <= nowMin && nowMin < end) return 'current';
    if (end <= nowMin) return 'past';
    return 'upcoming';
  };
  const hasCurrent = items.some((it) => stepStateOf(it) === 'current');
  let nowIdx = items.findIndex((it) => timetableTimeMinutes(it.time, '9:00') > nowMin);
  if (nowIdx === -1) nowIdx = items.length;

  const openAddStep = () => router.push(`/new/timetable-step?id=${ttId}` as any);
  const openEditStep = (i: number) => router.push(`/new/timetable-step?id=${ttId}&index=${i}` as any);

  const deleteTimetable = () =>
    confirmDelete({
      title: 'Delete timetable?',
      message: 'This removes the timetable and all of its steps.',
      onConfirm: async () => {
        await remove({ timetableId: ttId });
        router.back();
      },
    });
  const deleteStep = (i: number) =>
    confirmDelete({
      title: 'Delete step?',
      onConfirm: async () => {
        await update({ timetableId: ttId, items: items.filter((_, idx) => idx !== i) });
      },
    });

  return (
    <QScreen
      loading={tt === undefined}
      header={
        <SubBar
          kicker={title || 'Timetable'}
          right={
            <>
              <RoundBtn name="trash" onPress={deleteTimetable} color={C.ink2} accessibilityLabel="Delete timetable" />
              <RoundBtn name="plus" fill={C.ink} color={C.bg} onPress={openAddStep} accessibilityLabel="Add step" />
            </>
          }
        />
      }
    >
      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: 26, marginBottom: 30 }}>
        {(
          [
            [String(items.length), items.length === 1 ? 'item' : 'items'],
            [String(dayCount), 'days'],
            [String(totalHrs), 'hrs'],
          ] as const
        ).map(([n, l]) => (
          <View key={l}>
            <Numeral size={40}>{n}</Numeral>
            <Kick style={{ marginTop: 2 }}>{l}</Kick>
          </View>
        ))}
      </View>

      {items.length === 0 ? (
        <Press onPress={openAddStep} haptic style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 15 }}>
          <Icon name="plus" size={15} color={C.ink4} strokeWidth={2} />
          <T size={15.5} weight={500} color={C.ink4}>
            Add the first step
          </T>
        </Press>
      ) : (
        <View>
          {items.map((it, i) => {
            const durMin = timetableDurationMinutes(it.dur, TIMETABLE_DURATION_DEFAULT_MINUTES);
            // The rail segment beneath a step scales with its duration (~1.4px / min) → the rail reads as a time ruler.
            const barH = Math.round(Math.min(320, Math.max(92, durMin * 1.4)));
            const isLast = i === items.length - 1;
            const isNext = i === nowIdx;
            return (
              <View key={i}>
                {!hasCurrent && i === nowIdx && <NowMarker label={nowLabel} C={C} />}
                <TimelineStep
                  index={i}
                  time={formatTimetableTimeLabel(it.time)}
                  title={it.title || 'Untitled'}
                  durLabel={normalizeTimetableDuration(it.dur ?? '', defaultDur) || defaultDur}
                  relHint={isNext ? relTimeHint(timetableTimeMinutes(it.time, '9:00') - nowMin) : undefined}
                  state={stepStateOf(it)}
                  barH={barH}
                  isLast={isLast}
                  onPress={() => openEditStep(i)}
                  onDelete={() => deleteStep(i)}
                  C={C}
                />
              </View>
            );
          })}
          {!hasCurrent && nowIdx >= items.length && <NowMarker label={nowLabel} C={C} />}
        </View>
      )}
    </QScreen>
  );
}
