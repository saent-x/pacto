import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { FlashList } from "@shopify/flash-list";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import { useColors } from "@/src/hooks/useColors";
import { useSession } from "@/src/hooks/useSession";
import { useLoveNotes } from "@/src/hooks/useLoveNotes";
import { Typography } from "@/src/constants/typography";
import { BorderRadius, Spacing } from "@/src/constants/spacing";
import { MiniDateRail } from "@/src/components/calendar/MiniDateRail";
import { EmptyState } from "@/src/components/ui";
import { toPlainMarkdownPreview } from "@/src/components/journal/MarkdownText";
import { CreateLoveNoteSheet } from "@/src/components/loveNotes/CreateLoveNoteSheet";
import { matchesSelectedDateForTimestamp } from "@/src/lib/togetherDateFilter";
import { togetherItemContainerStyle, togetherListContainerStyle } from "@/src/constants/togetherStyles";

type NoteItem = {
  id: string;
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

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  const d = new Date(timestamp);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function LoveNotesScreen() {
  const C = useColors();
  const router = useRouter();
  const { profile, activeCouple } = useSession();
  const { notes, create, update, remove, refetch } = useLoveNotes();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<
    { id: string; body: string; isPrivate: boolean } | undefined
  >();

  const currentUserId = profile?.id ?? null;
  const visibleNotes = notes.filter((note) =>
    matchesSelectedDateForTimestamp(note.createdAt, selectedDate),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleSave = useCallback(
    async (data: { body: string; isPrivate: boolean }) => {
      if (editingNote) {
        await update(editingNote.id, data);
        setEditingNote(undefined);
        return;
      }

      await create(data);
    },
    [create, editingNote, update],
  );

  const isOwnNote = useCallback(
    (note: NoteItem) => note.authorId === currentUserId,
    [currentUserId],
  );

  const openComposer = useCallback((note?: NoteItem) => {
    setEditingNote(
      note
        ? { id: note.id, body: note.body, isPrivate: note.isPrivate }
        : undefined,
    );
    sheetRef.current?.present();
  }, []);

  const handleDelete = useCallback(
    (note: NoteItem) => {
      Alert.alert("Delete note", "Remove this love note?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await remove(note.id);
          },
        },
      ]);
    },
    [remove],
  );

  const renderEditAction = useCallback(
    (note: NoteItem) => () => (
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: C.primary }]}
        onPress={() => openComposer(note)}
      >
        <Feather name="edit-3" size={18} color="#fff" />
      </TouchableOpacity>
    ),
    [C.primary, openComposer],
  );

  const renderDeleteAction = useCallback(
    (note: NoteItem) => () => (
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: C.error }]}
        onPress={() => handleDelete(note)}
      >
        <Feather name="trash-2" size={18} color="#fff" />
      </TouchableOpacity>
    ),
    [C.error, handleDelete],
  );

  const renderNoteRow = ({
    item,
    index,
  }: {
    item: NoteItem;
    index: number;
  }) => {
    const own = isOwnNote(item);
    const preview = toPlainMarkdownPreview(item.body);
    const authorLabel = own
      ? "You"
      : (activeCouple?.partner?.displayName?.split(" ")[0] ?? "Partner");
    const row = (
        <TouchableOpacity
          style={[
            togetherItemContainerStyle,
            styles.noteRow,
            { backgroundColor: C.card },
          ]}
          activeOpacity={0.7}
          onPress={own ? () => openComposer(item) : undefined}
        >
        <View
          style={[
            styles.noteIcon,
            { backgroundColor: own ? C.errorLight : C.primaryMuted },
          ]}
        >
          <Feather name="heart" size={16} color={own ? C.error : C.primary} />
        </View>
        <View style={styles.noteBody}>
          <Text style={[styles.noteTitle, { color: C.text }]} numberOfLines={1}>
            {preview || "Love note"}
          </Text>
          <Text
            style={[styles.noteMeta, { color: C.textTertiary }]}
            numberOfLines={1}
          >
            {authorLabel} · {formatRelativeDate(item.createdAt)}
          </Text>
        </View>
        {item.isPrivate && (
          <Feather name="lock" size={14} color={C.textTertiary} />
        )}
      </TouchableOpacity>
    );

    return (
      <Animated.View entering={FadeInDown.duration(300).delay(80 + index * 40)}>
        {own ? (
          <Swipeable
            renderLeftActions={renderEditAction(item)}
            renderRightActions={renderDeleteAction(item)}
            overshootLeft={false}
            overshootRight={false}
            friction={2}
          >
            {row}
          </Swipeable>
        ) : (
          row
        )}
      </Animated.View>
    );
  };

  if (notes.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
        <SafeAreaView style={styles.flex} edges={["top"]}>
          <MiniDateRail
            title="Love Notes"
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            accentColor={C.error}
            onPressLeading={() => {
              Haptics.selectionAsync();
              router.replace("/(tabs)/together");
            }}
          />

          <View style={styles.emptyWrap}>
            <EmptyState
              title="No notes yet"
              description="Leave a note for each other and it will show up here."
            />
          </View>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              openComposer();
            }}
            activeOpacity={0.85}
            style={[styles.floatingFab, { backgroundColor: C.error }]}
          >
            <Feather name="plus" size={22} color={C.ink} />
          </TouchableOpacity>

          <CreateLoveNoteSheet
            sheetRef={sheetRef}
            onSave={handleSave}
            note={editingNote}
          />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
      <SafeAreaView style={styles.flex} edges={["top"]}>
        <MiniDateRail
          title="Love Notes"
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          accentColor={C.error}
          onPressLeading={() => {
            Haptics.selectionAsync();
            router.replace("/(tabs)/together");
          }}
        />

        {visibleNotes.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              title="No love notes on this date"
              description="Pick another day or clear the date filter."
            />
          </View>
        ) : (
          <FlashList
            data={visibleNotes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              togetherListContainerStyle,
            ]}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: C.border }]} />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={C.error}
              />
            }
            renderItem={renderNoteRow}
          />
        )}

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            openComposer();
          }}
          activeOpacity={0.85}
          style={[styles.floatingFab, { backgroundColor: C.error }]}
        >
          <Feather name="plus" size={22} color={C.ink} />
        </TouchableOpacity>

        <CreateLoveNoteSheet
          sheetRef={sheetRef}
          onSave={handleSave}
          note={editingNote}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  listContent: {
    // paddingHorizontal: Spacing.lg,
    paddingBottom: 120,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: 14,
  },
  noteIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  noteBody: {
    flex: 1,
  },
  noteTitle: {
    ...Typography.body,
    fontSize: 15,
    marginBottom: 2,
  },
  noteMeta: {
    ...Typography.small,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 72,
  },
  swipeAction: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    paddingHorizontal: Spacing["2xl"],
    height: 400,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  helperLabel: {
    ...Typography.bodyMedium,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subHelperLabel: {
    ...Typography.small,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Typography.largeTitle,
  },
  floatingFab: {
    position: "absolute",
    bottom: 100,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
