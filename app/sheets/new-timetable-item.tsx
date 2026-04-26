import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Overline, Pill, PrimaryButton } from '@/src/components/ui/atoms';
import { IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import {
  SheetDurationField,
  SheetIconLabelPicker,
  SheetRow,
  SheetSection,
  SheetSegment,
  SheetShell,
  SheetTimeField,
  SheetTitleField,
  type IconLabelOption,
  type SegmentOption,
} from '@/src/components/ui/SheetShell';
import { useSession } from '@/src/hooks/useSession';
import { useTimetable } from '@/src/hooks/useTimetables';
import { useTheme } from '@/src/lib/theme';
import { DAYS_LETTER } from '@/src/lib/timetables-data';

type Who = 'me' | 'sofia' | 'both';
type Cat = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
type Repeat = 'weekly' | 'once';

const CATS: { k: Cat; color: string; ink: string; icon: IconName }[] = [
  { k: 'Breakfast', color: '#F4A68C', ink: '#3A1F14', icon: 'coffee' },
  { k: 'Lunch', color: '#A8D8B9', ink: '#0F2C1A', icon: 'feather' },
  { k: 'Dinner', color: '#F2D86A', ink: '#3A2E08', icon: 'coffee' },
  { k: 'Snack', color: '#D89BA8', ink: '#3A1520', icon: 'gift' },
];

function dateFromHour(startHour: number): Date {
  const d = new Date();
  const h = Math.floor(startHour);
  const m = Math.round((startHour - h) * 60);
  d.setHours(h, m, 0, 0);
  return d;
}

function hourFromDate(d: Date): number {
  return d.getHours() + d.getMinutes() / 60;
}

function categoryFor(raw: string | undefined): Cat {
  if (raw === 'breakfast') return 'Breakfast';
  if (raw === 'lunch') return 'Lunch';
  if (raw === 'snack') return 'Snack';
  return 'Dinner';
}

function whoFor(raw: string | undefined): Who {
  if (raw === 'me' || raw === 'sofia' || raw === 'both') return raw;
  return 'both';
}

function repeatFor(raw: string | undefined): Repeat {
  return raw === 'once' ? 'once' : 'weekly';
}

// solo-mode: who-for hidden — defaults to me
export default function NewTimetableItem() {
  const { C, F } = useTheme();
  const params = useLocalSearchParams<{ timetableId?: string; id?: string }>();
  const timetableId =
    typeof params.timetableId === 'string' && params.timetableId.length > 0
      ? params.timetableId
      : null;
  const editId = typeof params.id === 'string' && params.id.length > 0 ? params.id : null;
  const isEdit = Boolean(editId);
  const { add, update, items } = useTimetable(timetableId);
  const { isSolo, partner } = useSession();
  const partnerName = partner?.displayName ?? 'Partner';
  const existingRaw = useMemo(
    () => (isEdit && editId ? (items as any[]).find((i) => i.id === editId) : undefined),
    [isEdit, editId, items],
  );

  const [title, setTitle] = useState(existingRaw?.title ?? '');
  const [cat, setCat] = useState<Cat>(
    existingRaw ? categoryFor((existingRaw as any).cat) : 'Dinner',
  );
  const [time, setTime] = useState<Date>(() =>
    dateFromHour(existingRaw ? Number((existingRaw as any).start ?? 19) : 19),
  );
  const [timeOpen, setTimeOpen] = useState(false);
  const [dur, setDur] = useState(existingRaw ? Number((existingRaw as any).dur ?? 90) : 90);
  const [days, setDays] = useState<number[]>(
    existingRaw ? [Number((existingRaw as any).day ?? 2)] : [2],
  );
  const [who, setWho] = useState<Who>(
    existingRaw ? whoFor((existingRaw as any).who) : isSolo ? 'me' : 'both',
  );
  const [repeat, setRepeat] = useState<Repeat>(
    existingRaw ? repeatFor((existingRaw as any).repeat) : 'weekly',
  );
  const [saving, setSaving] = useState(false);

  const active = CATS.find((c) => c.k === cat) ?? CATS[0];
  const toggleDay = (i: number) =>
    setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort()));

  const catOptions: IconLabelOption<Cat>[] = useMemo(
    () => CATS.map((c) => ({ key: c.k, icon: c.icon, label: c.k, color: c.color })),
    [],
  );
  const whoOptions: SegmentOption<Who>[] = [
    { key: 'me', label: 'Me' },
    { key: 'sofia', label: partnerName },
    { key: 'both', label: 'Both' },
  ];
  const repeatOptions: SegmentOption<Repeat>[] = [
    { key: 'weekly', label: 'Weekly' },
    { key: 'once', label: 'Once' },
  ];

  const canSave =
    title.trim().length > 0 && !!timetableId && days.length > 0 && dur > 0 && !saving;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const base = {
        title: title.trim(),
        category: cat.toLowerCase(),
        icon: active.icon,
        color: active.color,
        ink: active.ink,
        who: isSolo ? 'me' : who,
        repeat,
        startHour: hourFromDate(time),
        duration: dur,
      };
      if (isEdit && editId) {
        await update(editId, { ...base, day: days[0] });
      } else {
        for (const d of days) {
          await add({ ...base, day: d });
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-timetable-item] save failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      eyebrow={`${isEdit ? 'EDIT' : 'NEW'} ITEM · ${cat.toUpperCase()}`}
      eyebrowColor={active.color}
      title={isEdit ? 'Edit item' : 'New item'}
      footer={
        <PrimaryButton icon={isEdit ? 'check' : 'plus'} onPress={onSave} disabled={!canSave}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add to timetable'}
        </PrimaryButton>
      }
    >
      <SheetSection title="Title" first>
        <SheetTitleField
          testID="new-timetable-item-title-input"
          value={title}
          onChangeText={setTitle}
          placeholder="Name this item…"
          accent={active.color}
        />
      </SheetSection>

      <SheetSection title="Category">
        <SheetIconLabelPicker
          options={catOptions}
          selected={cat}
          onChange={setCat}
          testIDPrefix="new-timetable-item-cat"
        />
      </SheetSection>

      <SheetRow style={{ marginTop: 22 }}>
        <View style={{ flex: 1 }}>
          <Overline style={{ marginBottom: 10 }}>Time</Overline>
          <SheetTimeField
            pressTestID="new-timetable-item-time"
            value={time}
            onChange={setTime}
            accent={active.color}
            open={timeOpen}
            onPress={() => setTimeOpen((v) => !v)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Overline style={{ marginBottom: 10 }}>Duration</Overline>
          <SheetDurationField
            pressTestID="new-timetable-item-dur-input"
            minutes={dur}
            onChange={setDur}
            accent={active.color}
          />
        </View>
      </SheetRow>

      <SheetSection title="Days">
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {DAYS_LETTER.map((d, i) => {
            const sel = days.includes(i);
            return (
              <PressScale
                key={i}
                testID={`new-timetable-item-day-${i}`}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => undefined);
                  toggleDay(i);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: sel ? active.color : C.card,
                  borderWidth: 1,
                  borderColor: sel ? active.color : C.line,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: F.displayBold,
                    fontSize: 14,
                    color: sel ? active.ink : C.mist,
                  }}
                >
                  {d}
                </Text>
              </PressScale>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
          {[
            { l: 'Every day', d: [0, 1, 2, 3, 4, 5, 6] },
            { l: 'Weekdays', d: [0, 1, 2, 3, 4] },
            { l: 'Weekends', d: [5, 6] },
          ].map((p) => (
            <Pill key={p.l} testID={`new-timetable-item-preset-${p.l}`} onPress={() => setDays(p.d)}>
              {p.l}
            </Pill>
          ))}
        </View>
      </SheetSection>

      {isSolo ? (
        <View style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Repeats</Overline>
          <SheetSegment
            options={repeatOptions}
            selected={repeat}
            onChange={setRepeat}
            testIDPrefix="new-timetable-item-repeat"
          />
        </View>
      ) : (
        <SheetRow style={{ marginTop: 22 }}>
          <View style={{ flex: 1 }}>
            <Overline style={{ marginBottom: 10 }}>For</Overline>
            <SheetSegment
              options={whoOptions}
              selected={who}
              onChange={setWho}
              testIDPrefix="new-timetable-item-who"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Overline style={{ marginBottom: 10 }}>Repeats</Overline>
            <SheetSegment
              options={repeatOptions}
              selected={repeat}
              onChange={setRepeat}
              testIDPrefix="new-timetable-item-repeat"
            />
          </View>
        </SheetRow>
      )}
    </SheetShell>
  );
}
