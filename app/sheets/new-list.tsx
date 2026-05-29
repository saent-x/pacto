import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Text } from 'react-native';
import { FeatureUnavailable } from '@/src/components/features/FeatureUnavailable';
import { PrimaryButton } from '@/src/components/ui/atoms';
import {
  SheetIconLabelPicker,
  SheetSection,
  SheetShell,
  SheetTitleField,
  type IconLabelOption,
} from '@/src/components/ui/SheetShell';
import { useTheme } from '@/src/lib/theme';
import { pickRandomUnusedValue } from '@/src/lib/random-unused';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useSession } from '@/src/hooks/useSession';
import { useTaskLists, type PastelKey } from '@/src/hooks/useTaskLists';

const COLOR_KEYS: PastelKey[] = ['peach', 'lavender', 'butter', 'mint', 'rose', 'sky', 'gold', 'journal'];
type Visibility = 'personal' | 'shared';

function isPastelKey(value: unknown): value is PastelKey {
  return typeof value === 'string' && COLOR_KEYS.includes(value as PastelKey);
}

export default function NewList() {
  const gate = useFeatureGate('tasks');
  if (!gate.enabled) return gate.feature ? <FeatureUnavailable feature={gate.feature} /> : null;
  return <NewListInner />;
}

function NewListInner() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { C } = useTheme();
  const { create, update, lists, isLoading } = useTaskLists();
  const { isSolo } = useSession();
  const existing = useMemo(
    () => (isEdit && id ? lists.find((l) => l.id === id) : undefined),
    [isEdit, id, lists],
  );
  const existingColorKey = useMemo(
    () => (isPastelKey(existing?.colorKey) ? existing.colorKey : null),
    [existing?.colorKey],
  );
  const defaultColorKey = useMemo(
    () => pickRandomUnusedValue(COLOR_KEYS, lists.map((list) => list.colorKey)),
    [lists],
  );

  const [name, setName] = useState(existing?.name ?? '');
  const [colorKey, setColorKey] = useState<PastelKey>(
    existingColorKey ?? defaultColorKey,
  );
  const [visibility, setVisibility] = useState<Visibility>(
    () => (isSolo || existing?.scope === 'personal' ? 'personal' : 'shared'),
  );
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const color = (C as any)[colorKey] as string;
  const canSave = name.trim().length > 0 && (!isEdit || !!existing) && !saving;
  const visibilityOptions = useMemo<IconLabelOption<Visibility>[]>(
    () => [
      { key: 'personal', icon: 'lock', label: 'Just me', color: C.sky },
      { key: 'shared', icon: 'users', label: 'Together', color: C.gold },
    ],
    [C.gold, C.sky],
  );

  useEffect(() => {
    if (isEdit) {
      if (!existing) return;
      setName(String(existing.name ?? ''));
      setColorKey(existingColorKey ?? defaultColorKey);
      setVisibility(isSolo || existing.scope === 'personal' ? 'personal' : 'shared');
      return;
    }
    setColorKey(defaultColorKey);
    setVisibility(isSolo ? 'personal' : 'shared');
  }, [defaultColorKey, existing, existingColorKey, isEdit, isSolo]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (isEdit && id) {
        await update(id, {
          name: trimmed,
          colorKey,
          scope: isSolo ? 'personal' : visibility,
        });
      } else {
        await create({ name: trimmed, colorKey, scope: isSolo ? 'personal' : visibility });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-list] save failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (isEdit && !existing) {
    return (
      <SheetShell
        eyebrow="LIST"
        eyebrowColor={color}
        title={isLoading ? 'Loading list' : 'List missing'}
      >
        <Text style={{ color: C.ink2 }}>
          {isLoading
            ? 'Loading this list…'
            : 'This list could not be found or is no longer available in this space.'}
        </Text>
      </SheetShell>
    );
  }

  return (
    <SheetShell
      eyebrow={isEdit ? 'EDIT LIST' : 'NEW LIST'}
      eyebrowColor={color}
      title={isEdit ? 'Edit list' : 'Make a list'}
      footer={
        <PrimaryButton icon={isEdit ? 'check' : 'plus'} onPress={handleSave} disabled={!canSave}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create list'}
        </PrimaryButton>
      }
    >
      <SheetSection title="Name" first>
        <SheetTitleField
          testID="new-list-name-input"
          value={name}
          onChangeText={setName}
          placeholder="Name your list…"
          accent={color}
        />
      </SheetSection>

      {!isSolo ? (
        <SheetSection title="Visibility">
          <SheetIconLabelPicker
            options={visibilityOptions}
            selected={visibility}
            onChange={setVisibility}
            testIDPrefix="new-list-visibility"
          />
        </SheetSection>
      ) : null}

    </SheetShell>
  );
}
