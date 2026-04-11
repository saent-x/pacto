import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { ThemedSheet, BottomSheetTextInput } from '@/src/components/ui';
import { sheet, useGlass } from '@/src/components/ui/sheetStyles';
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

const CURRENCIES = [
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'NGN', label: 'Nigerian Naira', symbol: '₦' },
];

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (data: { title: string; amount: number; paidBy: string; currency: string; splitType: string; category: string; date: string }) => Promise<void>;
  expense?: { id: string; title: string; amount: number; paidBy: string; currency: string; splitType: string; category: string; date: string };
}

export function CreateExpenseSheet({ sheetRef, onSave, expense }: Props) {
  const C = useColors();
  const { mode } = useTheme();
  const { activeCouple, profile } = useSession();
  const partner = activeCouple?.partner ?? null;
  const currentUserId = profile?.id ?? null;

  const [title, setTitle] = useState(expense?.title ?? '');
  const [amount, setAmount] = useState(expense?.amount ? String(expense.amount) : '');
  const [paidBy, setPaidBy] = useState(expense?.paidBy ?? currentUserId ?? '');
  const [currency, setCurrency] = useState(expense?.currency ?? 'USD');
  const [splitType, setSplitType] = useState(expense?.splitType ?? '');
  const [category, setCategory] = useState(expense?.category ?? '');
  const [date, setDate] = useState(expense?.date ? new Date(expense.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const sessionKey = expense ? `edit:${expense.id}` : 'create';
  const sessionKeyRef = useRef(sessionKey);

  const isEdit = !!expense;

  const { glassBg, glassBorder } = useGlass();
  const activeBg = C.expensesLight;

  useEffect(() => {
    if (sessionKeyRef.current === sessionKey) {
      return;
    }

    sessionKeyRef.current = sessionKey;
    setTitle(expense?.title ?? '');
    setAmount(expense?.amount ? String(expense.amount) : '');
    setPaidBy(expense?.paidBy ?? currentUserId ?? '');
    setCurrency(expense?.currency ?? 'USD');
    setSplitType(expense?.splitType ?? '');
    setCategory(expense?.category ?? '');
    setDate(expense?.date ? new Date(expense.date) : new Date());
    setShowDatePicker(false);
    setShowCurrencyPicker(false);
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
        currency,
        splitType: splitType || 'even',
        category: category || 'general',
        date: format(date, 'yyyy-MM-dd'),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheetRef.current?.dismiss();
      if (!isEdit) {
        setTitle('');
        setAmount('');
        setPaidBy(currentUserId ?? '');
        setCurrency('USD');
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
  }, [title, amount, paidBy, currency, splitType, category, date, onSave, isEdit, sheetRef, currentUserId]);

  const selectedCurrency = CURRENCIES.find((item) => item.code === currency) ?? CURRENCIES[0];

  const footer = (
    <TouchableOpacity
      onPress={handleSave}
      disabled={saving}
      activeOpacity={0.8}
      style={[sheet.saveBtn, { backgroundColor: C.expenses }]}
    >
      <Feather name={isEdit ? 'check' : 'dollar-sign'} size={18} color={C.ink} />
      <Text style={[sheet.saveBtnText, { color: C.ink }]}>
        {saving ? 'Saving...' : isEdit ? 'Update' : 'Add Expense'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ThemedSheet
      sheetRef={sheetRef}
      scrollable
      footer={footer}
    >
      <View style={sheet.form}>
        <View style={sheet.dateHeader}>
          <Text style={[sheet.sheetLabel, { color: C.expenses }]}>
            {isEdit ? 'EDIT EXPENSE' : 'NEW EXPENSE'}
          </Text>
          <Text style={[sheet.dateDisplay, { color: C.primary }]}>
            {format(date, 'EEEE, MMMM d')}
          </Text>
        </View>

        <BottomSheetTextInput
          style={[sheet.titleInput, { color: C.text }]}
          placeholder="What was it for?"
          placeholderTextColor={C.fog}
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        {/* Amount — large input */}
        <View style={sheet.amountRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.selectionAsync();
              setShowCurrencyPicker((current) => !current);
            }}
            style={[styles.currencyPill, { backgroundColor: activeBg, borderColor: C.expenses }]}
          >
            <Text style={[styles.currencyCode, { color: C.expenses }]}>{selectedCurrency.code}</Text>
          </TouchableOpacity>
          <Text style={[sheet.currencySign, { color: C.expenses }]}>{selectedCurrency.symbol}</Text>
          <BottomSheetTextInput
            style={[sheet.amountInput, { color: C.text }]}
            placeholder="0.00"
            placeholderTextColor={C.fog}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
        </View>
        {showCurrencyPicker ? (
          <View style={[styles.currencyMenu, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            {CURRENCIES.map((option) => {
              const active = option.code === currency;
              return (
                <TouchableOpacity
                  key={option.code}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCurrency(option.code);
                    setShowCurrencyPicker(false);
                  }}
                  style={[
                    styles.currencyOption,
                    active && { backgroundColor: activeBg },
                  ]}
                >
                  <Text style={[styles.currencyOptionCode, { color: active ? C.expenses : C.text }]}>{option.code}</Text>
                  <Text style={[styles.currencyOptionLabel, { color: active ? C.expenses : C.textSecondary }]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {/* Paid by — glass toggles */}
        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Paid by</Text>
          <View style={sheet.toggleRow}>
            {[
              { value: currentUserId ?? '', label: 'Me', icon: 'user' as const },
              ...(partner ? [{ value: partner.id, label: partner.displayName?.split(' ')[0] ?? 'Partner', icon: 'heart' as const }] : []),
            ].map((opt) => {
              const active = paidBy === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    sheet.glassToggle,
                    { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.expenses : glassBorder },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPaidBy(opt.value);
                  }}
                >
                  <Feather name={opt.icon} size={14} color={active ? C.expenses : C.fog} />
                  <Text style={[sheet.toggleText, { color: active ? C.expenses : C.haze }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Split type — glass chips */}
        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Split</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={sheet.chipRow}>
              {SPLIT_TYPES.map((s) => {
                const active = splitType === s.value;
                return (
                  <TouchableOpacity
                    key={s.value}
                    style={[
                      sheet.chip,
                      { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.expenses : glassBorder },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSplitType(splitType === s.value ? '' : s.value);
                    }}
                  >
                    <Text style={[sheet.chipText, { color: active ? C.expenses : C.haze }]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Category — horizontal scroll glass chips */}
        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={sheet.chipRow}>
              {CATEGORIES.map((cat) => {
                const active = category === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      sheet.chip,
                      { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.expenses : glassBorder },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCategory(category === cat.value ? '' : cat.value);
                    }}
                  >
                    <Text style={[sheet.chipText, { color: active ? C.expenses : C.haze }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Date — glass pill */}
        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Date</Text>
          <TouchableOpacity
            style={[sheet.glassPill, { backgroundColor: glassBg, borderColor: glassBorder }]}
            onPress={() => {
              Haptics.selectionAsync();
              setShowDatePicker((current) => !current);
            }}
          >
            <Feather name="calendar" size={15} color={C.expenses} />
            <Text style={[sheet.glassPillText, { color: C.text }]}>
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
  currencyPill: {
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  currencyCode: {
    ...Typography.captionMedium,
    letterSpacing: 0.8,
  },
  currencyMenu: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    overflow: 'hidden',
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  currencyOptionCode: {
    ...Typography.captionMedium,
    width: 40,
  },
  currencyOptionLabel: {
    ...Typography.body,
    flex: 1,
  },
});
