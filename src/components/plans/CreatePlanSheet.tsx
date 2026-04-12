import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, Alert } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { ThemedSheet, BottomSheetTextInput, OptionSelect } from '@/src/components/ui';
import { sheet, useGlass } from '@/src/components/ui/sheetStyles';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';

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
  plan?: { id: string; title: string; description: string | null; category: string | null; targetDate: string | null };
}

export function CreatePlanSheet({ sheetRef, onSave, plan }: Props) {
  const C = useColors();
  const { mode } = useTheme();

  const [title, setTitle] = useState(plan?.title ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [category, setCategory] = useState(plan?.category ?? '');
  const [targetDate, setTargetDate] = useState(plan?.targetDate ? new Date(`${plan.targetDate}T00:00:00`) : null);
  const [showDatePicker, setShowDatePicker] = useState(false);
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
  }, [plan, sessionKey]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give your plan a name.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        category: category || null,
        targetDate: targetDate ? format(targetDate, 'yyyy-MM-dd') : null,
        budget: null,
        status: 'active',
        priority: 0,
        isPrivate: false,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheetRef.current?.dismiss();
      if (!isEdit) {
        setTitle('');
        setDescription('');
        setCategory('');
        setTargetDate(null);
      }
    } catch (error) {
      console.warn('[Coupl] Save plan failed:', error);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  }, [title, description, category, targetDate, onSave, isEdit, sheetRef]);

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

        {/* Category */}
        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Category</Text>
          <OptionSelect
            options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            selected={category}
            onSelect={setCategory}
            accentColor={C.plans}
            accentBg={activeBg}
          />
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

      </View>
    </ThemedSheet>
  );
}

