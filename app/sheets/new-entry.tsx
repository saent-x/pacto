import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { useJournal } from '@/src/hooks/useJournal';
import { useTheme } from '@/src/lib/theme';

type Mood = 'great' | 'good' | 'okay' | 'low' | 'rough';

export default function NewEntry() {
  const { C, F } = useTheme();
  const { create } = useJournal();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mood, setMood] = useState<Mood>('good');
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  const now = useMemo(() => new Date(), []);
  const eyebrow = format(now, 'EEEE, MMMM d').toUpperCase();
  const entryDate = format(now, 'yyyy-MM-dd');

  const reduced = useReducedMotion();
  const toggleProgress = useSharedValue(isPrivate ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      toggleProgress.value = isPrivate ? 1 : 0;
      return;
    }
    toggleProgress.value = withTiming(isPrivate ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [isPrivate, reduced, toggleProgress]);
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: toggleProgress.value * 18 }],
  }));
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      toggleProgress.value,
      [0, 1],
      [C.line, C.lavender],
    ),
  }));

  const moods: { k: Mood; icon: IconName; color: string; label: string }[] = [
    { k: 'great', icon: 'sun', color: C.mint, label: 'Great' },
    { k: 'good', icon: 'cloud', color: C.sky, label: 'Good' },
    { k: 'okay', icon: 'minus', color: C.butter, label: 'Okay' },
    { k: 'low', icon: 'drizzle', color: C.rose, label: 'Low' },
    { k: 'rough', icon: 'zap', color: C.peach, label: 'Rough' },
  ];

  const canSave = body.trim().length > 0 && !saving;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await create({
        title: title.trim() || null,
        body: body.trim(),
        mood,
        is_private: isPrivate,
        entry_date: entryDate,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-entry] create failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      eyebrow={eyebrow}
      title="New entry."
      footer={
        <PrimaryButton
          icon="feather"
          onPress={onSave}
          disabled={!canSave}
        >
          {saving ? 'Saving…' : 'Save entry'}
        </PrimaryButton>
      }
    >
      <TextInput
        testID="new-entry-title-input"
        value={title}
        onChangeText={setTitle}
        placeholder="Give it a title…"
        placeholderTextColor={C.fog}
        style={{
          color: C.bone,
          fontFamily: F.displayBold,
          fontSize: 26,
          paddingVertical: 6,
          letterSpacing: -0.5,
        }}
      />
      <View style={{ marginTop: 4, width: 40, height: 2, backgroundColor: C.gold, borderRadius: 1 }} />

      <TextInput
        testID="new-entry-body-input"
        value={body}
        onChangeText={setBody}
        placeholder="Write your thoughts..."
        placeholderTextColor={C.fog}
        multiline
        textAlignVertical="top"
        style={{
          minHeight: 200,
          marginTop: 18,
          color: C.bone,
          fontFamily: F.serif,
          fontStyle: body ? 'normal' : 'italic',
          fontSize: 16,
          lineHeight: 24,
        }}
      />

      <View style={{ marginTop: 14 }}>
        <Overline style={{ marginBottom: 10 }}>How does it feel?</Overline>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 12 }}>
            {moods.map((m) => {
              const active = mood === m.k;
              return (
                <PressScale
                  key={m.k}
                  testID={`new-entry-mood-${m.k}`}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => undefined);
                    setMood(m.k);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    backgroundColor: active ? `${m.color}26` : 'transparent',
                    borderWidth: 1,
                    borderColor: active ? m.color : C.line,
                  }}
                >
                  <Icon name={m.icon} size={14} color={active ? m.color : C.fog} />
                  <Text
                    style={{
                      color: active ? m.color : C.mist,
                      fontFamily: F.bodyBold,
                      fontSize: 12,
                    }}
                  >
                    {m.label}
                  </Text>
                </PressScale>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View
        style={{
          marginTop: 20,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 14,
          backgroundColor: isPrivate ? 'rgba(184,168,232,0.10)' : C.card,
          borderWidth: 1,
          borderColor: isPrivate ? C.lavender : C.line,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Icon name="lock" size={16} color={isPrivate ? C.lavender : C.fog} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: C.bone, fontFamily: F.bodyBold }}>Private</Text>
          <Text style={{ fontSize: 11, color: C.fog, marginTop: 2 }}>
            {isPrivate ? 'Only you can see this entry' : 'Sofia can see this entry'}
          </Text>
        </View>
        <Pressable
          testID="new-entry-private-toggle"
          onPress={() => {
            Haptics.selectionAsync().catch(() => undefined);
            setIsPrivate((v) => !v);
          }}
        >
          <Animated.View
            style={[
              {
                width: 44,
                height: 26,
                borderRadius: 13,
                justifyContent: 'center',
              },
              trackStyle,
            ]}
          >
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: 3,
                  left: 3,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: '#fff',
                },
                thumbStyle,
              ]}
            />
          </Animated.View>
        </Pressable>
      </View>
    </SheetShell>
  );
}
