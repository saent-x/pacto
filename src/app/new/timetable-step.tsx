import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { Id } from '@cvx/_generated/dataModel';
import { useColors } from '@/theme';
import { Kick, Icon, Press, Mono } from '@/ui';
import { SheetShell, QField } from '@/features/sheets/parts';
import { confirmDelete } from '@/lib/confirm';
import {
  formatTimetableDurationMinutes,
  formatTimetableTimeLabel,
  formatTimetableTimeMinutes,
  normalizeTimetableDuration,
  normalizeTimetableTime,
  timetableDurationMinutes,
  timetableTimeMinutes,
  TIMETABLE_DURATION_DEFAULT_MINUTES,
  TIMETABLE_DURATION_MAX_MINUTES,
  TIMETABLE_DURATION_MIN_MINUTES,
  TIMETABLE_DURATION_STEP_MINUTES,
  TIMETABLE_TIME_STEP_MINUTES,
} from '@/lib/timetableTime';

type Item = { time: string; title: string; dur?: string };

const HOLD_START_MS = 360;
const HOLD_INITIAL_REPEAT_MS = 220;
const HOLD_MIN_REPEAT_MS = 80;

// A capsule −/+ stepper. Tap nudges by one step; press-and-hold auto-repeats (accelerating).
function Stepper({ display, accent, onAdjust }: { display: string; accent?: boolean; onAdjust: (dir: 1 | -1) => void }) {
  const C = useColors();
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);

  const clear = () => {
    if (startTimer.current) {
      clearTimeout(startTimer.current);
      startTimer.current = null;
    }
    if (repeatTimer.current) {
      clearTimeout(repeatTimer.current);
      repeatTimer.current = null;
    }
  };
  useEffect(() => () => clear(), []);

  const repeat = (dir: 1 | -1, delay: number) => {
    onAdjust(dir);
    const next = Math.max(HOLD_MIN_REPEAT_MS, Math.floor(delay * 0.78));
    repeatTimer.current = setTimeout(() => repeat(dir, next), delay);
  };
  const start = (dir: 1 | -1) => {
    clear();
    held.current = false;
    startTimer.current = setTimeout(() => {
      held.current = true;
      repeat(dir, HOLD_INITIAL_REPEAT_MS);
    }, HOLD_START_MS);
  };
  // A hold fires repeats AND a trailing onPress — swallow that trailing tap.
  const tap = (dir: 1 | -1) => {
    if (held.current) {
      held.current = false;
      return;
    }
    onAdjust(dir);
  };

  const iconColor = accent ? C.accent : C.ink3;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 999,
        overflow: 'hidden',
      }}
    >
      <Press
        onPress={() => tap(-1)}
        onPressIn={() => start(-1)}
        onPressOut={clear}
        haptic
        hitSlop={8}
        accessibilityLabel="Decrease"
        style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="minus" size={16} color={iconColor} strokeWidth={2.2} />
      </Press>
      <Mono size={15} weight={600} color={accent ? C.accent : C.ink} style={{ minWidth: 96, textAlign: 'center' }}>
        {display}
      </Mono>
      <Press
        onPress={() => tap(1)}
        onPressIn={() => start(1)}
        onPressOut={clear}
        haptic
        hitSlop={8}
        accessibilityLabel="Increase"
        style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="plus" size={16} color={iconColor} strokeWidth={2.2} />
      </Press>
    </View>
  );
}

export default function NewTimetableStep() {
  const router = useRouter();
  const { id, index } = useLocalSearchParams<{ id: string; index?: string }>();
  const ttId = id as Id<'timetables'>;
  const stepIndex = index != null && index !== '' ? Number(index) : null;
  const editing = stepIndex != null;

  const tt = useQuery(api.timetables.getTimetable, id ? { timetableId: ttId } : 'skip');
  const update = useMutation(api.timetables.updateTimetable);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The full list, normalized — submit rewrites this array with the edited step spliced in.
  const loadedItems: Item[] = (tt?.items ?? []).map((it) => ({
    time: normalizeTimetableTime(it.time),
    title: it.title,
    dur: normalizeTimetableDuration(it.dur ?? ''),
  }));
  const existing = editing && stepIndex != null ? loadedItems[stepIndex] : undefined;

  const defaultDur = formatTimetableDurationMinutes(TIMETABLE_DURATION_DEFAULT_MINUTES);
  const baseTime = existing?.time ?? '9:00';
  const baseDur = existing?.dur || defaultDur;

  // Drafts default to the existing step (edit) or sensible defaults (add).
  const [time, setTime] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [dur, setDur] = useState<string | null>(null);

  const stepTime = time ?? baseTime;
  const stepTitle = title ?? existing?.title ?? '';
  const stepDur = dur ?? baseDur;

  const adjustTime = (dir: 1 | -1) =>
    setTime((prev) =>
      formatTimetableTimeMinutes(timetableTimeMinutes(prev ?? baseTime, '9:00') + dir * TIMETABLE_TIME_STEP_MINUTES),
    );
  const adjustDur = (dir: 1 | -1) =>
    setDur((prev) => {
      const cur = timetableDurationMinutes(prev ?? baseDur, TIMETABLE_DURATION_DEFAULT_MINUTES);
      const minutes = Math.min(
        TIMETABLE_DURATION_MAX_MINUTES,
        Math.max(TIMETABLE_DURATION_MIN_MINUTES, cur + dir * TIMETABLE_DURATION_STEP_MINUTES),
      );
      return formatTimetableDurationMinutes(minutes);
    });

  const submit = async () => {
    if (!id || busy) return;
    setBusy(true);
    setError(null);
    const step: Item = { time: stepTime, title: stepTitle.trim(), dur: stepDur };
    const items = [...loadedItems];
    if (editing && stepIndex != null) items[stepIndex] = step;
    else items.push(step);
    // Keep storage in time order — the timeline renders insertion order, so an
    // out-of-order add would misplace the Now marker and next-step countdown.
    items.sort((a, b) => timetableTimeMinutes(a.time, '9:00') - timetableTimeMinutes(b.time, '9:00'));
    try {
      await update({ timetableId: ttId, items });
      router.back();
    } catch {
      setError("Couldn't save — check your connection and try again.");
      setBusy(false);
    }
  };

  const onDelete =
    editing && stepIndex != null
      ? () =>
          confirmDelete({
            title: 'Delete step?',
            onConfirm: async () => {
              const items = loadedItems.filter((_, i) => i !== stepIndex);
              await update({ timetableId: ttId, items });
              router.back();
            },
          })
      : undefined;

  return (
    <SheetShell
      kicker={editing ? 'Edit step' : 'New step'}
      title={tt?.title || 'Timetable'}
      footerLabel={busy ? 'Saving…' : editing ? 'Save step' : 'Add step'}
      footerIcon={editing ? 'check' : 'plus'}
      onSubmit={submit}
      disabled={!stepTitle.trim() || busy}
      onDelete={onDelete}
      loading={tt === undefined}
      busy={busy}
      error={error}
    >
      <View style={{ marginBottom: 24 }}>
        <Kick style={{ marginBottom: 10 }}>Starts at</Kick>
        <Stepper accent display={formatTimetableTimeLabel(stepTime)} onAdjust={adjustTime} />
      </View>

      <QField label="What happens" value={stepTitle} onChangeText={setTitle} placeholder="Morning walk" />

      <View style={{ marginBottom: 24 }}>
        <Kick style={{ marginBottom: 10 }}>How long</Kick>
        <Stepper display={normalizeTimetableDuration(stepDur, defaultDur) || defaultDur} onAdjust={adjustDur} />
      </View>
    </SheetShell>
  );
}
