import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
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
  const { C, F } = useTheme();
  const { create } = useMilestones();
  const colors = [C.rose, C.peach, C.butter, C.mint, C.sky, C.lavender, C.gold];
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<IconName>('heart');
  const [color, setColor] = useState<string>(C.rose);
  const [repeat, setRepeat] = useState(false);
  const [saving, setSaving] = useState(false);

  const now = useMemo(() => new Date(), []);
  const dateLabel = format(now, 'MMM d, yyyy');
  const dateValue = format(now, 'yyyy-MM-dd');

  const canSave = title.trim().length > 0 && !saving;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await create({
        title: title.trim(),
        date: dateValue,
        icon,
        color,
        repeatYearly: repeat,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-milestone] create failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      eyebrow="NEW MILESTONE"
      eyebrowColor={color}
      title="Mark the day."
      footer={
        <PrimaryButton
          icon="star"
          onPress={onSave}
          disabled={!canSave}
        >
          {saving ? 'Saving…' : 'Save milestone'}
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
              <Pressable
                key={i}
                testID={`new-milestone-icon-${i}`}
                onPress={() => setIcon(i)}
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
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Color</Overline>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {colors.map((c) => (
            <Pressable
              key={c}
              testID={`new-milestone-color-${c}`}
              onPress={() => setColor(c)}
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
          onPress={() => setRepeat((v) => !v)}
          style={{
            width: 44,
            height: 26,
            borderRadius: 13,
            backgroundColor: repeat ? color : C.line,
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: 3,
              left: repeat ? 21 : 3,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: '#fff',
            }}
          />
        </Pressable>
      </View>
    </SheetShell>
  );
}
