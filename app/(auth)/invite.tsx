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
const INVITE_CODE_SLOT_SIZE = 52;
const INVITE_CODE_SLOT_RADIUS = 999;

export default function Invite() {
  const { C } = useTheme();
  const router = useRouter();
  const session = useSession();
  const { user } = session;
  const [code, setCode] = useState<string[]>(Array(SLOTS).fill(''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refs = useRef<Array<TextInput | null>>([]);
  const joiningRef = useRef(false);
  const replacingSoloPact =
    session.status === 'ready' &&
    session.isSolo &&
    !!session.space?.id &&
    !!session.membership?.id;

  const setSlot = (i: number, v: string) => {
    const cleaned = v.replace(/[^a-z0-9]/gi, '').toUpperCase();
    const next = [...code];
    if (cleaned.length > 1) {
      cleaned
        .slice(0, SLOTS - i)
        .split('')
        .forEach((char, offset) => {
          next[i + offset] = char;
        });
      setCode(next);
      setError(null);
      refs.current[Math.min(i + cleaned.length, SLOTS - 1)]?.focus();
      return;
    }
    next[i] = cleaned;
    setCode(next);
    setError(null);
    if (cleaned && i < SLOTS - 1) refs.current[i + 1]?.focus();
  };

  const joined = code.join('');
  const filled = code.every((c) => c);

  async function submit() {
    if (joiningRef.current) return;
    if (!user || !isValidInviteCode(joined)) {
      setError('Invalid code');
      return;
    }
    joiningRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await ensureUserRow({ userId: user.id, email: user.email });
      await joinSpaceByCode({
        userId: user.id,
        code: joined,
      });
      router.replace('/(tabs)/home' as any);
    } catch (e: any) {
      console.warn('[invite] joinSpaceByCode failed', e);
      const msg = e?.body?.message || e?.message || '';
      setError(msg ? `Couldn't join: ${msg}` : 'Code no longer valid');
    } finally {
      joiningRef.current = false;
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
          {replacingSoloPact
            ? 'Six characters. Your solo base stays with you.'
            : "Six characters — case doesn't matter."}
        </Text>
      </View>

      <View style={styles.codeWrap}>
        <Text style={[Typography.eyebrowSm, { color: C.ink3, marginBottom: 14, textAlign: 'center' }]}>
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
              autoCapitalize="characters"
              autoCorrect={false}
              style={[
                styles.slot,
                {
                  borderColor: error ? C.error : ch ? C.accent : C.line2,
                  color: C.inkColor,
                  fontFamily: Typography.pixelFont,
                  backgroundColor: ch ? C.bgCard : C.bg,
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
  hero: { alignItems: 'center', marginTop: 44, marginBottom: 38 },
  codeWrap: {
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  slot: {
    width: INVITE_CODE_SLOT_SIZE,
    height: INVITE_CODE_SLOT_SIZE,
    borderWidth: 1.5,
    borderRadius: INVITE_CODE_SLOT_RADIUS,
    textAlign: 'center',
    fontSize: 24,
  },
  footer: { marginTop: 'auto' },
  primary: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
