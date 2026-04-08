import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Platform, Share } from 'react-native';
import { useCallback, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useConvex, useMutation } from 'convex/react';
import { makeFunctionReference } from 'convex/server';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/hooks/useSession';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { GlassSection, GlassRow, ThemedSheet, BottomSheetTextInput } from '@/src/components/ui';

const updateCoupleMutation = makeFunctionReference<'mutation', { name?: string; anniversary?: string | null }, any>('couples:updateCouple');
const leaveCoupleMutation = makeFunctionReference<'mutation', {}>('couples:leaveCouple');
const exportDataQuery = makeFunctionReference<'query', {}, any>('dataExport:exportMyData');

export default function CoupleSettingsScreen() {
  const C = useColors();
  const { mode } = useTheme();
  const router = useRouter();
  const convex = useConvex();
  const updateCouple = useMutation(updateCoupleMutation);
  const { activeCouple, profile, refetch } = useSession();

  const couple = activeCouple?.couple ?? null;
  const partner = activeCouple?.partner ?? null;
  const inviteCode = couple?.inviteCode ?? null;

  // Edit name
  const nameSheetRef = useRef<BottomSheetModal>(null);
  const [editName, setEditName] = useState(couple?.name ?? '');

  // Edit anniversary
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [anniversaryDate, setAnniversaryDate] = useState<Date | null>(
    couple?.anniversary ? new Date(couple.anniversary + 'T12:00:00Z') : null,
  );

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(inviteCode);
    Alert.alert('Copied', 'Invite code copied to clipboard.');
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    try {
      await updateCouple({ name: editName.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      nameSheetRef.current?.dismiss();
      await refetch();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update name.');
    }
  };

  const handleSaveAnniversary = async (date: Date) => {
    const dateStr = date.toISOString().slice(0, 10);
    try {
      await updateCouple({ anniversary: dateStr });
      setAnniversaryDate(date);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refetch();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update anniversary.');
    }
  };

  const handleExportData = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const data = await convex.query(exportDataQuery, {});
      const json = JSON.stringify(data, null, 2);
      await Share.share({
        message: json,
        title: 'Coupl Data Export',
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to export data.');
    }
  };

  const handleLeaveCouple = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Leave Couple',
      'Are you sure you want to leave this couple? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await convex.mutation(leaveCoupleMutation, {});
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to leave couple.');
              return;
            }
            // Refetch session — useProtectedRoute will redirect to
            // onboarding once activeCouple becomes null.
            await refetch();
          },
        },
      ],
    );
  };

  const anniversaryLabel = anniversaryDate
    ? anniversaryDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Tap to set';

  const glassBg = mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';

  const nameSheetFooter = (
    <TouchableOpacity
      onPress={handleSaveName}
      activeOpacity={0.8}
      style={[styles.saveBtn, { backgroundColor: C.primary }]}
    >
      <Feather name="check" size={18} color={C.ink} />
      <Text style={[styles.saveBtnText, { color: C.ink }]}>Save Name</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); router.back(); }}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-left" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.text }]}>Our Space</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Your Couple */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <GlassSection header="Your Couple">
              <GlassRow
                icon="heart"
                label="Couple Name"
                value={couple?.name ?? '—'}
                chevron
                onPress={() => {
                  setEditName(couple?.name ?? '');
                  nameSheetRef.current?.present();
                }}
              />
              <GlassRow
                icon="calendar"
                iconColor={C.reminders}
                label="Anniversary"
                value={anniversaryLabel}
                chevron
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowDatePicker(true);
                }}
                last
              />
            </GlassSection>
          </Animated.View>

          {showDatePicker && (
            <>
              <DateTimePicker
                value={anniversaryDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  if (Platform.OS !== 'ios') setShowDatePicker(false);
                  if (date) handleSaveAnniversary(date);
                }}
                themeVariant={mode}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  activeOpacity={0.8}
                  style={[styles.dateDoneBtn, { backgroundColor: C.primary }]}
                >
                  <Text style={[styles.dateDoneBtnText, { color: C.ink }]}>Done</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Invite */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <GlassSection header="Invite">
              {inviteCode ? (
                <GlassRow
                  icon="link"
                  iconColor={C.info}
                  label="Invite Code"
                  value={inviteCode}
                  chevron
                  onPress={handleCopyCode}
                  last
                />
              ) : (
                <GlassRow
                  icon="check-circle"
                  iconColor={C.success}
                  label="Partner already joined"
                  last
                />
              )}
            </GlassSection>
          </Animated.View>

          {/* Partner */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <GlassSection header="Partner">
              {partner ? (
                <GlassRow
                  icon="user"
                  iconColor={C.primary}
                  label={partner.displayName ?? 'Partner'}
                  subtitle="Joined your couple"
                  last
                />
              ) : (
                <GlassRow
                  icon="user-plus"
                  iconColor={C.textTertiary}
                  label="Waiting for partner"
                  subtitle="Share your invite code"
                  last
                />
              )}
            </GlassSection>
          </Animated.View>

          {/* Privacy & Data */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)}>
            <GlassSection header="Privacy & Data">
              <GlassRow
                icon="lock"
                iconColor={C.primary}
                label="Encryption"
                subtitle="End-to-end encrypt your data"
                chevron
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(tabs)/more/key-exchange' as never);
                }}
              />
              <GlassRow
                icon="download"
                iconColor={C.info}
                label="Export My Data"
                subtitle="Download all your couple data"
                chevron
                onPress={handleExportData}
                last
              />
            </GlassSection>
          </Animated.View>

          {/* Destructive */}
          <Animated.View entering={FadeInDown.duration(400).delay(500)}>
            <GlassSection>
              <GlassRow
                icon="log-out"
                iconColor={C.error}
                iconBg={C.errorLight}
                label="Leave Couple"
                destructive
                last
                onPress={handleLeaveCouple}
              />
            </GlassSection>
          </Animated.View>
        </ScrollView>

        {/* Edit Name Sheet */}
        <ThemedSheet sheetRef={nameSheetRef} snapPoints={['60%']} footer={nameSheetFooter}>
          <View style={styles.sheetContent}>
            <Text style={[styles.sheetLabel, { color: C.primary }]}>COUPLE NAME</Text>
            <BottomSheetTextInput
              style={[styles.sheetInput, { color: C.text }]}
              placeholder="Your couple name..."
              placeholderTextColor={C.fog}
              value={editName}
              onChangeText={setEditName}
              autoFocus
            />
          </View>
        </ThemedSheet>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.subheading,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 120,
  },
  sheetContent: {
    gap: Spacing.lg,
  },
  sheetLabel: {
    ...Typography.overline,
    letterSpacing: 3,
  },
  sheetInput: {
    ...Typography.title,
    padding: 0,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveBtnText: {
    ...Typography.subheading,
    fontSize: 15,
  },
  dateDoneBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: Spacing.lg,
    borderRadius: 14,
  },
  dateDoneBtnText: {
    ...Typography.subheading,
    fontSize: 15,
  },
});
