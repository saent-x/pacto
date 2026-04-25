import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
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
import { useMilestones } from '@/src/hooks/useMilestones';
import { useTheme } from '@/src/lib/theme';

const ICONS: IconName[] = [
  'heart',
  'star',
  'home',
  'mapPin',
  'gift',
  'coffee',
  'briefcase',
  'camera',
  'music',
];

export default function NewMilestone() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { C, F } = useTheme();
  const { create, update, milestones } = useMilestones();
  const existing = useMemo(
    () => (isEdit && id ? milestones.find((m) => m.id === id) : undefined),
    [isEdit, id, milestones],
  );
  const colors = [C.rose, C.peach, C.butter, C.mint, C.sky, C.lavender, C.gold];
  const [title, setTitle] = useState(existing?.title ?? '');
  const [icon, setIcon] = useState<IconName>((existing?.icon as IconName) ?? 'heart');
  const [color, setColor] = useState<string>(existing?.color ?? C.rose);
  const [repeat, setRepeat] = useState(Boolean(existing?.repeatYearly));
  const [saving, setSaving] = useState(false);

  const now = useMemo(() => new Date(), []);
  const dateLabel = existing?.date
    ? format(new Date(existing.date), 'MMM d, yyyy')
    : format(now, 'MMM d, yyyy');
  const dateValue = existing?.date ?? format(now, 'yyyy-MM-dd');

  const canSave = title.trim().length > 0 && !saving;

  const reduced = useReducedMotion();
  const repeatProgress = useSharedValue(repeat ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      repeatProgress.value = repeat ? 1 : 0;
      return;
    }
    repeatProgress.value = withTiming(repeat ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [repeat, reduced, repeatProgress]);
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: repeatProgress.value * 18 }],
  }));
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      repeatProgress.value,
      [0, 1],
      [C.line, color],
    ),
  }));

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        date: dateValue,
        icon,
        color,
        repeatYearly: repeat,
      };
      if (isEdit && id) {
        await update(id, payload);
      } else {
        await create(payload);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-milestone] save failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      eyebrow={isEdit ? 'EDIT MILESTONE' : 'NEW MILESTONE'}
      eyebrowColor={color}
      title={isEdit ? 'Edit milestone.' : 'Mark the day.'}
      footer={
        <PrimaryButton
          icon={isEdit ? 'check' : 'star'}
          onPress={onSave}
          disabled={!canSave}
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save milestone'}
        </PrimaryButton>
      }
    >
      <Overline style={{ marginBottom: 8 }}>What is it</Overline>
      <TextInput
        testID="new-milestone-title-input"
        value={title}
        onChangeText={setTitle}
        placeholder="Anniversary, first apartment..."
        placeholderTextColor={C.fog}
        style={{
          color: C.bone,
          fontFamily: F.displayBold,
          fontSize: 22,
          paddingVertical: 6,
          borderBottomWidth: 2,
          borderBottomColor: title ? color : C.line,
        }}
      />

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>When</Overline>
        <View
          style={{
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 14,
            paddingVertical: 14,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Icon name="calendar" size={16} color={color} />
          <Text style={{ flex: 1, color: C.bone, fontSize: 14, fontFamily: F.bodyBold }}>
            {dateLabel}
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: C.fog,
              fontFamily: F.bodyBold,
              letterSpacing: 0.8,
            }}
          >
            TAP TO EDIT
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Icon</Overline>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {ICONS.map((i) => {
            const sel = icon === i;
            return (
              <PressScale
                key={i}
                testID={`new-milestone-icon-${i}`}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => undefined);
                  setIcon(i);
                }}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 13,
                  backgroundColor: sel ? `${color}33` : C.card,
                  borderWidth: 1,
                  borderColor: sel ? color : C.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={i} size={17} color={sel ? color : C.mist} />
              </PressScale>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Color</Overline>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {colors.map((c) => (
            <PressScale
              key={c}
              testID={`new-milestone-color-${c}`}
              onPress={() => {
                Haptics.selectionAsync().catch(() => undefined);
                setColor(c);
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: c,
                borderWidth: 3,
                borderColor: color === c ? 'rgba(255,255,255,0.35)' : 'transparent',
              }}
            />
          ))}
        </View>
      </View>

      <View
        style={{
          marginTop: 22,
          paddingVertical: 14,
          paddingHorizontal: 16,
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Icon name="repeat" size={16} color={repeat ? color : C.fog} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: C.bone, fontFamily: F.bodyBold }}>
            Remind me every year
          </Text>
          <Text style={{ fontSize: 11, color: C.fog, marginTop: 2, fontFamily: F.body }}>
            {repeat ? 'We’ll nudge you both 3 days before' : 'One-time only'}
          </Text>
        </View>
        <Pressable
          testID="new-milestone-repeat-toggle"
          onPress={() => {
            Haptics.selectionAsync().catch(() => undefined);
            setRepeat((v) => !v);
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
