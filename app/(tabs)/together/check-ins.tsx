import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { format } from 'date-fns';

import { useColors } from '@/src/hooks/useColors';
import { useSession } from '@/src/hooks/useSession';
import { useCheckIns, type CheckInRecord } from '@/src/hooks/useCheckIns';
import { BorderRadius, Spacing } from '@/src/constants/spacing';
import { getCheckInMoodMeta } from '@/src/constants/checkInMoods';
import { Typography } from '@/src/constants/typography';
import { EmptyState, BrushUnderline } from '@/src/components/ui';
import { togetherItemContainerStyle, togetherListContainerStyle } from './_itemStyles';

export default function CheckInsScreen() {
  const C = useColors();
  const router = useRouter();
  const { activeCouple } = useSession();
  const { checkIns, remove, refetch } = useCheckIns();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleDelete = useCallback(
    (item: CheckInRecord) => {
      Alert.alert('Delete check-in', 'Remove this check-in?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await remove(item._id);
          },
        },
      ]);
    },
    [remove],
  );

  const renderDeleteAction = useCallback(
    (item: CheckInRecord) => () => (
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: C.error }]}
        onPress={() => handleDelete(item)}
      >
        <Feather name="trash-2" size={18} color="#fff" />
      </TouchableOpacity>
    ),
    [C.error, handleDelete],
  );

  const renderCheckInItem = ({ item, index }: { item: CheckInRecord; index: number }) => {
    const mood = getCheckInMoodMeta(item.mood);
    const isMine = item.authorId === activeCouple?.membership?.userId;
    const authorLabel = isMine ? 'You' : activeCouple?.partner?.displayName ?? 'Partner';
    const checkedInAt = format(new Date(item.createdAt), 'MMM d, h:mm a');
    const row = (
      <TouchableOpacity
        activeOpacity={0.78}
        style={[
          togetherItemContainerStyle,
          styles.row,
          { backgroundColor: C.card },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: C.moodLight }]}>
          <Feather name={mood?.icon ?? 'activity'} size={16} color={C.mood} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>
            {authorLabel} · {mood?.label ?? 'Checked in'}
          </Text>
          <Text style={[styles.meta, { color: C.textTertiary }]} numberOfLines={1}>
            {checkedInAt} · for {item.checkInDate}
          </Text>
          {item.note ? (
            <Text style={[styles.note, { color: C.textSecondary }]} numberOfLines={2}>
              {item.note}
            </Text>
          ) : null}
        </View>
        {item.isPrivate && <Feather name="lock" size={14} color={C.textTertiary} />}
      </TouchableOpacity>
    );

    if (!isMine) {
      return (
        <Animated.View entering={FadeInDown.duration(320).delay(index * 40)}>
          {row}
        </Animated.View>
      );
    }

    return (
      <Animated.View entering={FadeInDown.duration(320).delay(index * 40)}>
        <Swipeable
          renderLeftActions={renderDeleteAction(item)}
          renderRightActions={renderDeleteAction(item)}
          overshootLeft={false}
          overshootRight={false}
          friction={2}
        >
          {row}
        </Swipeable>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={[styles.header, { backgroundColor: C.background }]}>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              router.back();
            }}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={22} color={C.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <BrushUnderline color={C.warning} style={styles.userNameBrush}>
              <Text style={[styles.headerTitle, { color: C.text }]}>Check-Ins</Text>
            </BrushUnderline>
            <Text style={[styles.headerSubtitle, { color: C.textTertiary }]}>Recent check-ins</Text>
          </View>
        </View>
        

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            togetherListContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.mood} />
          }
        >

          <Animated.View entering={FadeInDown.duration(320).delay(120)} style={styles.historySection}>
            {checkIns.length > 0 ? (
              <View style={styles.listWrap}>
                {checkIns.slice(0, 30).map((item, index) => (
                  <View key={item._id}>
                    {renderCheckInItem({ item, index })}
                    <View style={[styles.separator, { backgroundColor: C.border }]} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <EmptyState
                  title="No check-ins yet"
                  description="Use the home screen card to add the first daily check-in."
                />
              </View>
            )}
          </Animated.View>
        </ScrollView>
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
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerText: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
  },
  userNameBrush: {
    ...Typography.title,
    marginTop: 2,
  },
  headerTitle: {
    ...Typography.title,
    fontSize: 22,
  },
  headerSubtitle: {
    ...Typography.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  introWrap: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  introCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  introEyebrow: {
    ...Typography.overline,
    letterSpacing: 2,
  },
  introTitle: {
    ...Typography.headingRegular,
  },
  introBody: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 21,
  },
  historySection: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    ...Typography.overline,
    letterSpacing: 2.4,
    marginBottom: Spacing.xs,
  },
  listWrap: {
    paddingBottom: Spacing['2xl'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Typography.body,
    fontSize: 15,
  },
  meta: {
    ...Typography.small,
  },
  note: {
    ...Typography.small,
    lineHeight: 19,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 72,
  },
  swipeAction: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    height: 400,
  },
});
