import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { Overline, Pill, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { usePlans } from '@/src/hooks/usePlans';
import { useTheme } from '@/src/lib/theme';

const ICONS: IconName[] = [
  'compass',
  'mapPin',
  'home',
  'heart',
  'gift',
  'star',
  'coffee',
  'camera',
  'briefcase',
  'book',
];

const TARGETS = ['This month', 'Next month', '3 months', '6 months', 'This year', '2027+'];

type Bucket = 'Soon' | 'Ongoing' | 'Later' | 'Someday';

const BUCKET_CANON: Record<Bucket, string> = {
  Soon: 'This month',
  Ongoing: 'Ongoing',
  Later: 'Later this year',
  Someday: 'Someday',
};

function bucketFromCanon(canonical: string | null | undefined): Bucket {
  switch (canonical) {
    case 'Ongoing':
      return 'Ongoing';
    case 'Later this year':
      return 'Later';
    case 'Someday':
      return 'Someday';
    default:
      return 'Soon';
  }
}

export default function NewPlan() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { C, F } = useTheme();
  const { create, update, plans } = usePlans();
  const existing = useMemo(
    () => (isEdit && id ? plans.find((p) => p.id === id) : undefined),
    [isEdit, id, plans],
  );
  const colors = [C.sky, C.peach, C.butter, C.mint, C.rose, C.lavender, C.gold];
  const [title, setTitle] = useState(existing?.title ?? '');
  const [sub, setSub] = useState(existing?.description ?? '');
  const [icon, setIcon] = useState<IconName>((existing?.icon as IconName) ?? 'compass');
  const [color, setColor] = useState<string>(existing?.color ?? C.sky);
  const [bucket, setBucket] = useState<Bucket>(
    existing ? bucketFromCanon(existing.bucket) : 'Soon',
  );
  const [target, setTarget] = useState(existing?.category ?? 'This month');
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && !saving;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: sub.trim() || null,
        category: target,
        bucket: BUCKET_CANON[bucket],
        icon,
        color,
        priority: existing?.priority ?? 0,
        status: existing?.status ?? 'active',
      };
      if (isEdit && id) {
        await update(id, payload);
      } else {
        await create(payload);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-plan] save failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const buckets: { k: Bucket; sub: string; color: string }[] = useMemo(
    () => [
      { k: 'Soon', sub: 'weeks', color: C.peach },
      { k: 'Ongoing', sub: 'always-on', color: C.butter },
      { k: 'Later', sub: 'months', color: C.mint },
      { k: 'Someday', sub: 'dreamy', color: C.lavender },
    ],
    [C]
  );

  return (
    <SheetShell
      eyebrow={isEdit ? 'EDIT PLAN' : 'NEW PLAN'}
      eyebrowColor={color}
      title={isEdit ? 'Edit plan.' : 'Something to build.'}
      footer={
        <PrimaryButton icon={isEdit ? 'check' : 'plus'} onPress={onSave} disabled={!canSave}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create plan'}
        </PrimaryButton>
      }
    >
      {/* Preview card */}
      <View style={{ backgroundColor: color, borderRadius: 20, padding: 18, marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 9,
                fontFamily: F.bodyBold,
                letterSpacing: 1.4,
                opacity: 0.5,
                color: '#1A0F0A',
                textTransform: 'uppercase',
              }}
            >
              {bucket}
            </Text>
            <Text
              style={{
                fontFamily: F.displayBold,
                fontSize: 20,
                color: '#1A0F0A',
                letterSpacing: -0.4,
                lineHeight: 22,
                marginTop: 4,
              }}
            >
              {title || 'Your plan title'}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: '#1A0F0A',
                opacity: 0.6,
                fontFamily: F.body,
                marginTop: 2,
              }}
            >
              {sub || target}
            </Text>
          </View>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: 'rgba(0,0,0,0.14)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={icon} size={16} color="#1A0F0A" />
          </View>
        </View>
      </View>

      <Overline style={{ marginBottom: 8 }}>Title</Overline>
      <TextInput
        testID="new-plan-title-input"
        value={title}
        onChangeText={setTitle}
        placeholder="Venice weekend, buy the apartment..."
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

      <View style={{ marginTop: 20 }}>
        <Overline style={{ marginBottom: 8 }}>Subtitle</Overline>
        <TextInput
          testID="new-plan-sub-input"
          value={sub}
          onChangeText={setSub}
          placeholder="3 days, weekends, target late 2026..."
          placeholderTextColor={C.fog}
          style={{
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 12,
            color: C.bone,
            fontFamily: F.body,
            fontSize: 14,
            paddingVertical: 12,
            paddingHorizontal: 14,
          }}
        />
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Bucket</Overline>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {buckets.map((b) => {
            const sel = bucket === b.k;
            return (
              <PressScale
                key={b.k}
                testID={`new-plan-bucket-${b.k}`}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => undefined);
                  setBucket(b.k);
                }}
                style={{
                  width: '48%',
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: sel ? `${b.color}26` : C.card,
                  borderWidth: 1,
                  borderColor: sel ? b.color : C.line,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: F.bodyBold,
                    color: sel ? b.color : C.bone,
                  }}
                >
                  {b.k}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: F.bodyBold,
                    color: C.fog,
                    marginTop: 2,
                    letterSpacing: 0.4,
                  }}
                >
                  {b.sub}
                </Text>
              </PressScale>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Target</Overline>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 12 }}>
            {TARGETS.map((t) => (
              <Pill
                key={t}
                testID={`new-plan-target-${t}`}
                active={target === t}
                activeBg={`${color}33`}
                activeColor={color}
                onPress={() => setTarget(t)}
              >
                {t}
              </Pill>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Icon</Overline>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {ICONS.map((i) => {
            const sel = icon === i;
            return (
              <PressScale
                key={i}
                testID={`new-plan-icon-${i}`}
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
              testID={`new-plan-color-${c}`}
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
    </SheetShell>
  );
}
