import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { PrimaryButton } from '@/src/components/ui/atoms';
import { IconName } from '@/src/components/ui/Icon';
import {
  SheetColorGrid,
  SheetIconGrid,
  SheetSection,
  SheetShell,
  SheetTitleField,
} from '@/src/components/ui/SheetShell';
import { useTheme } from '@/src/lib/theme';
import { useTaskLists, type PastelKey } from '@/src/hooks/useTaskLists';

const ICONS: { key: IconName; icon: IconName }[] = [
  { key: 'shoppingBag', icon: 'shoppingBag' },
  { key: 'home', icon: 'home' },
  { key: 'heart', icon: 'heart' },
  { key: 'briefcase', icon: 'briefcase' },
  { key: 'book', icon: 'book' },
  { key: 'gift', icon: 'gift' },
  { key: 'mapPin', icon: 'mapPin' },
  { key: 'coffee', icon: 'coffee' },
  { key: 'music', icon: 'music' },
  { key: 'camera', icon: 'camera' },
];

const COLOR_KEYS: PastelKey[] = ['peach', 'lavender', 'butter', 'mint', 'rose', 'sky', 'gold', 'journal'];

export default function NewList() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { C } = useTheme();
  const { create, update, lists } = useTaskLists();
  const existing = useMemo(
    () => (isEdit && id ? lists.find((l) => l.id === id) : undefined),
    [isEdit, id, lists],
  );

  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState<IconName>((existing?.icon as IconName) ?? 'shoppingBag');
  const [colorKey, setColorKey] = useState<PastelKey>(
    (existing?.colorKey as PastelKey) ?? 'peach',
  );
  const [saving, setSaving] = useState(false);

  const color = (C as any)[colorKey] as string;
  const colorOptions = useMemo(
    () => COLOR_KEYS.map((k) => ({ key: k, value: (C as any)[k] as string })),
    [C],
  );

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      if (isEdit && id) {
        await update(id, { name: trimmed, icon, colorKey });
      } else {
        await create({ name: trimmed, icon, colorKey });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-list] save failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      eyebrow={isEdit ? 'EDIT LIST' : 'NEW LIST'}
      eyebrowColor={color}
      title={isEdit ? 'Edit list.' : 'Make a list.'}
      footer={
        <PrimaryButton icon={isEdit ? 'check' : 'plus'} onPress={handleSave} disabled={!name.trim() || saving}>
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

      <SheetSection title="Icon">
        <SheetIconGrid
          options={ICONS}
          selected={icon}
          onChange={setIcon}
          accent={color}
          testIDPrefix="new-list-icon"
        />
      </SheetSection>

      <SheetSection title="Color">
        <SheetColorGrid
          colors={colorOptions}
          selected={colorKey}
          onChange={setColorKey}
          testIDPrefix="new-list-color"
        />
      </SheetSection>
    </SheetShell>
  );
}
