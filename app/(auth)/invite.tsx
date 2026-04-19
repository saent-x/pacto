import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CouplRings, Display, Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { GoldRule } from '@/src/components/ui/WarmBlock';
import { Icon } from '@/src/components/ui/Icon';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/lib/session';
import { ensureUserRow, joinSpaceByCode } from '@/src/lib/space-actions';
import { isValidInviteCode } from '@/src/lib/invite-code';

const SLOTS = 6;

export default function Invite() {
  const router = useRouter();
  const { C, F } = useTheme();
  const { user } = useSession();
  const [code, setCode] = useState<string[]>(Array(SLOTS).fill(''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refs = useRef<Array<TextInput | null>>([]);

  const setSlot = (i: number, v: string) => {
    const next = [...code];
    next[i] = v.slice(-1).toUpperCase();
    setCode(next);
    setError(null);
    if (v && i < SLOTS - 1) refs.current[i + 1]?.focus();
  };

  const joined = code.join('');
  const filled = code.every((c) => c);

  async function submit() {
    if (!user || !isValidInviteCode(joined)) {
      setError('Invalid code');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await ensureUserRow({ userId: user.id, email: user.email });
      await joinSpaceByCode({ userId: user.id, code: joined });
      // SessionGate → /(tabs)/home
    } catch (e: any) {
      // Atomic transact failed — most likely code no longer valid
      setError('Code no longer valid');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: C.ink }]}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 40 }}>
        <Icon name="chevronLeft" size={22} color={C.mist} />
      </Pressable>

      <CouplRings size={48} a={C.peach} b={C.lavender} />
      <Display size={36} style={{ marginTop: 18 }}>
        Enter your code<Text style={{ color: C.gold }}>.</Text>
      </Display>
      <GoldRule width={32} />
      <Text style={{ fontFamily: F.serif, fontStyle: 'italic', color: C.mist, fontSize: 15, marginTop: 14, maxWidth: 300 }}>
        Six characters \u2014 case doesn\u2019t matter.
      </Text>

      <View style={{ marginTop: 48 }}>
        <Overline style={{ marginBottom: 14 }}>Invite code</Overline>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {code.map((ch, i) => (
            <TextInput
              key={i}
              ref={(r) => { refs.current[i] = r; }}
              value={ch}
              onChangeText={(v) => setSlot(i, v)}
              maxLength={1}
              autoCapitalize="characters"
              style={[
                styles.slot,
                {
                  borderColor: error ? C.error : ch ? C.gold : C.line,
                  color: C.bone,
                  fontFamily: F.display,
                  backgroundColor: C.card,
                },
              ]}
            />
          ))}
        </View>
        {error && (
          <Text style={{ color: C.error, marginTop: 12, fontFamily: F.body, fontSize: 13 }}>{error}</Text>
        )}
      </View>

      <View style={{ marginTop: 'auto' }}>
        <PrimaryButton onPress={submit} disabled={!filled || busy}>
          {busy ? 'Joining…' : 'Continue'}
        </PrimaryButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, paddingTop: 60, paddingBottom: 40 },
  slot: {
    width: 48, height: 56, borderWidth: 1, borderRadius: 12,
    textAlign: 'center', fontSize: 24, fontWeight: '700',
  },
});
