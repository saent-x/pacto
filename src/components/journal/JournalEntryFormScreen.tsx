import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { FeatureUnavailable } from '@/src/components/features/FeatureUnavailable';
import { PrimaryButton } from '@/src/components/ui/atoms';
import {
  SheetSection,
  SheetShell,
  SheetTitleField,
  SheetToggleRow,
} from '@/src/components/ui/SheetShell';
import { Typography } from '@/src/constants/typography';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useJournal } from '@/src/hooks/useJournal';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';

export function JournalEntryFormScreen() {
  const gate = useFeatureGate('journal');
  if (!gate.enabled) return gate.feature ? <FeatureUnavailable feature={gate.feature} /> : null;
  return <JournalEntryFormScreenInner />;
}

function isValidDateKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function JournalEntryFormScreenInner() {
  const { C, F } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { create, update, allEntries, isLoading } = useJournal();
  const { isSolo, partner, user } = useSession();
  const editId = typeof id === 'string' && id.length > 0 ? id : null;
  const isEdit = !!editId;
  const entry = useMemo(
    () => (editId ? allEntries.find((e: any) => String(e.id) === editId) ?? null : null),
    [allEntries, editId],
  );
  const canEditEntry = !isEdit || Boolean(entry && user?.id && entry.author_id === user.id);

  const now = useMemo(() => new Date(), []);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [entryDate, setEntryDate] = useState(format(now, 'yyyy-MM-dd'));
  const [hydratedEntryId, setHydratedEntryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const partnerName = partner?.displayName ?? 'Partner';

  useEffect(() => {
    if (!editId || !entry || !canEditEntry || hydratedEntryId === editId) return;
    setTitle(entry.title ?? '');
    setBody(entry.body ?? '');
    setIsPrivate(!!entry.is_private);
    setEntryDate(isValidDateKey(entry.entry_date) ? entry.entry_date : format(now, 'yyyy-MM-dd'));
    setHydratedEntryId(editId);
  }, [canEditEntry, editId, entry, hydratedEntryId, now]);

  const canSave = body.trim().length > 0 && !saving && canEditEntry;
  const eyebrow = isEdit
    ? 'EDIT JOURNAL ENTRY'
    : format(now, 'EEEE, MMMM d').toUpperCase();

  const onSave = async () => {
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const payload = {
        title: title.trim() || null,
        body: body.trim(),
        is_private: isSolo ? true : isPrivate,
      };
      if (isEdit && editId) {
        await update(editId, {
          ...payload,
          ...(isValidDateKey(entry?.entry_date) ? { entry_date: entryDate } : {}),
        });
      } else {
        await create({ ...payload, entry_date: entryDate });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[journal-entry-form] save failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (isEdit && (!entry || !canEditEntry)) {
    return (
      <SheetShell
        eyebrow="JOURNAL"
        title={isLoading ? 'Loading entry' : entry ? 'Entry not editable' : 'Entry missing'}
      >
        <Text style={[Typography.body, { color: C.ink2 }]}>
          {isLoading
            ? 'Loading this entry…'
            : entry
            ? 'Only the author can edit this journal entry.'
            : 'This journal entry could not be found.'}
        </Text>
      </SheetShell>
    );
  }

  return (
      <SheetShell
        eyebrow={eyebrow}
        eyebrowColor={C.journal}
        title={isEdit ? 'Edit entry' : 'New entry'}
        footer={
          <PrimaryButton icon="feather" onPress={onSave} disabled={!canSave}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save entry'}
          </PrimaryButton>
        }
      >
        <SheetSection title="Title" first>
          <SheetTitleField
            testID="new-entry-title-input"
            value={title}
            onChangeText={setTitle}
            placeholder="Give it a title…"
            accent={C.journal}
          />
        </SheetSection>

        <SheetSection title="Entry">
          <TextInput
            testID="new-entry-body-input"
            value={body}
            onChangeText={setBody}
            placeholder="Write your thoughts…"
            placeholderTextColor={C.fog}
            multiline
            textAlignVertical="top"
            style={{
              minHeight: 260,
              backgroundColor: 'transparent',
              color: C.inkColor,
              fontFamily: F.serif,
              fontStyle: body ? 'normal' : 'italic',
              fontSize: 16,
              lineHeight: 24,
            }}
          />
        </SheetSection>

        {!isSolo && (
          <View style={{ marginTop: 22 }}>
            <SheetToggleRow
              icon="lock"
              label="Private"
              sublabel={isPrivate ? 'Only you can see this entry' : `${partnerName} can see this entry`}
              value={isPrivate}
              onChange={setIsPrivate}
              accent={C.lavender}
              pressTestID="new-entry-private-toggle"
            />
          </View>
        )}
      </SheetShell>
  );
}
