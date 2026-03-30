import { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useColors } from '@/src/hooks/useColors';
import { useSession } from '@/src/hooks/useSession';
import { useLoveNotes } from '@/src/hooks/useLoveNotes';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { EmptyState } from '@/src/components/ui';
import { toPlainMarkdownPreview } from '@/src/components/journal/MarkdownText';
import { CreateLoveNoteSheet } from '@/src/components/loveNotes/CreateLoveNoteSheet';

type NoteItem = {
  _id: string;
  authorId: string;
  body: string;
  isPrivate: boolean;
  createdAt: number;
  updatedAt: number;
};

function formatRelativeDate(timestamp: number) {
  const now = Date.now();
  const diffMs = now - timestamp;
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function LoveNotesScreen() {
  const C = useColors();
  const router = useRouter();
  const { profile, activeCouple } = useSession();
  const { notes, isLoading, create, refetch } = useLoveNotes();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);

  const currentUserId = profile?._id ?? null;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleCreate = useCallback(
    async (data: { body: string; isPrivate: boolean }) => {
      await create(data);
    },
    [create],
  );

  const isOwnNote = (note: NoteItem) => note.authorId === currentUserId;

  if (!isLoading && notes.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: C.background }]}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                router.back();
              }}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="arrow-left" size={22} color={C.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: C.text }]}>Love Notes</Text>
            <View style={{ width: 40 }} />
          </View>

          <EmptyState
            icon="heart"
            title="No notes yet"
            description="Tell them something sweet"
            actionLabel="Write a Note"
            onAction={() => sheetRef.current?.present()}
          />

          {/* FAB */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              sheetRef.current?.present();
            }}
            activeOpacity={0.85}
            style={[styles.floatingFab, { backgroundColor: C.primary }]}
          >
            <Feather name="plus" size={22} color={C.ink} />
          </TouchableOpacity>

          <CreateLoveNoteSheet sheetRef={sheetRef} onSave={handleCreate} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              router.back();
            }}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="arrow-left" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.text }]}>Love Notes</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlashList
          data={notes}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />
          }
          renderItem={({ item, index }) => {
            const own = isOwnNote(item);
            const accentColor = own ? C.primary : C.journal;

            return (
              <Animated.View entering={FadeInDown.duration(400).delay(100 + index * 60)}>
                <View
                  style={[
                    styles.noteCard,
                    { backgroundColor: C.card, borderColor: C.border },
                  ]}
                >
                  {/* Accent bar */}
                  <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

                  <View style={styles.noteContent}>
                    <View style={styles.noteHeader}>
                      <Text style={[styles.noteAuthor, { color: accentColor }]}>
                        {own ? 'You' : activeCouple?.partner?.displayName?.split(' ')[0] ?? 'Partner'}
                      </Text>
                      <View style={styles.noteHeaderRight}>
                        {item.isPrivate && (
                          <Feather name="lock" size={12} color={C.textTertiary} style={styles.lockIcon} />
                        )}
                        <Text style={[styles.noteDate, { color: C.textTertiary }]}>
                          {formatRelativeDate(item.createdAt)}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[styles.noteBody, { color: C.text }]}
                      numberOfLines={6}
                    >
                      {toPlainMarkdownPreview(item.body)}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            );
          }}
        />

        {/* FAB */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            sheetRef.current?.present();
          }}
          activeOpacity={0.85}
          style={[styles.floatingFab, { backgroundColor: C.primary }]}
        >
          <Feather name="plus" size={22} color={C.ink} />
        </TouchableOpacity>

        <CreateLoveNoteSheet sheetRef={sheetRef} onSave={handleCreate} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: 20,
  },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 120,
  },

  // Note card
  noteCard: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  noteContent: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteAuthor: {
    ...Typography.overline,
    letterSpacing: 1.5,
  },
  noteHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  lockIcon: {
    marginRight: 2,
  },
  noteDate: {
    ...Typography.small,
  },
  noteBody: {
    ...Typography.headingRegular,
    fontStyle: 'italic',
    lineHeight: 26,
  },
  floatingFab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
