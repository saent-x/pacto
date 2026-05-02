import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { HeaderBrand, PactoMark } from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/lib/session';
import { ensureUserRow, joinSpaceByCode } from '@/src/lib/space-actions';
import { isValidInviteCode } from '@/src/lib/invite-code';

const SLOTS = 6;

export default function Invite() {
  const { C } = useTheme();
  const router = useRouter();
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
    } catch (e: any) {
      setError('Code no longer valid');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerBackground: () => null,
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: C.inkColor,
          title: '',
          headerLeft: () => (
            <PressScale
              onPress={() => router.back()}
              hitSlop={12}
              style={{ padding: 4 }}
            >
              <Icon name="chevronLeft" size={22} color={C.inkColor} strokeWidth={2.2} />
            </PressScale>
          ),
        }}
      />

      <View style={styles.hero}>
        <PactoMark size={48} />
        <View style={{ height: 14 }} />
        <HeaderBrand eyebrow="JOIN A PACT" title="enter your code" size={28} />
        <Text
          style={[
            Typography.body,
            { color: C.ink2, marginTop: 12, textAlign: 'center', maxWidth: 300 },
          ]}
        >
          Six characters — case doesn't matter.
        </Text>
      </View>

      <View style={styles.codeWrap}>
        <Text style={[Typography.eyebrow, { color: C.ink3, marginBottom: 12, marginLeft: 4 }]}>
          Invite code
        </Text>
        <View style={styles.slotRow}>
          {code.map((ch, i) => (
            <TextInput
              key={i}
              ref={(r) => {
                refs.current[i] = r;
              }}
              value={ch}
              onChangeText={(v) => setSlot(i, v)}
              maxLength={1}
              autoCapitalize="characters"
              style={[
                styles.slot,
                {
                  borderColor: error ? C.error : ch ? C.accent : C.lineColor,
                  color: C.inkColor,
                  fontFamily: Typography.pixelFont,
                  backgroundColor: C.bgCard,
                },
              ]}
            />
          ))}
        </View>
        {error ? (
          <Text style={[Typography.caption, { color: C.error, marginTop: 12 }]}>
            {error}
          </Text>
        ) : null}
      </View>

      <View style={styles.footer}>
        <PressScale
          onPress={submit}
          disabled={!filled || busy}
          style={[
            styles.primary,
            {
              backgroundColor: !filled || busy ? C.ink3 : C.inkColor,
              opacity: !filled || busy ? 0.6 : 1,
            },
          ]}
        >
          <Text style={[Typography.buttonLabel, { color: C.bg }]}>
            {busy ? 'Joining…' : 'Continue'}
          </Text>
        </PressScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, paddingTop: 24, paddingBottom: 40 },
  hero: { alignItems: 'center', marginTop: 8, marginBottom: 36 },
  codeWrap: { marginBottom: 28 },
  slotRow: {
    flexDirection: 'row',
    gap: 10,
  },
  slot: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
  },
  footer: { marginTop: 'auto' },
  primary: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
