import { format, parseISO } from 'date-fns';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeatureUnavailable } from '@/src/components/features/FeatureUnavailable';
import { Icon } from '@/src/components/ui/Icon';
import { Avatar, HeaderBrand } from '@/src/components/ui/pacto';
import { PressScale } from '@/src/components/ui/PressScale';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { Typography } from '@/src/constants/typography';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useJournal } from '@/src/hooks/useJournal';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';

export function JournalEntryDetailScreen() {
  const gate = useFeatureGate('journal');
  if (!gate.enabled) return gate.feature ? <FeatureUnavailable feature={gate.feature} /> : null;
  return <JournalEntryDetailScreenInner />;
}

function JournalEntryDetailScreenInner() {
  const { C, F } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, partner, members } = useSession();
  const { allEntries, isLoading, remove } = useJournal();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const entryId = typeof id === 'string' ? id : '';
  const deletePendingRef = useRef(false);

  const entry = useMemo(
    () => allEntries.find((e: any) => String(e.id) === entryId) ?? null,
    [allEntries, entryId],
  );

  if (!entry) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <JournalDetailHeader />
        <SheetShell
          eyebrow="JOURNAL"
          title={isLoading ? 'Loading entry' : 'Entry missing'}
          showClose={false}
          topPadding={insets.top + 70}
        >
          <Text style={[Typography.body, { color: C.ink2 }]}>
            {isLoading ? 'Loading this entry…' : 'This journal entry could not be found.'}
          </Text>
        </SheetShell>
      </View>
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

  const createdAt = timestampMs(entry.created_at);
  const dateRow = (() => {
    if (entry.entry_date) {
      const entryDate = parseEntryDate(entry.entry_date);
      if (entryDate) return format(entryDate, 'EEEE · MMM d, yyyy');
    }
    if (createdAt != null) return format(new Date(createdAt), 'EEEE · MMM d, yyyy');
    return '';
  })();
  const timeRow = createdAt != null ? format(new Date(createdAt), 'h:mm a') : '';
  const bodyText = entry.body?.trim() || '(empty)';
  const isEmptyBody = bodyText === '(empty)';

  const onEdit = () => {
    if (!isMine) return;
    router.push(`/sheets/journal-entry?id=${entry.id}` as any);
  };

  const onDelete = () => {
    Alert.alert('Delete entry?', 'This entry will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (deletePendingRef.current) return;
          deletePendingRef.current = true;
          try {
            await remove(String(entry.id));
            router.back();
          } finally {
            deletePendingRef.current = false;
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <JournalDetailHeader />
      <SheetShell
        eyebrow="JOURNAL ENTRY"
        title={entry.title?.trim() || 'an entry'}
        showClose={false}
        topPadding={insets.top + 70}
        bottomPadding={isMine ? 132 : 28}
      >
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

        <View testID="journal-entry-body-wrap" style={styles.bodyWrap}>
          <Text
            testID="journal-entry-body-text"
            selectable
            style={[
              styles.bodyText,
              {
                color: isEmptyBody ? C.ink3 : C.inkColor,
                fontFamily: F.serif,
                fontStyle: isEmptyBody ? 'italic' : 'normal',
              },
            ]}
          >
            {bodyText}
          </Text>
        </View>

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
      {isMine ? (
        <View
          testID="journal-entry-actions-bar"
          style={[
            styles.footer,
            {
              bottom: Math.max(20, insets.bottom + 16),
              backgroundColor: C.bg,
            },
          ]}
        >
          <PressScale
            testID="journal-entry-edit-action"
            onPress={onEdit}
            style={[styles.btn, { backgroundColor: C.inkColor }]}
          >
            <Icon name="edit" size={14} color={C.bg} strokeWidth={2.4} />
            <Text style={[Typography.buttonLabel, { color: C.bg }]}>Edit</Text>
          </PressScale>
          <PressScale
            testID="journal-entry-delete-action"
            onPress={onDelete}
            style={[
              styles.btn,
              { backgroundColor: C.bgCard, borderColor: C.lineColor, borderWidth: 1 },
            ]}
          >
            <Icon name="trash" size={14} color={C.error} strokeWidth={2.4} />
            <Text style={[Typography.buttonLabel, { color: C.error }]}>Delete</Text>
          </PressScale>
        </View>
      ) : null}
    </View>
  );
}

function timestampMs(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseEntryDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = parseISO(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function JournalDetailHeader() {
  const { C } = useTheme();
  return (
    <Stack.Screen
      options={{
        headerShown: true,
        headerTransparent: true,
        headerShadowVisible: false,
        headerBackground: () => null,
        headerTintColor: C.inkColor,
        headerBackTitle: '',
        title: '',
        headerTitleAlign: 'center',
        headerTitle: () => <HeaderBrand eyebrow="JOURNAL" title="entry" />,
        headerLeft: () => (
          <PressScale
            onPress={() => router.back()}
            hitSlop={12}
            haptic="impact"
            pressedScale={0.96}
            style={{ padding: 4 }}
          >
            <Icon name="chevronLeft" size={22} color={C.inkColor} strokeWidth={2.2} />
          </PressScale>
        ),
      }}
    />
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
  bodyWrap: {
    marginTop: 24,
    paddingHorizontal: 2,
  },
  bodyText: {
    fontSize: 18,
    lineHeight: 30,
    letterSpacing: 0,
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
    position: 'absolute',
    left: 20,
    right: 20,
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
    borderRadius: 999,
  },
});
