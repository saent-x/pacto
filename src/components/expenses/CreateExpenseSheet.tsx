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

const SPLIT_TYPES = [
  { label: 'My treat \u{1F49B}', value: 'my_treat' },
  { label: 'Split evenly', value: 'split' },
  { label: "I'll get the next one", value: 'next_one' },
];

const CATEGORIES = [
  { label: '\u{1F37D}\uFE0F Date night', value: 'Date night' },
  { label: '\u{1F3E0} Our place', value: 'Our place' },
  { label: '\u2708\uFE0F Trip', value: 'Trip' },
  { label: '\u{1F381} Surprise', value: 'Surprise' },
  { label: '\u{1F6D2} Groceries', value: 'Groceries' },
];

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (data: { title: string; amount: number; paidBy: string; splitType: string; category: string; date: string }) => Promise<void>;
  expense?: { id: string; title: string; amount: number; paidBy: string; splitType: string; category: string; date: string };
}

export function CreateExpenseSheet({ sheetRef, onSave, expense }: Props) {
  const C = useColors();
  const { mode } = useTheme();
  const { activeCouple, profile } = useSession();
  const partner = activeCouple?.partner ?? null;
  const currentUserId = profile?._id ?? null;

  const [title, setTitle] = useState(expense?.title ?? '');
  const [amount, setAmount] = useState(expense?.amount ? String(expense.amount) : '');
  const [paidBy, setPaidBy] = useState(expense?.paidBy ?? currentUserId ?? '');
  const [splitType, setSplitType] = useState(expense?.splitType ?? '');
  const [category, setCategory] = useState(expense?.category ?? '');
  const [date, setDate] = useState(expense?.date ? new Date(expense.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const sessionKey = expense ? `edit:${expense.id}` : 'create';
  const sessionKeyRef = useRef(sessionKey);

  const isEdit = !!expense;

  const glassBg = mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const glassBorder = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const activeBg = C.expensesLight;

  useEffect(() => {
    if (sessionKeyRef.current === sessionKey) {
      return;
    }

    sessionKeyRef.current = sessionKey;
    setTitle(expense?.title ?? '');
    setAmount(expense?.amount ? String(expense.amount) : '');
    setPaidBy(expense?.paidBy ?? currentUserId ?? '');
    setSplitType(expense?.splitType ?? '');
    setCategory(expense?.category ?? '');
    setDate(expense?.date ? new Date(expense.date) : new Date());
    setShowDatePicker(false);
  }, [expense, sessionKey, currentUserId]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give your expense a name.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Amount required', 'Enter a valid amount.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        amount: parsedAmount,
        paidBy,
        splitType: splitType || 'split',
        category: category || 'Date night',
        date: date.toISOString(),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheetRef.current?.dismiss();
      if (!isEdit) {
        setTitle('');
        setAmount('');
        setPaidBy(currentUserId ?? '');
        setSplitType('');
        setCategory('');
        setDate(new Date());
      }
    } catch (error) {
      console.warn('[Coupl] Save expense failed:', error);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  }, [title, amount, paidBy, splitType, category, date, onSave, isEdit, sheetRef, currentUserId]);

  const footer = (
    <TouchableOpacity
      onPress={handleSave}
      disabled={saving}
      activeOpacity={0.8}
      style={[styles.saveBtn, { backgroundColor: C.expenses }]}
    >
      <Feather name={isEdit ? 'check' : 'dollar-sign'} size={18} color={C.ink} />
      <Text style={[styles.saveBtnText, { color: C.ink }]}>
        {saving ? 'Saving...' : isEdit ? 'Update' : 'Add Expense'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ThemedSheet
      sheetRef={sheetRef}
      snapPoints={['84%']}
      scrollable
      footer={footer}
    >
      <View style={styles.form}>
        <View style={styles.dateHeader}>
          <Text style={[styles.sheetLabel, { color: C.expenses }]}>
            {isEdit ? 'EDIT EXPENSE' : 'NEW EXPENSE'}
          </Text>
          <Text style={[styles.dateDisplay, { color: C.expenses }]}>
            {format(date, 'EEEE, MMMM d')}
          </Text>
        </View>

        <BottomSheetTextInput
          style={[styles.titleInput, { color: C.text }]}
          placeholder="What was it for?"
          placeholderTextColor={C.fog}
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        {/* Amount — large input */}
        <View style={styles.amountRow}>
          <Text style={[styles.currencySign, { color: C.expenses }]}>$</Text>
          <BottomSheetTextInput
            style={[styles.amountInput, { color: C.text }]}
            placeholder="0.00"
            placeholderTextColor={C.fog}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Paid by — glass toggles */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Paid by</Text>
          <View style={styles.toggleRow}>
            {[
              { value: currentUserId ?? '', label: 'Me', icon: 'user' as const },
              ...(partner ? [{ value: partner._id, label: partner.displayName?.split(' ')[0] ?? 'Partner', icon: 'heart' as const }] : []),
            ].map((opt) => {
              const active = paidBy === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.glassToggle,
                    { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.expenses : glassBorder },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPaidBy(opt.value);
                  }}
                >
                  <Feather name={opt.icon} size={14} color={active ? C.expenses : C.fog} />
                  <Text style={[styles.toggleText, { color: active ? C.expenses : C.haze }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Split type — glass chips */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Split</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {SPLIT_TYPES.map((s) => {
                const active = splitType === s.value;
                return (
                  <TouchableOpacity
                    key={s.value}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.expenses : glassBorder },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSplitType(splitType === s.value ? '' : s.value);
                    }}
                  >
                    <Text style={[styles.chipText, { color: active ? C.expenses : C.haze }]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
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
                      { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.expenses : glassBorder },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCategory(category === cat.value ? '' : cat.value);
                    }}
                  >
                    <Text style={[styles.chipText, { color: active ? C.expenses : C.haze }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Date — glass pill */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Date</Text>
          <TouchableOpacity
            style={[styles.glassPill, { backgroundColor: glassBg, borderColor: glassBorder }]}
            onPress={() => {
              Haptics.selectionAsync();
              setShowDatePicker((current) => !current);
            }}
          >
            <Feather name="calendar" size={15} color={C.expenses} />
            <Text style={[styles.glassPillText, { color: C.text }]}>
              {format(date, 'MMM d, yyyy')}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                if (Platform.OS !== 'ios') setShowDatePicker(false);
                if (d) setDate(d);
              }}
              themeVariant={mode}
            />
          )}
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
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  currencySign: {
    ...Typography.largeTitle,
    fontSize: 42,
  },
  amountInput: {
    ...Typography.largeTitle,
    fontSize: 42,
    padding: 0,
    flex: 1,
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
