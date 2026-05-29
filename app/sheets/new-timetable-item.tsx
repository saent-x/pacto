import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { FeatureUnavailable } from '@/src/components/features/FeatureUnavailable';
import { Pill, PrimaryButton } from '@/src/components/ui/atoms';
import { PressScale } from '@/src/components/ui/PressScale';
import {
  SheetDurationField,
  SheetIconLabelPicker,
  SheetLabel,
  SheetRow,
  SheetSection,
  SheetSegment,
  SheetShell,
  SheetTimeField,
  SheetTitleField,
  type IconLabelOption,
  type SegmentOption,
} from '@/src/components/ui/SheetShell';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useSession } from '@/src/hooks/useSession';
import { useTimetable } from '@/src/hooks/useTimetables';
import { useTheme } from '@/src/lib/theme';
import {
  DAYS_LETTER,
  itemOptionForTemplate,
  itemOptionsForTemplate,
  normalizeTemplateKey,
  tmplByKey,
  type Who,
  normalizeWho,
} from '@/src/lib/timetables-data';

type Repeat = 'weekly' | 'once';

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

function whoFor(raw: string | undefined): Who {
  return normalizeWho(raw);
}

function repeatFor(raw: string | undefined): Repeat {
  return raw === 'once' ? 'once' : 'weekly';
}

function durationMinutesFromItem(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 90;
  // useTimetable() exposes normalized item duration in hours for rendering.
  // The sheet writes minutes, so convert normalized edit values back.
  return n <= 24 ? Math.round(n * 60) : Math.round(n);
}

function normalizeDayIndex(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return ((Math.trunc(n) % 7) + 7) % 7;
}

function storageDayToUiDay(value: unknown): number {
  return (normalizeDayIndex(value, 0) + 6) % 7;
}

function uiDayToStorageDay(value: unknown): number {
  return (normalizeDayIndex(value, 0) + 1) % 7;
}

// solo-mode: who-for hidden — defaults to me
export default function NewTimetableItem() {
  const gate = useFeatureGate('timetable');
  if (!gate.enabled) return gate.feature ? <FeatureUnavailable feature={gate.feature} /> : null;
  return <NewTimetableItemInner />;
}

