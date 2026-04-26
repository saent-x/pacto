import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { IconName } from '@/src/components/ui/Icon';
import {
  SheetDateField,
  SheetIconLabelPicker,
  SheetRow,
  SheetSection,
  SheetSegment,
  SheetShell,
  SheetTitleField,
  type IconLabelOption,
  type SegmentOption,
} from '@/src/components/ui/SheetShell';
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

// solo-mode: payer + split hidden — defaults to me + 50/50
export default function NewExpense() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { C, F } = useTheme();
  const { create, update, expenses } = useExpenses();
  const { user, partner, isSolo } = useSession();
  const existing = useMemo(
    () => (isEdit && id ? expenses.find((e) => e.id === id) : undefined),
    [isEdit, id, expenses],
  );
  const initialBy: PayerKey = (() => {
    if (!existing || !user) return 'mattia';
    return existing.paidBy === user.id ? 'mattia' : 'sofia';
  })();
  const initialSplit: SplitKey = (() => {
    if (!existing) return '50/50';
    if (existing.splitType === 'payer') return 'Me';
    if (existing.splitType === 'other') return 'Them';
    return '50/50';
  })();
  const [amt, setAmt] = useState(existing ? String(existing.amount ?? '') : '');
  const [what, setWhat] = useState(existing?.title ?? '');
  const [cat, setCat] = useState<Cat>((existing?.category as Cat) ?? 'food');
  const [split, setSplit] = useState<SplitKey>(initialSplit);
  const [by, setBy] = useState<PayerKey>(initialBy);
  const [date, setDate] = useState<Date>(() =>
    existing?.date ? new Date(`${existing.date}T00:00:00`) : new Date(),
  );
  const [dateOpen, setDateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const cats: IconLabelOption<Cat>[] = useMemo(
    () => [
      { key: 'food', icon: 'coffee' as IconName, label: 'Food', color: C.butter },
      { key: 'home', icon: 'home' as IconName, label: 'Home', color: C.mint },
      { key: 'fun', icon: 'heart' as IconName, label: 'Fun', color: C.rose },
      { key: 'travel', icon: 'mapPin' as IconName, label: 'Travel', color: C.sky },
      { key: 'other', icon: 'moreH' as IconName, label: 'Other', color: C.lavender },
    ],
    [C],
  );

  const payerOptions: SegmentOption<PayerKey>[] = [
    { key: 'mattia', label: 'Me' },
    { key: 'sofia', label: partner?.displayName ?? 'Sofia' },
  ];
  const splitOptions: SegmentOption<SplitKey>[] = [
    { key: '50/50', label: '50/50' },
    { key: 'Me', label: 'Me' },
    { key: 'Them', label: 'Them' },
  ];

  const parsedAmount = Number(amt.replace(',', '.'));
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const canSave = amountValid && what.trim().length > 0 && !saving;

  const onSave = async () => {
    if (!canSave || !user?.id) return;
    setSaving(true);
    try {
      const payerId = isSolo
        ? user.id
        : by === 'mattia'
          ? user.id
          : (partner?.id ?? user.id);
      const payload = {
        title: what.trim(),
        amount: parsedAmount,
        paidBy: payerId,
        currency: 'EUR',
        splitType: isSolo ? 'even' : SPLIT_TYPE[split],
        category: cat,
        date: format(date, 'yyyy-MM-dd'),
      };
      if (isEdit && id) {
        await update(id, payload);
      } else {
        await create(payload);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-expense] save failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      eyebrow={isEdit ? 'EDIT EXPENSE' : 'NEW EXPENSE'}
      eyebrowColor={C.mint}
      title={isEdit ? 'Edit expense.' : 'Keep tabs.'}
      footer={
        <PrimaryButton icon="check" onPress={onSave} disabled={!canSave}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add expense'}
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

      <SheetSection title="For what" first>
        <SheetTitleField
          testID="new-expense-what-input"
          value={what}
          onChangeText={setWhat}
          placeholder="Groceries, dinner, rent..."
          accent={C.mint}
        />
      </SheetSection>

      <SheetSection title="Category">
        <SheetIconLabelPicker
          options={cats}
          selected={cat}
          onChange={setCat}
          testIDPrefix="new-expense-cat"
        />
      </SheetSection>

      <SheetSection title="Date">
        <SheetRow>
          <SheetDateField
            pressTestID="new-expense-date"
            value={date}
            onChange={setDate}
            accent={C.mint}
            open={dateOpen}
            onPress={() => setDateOpen((v) => !v)}
          />
        </SheetRow>
      </SheetSection>

      {!isSolo && (
        <SheetRow style={{ marginTop: 22 }}>
          <View style={{ flex: 1 }}>
            <Overline style={{ marginBottom: 10 }}>Paid by</Overline>
            <SheetSegment
              options={payerOptions}
              selected={by}
              onChange={setBy}
              accent={C.mint}
              testIDPrefix="new-expense-paidby"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Overline style={{ marginBottom: 10 }}>Split</Overline>
            <SheetSegment
              options={splitOptions}
              selected={split}
              onChange={setSplit}
              accent={C.mint}
              testIDPrefix="new-expense-split"
            />
          </View>
        </SheetRow>
      )}
    </SheetShell>
  );
}
