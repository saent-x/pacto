import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { useTimetables } from '@/src/hooks/useTimetables';
import { useTheme } from '@/src/lib/theme';
import { TEMPLATES, type TemplateKey } from '@/src/lib/timetables-data';

type Share = 'solo' | 'partner' | 'shared';

export default function NewTimetable() {
  const { C, F } = useTheme();
  const { create } = useTimetables();
  const [title, setTitle] = useState('');
  const [tmplKey, setTmplKey] = useState<TemplateKey>('meals');
  const [share, setShare] = useState<Share>('shared');
  const [saving, setSaving] = useState(false);
  const tmpl = TEMPLATES.find((t) => t.key === tmplKey) ?? TEMPLATES[0];

  const canSave = title.trim().length > 0 && !saving;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await create({
        title: title.trim(),
        template: tmplKey,
        share,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-timetable] create failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      eyebrow="NEW TIMETABLE"
      title="Shape the week."
      footer={
        <PrimaryButton icon="plus" onPress={onSave} disabled={!canSave}>
          {saving ? 'Saving…' : 'Create timetable'}
        </PrimaryButton>
      }
    >
      <View
        style={{
          backgroundColor: tmpl.color,
          borderRadius: 22,
          padding: 18,
          marginBottom: 22,
        }}
      >
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
              {share === 'shared' ? 'SHARED' : share === 'partner' ? "SOFIA'S" : 'SOLO'} ·{' '}
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
            <Text
              style={{
                fontSize: 11,
                opacity: 0.65,
                color: tmpl.ink,
                fontFamily: F.body,
                marginTop: 4,
              }}
            >
              {tmpl.sample}
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
      </View>

      <Overline style={{ marginBottom: 8 }}>Title</Overline>
      <TextInput
        testID="new-timetable-title-input"
        value={title}
        onChangeText={setTitle}
        placeholder="Our meals this week..."
        placeholderTextColor={C.fog}
        style={{
          color: C.bone,
          fontFamily: F.displayBold,
          fontSize: 22,
          paddingVertical: 6,
          borderBottomWidth: 2,
          borderBottomColor: title ? C.gold : C.line,
        }}
      />

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Template</Overline>
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
                  <Icon name={t.icon} size={15} color={t.ink} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: F.bodyBold,
                      color: sel ? t.ink : C.bone,
                    }}
                  >
                    {t.label}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 9,
                      color: sel ? t.ink : C.fog,
                      opacity: sel ? 0.6 : 1,
                      fontFamily: F.body,
                      marginTop: 2,
                    }}
                  >
                    {t.sample}
                  </Text>
                </View>
              </PressScale>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Share with</Overline>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(
            [
              { k: 'solo', l: 'Just me', s: 'private', color: '#9FC4DC', icon: 'user' as const },
              { k: 'partner', l: "Sofia's", s: 'for her', color: '#B8A8E8', icon: 'heart' as const },
              { k: 'shared', l: 'Together', s: 'both edit', color: C.gold, icon: 'users' as const },
            ] as { k: Share; l: string; s: string; color: string; icon: any }[]
          ).map((o) => {
            const sel = share === o.k;
            return (
              <PressScale
                key={o.k}
                testID={`new-timetable-share-${o.k}`}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => undefined);
                  setShare(o.k);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  borderRadius: 14,
                  backgroundColor: sel ? `${o.color}1F` : C.card,
                  borderWidth: 1,
                  borderColor: sel ? o.color : C.line,
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon name={o.icon} size={16} color={sel ? o.color : C.mist} />
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: F.bodyBold,
                    color: sel ? o.color : C.bone,
                  }}
                >
                  {o.l}
                </Text>
                <Text
                  style={{
                    fontSize: 9,
                    fontFamily: F.body,
                    color: C.fog,
                  }}
                >
                  {o.s}
                </Text>
              </PressScale>
            );
          })}
        </View>
      </View>
    </SheetShell>
  );
}