function NewTimetableItemInner() {
  const { C, F } = useTheme();
  const params = useLocalSearchParams<{ timetableId?: string; id?: string }>();
  const timetableId =
    typeof params.timetableId === 'string' && params.timetableId.length > 0
      ? params.timetableId
      : null;
  const editId = typeof params.id === 'string' && params.id.length > 0 ? params.id : null;
  const isEdit = Boolean(editId);
  const { add, update, items, timetable, isLoading } = useTimetable(timetableId);
  const { isSolo, partner } = useSession();
  const partnerName = partner?.displayName ?? 'Partner';
  const existingRaw = useMemo(
    () => (isEdit && editId ? (items as any[]).find((i) => i.id === editId) : undefined),
    [isEdit, editId, items],
  );
  const templateKey = normalizeTemplateKey(timetable?.template, timetable?.title);
  const templateMeta = tmplByKey(templateKey);
  const itemOptions = useMemo(() => itemOptionsForTemplate(templateKey), [templateKey]);

  const [title, setTitle] = useState(existingRaw?.title ?? '');
  const [itemKind, setItemKind] = useState<string>(
    existingRaw
      ? itemOptionForTemplate(templateKey, (existingRaw as any).cat).key
      : 'none',
  );
  const [time, setTime] = useState<Date>(() =>
    dateFromHour(existingRaw ? Number((existingRaw as any).start ?? 19) : 19),
  );
  const [dur, setDur] = useState(() => durationMinutesFromItem((existingRaw as any)?.dur));
  const [days, setDays] = useState<number[]>(
    existingRaw ? [storageDayToUiDay((existingRaw as any).day)] : [2],
  );
  const [who, setWho] = useState<Who>(
    existingRaw ? whoFor((existingRaw as any).who) : isSolo ? 'me' : 'both',
  );
  const [repeat, setRepeat] = useState<Repeat>(
    existingRaw ? repeatFor((existingRaw as any).repeat) : 'weekly',
  );
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const effectiveItemKind = itemOptions.some((o) => o.key === itemKind)
    ? itemKind
    : itemOptions[0].key;
  const active = itemOptions.find((o) => o.key === effectiveItemKind) ?? itemOptions[0] ?? templateMeta;
  const toggleDay = (i: number) =>
    setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort()));

  const typeOptions: IconLabelOption<string>[] = useMemo(
    () =>
      itemOptions.map((o) => ({
        key: o.key,
        icon: o.icon,
        label: o.label,
        color: o.color,
      })),
    [itemOptions],
  );
  const whoOptions: SegmentOption<Who>[] = [
    { key: 'me', label: 'Me' },
    { key: 'partner', label: partnerName },
    { key: 'both', label: 'Both' },
  ];
  const repeatOptions: SegmentOption<Repeat>[] = [
    { key: 'weekly', label: 'Weekly' },
    { key: 'once', label: 'Once' },
  ];

  useEffect(() => {
    if (!isEdit || !existingRaw) return;
    setTitle(String((existingRaw as any).title ?? ''));
    setItemKind(itemOptionForTemplate(templateKey, (existingRaw as any).cat).key);
    setTime(dateFromHour(Number((existingRaw as any).start ?? 19)));
    setDur(durationMinutesFromItem((existingRaw as any).dur));
    setDays([storageDayToUiDay((existingRaw as any).day)]);
    setWho(whoFor((existingRaw as any).who));
    setRepeat(repeatFor((existingRaw as any).repeat));
  }, [existingRaw, isEdit, templateKey]);

  const canSave =
    title.trim().length > 0 &&
    !!timetableId &&
    !!timetable &&
    (!isEdit || !!existingRaw) &&
    days.length > 0 &&
    dur > 0 &&
    !saving;

  const onSave = async () => {
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const base = {
        title: title.trim(),
        category: effectiveItemKind,
        icon: active.icon,
        color: active.color,
        ink: active.ink,
        who: isSolo ? 'me' : who,
        repeat,
        startHour: hourFromDate(time),
        duration: dur,
      };
      if (isEdit && editId) {
        await update(editId, { ...base, day: uiDayToStorageDay(days[0]) });
      } else {
        for (const d of days) {
          await add({ ...base, day: uiDayToStorageDay(d) });
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-timetable-item] save failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (!timetableId || !timetable) {
    return (
      <SheetShell
        eyebrow="TIMETABLE ITEM"
        eyebrowColor={templateMeta.color}
        title={isLoading ? 'Loading timetable' : 'Timetable missing'}
      >
        <Text style={{ color: C.ink2, fontFamily: F.body, fontSize: 14, lineHeight: 20 }}>
          {isLoading
            ? 'Loading this timetable…'
            : 'This timetable could not be found or is no longer available in this space.'}
        </Text>
      </SheetShell>
    );
  }

  if (isEdit && !existingRaw) {
    return (
      <SheetShell
        eyebrow="TIMETABLE ITEM"
        eyebrowColor={active.color}
        title={isLoading ? 'Loading item' : 'Item missing'}
      >
        <Text style={{ color: C.ink2, fontFamily: F.body, fontSize: 14, lineHeight: 20 }}>
          {isLoading
            ? 'Loading this timetable item…'
            : 'This timetable item could not be found or is no longer available in this space.'}
        </Text>
      </SheetShell>
    );
  }

  return (
    <SheetShell
      eyebrow={`${isEdit ? 'EDIT' : 'NEW'} ITEM · ${active.label.toUpperCase()}`}
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

      <SheetSection title={templateKey === 'meals' ? 'Meal' : 'Type'}>
        <SheetIconLabelPicker
          options={typeOptions}
          selected={effectiveItemKind}
          onChange={setItemKind}
          testIDPrefix="new-timetable-item-cat"
        />
      </SheetSection>

      <SheetRow style={{ marginTop: 22 }}>
        <View style={{ flex: 1 }}>
          <SheetLabel style={{ marginBottom: 10 }}>Time</SheetLabel>
          <SheetTimeField
            pressTestID="new-timetable-item-time"
            value={time}
            onChange={setTime}
            accent={active.color}
          />
        </View>
        <View style={{ flex: 1 }}>
          <SheetLabel style={{ marginBottom: 10 }}>Duration</SheetLabel>
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
                accessibilityState={{ selected: sel }}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => undefined);
                  toggleDay(i);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: sel ? active.color : C.bgCard,
                  borderWidth: 1,
                  borderColor: sel ? active.color : C.lineColor,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: F.displayBold,
                    fontSize: 14,
                    color: sel ? active.ink : C.ink2,
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
          <SheetLabel style={{ marginBottom: 10 }}>Repeats</SheetLabel>
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
            <SheetLabel style={{ marginBottom: 10 }}>For</SheetLabel>
            <SheetSegment
              options={whoOptions}
              selected={who}
              onChange={setWho}
              testIDPrefix="new-timetable-item-who"
            />
          </View>
          <View style={{ flex: 1 }}>
            <SheetLabel style={{ marginBottom: 10 }}>Repeats</SheetLabel>
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
