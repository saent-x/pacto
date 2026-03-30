import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { ThemedSheet, BottomSheetTextInput } from '@/src/components/ui';
import { useColors } from '@/src/hooks/useColors';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';

const STATUSES = [
  { label: 'Active', value: 'active' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'On hold', value: 'on_hold' },
];

const PRIORITIES = [
  { value: 1, label: 'Low', icon: 'minus' as const },
  { value: 2, label: 'Med', icon: 'alert-circle' as const },
  { value: 3, label: 'High', icon: 'alert-triangle' as const },
];

const CATEGORIES = [
  { label: '\u2708\uFE0F Trip', value: 'Trip' },
  { label: '\u{1F495} Date', value: 'Date' },
  { label: '\u{1F3E0} Home', value: 'Home' },
  { label: '\u{1F3AF} Goal', value: 'Goal' },
  { label: '\u{1F381} Gift', value: 'Gift' },
];

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (data: { title: string; description: string | null; category: string | null; targetDate: string | null; budget: number | null; status: string; priority: number; isPrivate: boolean }) => Promise<void>;
  plan?: { id: string; title: string; description: string | null; category: string | null; targetDate: string | null; budget: number | null; status: string; priority: number; isPrivate: boolean };
}

export function CreatePlanSheet({ sheetRef, onSave, plan }: Props) {
  const C = useColors();
  const { mode } = useTheme();
  const { activeCouple, profile } = useSession();

  const [title, setTitle] = useState(plan?.title ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [category, setCategory] = useState(plan?.category ?? '');
  const [targetDate, setTargetDate] = useState(plan?.targetDate ? new Date(plan.targetDate) : null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [budget, setBudget] = useState(plan?.budget ? String(plan.budget) : '');
  const [status, setStatus] = useState(plan?.status ?? 'active');
  const [priority, setPriority] = useState(plan?.priority ?? 0);
  const [isPrivate, setIsPrivate] = useState(plan?.isPrivate ?? false);
  const [saving, setSaving] = useState(false);
  const sessionKey = plan ? `edit:${plan.id}` : 'create';
  const sessionKeyRef = useRef(sessionKey);

  const isEdit = !!plan;

  const glassBg = mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const glassBorder = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const activeBg = C.plansLight;

  useEffect(() => {
    if (sessionKeyRef.current === sessionKey) {
      return;
    }

    sessionKeyRef.current = sessionKey;
    setTitle(plan?.title ?? '');
    setDescription(plan?.description ?? '');
    setCategory(plan?.category ?? '');
    setTargetDate(plan?.targetDate ? new Date(plan.targetDate) : null);
    setShowDatePicker(false);
    setBudget(plan?.budget ? String(plan.budget) : '');
    setStatus(plan?.status ?? 'active');
    setPriority(plan?.priority ?? 0);
    setIsPrivate(plan?.isPrivate ?? false);
  }, [plan, sessionKey]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give your plan a name.');
      return;
    }
    setSaving(true);
    try {
      const parsedBudget = budget ? parseFloat(budget) : null;
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        category: category || null,
        targetDate: targetDate ? targetDate.toISOString() : null,
        budget: parsedBudget && !isNaN(parsedBudget) ? parsedBudget : null,
        status,
        priority,
        isPrivate,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheetRef.current?.dismiss();
      if (!isEdit) {
        setTitle('');
        setDescription('');
        setCategory('');
        setTargetDate(null);
        setBudget('');
        setStatus('active');
        setPriority(0);
        setIsPrivate(false);
      }
    } catch (error) {
      console.warn('[Coupl] Save plan failed:', error);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  }, [title, description, category, targetDate, budget, status, priority, isPrivate, onSave, isEdit, sheetRef]);

  const footer = (
    <TouchableOpacity
      onPress={handleSave}
      disabled={saving}
      activeOpacity={0.8}
      style={[styles.saveBtn, { backgroundColor: C.plans }]}
    >
      <Feather name={isEdit ? 'check' : 'clipboard'} size={18} color={C.ink} />
      <Text style={[styles.saveBtnText, { color: C.ink }]}>
        {saving ? 'Saving...' : isEdit ? 'Update' : 'Create Plan'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ThemedSheet
      sheetRef={sheetRef}
      snapPoints={['92%']}
      scrollable
      footer={footer}
    >
      <View style={styles.form}>
        <View style={styles.dateHeader}>
          <Text style={[styles.sheetLabel, { color: C.plans }]}>
            {isEdit ? 'EDIT PLAN' : 'NEW PLAN'}
          </Text>
          <Text style={[styles.dateDisplay, { color: C.plans }]}>
            {targetDate ? format(targetDate, 'EEEE, MMMM d') : format(new Date(), 'EEEE, MMMM d')}
          </Text>
        </View>

        <BottomSheetTextInput
          style={[styles.titleInput, { color: C.text }]}
          placeholder="What's the plan?"
          placeholderTextColor={C.fog}
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        <View style={[styles.bodyCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <BottomSheetTextInput
            style={[styles.bodyInput, { color: C.text }]}
            placeholder="Add details..."
            placeholderTextColor={C.fog}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Category — horizontal scroll glass chips */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => {
                const active = category === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.plans : glassBorder },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCategory(category === cat.value ? '' : cat.value);
                    }}
                  >
                    <Text style={[styles.chipText, { color: active ? C.plans : C.haze }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Target date — glass pill */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Target date</Text>
          <TouchableOpacity
            style={[styles.glassPill, { backgroundColor: glassBg, borderColor: glassBorder }]}
            onPress={() => {
              Haptics.selectionAsync();
              setShowDatePicker((current) => !current);
            }}
          >
            <Feather name="calendar" size={15} color={C.plans} />
            <Text style={[styles.glassPillText, { color: C.text }]}>
              {targetDate ? format(targetDate, 'MMM d, yyyy') : 'Set a date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={targetDate ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                if (Platform.OS !== 'ios') setShowDatePicker(false);
                if (date) setTargetDate(date);
              }}
              themeVariant={mode}
            />
          )}
        </View>

        {/* Budget */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Budget</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.currencySign, { color: C.plans }]}>$</Text>
            <BottomSheetTextInput
              style={[styles.amountInput, { color: C.text }]}
              placeholder="0.00"
              placeholderTextColor={C.fog}
              value={budget}
              onChangeText={setBudget}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Status — glass chips */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {STATUSES.map((s) => {
                const active = status === s.value;
                return (
                  <TouchableOpacity
                    key={s.value}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.plans : glassBorder },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setStatus(s.value);
                    }}
                  >
                    <Text style={[styles.chipText, { color: active ? C.plans : C.haze }]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Priority — glass toggles */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Priority</Text>
          <View style={styles.toggleRow}>
            {PRIORITIES.map((p) => {
              const active = priority === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.glassToggle,
                    { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.plans : glassBorder },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPriority(priority === p.value ? 0 : p.value);
                  }}
                >
                  <Feather name={p.icon} size={14} color={active ? C.plans : C.fog} />
                  <Text style={[styles.toggleText, { color: active ? C.plans : C.haze }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Privacy toggle */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Privacy</Text>
          <TouchableOpacity
            style={[
              styles.glassToggle,
              { backgroundColor: isPrivate ? activeBg : glassBg, borderColor: isPrivate ? C.plans : glassBorder, flex: 0, paddingHorizontal: Spacing.lg },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setIsPrivate((prev) => !prev);
            }}
          >
            <Feather name={isPrivate ? 'lock' : 'unlock'} size={14} color={isPrivate ? C.plans : C.fog} />
            <Text style={[styles.toggleText, { color: isPrivate ? C.plans : C.haze }]}>
              {isPrivate ? 'Private' : 'Shared'}
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </ThemedSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.xl,
  },
  dateHeader: {
    gap: Spacing.xs,
  },
  sheetLabel: {
    ...Typography.overline,
    letterSpacing: 3,
  },
  dateDisplay: {
    ...Typography.overline,
    letterSpacing: 1.5,
  },
  titleInput: {
    ...Typography.title,
    padding: 0,
  },
  bodyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.md,
  },
  bodyInput: {
    ...Typography.body,
    minHeight: 72,
    lineHeight: 22,
    textAlignVertical: 'top',
    padding: 0,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    ...Typography.overline,
    letterSpacing: 2,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  glassPillText: {
    ...Typography.captionMedium,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  currencySign: {
    ...Typography.largeTitle,
    fontSize: 32,
  },
  amountInput: {
    ...Typography.largeTitle,
    fontSize: 32,
    padding: 0,
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  glassToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toggleText: {
    ...Typography.captionMedium,
    fontSize: 13,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    ...Typography.captionMedium,
    fontSize: 13,
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
});
