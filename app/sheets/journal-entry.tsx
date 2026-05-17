import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Avatar, Card } from '@/src/components/ui/pacto';
import { FeatureUnavailable } from '@/src/components/features/FeatureUnavailable';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useJournal } from '@/src/hooks/useJournal';
import { useSession } from '@/src/hooks/useSession';

export default function JournalEntrySheet() {
  const gate = useFeatureGate('journal');
  if (!gate.enabled) return gate.feature ? <FeatureUnavailable feature={gate.feature} /> : null;
  return <JournalEntrySheetInner />;
}

function JournalEntrySheetInner() {
  const { C } = useTheme();
  const { user, partner, members } = useSession();
  const { allEntries, remove } = useJournal();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const entry = useMemo(
    () => allEntries.find((e: any) => String(e.id) === id) ?? null,
    [allEntries, id]
  );

  if (!entry) {
    return (
      <SheetShell eyebrow="JOURNAL" title="entry">
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <Text style={[Typography.body, { color: C.ink2 }]}>
            Entry not found.
          </Text>
        </View>
      </SheetShell>
    );
  }

  const userId = user?.id ?? '';
  const partnerId = partner?.id ?? '';
  const partnerName = partner?.displayName ?? null;
  const isMine = entry.author_id === userId;

  const authorMeta = (() => {
    if (entry.author_id === userId)
      return {
        name: (user?.displayName ?? 'You').split(' ')[0],
        color: C.accent,
      };
    if (entry.author_id === partnerId)
      return {
        name: (partnerName ?? 'Partner').split(' ')[0],
        color: C.accent2,
      };
    const m = members.find((mm) => mm.id === entry.author_id);
    return {
      name: m?.displayName?.split(' ')[0] ?? 'Member',
      color: C.accent3,
    };
  })();

  const createdAt = entry.created_at ? new Date(entry.created_at).getTime() : 0;
  const dateRow = (() => {
    if (entry.entry_date) {
      try {
        return format(parseISO(entry.entry_date), 'EEEE · MMM d, yyyy');
      } catch {
        return '';
      }
    }
    if (createdAt) return format(new Date(createdAt), 'EEEE · MMM d, yyyy');
    return '';
  })();
  const timeRow = createdAt ? format(new Date(createdAt), 'h:mm a') : '';

  const onEdit = () => {
    if (!isMine) return;
    router.replace(`/sheets/new-entry?id=${entry.id}` as any);
  };

  const onDelete = () => {
    Alert.alert('Delete entry?', 'This entry will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove(String(entry.id));
          router.back();
        },
      },
    ]);
  };

  return (
    <SheetShell
      eyebrow="JOURNAL ENTRY"
      title={entry.title?.trim() || 'an entry'}
      footer={
        isMine ? (
          <View style={styles.footer}>
            <PressScale
              onPress={onEdit}
              style={[styles.btn, { backgroundColor: C.inkColor }]}
            >
              <Icon name="edit" size={14} color={C.bg} strokeWidth={2.4} />
              <Text style={[Typography.buttonLabel, { color: C.bg }]}>Edit</Text>
            </PressScale>
            <PressScale
              onPress={onDelete}
              style={[
                styles.btn,
                { backgroundColor: C.bgCard, borderColor: C.lineColor, borderWidth: 1 },
              ]}
            >
              <Icon name="trash" size={14} color={C.error} strokeWidth={2.4} />
              <Text style={[Typography.buttonLabel, { color: C.error }]}>
                Delete
              </Text>
            </PressScale>
          </View>
        ) : null
      }
    >
      {/* Meta row */}
      <View style={styles.metaRow}>
        <Avatar
          person={{
            initial: authorMeta.name.charAt(0).toUpperCase(),
            color: authorMeta.color,
          }}
          size={28}
        />
        <View style={{ flex: 1 }}>
          <Text style={[Typography.eyebrowSm, { color: authorMeta.color }]}>
            {authorMeta.name.toUpperCase()}
          </Text>
          <Text style={[Typography.mono, { color: C.ink3, fontSize: 11, marginTop: 2 }]}>
            {dateRow}
            {timeRow ? ` · ${timeRow}` : ''}
          </Text>
        </View>
        {entry.is_private ? (
          <View
            style={[
              styles.privateChip,
              { backgroundColor: C.bgSoft, borderColor: C.lineColor },
            ]}
          >
            <Icon name="lock" size={11} color={C.ink2} strokeWidth={2.2} />
            <Text style={[Typography.eyebrowSm, { color: C.ink2 }]}>PRIVATE</Text>
          </View>
        ) : null}
      </View>

      {/* Body */}
      <Card style={{ padding: 18, marginTop: 16 }}>
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
          <Text
            style={{
              fontFamily: Typography.geistFont,
              fontSize: 15,
              lineHeight: 24,
              color: C.inkColor,
            }}
          >
            {entry.body || '(empty)'}
          </Text>
        </ScrollView>
      </Card>

      {entry.tags && Array.isArray(entry.tags) && entry.tags.length > 0 ? (
        <View style={styles.tagsRow}>
          {entry.tags.map((t: string) => (
            <View
              key={t}
              style={[styles.tag, { backgroundColor: C.bgSoft, borderColor: C.lineColor }]}
            >
              <Text style={[Typography.eyebrowSm, { color: C.ink2 }]}>
                #{t.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  privateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 16,
  },
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
});
