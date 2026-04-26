import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { PrimaryButton } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import {
  SheetIconLabelPicker,
  SheetPreviewCard,
  SheetSection,
  SheetShell,
  SheetTitleField,
  type IconLabelOption,
} from '@/src/components/ui/SheetShell';
import { useSession } from '@/src/hooks/useSession';
import { useTimetables } from '@/src/hooks/useTimetables';
import { useTheme } from '@/src/lib/theme';
import { TEMPLATES, type TemplateKey } from '@/src/lib/timetables-data';

type Share = 'solo' | 'partner' | 'shared';

// solo-mode: share-with hidden — defaults to solo
export default function NewTimetable() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { C, F } = useTheme();
  const { create, update, timetables } = useTimetables();
  const { isSolo, partner } = useSession();
  const partnerName = partner?.displayName ?? 'Sofia';
  const existing = useMemo(
    () => (isEdit && id ? timetables.find((t) => t.id === id) : undefined),
    [isEdit, id, timetables],
  );
  const [title, setTitle] = useState(existing?.title ?? '');
  const [tmplKey, setTmplKey] = useState<TemplateKey>(
    (existing?.template as TemplateKey) ?? 'meals',
  );
  const [share, setShare] = useState<Share>(
    (existing?.share as Share) ?? (isSolo ? 'solo' : 'shared'),
  );
  const [saving, setSaving] = useState(false);
  const tmpl = TEMPLATES.find((t) => t.key === tmplKey) ?? TEMPLATES[0];

  const shareOptions: IconLabelOption<Share>[] = useMemo(
    () => [
      { key: 'solo', icon: 'user', label: 'Just me', color: C.sky },
      { key: 'partner', icon: 'heart', label: `${partnerName}'s`, color: C.lavender },
      { key: 'shared', icon: 'users', label: 'Together', color: C.gold },
    ],
    [C, partnerName],
  );

  const canSave = title.trim().length > 0 && !saving;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        template: tmplKey,
        share: isSolo ? ('solo' as Share) : share,
      };
      if (isEdit && id) {
        await update(id, payload);
      } else {
        await create(payload);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-timetable] save failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      eyebrow={isEdit ? 'EDIT TIMETABLE' : 'NEW TIMETABLE'}
      title={isEdit ? 'Edit timetable.' : 'Shape the week.'}
      footer={
        <PrimaryButton icon={isEdit ? 'check' : 'plus'} onPress={onSave} disabled={!canSave}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create timetable'}
        </PrimaryButton>
      }
    >
      <SheetPreviewCard bg={tmpl.color} ink={tmpl.ink}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 9,
                fontFamily: F.bodyBold,
                letterSpacing: 1.2,
                opacity: 0.55,
                color: tmpl.ink,
              }}
            >
              {share === 'shared'
                ? 'SHARED'
                : share === 'partner'
                  ? `${partnerName.toUpperCase()}'S`
                  : 'SOLO'}{' '}·{' '}
              {tmpl.label.toUpperCase()}
            </Text>
            <Text
              style={{
                fontFamily: F.displayBold,
                fontSize: 22,
                color: tmpl.ink,
                letterSpacing: -0.4,
                lineHeight: 24,
                marginTop: 6,
              }}
            >
              {title || `${tmpl.label} — our week`}
            </Text>
          </View>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: `${tmpl.ink}22`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={tmpl.icon} size={20} color={tmpl.ink} strokeWidth={2.2} />
          </View>
        </View>
      </SheetPreviewCard>

      <SheetSection title="Title" first>
        <SheetTitleField
          testID="new-timetable-title-input"
          value={title}
          onChangeText={setTitle}
          placeholder="Our meals this week..."
          accent={C.gold}
        />
      </SheetSection>

      <SheetSection title="Template">
        {/* EXCEPTION: free-form template labels — icon-only grid would lose the user-facing name */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TEMPLATES.map((t) => {
            const sel = tmplKey === t.key;
            return (
              <PressScale
                key={t.key}
                testID={`new-timetable-tmpl-${t.key}`}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => undefined);
                  setTmplKey(t.key);
                }}
                style={{
                  width: '48%',
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: sel ? t.color : C.card,
                  borderWidth: 1,
                  borderColor: sel ? t.color : C.line,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: sel ? `${t.ink}22` : t.color,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={t.icon as IconName} size={15} color={t.ink} strokeWidth={2.2} />
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: F.bodyBold,
                    color: sel ? t.ink : C.bone,
                    flex: 1,
                  }}
                >
                  {t.label}
                </Text>
              </PressScale>
            );
          })}
        </View>
      </SheetSection>

      {!isSolo && (
        <SheetSection title="Share with">
          <SheetIconLabelPicker
            options={shareOptions}
            selected={share}
            onChange={setShare}
            testIDPrefix="new-timetable-share"
          />
        </SheetSection>
      )}
    </SheetShell>
  );
}
