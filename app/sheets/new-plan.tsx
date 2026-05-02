import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { FeatureUnavailable } from '@/src/components/features/FeatureUnavailable';
import { PrimaryButton } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import {
  SheetColorGrid,
  SheetIconGrid,
  SheetPreviewCard,
  SheetSection,
  SheetShell,
  SheetTitleField,
  type IconOption,
} from '@/src/components/ui/SheetShell';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { usePlans } from '@/src/hooks/usePlans';
import { useTheme } from '@/src/lib/theme';

const ICONS: IconOption<IconName>[] = [
  { key: 'compass', icon: 'compass' },
  { key: 'mapPin', icon: 'mapPin' },
  { key: 'home', icon: 'home' },
  { key: 'heart', icon: 'heart' },
  { key: 'gift', icon: 'gift' },
  { key: 'star', icon: 'star' },
  { key: 'coffee', icon: 'coffee' },
  { key: 'camera', icon: 'camera' },
  { key: 'briefcase', icon: 'briefcase' },
  { key: 'book', icon: 'book' },
];

type Bucket = 'Soon' | 'Ongoing' | 'Later' | 'Someday';

const BUCKET_CANON: Record<Bucket, string> = {
  Soon: 'This month',
  Ongoing: 'Ongoing',
  Later: 'Later this year',
  Someday: 'Someday',
};

const BUCKETS: { key: Bucket; icon: IconName }[] = [
  { key: 'Soon', icon: 'zap' },
  { key: 'Ongoing', icon: 'repeat' },
  { key: 'Later', icon: 'clock' },
  { key: 'Someday', icon: 'star' },
];

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
  const gate = useFeatureGate('goals');
  if (!gate.enabled) return gate.feature ? <FeatureUnavailable feature={gate.feature} /> : null;
  return <NewPlanInner />;
}

function NewPlanInner() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { C, F } = useTheme();
  const { create, update, plans } = usePlans();
  const existing = useMemo(
    () => (isEdit && id ? plans.find((p) => p.id === id) : undefined),
    [isEdit, id, plans],
  );
  const colorOptions = useMemo(
    () => [C.sky, C.peach, C.butter, C.mint, C.rose, C.lavender, C.gold].map((v) => ({ key: v, value: v })),
    [C],
  );
  const [title, setTitle] = useState(existing?.title ?? '');
  const [icon, setIcon] = useState<IconName>((existing?.icon as IconName) ?? 'compass');
  const [color, setColor] = useState<string>(existing?.color ?? C.sky);
  const [bucket, setBucket] = useState<Bucket>(
    existing ? bucketFromCanon(existing.bucket) : 'Soon',
  );
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && !saving;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: null,
        category: BUCKET_CANON[bucket],
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

  return (
    <SheetShell
      eyebrow={isEdit ? 'EDIT GOAL' : 'NEW GOAL'}
      eyebrowColor={color}
      title={isEdit ? 'Edit goal' : 'New goal'}
      footer={
        <PrimaryButton icon={isEdit ? 'check' : 'plus'} onPress={onSave} disabled={!canSave}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create goal'}
        </PrimaryButton>
      }
    >
      <SheetPreviewCard bg={color} ink="#1A0F0A">
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
              {title || 'Your goal title'}
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
      </SheetPreviewCard>

      <SheetSection title="Title" first>
        <SheetTitleField
          testID="new-plan-title-input"
          value={title}
          onChangeText={setTitle}
          placeholder="Name your goal…"
          accent={color}
        />
      </SheetSection>

      <SheetSection title="Bucket">
        <SheetIconGrid
          options={BUCKETS}
          selected={bucket}
          onChange={setBucket}
          accent={color}
          testIDPrefix="new-plan-bucket"
        />
      </SheetSection>

      <SheetSection title="Icon">
        <SheetIconGrid
          options={ICONS}
          selected={icon}
          onChange={setIcon}
          accent={color}
          testIDPrefix="new-plan-icon"
        />
      </SheetSection>

      <SheetSection title="Color">
        <SheetColorGrid
          colors={colorOptions}
          selected={color}
          onChange={setColor}
          testIDPrefix="new-plan-color"
        />
      </SheetSection>
    </SheetShell>
  );
}
