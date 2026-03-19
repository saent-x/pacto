import { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format } from 'date-fns';
import { useColors } from '@/src/hooks/useColors';
import { useJournal, JournalFilter } from '@/src/hooks/useJournal';
import { useAuthStore } from '@/src/stores/authStore';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { EmptyState } from '@/src/components/ui';
import { CreateEntrySheet } from '@/src/components/journal/CreateEntrySheet';
import { JournalEntry } from '@/src/types/database';

const MOOD_ICONS: Record<string, { icon: string; color: string }> = {
  sun: { icon: 'sun', color: '#8AAF7B' },
  cloud: { icon: 'cloud', color: '#7BA0AF' },
  minus: { icon: 'minus', color: '#D4A054' },
  'cloud-drizzle': { icon: 'cloud-drizzle', color: '#B08090' },
  'cloud-lightning': { icon: 'cloud-lightning', color: '#C96B5A' },
};

export default function JournalScreen() {
  const C = useColors();
  const userId = useAuthStore((s) => s.user?.id);
  const { entries, isLoading, filter, setFilter, create, update, remove } = useJournal();

  const sheetRef = useRef<BottomSheetModal>(null);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | undefined>();
  const [readOnly, setReadOnly] = useState(false);

  const handleSave = async (data: any) => {
    if (editingEntry) {
      await update(editingEntry.id, data);
    } else {
      await create(data);
    }
    setEditingEntry(undefined);
    setReadOnly(false);
  };

  const openCreate = () => {
    setEditingEntry(undefined);
    setReadOnly(false);
    sheetRef.current?.present();
  };

  const openEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setReadOnly(entry.author_id !== userId);
    sheetRef.current?.present();
  };

  const renderItem = ({ item }: { item: JournalEntry }) => {
    const isOwn = item.author_id === userId;
    const moodInfo = item.mood ? MOOD_ICONS[item.mood] : null;

    return (
      <Animated.View entering={FadeInDown.duration(400)}>
        <TouchableOpacity
          style={[styles.entryCard, { backgroundColor: C.card, borderColor: C.border }]}
          activeOpacity={0.85}
          onPress={() => openEntry(item)}
        >
          {/* Left accent for partner entries */}
          {!isOwn && <View style={[styles.partnerBar, { backgroundColor: C.primary }]} />}

          <View style={styles.entryContent}>
            {/* Meta row */}
            <View style={styles.entryMeta}>
              <Text style={[styles.entryDate, { color: C.textTertiary }]}>
                {format(new Date(item.entry_date + 'T00:00:00'), 'MMM d, yyyy')}
              </Text>
              {item.is_private && (
                <Feather name="lock" size={11} color={C.fog} />
              )}
            </View>

            {/* Title */}
            {item.title && (
              <Text style={[styles.entryTitle, { color: C.text }]} numberOfLines={1}>
                {item.title}
              </Text>
            )}

            {/* Body preview */}
            <Text style={[styles.entryBody, { color: C.textSecondary }]} numberOfLines={2}>
              {item.body}
            </Text>

            {/* Bottom row */}
            <View style={styles.entryFooter}>
              {moodInfo && (
                <View style={[styles.moodBadge, { backgroundColor: moodInfo.color + '15' }]}>
                  <Feather name={moodInfo.icon as any} size={11} color={moodInfo.color} />
                </View>
              )}
              {!isOwn && (
                <Text style={[styles.authorLabel, { color: C.textTertiary }]}>Partner</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const hasEntries = entries.length > 0;

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: C.surface }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: C.text }]}>Journal</Text>
            <TouchableOpacity onPress={openCreate} style={styles.writeBtn}>
              <Feather name="edit-3" size={18} color={C.journal} />
            </TouchableOpacity>
          </View>

          {/* Filter tabs */}
          <View style={styles.filterRow}>
            {(['all', 'shared', 'private'] as JournalFilter[]).map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={styles.filterTab}
              >
                <Text style={[
                  styles.filterText,
                  { color: filter === f ? C.journal : C.textTertiary },
                ]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
                {filter === f && <View style={[styles.filterLine, { backgroundColor: C.journal }]} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {!hasEntries && !isLoading ? (
          <EmptyState
            icon="book-open"
            title="Your journal is empty"
            description="Write together or keep a private journal just for you."
            actionLabel="Write Entry"
            onAction={openCreate}
          />
        ) : (
          <FlashList
            data={entries}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        <CreateEntrySheet
          sheetRef={sheetRef}
          onSave={handleSave}
          entry={editingEntry}
          readOnly={readOnly}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },

  header: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.lg,
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: { ...Typography.title },
  writeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterRow: {
    flexDirection: 'row',
    gap: Spacing['2xl'],
  },
  filterTab: {
    paddingBottom: Spacing.md,
    position: 'relative',
  },
  filterText: {
    ...Typography.captionMedium,
  },
  filterLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },

  listContent: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.xl,
    paddingBottom: 100,
  },
  separator: { height: Spacing.md },

  entryCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  partnerBar: {
    width: 3,
  },
  entryContent: {
    flex: 1,
    padding: Spacing.xl,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  entryDate: {
    ...Typography.overline,
    fontSize: 10,
  },
  entryTitle: {
    ...Typography.heading,
    marginBottom: Spacing.xs,
  },
  entryBody: {
    ...Typography.caption,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  entryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  moodBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorLabel: {
    ...Typography.small,
  },
});
