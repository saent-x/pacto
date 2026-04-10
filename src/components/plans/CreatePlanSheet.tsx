import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
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
import { Spacing } from '@/src/constants/spacing';

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
  const [targetDate, setTargetDate] = useState(plan?.targetDate ? new Date(`${plan.targetDate}T00:00:00`) : null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [budget, setBudget] = useState(plan?.budget ? String(plan.budget) : '');
  const [status, setStatus] = useState(plan?.status ?? 'active');
  const [priority, setPriority] = useState(plan?.priority ?? 0);
  const [isPrivate, setIsPrivate] = useState(plan?.isPrivate ?? false);
  const [saving, setSaving] = useState(false);
  const sessionKey = plan ? `edit:${plan.id}` : 'create';
  const sessionKeyRef = useRef(sessionKey);

  const isEdit = !!plan;

  const { glassBg, glassBorder } = useGlass();
  const activeBg = C.plansLight;

  useEffect(() => {
    if (sessionKeyRef.current === sessionKey) {
      return;
    }

    sessionKeyRef.current = sessionKey;
    setTitle(plan?.title ?? '');
    setDescription(plan?.description ?? '');
    setCategory(plan?.category ?? '');
    setTargetDate(plan?.targetDate ? new Date(`${plan.targetDate}T00:00:00`) : null);
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
        targetDate: targetDate ? format(targetDate, 'yyyy-MM-dd') : null,
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
      style={[sheet.saveBtn, { backgroundColor: C.plans }]}
    >
      <Feather name={isEdit ? 'check' : 'clipboard'} size={18} color={C.ink} />
      <Text style={[sheet.saveBtnText, { color: C.ink }]}>
        {saving ? 'Saving...' : isEdit ? 'Update' : 'Create Plan'}
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
          <Text style={[sheet.sheetLabel, { color: C.plans }]}>
            {isEdit ? 'EDIT PLAN' : 'NEW PLAN'}
          </Text>
          <Text style={[sheet.dateDisplay, { color: C.primary }]}>
            {targetDate ? format(targetDate, 'EEEE, MMMM d') : format(new Date(), 'EEEE, MMMM d')}
          </Text>
        </View>

        <BottomSheetTextInput
          style={[sheet.titleInput, { color: C.text }]}
          placeholder="What's the plan?"
          placeholderTextColor={C.fog}
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        <View style={[sheet.bodyCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <BottomSheetTextInput
            style={[sheet.bodyInput, { color: C.text }]}
            placeholder="Add details..."
            placeholderTextColor={C.fog}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
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
                      { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.plans : glassBorder },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCategory(category === cat.value ? '' : cat.value);
                    }}
                  >
                    <Text style={[sheet.chipText, { color: active ? C.plans : C.haze }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Target date — glass pill */}
        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Target date</Text>
          <TouchableOpacity
            style={[sheet.glassPill, { backgroundColor: glassBg, borderColor: glassBorder }]}
            onPress={() => {
              Haptics.selectionAsync();
              setShowDatePicker((current) => !current);
            }}
          >
            <Feather name="calendar" size={15} color={C.plans} />
            <Text style={[sheet.glassPillText, { color: C.text }]}>
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
        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Budget</Text>
          <View style={sheet.amountRow}>
            <Text style={[sheet.currencySign, { color: C.plans }]}>$</Text>
            <BottomSheetTextInput
              style={[sheet.amountInput, { color: C.text }]}
              placeholder="0.00"
              placeholderTextColor={C.fog}
              value={budget}
              onChangeText={setBudget}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Status — glass chips */}
        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={sheet.chipRow}>
              {STATUSES.map((s) => {
                const active = status === s.value;
                return (
                  <TouchableOpacity
                    key={s.value}
                    style={[
                      sheet.chip,
                      { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.plans : glassBorder },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setStatus(s.value);
                    }}
                  >
                    <Text style={[sheet.chipText, { color: active ? C.plans : C.haze }]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Priority — glass toggles */}
        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Priority</Text>
          <View style={sheet.toggleRow}>
            {PRIORITIES.map((p) => {
              const active = priority === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    sheet.glassToggle,
                    { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.plans : glassBorder },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPriority(priority === p.value ? 0 : p.value);
                  }}
                >
                  <Feather name={p.icon} size={14} color={active ? C.plans : C.fog} />
                  <Text style={[sheet.toggleText, { color: active ? C.plans : C.haze }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Privacy toggle */}
        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Privacy</Text>
          <TouchableOpacity
            style={[
              sheet.glassToggle,
              { backgroundColor: isPrivate ? activeBg : glassBg, borderColor: isPrivate ? C.plans : glassBorder, flex: 0, paddingHorizontal: Spacing.lg },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setIsPrivate((prev) => !prev);
            }}
          >
            <Feather name={isPrivate ? 'lock' : 'unlock'} size={14} color={isPrivate ? C.plans : C.fog} />
            <Text style={[sheet.toggleText, { color: isPrivate ? C.plans : C.haze }]}>
              {isPrivate ? 'Private' : 'Shared'}
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </ThemedSheet>
  );
}

