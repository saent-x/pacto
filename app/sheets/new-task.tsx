import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Overline, Pill, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { useTheme } from '@/src/lib/theme';
import { useTaskLists } from '@/src/hooks/useTaskLists';
import { useTaskItems } from '@/src/hooks/useTasks';

const PRIORITIES: { k: 'low' | 'med' | 'high'; icon: IconName; dots: number; num: number }[] = [
  { k: 'low', icon: 'arrowDown', dots: 1, num: 1 },
  { k: 'med', icon: 'minus', dots: 2, num: 2 },
  { k: 'high', icon: 'chevronsUp', dots: 3, num: 3 },
];

const BUCKET_OFFSETS: Record<string, number | null> = {
  Today: 0,
  Tomorrow: 1,
  'This week': 3,
  Later: null,
};

function dueIso(offsetDays: number | null): string | null {
  if (offsetDays === null) return null;
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function NewTask() {
  const { listId } = useLocalSearchParams<{ listId?: string }>();
  const { C, F } = useTheme();
  const { lists } = useTaskLists();
  const { create } = useTaskItems(listId ?? null);

  const list = lists.find((l) => l.id === listId) ?? null;
  const color = list ? ((C as any)[list.colorKey] as string) : C.gold;

  const [title, setTitle] = useState('');
  const [bucket, setBucket] = useState<string>('Today');
  const [priority, setPriority] = useState<'low' | 'med' | 'high'>('med');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed || !listId || saving) return;
    setSaving(true);
    try {
      const prio = PRIORITIES.find((p) => p.k === priority)!.num;
      await create({
        title: trimmed,
        due_date: dueIso(BUCKET_OFFSETS[bucket] ?? null),
        priority: prio,
      });
      router.back();
    } catch (err) {
      console.warn('[new-task] create failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      eyebrow="NEW TASK"
      eyebrowColor={color}
      title={list?.name ?? 'Quick task.'}
      footer={
        <PrimaryButton
          icon="check"
          onPress={handleSave}
          disabled={!title.trim() || !listId || saving}
        >
          Add task
        </PrimaryButton>
      }
    >
      <Overline style={{ marginBottom: 8 }}>What needs doing</Overline>
      <TextInput
        testID="new-task-title-input"
        value={title}
        onChangeText={setTitle}
        placeholder="Pack travel documents..."
        placeholderTextColor={C.fog}
        autoFocus
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
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {Object.keys(BUCKET_OFFSETS).map((b) => (
            <Pill
              key={b}
              testID={`new-task-bucket-${b}`}
              active={bucket === b}
              activeBg={`${color}33`}
              activeColor={color}
              onPress={() => setBucket(b)}
            >
              {b}
            </Pill>
          ))}
        </View>
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Priority</Overline>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {PRIORITIES.map((p) => {
            const sel = priority === p.k;
            return (
              <Pressable
                key={p.k}
                testID={`new-task-priority-${p.k}`}
                onPress={() => setPriority(p.k)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 16,
                  backgroundColor: sel ? `${color}26` : 'transparent',
                  borderWidth: 1,
                  borderColor: sel ? color : C.line,
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon name={p.icon} size={18} color={sel ? color : C.mist} strokeWidth={2.5} />
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {[0, 1, 2].map((i) => (
                    <View
                      key={i}
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor:
                          i < p.dots ? (sel ? color : C.mist) : sel ? `${color}33` : C.line,
                      }}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {list ? (
        <View
          style={{
            marginTop: 22,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 14,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              backgroundColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={list.icon} size={14} color={(C as any)[`${list.colorKey}Ink`]} />
          </View>
          <Text style={{ flex: 1, color: C.mist, fontFamily: F.body, fontSize: 13 }}>
            Adding to <Text style={{ color: C.bone, fontFamily: F.bodyBold }}>{list.name}</Text>
          </Text>
        </View>
      ) : null}
    </SheetShell>
  );
}
