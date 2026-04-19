import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Overline, Pill, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { useTheme } from '@/src/lib/theme';
import { TASK_LISTS } from '@/src/lib/tasks-data';

const BUCKETS = ['Today', 'Tomorrow', 'This week', 'May', 'Later'];
const PRIORITIES: { k: 'low' | 'med' | 'high'; icon: IconName; dots: number }[] = [
  { k: 'low', icon: 'arrowDown', dots: 1 },
  { k: 'med', icon: 'minus', dots: 2 },
  { k: 'high', icon: 'chevronsUp', dots: 3 },
];

export default function NewTask() {
  const { listId } = useLocalSearchParams<{ listId?: string }>();
  const { C, F } = useTheme();
  const list = TASK_LISTS.find((l) => String(l.id) === String(listId));
  const color = list ? ((C as any)[list.colorKey] as string) : C.gold;

  const [title, setTitle] = useState('');
  const [bucket, setBucket] = useState('Today');
  const [priority, setPriority] = useState<'low' | 'med' | 'high'>('med');

  return (
    <SheetShell
      eyebrow="NEW TASK"
      eyebrowColor={color}
      title={list?.name ?? 'Quick task.'}
      footer={<PrimaryButton icon="check" onPress={() => router.back()}>Add task</PrimaryButton>}
    >
      <Overline style={{ marginBottom: 8 }}>What needs doing</Overline>
      <TextInput
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
          {BUCKETS.map((b) => (
            <Pill
              key={b}
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
                <Icon
                  name={p.icon}
                  size={18}
                  color={sel ? color : C.mist}
                  strokeWidth={2.5}
                />
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

      {list && (
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
      )}
    </SheetShell>
  );
}
