import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { useTheme } from '@/src/lib/theme';

type Cat = 'food' | 'home' | 'fun' | 'travel' | 'other';

export default function NewExpense() {
  const { C, F } = useTheme();
  const [amt, setAmt] = useState('');
  const [what, setWhat] = useState('');
  const [cat, setCat] = useState<Cat>('food');
  const [split, setSplit] = useState('50/50');
  const [by, setBy] = useState<'mattia' | 'sofia'>('mattia');

  const cats: { k: Cat; label: string; icon: IconName; color: string }[] = useMemo(
    () => [
      { k: 'food', label: 'Food', icon: 'coffee', color: C.butter },
      { k: 'home', label: 'Home', icon: 'home', color: C.mint },
      { k: 'fun', label: 'Fun', icon: 'heart', color: C.rose },
      { k: 'travel', label: 'Travel', icon: 'mapPin', color: C.sky },
      { k: 'other', label: 'Other', icon: 'moreH', color: C.lavender },
    ],
    [C]
  );

  return (
    <SheetShell
      eyebrow="NEW EXPENSE"
      eyebrowColor={C.mint}
      title="Keep tabs."
      footer={<PrimaryButton icon="check" onPress={() => router.back()}>Add expense</PrimaryButton>}
    >
      <View style={{ alignItems: 'center', paddingVertical: 4, marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 30,
              color: amt ? C.gold : C.fog,
            }}
          >
            €
          </Text>
          <TextInput
            value={amt}
            onChangeText={(t) => setAmt(t.replace(/[^0-9.,]/g, ''))}
            placeholder="0.00"
            placeholderTextColor={C.fog}
            inputMode="decimal"
            style={{
              color: amt ? C.bone : C.fog,
              fontFamily: F.displayBold,
              fontSize: 64,
              letterSpacing: -2,
              textAlign: 'center',
              minWidth: 200,
              padding: 0,
            }}
          />
        </View>
      </View>

      <Overline style={{ marginBottom: 8 }}>For what</Overline>
      <TextInput
        value={what}
        onChangeText={setWhat}
        placeholder="Groceries, dinner, rent..."
        placeholderTextColor={C.fog}
        style={{
          color: C.bone,
          fontFamily: F.displayBold,
          fontSize: 20,
          paddingVertical: 6,
          borderBottomWidth: 2,
          borderBottomColor: what ? C.mint : C.line,
        }}
      />

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Category</Overline>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 12 }}>
            {cats.map((c) => {
              const sel = cat === c.k;
              return (
                <Pressable
                  key={c.k}
                  onPress={() => setCat(c.k)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    backgroundColor: sel ? `${c.color}26` : 'transparent',
                    borderWidth: 1,
                    borderColor: sel ? c.color : C.line,
                  }}
                >
                  <Icon name={c.icon} size={14} color={sel ? c.color : C.fog} />
                  <Text
                    style={{
                      color: sel ? c.color : C.mist,
                      fontFamily: F.bodyBold,
                      fontSize: 12,
                    }}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={{ marginTop: 20, flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Overline style={{ marginBottom: 10 }}>Paid by</Overline>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(
              [
                { k: 'mattia', l: 'Me' },
                { k: 'sofia', l: 'Sofia' },
              ] as const
            ).map((p) => {
              const sel = by === p.k;
              return (
                <Pressable
                  key={p.k}
                  onPress={() => setBy(p.k)}
                  style={{
                    flex: 1,
                    paddingVertical: 11,
                    borderRadius: 12,
                    backgroundColor: sel ? C.cardHi : 'transparent',
                    borderWidth: 1,
                    borderColor: sel ? C.gold : C.line,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: sel ? C.bone : C.mist, fontFamily: F.bodyBold, fontSize: 12 }}>
                    {p.l}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Overline style={{ marginBottom: 10 }}>Split</Overline>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {['50/50', 'Me', 'Them'].map((s) => {
              const sel = split === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setSplit(s)}
                  style={{
                    flex: 1,
                    paddingVertical: 11,
                    borderRadius: 12,
                    backgroundColor: sel ? C.cardHi : 'transparent',
                    borderWidth: 1,
                    borderColor: sel ? C.gold : C.line,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: sel ? C.bone : C.mist, fontFamily: F.bodyBold, fontSize: 11 }}>
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </SheetShell>
  );
}
