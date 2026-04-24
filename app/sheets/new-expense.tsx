import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { useExpenses } from '@/src/hooks/useExpenses';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';

type Cat = 'food' | 'home' | 'fun' | 'travel' | 'other';
type PayerKey = 'mattia' | 'sofia';
type SplitKey = '50/50' | 'Me' | 'Them';

const SPLIT_TYPE: Record<SplitKey, string> = {
  '50/50': 'even',
  Me: 'payer',
  Them: 'other',
};

export default function NewExpense() {
  const { C, F } = useTheme();
  const { create } = useExpenses();
  const { user, partner, isSolo } = useSession();
  const [amt, setAmt] = useState('');
  const [what, setWhat] = useState('');
  const [cat, setCat] = useState<Cat>('food');
  const [split, setSplit] = useState<SplitKey>('50/50');
  const [by, setBy] = useState<PayerKey>('mattia');
  const [saving, setSaving] = useState(false);

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

  const parsedAmount = Number(amt.replace(',', '.'));
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const canSave = amountValid && what.trim().length > 0 && !saving;

  const onSave = async () => {
    if (!canSave || !user?.id) return;
    setSaving(true);
    try {
      const payerId =
        by === 'mattia' ? user.id : (partner?.id ?? user.id);
      await create({
        title: what.trim(),
        amount: parsedAmount,
        paidBy: payerId,
        currency: 'EUR',
        splitType: SPLIT_TYPE[split],
        category: cat,
        date: format(new Date(), 'yyyy-MM-dd'),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-expense] create failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      eyebrow="NEW EXPENSE"
      eyebrowColor={C.mint}
      title="Keep tabs."
      footer={
        <PrimaryButton
          icon="check"
          onPress={onSave}
          disabled={!canSave}
        >
          {saving ? 'Saving…' : 'Add expense'}
        </PrimaryButton>
      }
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
            testID="new-expense-amount-input"
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
        testID="new-expense-what-input"
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
                <PressScale
                  key={c.k}
                  testID={`new-expense-cat-${c.k}`}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => undefined);
                    setCat(c.k);
                  }}
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
                </PressScale>
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
                { k: 'sofia', l: partner?.displayName ?? 'Sofia' },
              ] as const
            ).map((p) => {
              const sel = by === p.k;
              const disabled = p.k === 'sofia' && isSolo;
              return (
                <PressScale
                  key={p.k}
                  testID={`new-expense-paidby-${p.k}`}
                  onPress={() => {
                    if (disabled) return;
                    Haptics.selectionAsync().catch(() => undefined);
                    setBy(p.k);
                  }}
                  disabled={disabled}
                  style={{
                    flex: 1,
                    paddingVertical: 11,
                    borderRadius: 12,
                    backgroundColor: sel ? C.cardHi : 'transparent',
                    borderWidth: 1,
                    borderColor: sel ? C.gold : C.line,
                    alignItems: 'center',
                    opacity: disabled ? 0.4 : 1,
                  }}
                >
                  <Text style={{ color: sel ? C.bone : C.mist, fontFamily: F.bodyBold, fontSize: 12 }}>
                    {p.l}
                  </Text>
                </PressScale>
              );
            })}
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Overline style={{ marginBottom: 10 }}>Split</Overline>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['50/50', 'Me', 'Them'] as SplitKey[]).map((s) => {
              const sel = split === s;
              return (
                <PressScale
                  key={s}
                  testID={`new-expense-split-${s}`}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => undefined);
                    setSplit(s);
                  }}
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
                </PressScale>
              );
            })}
          </View>
        </View>
      </View>
    </SheetShell>
  );
}
