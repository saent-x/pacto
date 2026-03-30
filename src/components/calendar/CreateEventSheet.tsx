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

const PRIORITIES = [
  { value: 1, label: 'Low', icon: 'minus' as const },
  { value: 2, label: 'Med', icon: 'alert-circle' as const },
  { value: 3, label: 'High', icon: 'alert-triangle' as const },
];

const CATEGORIES = [
  { label: '\u{1F495} Date night', value: 'Date night' },
  { label: '\u{1F382} Birthday', value: 'Birthday' },
  { label: '\u{1F3E0} Home', value: 'Home' },
  { label: '\u{1F468}\u200D\u{1F469}\u200D\u{1F467} Family', value: 'Family' },
  { label: '\u2708\uFE0F Trip', value: 'Trip' },
  { label: '\u{1F4C5} Private', value: 'Private' },
];

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (data: { title: string; description: string | null; startsAt: number; endsAt: number | null; category: string | null; location: string | null; priority: number; isPrivate: boolean }) => Promise<void>;
  event?: { id: string; title: string; description: string | null; startsAt: number; endsAt: number | null; category: string | null; location: string | null; priority: number; isPrivate: boolean };
}

export function CreateEventSheet({ sheetRef, onSave, event }: Props) {
  const C = useColors();
  const { mode } = useTheme();
  const { activeCouple, profile } = useSession();

  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [startsAt, setStartsAt] = useState(event?.startsAt ? new Date(event.startsAt) : new Date());
  const [endsAt, setEndsAt] = useState(event?.endsAt ? new Date(event.endsAt) : null);
  const [showStartDate, setShowStartDate] = useState(false);
  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);
  const [category, setCategory] = useState(event?.category ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [priority, setPriority] = useState(event?.priority ?? 0);
  const [isPrivate, setIsPrivate] = useState(event?.isPrivate ?? false);
  const [saving, setSaving] = useState(false);
  const sessionKey = event ? `edit:${event.id}` : 'create';
  const sessionKeyRef = useRef(sessionKey);

  const isEdit = !!event;

  const glassBg = mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const glassBorder = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const activeBg = C.primaryMuted;

  useEffect(() => {
    if (sessionKeyRef.current === sessionKey) {
      return;
    }

    sessionKeyRef.current = sessionKey;
    setTitle(event?.title ?? '');
    setDescription(event?.description ?? '');
    setStartsAt(event?.startsAt ? new Date(event.startsAt) : new Date());
    setEndsAt(event?.endsAt ? new Date(event.endsAt) : null);
    setShowStartDate(false);
    setShowStartTime(false);
    setShowEndDate(false);
    setShowEndTime(false);
    setCategory(event?.category ?? '');
    setLocation(event?.location ?? '');
    setPriority(event?.priority ?? 0);
    setIsPrivate(event?.isPrivate ?? false);
  }, [event, sessionKey]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give your event a name.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        startsAt: startsAt.getTime(),
        endsAt: endsAt ? endsAt.getTime() : null,
        category: category || null,
        location: location.trim() || null,
        priority,
        isPrivate,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheetRef.current?.dismiss();
      if (!isEdit) {
        setTitle('');
        setDescription('');
        setStartsAt(new Date());
        setEndsAt(null);
        setCategory('');
        setLocation('');
        setPriority(0);
        setIsPrivate(false);
      }
    } catch (error) {
      console.warn('[Coupl] Save event failed:', error);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  }, [title, description, startsAt, endsAt, category, location, priority, isPrivate, onSave, isEdit, sheetRef]);

  const closeAllPickers = () => {
    setShowStartDate(false);
    setShowStartTime(false);
    setShowEndDate(false);
    setShowEndTime(false);
  };

  const footer = (
    <TouchableOpacity
      onPress={handleSave}
      disabled={saving}
      activeOpacity={0.8}
      style={[styles.saveBtn, { backgroundColor: C.primary }]}
    >
      <Feather name={isEdit ? 'check' : 'calendar'} size={18} color={C.ink} />
      <Text style={[styles.saveBtnText, { color: C.ink }]}>
        {saving ? 'Saving...' : isEdit ? 'Update' : 'Add Event'}
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
          <Text style={[styles.sheetLabel, { color: C.primary }]}>
            {isEdit ? 'EDIT EVENT' : 'NEW EVENT'}
          </Text>
          <Text style={[styles.dateDisplay, { color: C.primary }]}>
            {format(startsAt, 'EEEE, MMMM d')}
          </Text>
        </View>

        <BottomSheetTextInput
          style={[styles.titleInput, { color: C.text }]}
          placeholder="What's happening?"
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

        {/* Start — date/time glass pills */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Starts</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={[styles.glassPill, { backgroundColor: glassBg, borderColor: glassBorder }]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowStartDate((current) => !current);
                setShowStartTime(false);
                setShowEndDate(false);
                setShowEndTime(false);
              }}
            >
              <Feather name="calendar" size={15} color={C.primary} />
              <Text style={[styles.glassPillText, { color: C.text }]}>
                {format(startsAt, 'MMM d, yyyy')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.glassPill, { backgroundColor: glassBg, borderColor: glassBorder }]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowStartTime((current) => !current);
                setShowStartDate(false);
                setShowEndDate(false);
                setShowEndTime(false);
              }}
            >
              <Feather name="clock" size={15} color={C.primary} />
              <Text style={[styles.glassPillText, { color: C.text }]}>
                {format(startsAt, 'h:mm a')}
              </Text>
            </TouchableOpacity>
          </View>
          {showStartDate && (
            <DateTimePicker
              value={startsAt}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                if (Platform.OS !== 'ios') setShowStartDate(false);
                if (date) setStartsAt(date);
              }}
              themeVariant={mode}
            />
          )}
          {showStartTime && (
            <DateTimePicker
              value={startsAt}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                if (Platform.OS !== 'ios') setShowStartTime(false);
                if (date) setStartsAt(date);
              }}
              themeVariant={mode}
            />
          )}
        </View>

        {/* End — date/time glass pills */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Ends</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={[styles.glassPill, { backgroundColor: glassBg, borderColor: glassBorder }]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowEndDate((current) => !current);
                setShowStartDate(false);
                setShowStartTime(false);
                setShowEndTime(false);
                if (!endsAt) setEndsAt(new Date(startsAt.getTime() + 60 * 60 * 1000));
              }}
            >
              <Feather name="calendar" size={15} color={C.primary} />
              <Text style={[styles.glassPillText, { color: C.text }]}>
                {endsAt ? format(endsAt, 'MMM d, yyyy') : 'No end date'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.glassPill, { backgroundColor: glassBg, borderColor: glassBorder }]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowEndTime((current) => !current);
                setShowStartDate(false);
                setShowStartTime(false);
                setShowEndDate(false);
                if (!endsAt) setEndsAt(new Date(startsAt.getTime() + 60 * 60 * 1000));
              }}
            >
              <Feather name="clock" size={15} color={C.primary} />
              <Text style={[styles.glassPillText, { color: C.text }]}>
                {endsAt ? format(endsAt, 'h:mm a') : '--:--'}
              </Text>
            </TouchableOpacity>
          </View>
          {showEndDate && (
            <DateTimePicker
              value={endsAt ?? new Date(startsAt.getTime() + 60 * 60 * 1000)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                if (Platform.OS !== 'ios') setShowEndDate(false);
                if (date) setEndsAt(date);
              }}
              themeVariant={mode}
            />
          )}
          {showEndTime && (
            <DateTimePicker
              value={endsAt ?? new Date(startsAt.getTime() + 60 * 60 * 1000)}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                if (Platform.OS !== 'ios') setShowEndTime(false);
                if (date) setEndsAt(date);
              }}
              themeVariant={mode}
            />
          )}
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
                      { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.primary : glassBorder },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCategory(category === cat.value ? '' : cat.value);
                    }}
                  >
                    <Text style={[styles.chipText, { color: active ? C.primary : C.haze }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Location</Text>
          <View style={[styles.glassField, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Feather name="map-pin" size={15} color={C.fog} />
            <BottomSheetTextInput
              style={[styles.fieldInput, { color: C.text }]}
              placeholder="Where?"
              placeholderTextColor={C.fog}
              value={location}
              onChangeText={setLocation}
            />
          </View>
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
                    { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.primary : glassBorder },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPriority(priority === p.value ? 0 : p.value);
                  }}
                >
                  <Feather name={p.icon} size={14} color={active ? C.primary : C.fog} />
                  <Text style={[styles.toggleText, { color: active ? C.primary : C.haze }]}>
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
              { backgroundColor: isPrivate ? activeBg : glassBg, borderColor: isPrivate ? C.primary : glassBorder, flex: 0, paddingHorizontal: Spacing.lg },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setIsPrivate((prev) => !prev);
            }}
          >
            <Feather name={isPrivate ? 'lock' : 'unlock'} size={14} color={isPrivate ? C.primary : C.fog} />
            <Text style={[styles.toggleText, { color: isPrivate ? C.primary : C.haze }]}>
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
  },
  glassPillText: {
    ...Typography.captionMedium,
  },
  glassField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fieldInput: {
    ...Typography.body,
    flex: 1,
    padding: 0,
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
