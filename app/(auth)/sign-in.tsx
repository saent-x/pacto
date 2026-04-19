import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { CouplRings, Display, Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { GoldRule } from '@/src/components/ui/WarmBlock';
import { Icon } from '@/src/components/ui/Icon';
import { useTheme } from '@/src/lib/theme';
import { db } from '@/src/lib/db';
import { signInWithOAuth } from '@/src/lib/oauth';

const CODE_LENGTH = 6;

type Stage = 'email' | 'code';

export default function SignIn() {
  const { C, F } = useTheme();
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    if (!email.includes('@')) {
      setError('Enter a valid email');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await db.auth.sendMagicCode({ email });
      setStage('code');
    } catch (e: any) {
      setError(e?.message ?? 'Could not send code');
    } finally {
      setBusy(false);
    }
  }

  async function submitCode() {
    const joined = code.join('');
    if (joined.length !== CODE_LENGTH) return;
    setBusy(true);
    setError(null);
    try {
      await db.auth.signInWithMagicCode({ email, code: joined });
      // SessionGate will route after auth state updates
    } catch (e: any) {
      setError(e?.message ?? 'Invalid code');
    } finally {
      setBusy(false);
    }
  }

  async function doOAuth(provider: 'apple' | 'google') {
    setBusy(true);
    setError(null);
    try {
      await signInWithOAuth(provider);
    } catch (e: any) {
      setError(e?.message ?? 'Sign-in cancelled');
    } finally {
      setBusy(false);
    }
  }

  const setCodeSlot = (i: number, v: string) => {
    const next = [...code];
    next[i] = v.slice(-1).toUpperCase();
    setCode(next);
  };

  // Constants.isDevice was removed in newer expo-constants; use __DEV__ alone for the simulator helper
  const isSimulator = __DEV__;

  return (
    <ScrollView
      contentContainerStyle={[styles.root, { backgroundColor: C.ink }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <CouplRings size={54} a={C.peach} b={C.lavender} />
        <Display size={52} style={{ marginTop: 20 }}>
          coupl<Text style={{ color: C.gold }}>.</Text>
        </Display>
        <GoldRule width={32} />
        <Text
          style={{
            fontFamily: F.serif, fontStyle: 'italic', fontSize: 18,
            color: C.mist, lineHeight: 25, marginTop: 16, maxWidth: 260,
          }}
        >
          Your quiet place, together.
        </Text>
      </View>

      <View style={{ gap: 24 }}>
        <View>
          <Overline style={{ marginBottom: 10 }}>Email</Overline>
          <View style={[styles.field, { borderBottomColor: stage === 'email' ? C.gold : C.ash }]}>
            <Icon name="mail" size={16} color={stage === 'email' ? C.gold : C.fog} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              editable={stage === 'email' && !busy}
              placeholder="you@coupl.app"
              placeholderTextColor={C.fog}
              autoCapitalize="none"
              keyboardType="email-address"
              style={{ flex: 1, color: C.bone, fontFamily: F.body, fontSize: 15 }}
            />
          </View>
        </View>

        {stage === 'code' && (
          <View>
            <Overline style={{ marginBottom: 10 }}>Code</Overline>
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
              {code.map((ch, i) => (
                <TextInput
                  key={i}
                  value={ch}
                  onChangeText={(v) => setCodeSlot(i, v)}
                  maxLength={1}
                  autoCapitalize="characters"
                  keyboardType="number-pad"
                  style={[
                    styles.slot,
                    {
                      borderColor: ch ? C.gold : error ? C.error : C.line,
                      backgroundColor: C.card,
                      color: C.bone,
                      fontFamily: F.display,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {error && (
          <Text style={{ color: C.error, fontSize: 13, fontFamily: F.body, textAlign: 'center' }}>
            {error}
          </Text>
        )}

        {stage === 'email' ? (
          <PrimaryButton onPress={sendCode} disabled={busy}>
            {busy ? 'Sending…' : 'Continue'}
          </PrimaryButton>
        ) : (
          <>
            <PrimaryButton onPress={submitCode} disabled={busy || code.some((c) => !c)}>
              {busy ? <ActivityIndicator color={C.ink} /> : 'Verify'}
            </PrimaryButton>
            <Pressable onPress={() => { setStage('email'); setCode(Array(CODE_LENGTH).fill('')); setError(null); }}>
              <Text style={{ color: C.mist, textAlign: 'center', fontSize: 13, fontFamily: F.body }}>
                Use a different email
              </Text>
            </Pressable>
          </>
        )}

        {stage === 'email' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
              <Text style={{ color: C.fog, fontSize: 11, fontFamily: F.bodyBold, letterSpacing: 1.2 }}>OR</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
            </View>

            <Pressable
              onPress={() => doOAuth('apple')}
              disabled={busy}
              style={[styles.oauth, { backgroundColor: '#000' }]}
            >
              <Text style={{ color: '#fff', fontFamily: F.bodyBold, fontSize: 14 }}>Continue with Apple</Text>
            </Pressable>
            <Pressable
              onPress={() => doOAuth('google')}
              disabled={busy}
              style={[styles.oauth, { backgroundColor: C.bone, borderColor: C.line, borderWidth: 1 }]}
            >
              <Text style={{ color: C.ink, fontFamily: F.bodyBold, fontSize: 14 }}>Continue with Google</Text>
            </Pressable>

            {isSimulator && (
              <Pressable
                onPress={() => setEmail('dev@coupl.app')}
                style={{ alignSelf: 'center', paddingVertical: 8 }}
              >
                <Text style={{ color: C.fog, fontSize: 11, fontFamily: F.body }}>
                  Dev: prefill test email
                </Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 24, paddingTop: 80, paddingBottom: 40 },
  hero: { marginBottom: 44 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 10, borderBottomWidth: 1 },
  slot: {
    width: 44, height: 52, borderWidth: 1, borderRadius: 10,
    textAlign: 'center', fontSize: 22, fontWeight: '700',
  },
  oauth: {
    paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
});
