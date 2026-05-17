import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { FeatureUnavailable } from '@/src/components/features/FeatureUnavailable';
import { PrimaryButton } from '@/src/components/ui/atoms';
import { IconName } from '@/src/components/ui/Icon';
import {
  SheetColorGrid,
  SheetDateField,
  SheetIconGrid,
  SheetSection,
  SheetShell,
  SheetTitleField,
  SheetToggleRow,
  type IconOption,
} from '@/src/components/ui/SheetShell';
import { useMilestones } from '@/src/hooks/useMilestones';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';

const ICONS: IconOption<IconName>[] = [
  { key: 'heart', icon: 'heart' },
  { key: 'star', icon: 'star' },
  { key: 'home', icon: 'home' },
  { key: 'mapPin', icon: 'mapPin' },
  { key: 'gift', icon: 'gift' },
  { key: 'coffee', icon: 'coffee' },
  { key: 'briefcase', icon: 'briefcase' },
  { key: 'camera', icon: 'camera' },
  { key: 'music', icon: 'music' },
];

// solo-mode: repeat copy adjusted (no partner)
export default function NewMilestone() {
  const gate = useFeatureGate('memories');
  if (!gate.enabled) return gate.feature ? <FeatureUnavailable feature={gate.feature} /> : null;
  return <NewMilestoneInner />;
}

function NewMilestoneInner() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { C } = useTheme();
  const { create, update, milestones } = useMilestones();
  const { isSolo } = useSession();
  const existing = useMemo(
    () => (isEdit && id ? milestones.find((m) => m.id === id) : undefined),
    [isEdit, id, milestones],
  );
  const colorOptions = useMemo(
    () =>
      [C.rose, C.peach, C.butter, C.mint, C.sky, C.lavender, C.gold].map((v) => ({
        key: v,
        value: v,
      })),
    [C],
  );

  const [title, setTitle] = useState(existing?.title ?? '');
  const [icon, setIcon] = useState<IconName>((existing?.icon as IconName) ?? 'heart');
  const [color, setColor] = useState<string>(existing?.color ?? C.rose);
  const [repeat, setRepeat] = useState(Boolean(existing?.repeatYearly));
  const [date, setDate] = useState<Date>(() =>
    existing?.date ? new Date(`${existing.date}T00:00:00`) : new Date(),
  );
  const [dateOpen, setDateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && !saving;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        date: format(date, 'yyyy-MM-dd'),
        icon,
        color,
        repeatYearly: repeat,
      };
      if (isEdit && id) {
        await update(id, payload);
      } else {
        await create(payload);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-milestone] save failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      eyebrow={isEdit ? 'EDIT MILESTONE' : 'NEW MILESTONE'}
      eyebrowColor={color}
      title={isEdit ? 'Edit milestone' : 'New milestone'}
      footer={
        <PrimaryButton
          icon={isEdit ? 'check' : 'star'}
          onPress={onSave}
          disabled={!canSave}
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save milestone'}
        </PrimaryButton>
      }
    >
      <SheetSection title="What is it" first>
        <SheetTitleField
          testID="new-milestone-title-input"
          value={title}
          onChangeText={setTitle}
          placeholder="Name this milestone…"
          accent={color}
        />
      </SheetSection>

      <SheetSection title="When">
        <View style={{ flexDirection: 'row' }}>
          <SheetDateField
            pressTestID="new-milestone-date"
            value={date}
            onChange={setDate}
            accent={color}
            open={dateOpen}
            onPress={() => setDateOpen((v) => !v)}
          />
        </View>
      </SheetSection>

      <SheetSection title="Icon">
        <SheetIconGrid
          options={ICONS}
          selected={icon}
          onChange={setIcon}
          accent={color}
          testIDPrefix="new-milestone-icon"
        />
      </SheetSection>

      <SheetSection title="Color">
        <SheetColorGrid
          colors={colorOptions}
          selected={color}
          onChange={setColor}
          testIDPrefix="new-milestone-color"
        />
      </SheetSection>

      <View style={{ marginTop: 22 }}>
        <SheetToggleRow
          icon="repeat"
          label="Remind me every year"
          sublabel={
            repeat
              ? isSolo
                ? 'We’ll nudge you 3 days before'
                : 'We’ll nudge you both 3 days before'
              : 'One-time only'
          }
          value={repeat}
          onChange={setRepeat}
          accent={color}
          pressTestID="new-milestone-repeat-toggle"
        />
      </View>
    </SheetShell>
  );
}
