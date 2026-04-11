import { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/hooks/useSession';
import { useJournal } from '@/src/hooks/useJournal';
import { MarkdownText } from '@/src/components/journal/MarkdownText';
import { CreateEntrySheet } from '@/src/components/journal/CreateEntrySheet';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';

const MOOD_MAP: Record<string, { label: string; icon: string; color: string }> = {
  sun: { label: 'Great', icon: 'sun', color: '#8AAF7B' },
  cloud: { label: 'Good', icon: 'cloud', color: '#7BA0AF' },
  minus: { label: 'Okay', icon: 'minus', color: '#D4A054' },
  'cloud-drizzle': { label: 'Low', icon: 'cloud-drizzle', color: '#B08090' },
  'cloud-lightning': { label: 'Rough', icon: 'cloud-lightning', color: '#C96B5A' },
};

export default function JournalDetailScreen() {
  const C = useColors();
  const { mode } = useTheme();
  const router = useRouter();
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const { profile } = useSession();
  const userId = profile?.id ?? null;
  const { entries, update, remove, uploadJournalImage, refetch } = useJournal();
  const [refreshing, setRefreshing] = useState(false);

  const entry = entries.find((e) => e.id === entryId) ?? null;
  const isOwn = entry?.author_id === userId;
  const mood = entry?.mood ? MOOD_MAP[entry.mood] : null;

  const sheetRef = useRef<BottomSheetModal>(null);

  const glassBg = mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)';
  const glassBorder = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.10)';

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const handleDelete = useCallback(() => {
    if (!entry) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Delete Entry', 'This can\'t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove(entry.id);
          router.back();
        },
      },
    ]);
  }, [entry, remove, router]);

  const handleSave = useCallback(async (data: any) => {
    if (!entry) return;
    await update(entry.id, data);
  }, [entry, update]);

  if (!entry) {
    return (
      <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
              <Feather name="arrow-left" size={22} color={C.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.notFound}>
            <Text style={[styles.notFoundText, { color: C.textTertiary }]}>Entry not found</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const displayDate = format(new Date(entry.entry_date + 'T00:00:00'), 'EEEE, MMMM d, yyyy');

  return (
    <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Nav bar */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </TouchableOpacity>
          {isOwn && (
            <View style={styles.navActions}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  sheetRef.current?.present();
                }}
                hitSlop={12}
              >
                <Feather name="edit-3" size={18} color={C.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} hitSlop={12}>
                <Feather name="trash-2" size={18} color={C.error} />
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.journal} />
          }
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <Text style={[styles.dateLabel, { color: C.journal }]}>{displayDate}</Text>
            {entry.title && (
              <Text style={[styles.title, { color: C.text }]}>{entry.title}</Text>
            )}

            {/* Meta row */}
            <View style={styles.metaRow}>
              {!isOwn && (
                <View style={[styles.metaPill, { backgroundColor: C.primaryMuted }]}>
                  <Feather name="user" size={11} color={C.primary} />
                  <Text style={[styles.metaText, { color: C.primary }]}>Partner</Text>
                </View>
              )}
              {entry.is_private && (
                <View style={[styles.metaPill, { backgroundColor: glassBg, borderColor: glassBorder, borderWidth: StyleSheet.hairlineWidth }]}>
                  <Feather name="lock" size={11} color={C.textTertiary} />
                  <Text style={[styles.metaText, { color: C.textTertiary }]}>Private</Text>
                </View>
              )}
              {mood && (
                <View style={[styles.metaPill, { backgroundColor: mood.color + '15' }]}>
                  <Feather name={mood.icon as any} size={11} color={mood.color} />
                  <Text style={[styles.metaText, { color: mood.color }]}>{mood.label}</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Images */}
          {entry.media_urls.length > 0 && (
            <Animated.View entering={FadeInDown.duration(500).delay(100)}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imageRow}
              >
                {entry.media_urls.map((uri, i) => (
                  <Image
                    key={`${uri}-${i}`}
                    source={{ uri }}
                    style={[styles.image, { backgroundColor: C.card }]}
                  />
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* Body */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.body}>
            <MarkdownText value={entry.body} />
          </Animated.View>
        </ScrollView>

        {/* Edit sheet (only for own entries) */}
        {isOwn && (
          <CreateEntrySheet
            sheetRef={sheetRef}
            onSave={handleSave}
            onUploadImage={uploadJournalImage}
            entry={entry}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },

  scroll: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: 100,
  },

  header: {
    gap: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  dateLabel: {
    ...Typography.overline,
    letterSpacing: 2,
  },
  title: {
    ...Typography.largeTitle,
    fontSize: 28,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  metaText: {
    ...Typography.small,
    fontSize: 11,
    fontFamily: Typography.subheading.fontFamily,
  },

  imageRow: {
    gap: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  image: {
    width: 240,
    height: 180,
    borderRadius: BorderRadius.lg,
  },

  body: {
    marginBottom: Spacing['3xl'],
  },

  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    ...Typography.body,
  },
});
