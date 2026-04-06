import React, { useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQuery, useMutation } from 'convex/react';
import { makeFunctionReference } from 'convex/server';
import { useColors } from '@/src/hooks/useColors';
import { useSession } from '@/src/hooks/useSession';
import { useEncryption } from '@/src/hooks/useEncryption';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { EmptyState } from '@/src/components/ui';
import { CreateCheckInSheet } from '@/src/components/checkIns/CreateCheckInSheet';

const getCheckInsQuery = makeFunctionReference<'query', { checkInDate?: string }, any>('checkIns:getCheckIns');
const submitCheckInMutation = makeFunctionReference<'mutation', { mood?: string | null; note?: string | null; isPrivate?: boolean }, any>('checkIns:submitCheckIn');

interface CheckInRecord {
  _id: string;
  authorId: string;
  mood: string | null;
  note: string | null;
  isPrivate: boolean;
  checkInDate: string;
  createdAt: number;
}

export default function CheckInsScreen() {
  const C = useColors();
  const router = useRouter();
  const { profile, activeCouple } = useSession();
  const { encrypt, decrypt, hasKey } = useEncryption();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);
  const submitCheckIn = useMutation(submitCheckInMutation);

  const today = new Date().toISOString().slice(0, 10);
  const rawCheckIns = useQuery(getCheckInsQuery, {}) as CheckInRecord[] | undefined;
  const rawTodayCheckIns = useQuery(getCheckInsQuery, { checkInDate: today }) as CheckInRecord[] | undefined;

  // Decrypt notes asynchronously — existing plaintext passes through
  const [checkIns, setCheckIns] = useState<CheckInRecord[] | undefined>(rawCheckIns);
  const [todayCheckIns, setTodayCheckIns] = useState<CheckInRecord[] | undefined>(rawTodayCheckIns);

  React.useEffect(() => {
    let cancelled = false;
    async function decryptList(items: CheckInRecord[] | undefined, setter: (v: CheckInRecord[]) => void) {
      if (!items) return;
      const decrypted = await Promise.all(
        items.map(async (c) => ({
          ...c,
          note: c.note ? await decrypt(c.note) : c.note,
        })),
      );
      if (!cancelled) setter(decrypted);
    }
    if (hasKey) {
      decryptList(rawCheckIns, setCheckIns);
      decryptList(rawTodayCheckIns, (v) => setTodayCheckIns(v));
    } else {
      setCheckIns(rawCheckIns);
      setTodayCheckIns(rawTodayCheckIns);
    }
    return () => { cancelled = true; };
  }, [rawCheckIns, rawTodayCheckIns, decrypt, hasKey]);

  const myTodayCheckIn = todayCheckIns?.find((c) => c.authorId === activeCouple?.membership?.userId);
  const partnerTodayCheckIn = todayCheckIns?.find((c) => c.authorId !== activeCouple?.membership?.userId);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleCreateCheckIn = useCallback(
    async (data: { mood: string | null; note: string | null; isPrivate: boolean }) => {
      await submitCheckIn({
        mood: data.mood,
        note: data.note ? await encrypt(data.note) : data.note,
        isPrivate: data.isPrivate,
      });
    },
    [submitCheckIn, encrypt],
  );

  const todayMood = myTodayCheckIn?.mood;
  const partnerTodayMood = partnerTodayCheckIn?.mood;

  const renderCheckInItem = ({ item, index }: { item: CheckInRecord; index: number }) => (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 60)}>
      <View style={[styles.checkInCard, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.checkInRow}>
          <Text style={styles.checkInEmoji}>{item.mood ?? '😶'}</Text>
          <View style={styles.checkInContent}>
            <Text style={[styles.checkInDate, { color: C.textTertiary }]}>{item.checkInDate}</Text>
            {item.note && (
              <Text style={[styles.checkInNote, { color: C.textSecondary }]} numberOfLines={2}>
                {item.note}
              </Text>
            )}
          </View>
          {item.isPrivate && <Feather name="lock" size={13} color={C.textTertiary} />}
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Header */}
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
          <Text style={[styles.headerTitle, { color: C.text }]}>How We Feel</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.mood} />
          }
        >
          {/* Today's pulse */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.pulseSection}>
            <Text style={[styles.sectionLabel, { color: C.mood }]}>TODAY</Text>
            <View style={styles.pulseRow}>
              <View style={styles.pulseCircle}>
                <View style={[styles.pulseRing, { backgroundColor: C.moodLight, borderColor: C.mood }]}>
                  <Text style={styles.pulseEmoji}>{todayMood ?? '😶'}</Text>
                </View>
                <Text style={[styles.pulseName, { color: C.textSecondary }]} numberOfLines={1}>
                  {profile?.displayName ?? 'You'}
                </Text>
              </View>

              {activeCouple?.partner && (
                <>
                  <View style={[styles.pulseDivider, { backgroundColor: C.border }]} />
                  <View style={styles.pulseCircle}>
                    <View style={[styles.pulseRing, { backgroundColor: C.moodLight, borderColor: C.mood }]}>
                      <Text style={styles.pulseEmoji}>{partnerTodayMood ?? '😶'}</Text>
                    </View>
                    <Text style={[styles.pulseName, { color: C.textSecondary }]} numberOfLines={1}>
                      {activeCouple.partner.displayName ?? 'Partner'}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </Animated.View>

          {/* History */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.historySection}>
            <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>RECENT</Text>
            {checkIns && checkIns.length > 0 ? (
              <View style={styles.listWrap}>
                {checkIns.slice(0, 20).map((item, index) => (
                  <View key={item._id}>{renderCheckInItem({ item, index })}</View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <EmptyState
                  icon="smile"
                  title="How are you feeling?"
                  description="Share your daily pulse with your partner"
                  actionLabel="Check In"
                  onAction={() => sheetRef.current?.present()}
                />
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            sheetRef.current?.present();
          }}
          activeOpacity={0.85}
          style={[styles.floatingFab, { backgroundColor: C.mood }]}
        >
          <Feather name="plus" size={22} color={C.ink} />
        </TouchableOpacity>

        <CreateCheckInSheet sheetRef={sheetRef} onSave={handleCreateCheckIn} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: 20,
  },
  fab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 120,
  },

  // Pulse
  pulseSection: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  sectionLabel: {
    ...Typography.overline,
    letterSpacing: 3,
    marginBottom: Spacing.lg,
  },
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pulseRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseEmoji: {
    fontSize: 36,
  },
  pulseName: {
    ...Typography.caption,
    maxWidth: 80,
    textAlign: 'center',
  },
  pulseDivider: {
    width: 1,
    height: 40,
    marginHorizontal: Spacing['2xl'],
  },

  // History
  historySection: {
    marginTop: Spacing.md,
  },
  listWrap: {
    gap: Spacing.sm,
  },
  checkInCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  checkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checkInEmoji: {
    fontSize: 28,
  },
  checkInContent: {
    flex: 1,
    gap: 2,
  },
  checkInDate: {
    ...Typography.small,
  },
  checkInNote: {
    ...Typography.caption,
    lineHeight: 18,
  },
  emptyWrap: {
    height: 300,
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
