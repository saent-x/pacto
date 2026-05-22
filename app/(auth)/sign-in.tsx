import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Card, HeaderBrand, PactoMark } from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { db } from '@/src/lib/db';
import { signInWithOAuth } from '@/src/lib/oauth';
import { isAppleSignInAvailable, signInWithApple } from '@/src/lib/auth-apple';
import { signInWithGoogle } from '@/src/lib/auth-google';

const CODE_LENGTH = 6;

type Stage = 'email' | 'code';

export default function SignIn() {
  const { C, mode } = useTheme();
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slotRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (stage === 'code') {
      setTimeout(() => slotRefs.current[0]?.focus(), 50);
    }
  }, [stage]);

  function updateEmail(nextEmail: string) {
    setEmail(nextEmail);
    if (error) setError(null);
  }

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
    } catch (e: any) {
      setError(e?.message ?? 'Invalid code');
    } finally {
      setBusy(false);
    }
  }

  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

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

  async function doGoogleNative() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e?.message ?? 'Google sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  async function doAppleNative() {
    setBusy(true);
    setError(null);
    try {
      await signInWithApple();
    } catch (e: any) {
      setError(e?.message ?? 'Apple sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  const setCodeSlot = (i: number, v: string) => {
    const digits = v.replace(/\D/g, '');
    if (digits.length > 1) {
      const next = Array(CODE_LENGTH).fill('');
      for (let j = 0; j < Math.min(digits.length, CODE_LENGTH); j++) {
        next[j] = digits[j];
      }
      setCode(next);
      const last = Math.min(digits.length, CODE_LENGTH) - 1;
      slotRefs.current[last]?.blur();
      return;
    }
    const next = [...code];
    next[i] = digits.slice(-1);
    setCode(next);
    if (digits && i < CODE_LENGTH - 1) {
      slotRefs.current[i + 1]?.focus();
    }
  };

  const onCodeKeyPress = (i: number, key: string) => {
    if (key === 'Backspace' && !code[i] && i > 0) {
      slotRefs.current[i - 1]?.focus();
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={[styles.root, { backgroundColor: C.bg }]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <PactoMark size={64} />
        <View style={{ height: 18 }} />
        <HeaderBrand eyebrow="WELCOME" title="pacto" size={32} />
        <Text style={[Typography.body, { color: C.ink2, marginTop: 14, textAlign: 'center', maxWidth: 280 }]}>
          The few people who actually run your day.
        </Text>
      </View>

      <View style={{ gap: 18 }}>
        <View>
          <Text style={[Typography.eyebrow, { color: C.ink3, marginBottom: 8, marginLeft: 4 }]}>
            Email
          </Text>
          <Card style={{ padding: 0, borderColor: stage === 'email' ? C.accent : C.lineColor }}>
            <View style={styles.field}>
              <Icon
                name="mail"
                size={16}
                color={stage === 'email' ? C.accent : C.ink3}
              />
              <TextInput
                value={email}
                onChangeText={updateEmail}
                editable={stage === 'email' && !busy}
                placeholder="you@example.com"
                placeholderTextColor={C.ink3}
                autoCapitalize="none"
                keyboardType="email-address"
                style={{
                  flex: 1,
                  color: C.inkColor,
                  fontFamily: Typography.geistFont,
                  fontSize: 15,
                  paddingVertical: 0,
                }}
              />
            </View>
          </Card>
        </View>

        {stage === 'code' ? (
          <View>
            <Text style={[Typography.eyebrow, { color: C.ink3, marginBottom: 10, marginLeft: 4 }]}>
              Code
            </Text>
            <View style={styles.slotRow}>
              {code.map((ch, i) => (
                <TextInput
                  key={i}
                  ref={(r) => {
                    slotRefs.current[i] = r;
                  }}
                  value={ch}
                  onChangeText={(v) => setCodeSlot(i, v)}
                  onKeyPress={(e) => onCodeKeyPress(i, e.nativeEvent.key)}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  style={[
                    styles.slot,
                    {
                      borderColor: ch ? C.accent : error ? C.error : C.lineColor,
                      backgroundColor: C.bgCard,
                      color: C.inkColor,
                      fontFamily: Typography.pixelFont,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        ) : null}

        {error ? (
          <Text
            style={[
              Typography.caption,
              { color: C.error, textAlign: 'center', marginTop: 4 },
            ]}
          >
            {error}
          </Text>
        ) : null}

        {stage === 'email' ? (
          <PrimaryButton onPress={sendCode} disabled={busy}>
            {busy ? 'Sending…' : 'Continue'}
          </PrimaryButton>
        ) : (
          <>
            <PrimaryButton
              onPress={submitCode}
              disabled={busy || code.some((c) => !c)}
            >
              {busy ? <ActivityIndicator color={C.bg} /> : 'Verify'}
            </PrimaryButton>
            <PressScale
              onPress={() => {
                setStage('email');
                setCode(Array(CODE_LENGTH).fill(''));
                setError(null);
              }}
            >
              <Text
                style={[
                  Typography.caption,
                  { color: C.ink2, textAlign: 'center' },
                ]}
              >
                Use a different email
              </Text>
            </PressScale>
          </>
        )}

        {stage === 'email' ? (
          <>
            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: C.lineColor }]} />
              <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>OR</Text>
              <View style={[styles.line, { backgroundColor: C.lineColor }]} />
            </View>

            {Platform.OS === 'ios' && appleAvailable ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                }
                buttonStyle={
                  AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={14}
                style={styles.appleButton}
                onPress={doAppleNative}
              />
            ) : (
              <PressScale
                onPress={() => doOAuth('apple')}
                disabled={busy}
                style={[
                  styles.oauth,
                  { backgroundColor: mode === 'dark' ? C.bgSoft : C.inkColor },
                ]}
              >
                <Text
                  style={[
                    Typography.buttonLabel,
                    styles.buttonLabel,
                    { color: mode === 'dark' ? C.inkColor : C.bg },
                  ]}
                >
                  Continue with Apple
                </Text>
              </PressScale>
            )}
            <PressScale
              onPress={doGoogleNative}
              disabled={busy}
              style={[
                styles.oauth,
                { backgroundColor: C.bgCard, borderColor: C.lineColor, borderWidth: 1 },
              ]}
            >
              <Text style={[Typography.buttonLabel, styles.buttonLabel, { color: C.inkColor }]}>
                Continue with Google
              </Text>
            </PressScale>

          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

function PrimaryButton({
  children,
  onPress,
  disabled,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { C } = useTheme();
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.primary,
        {
          backgroundColor: disabled ? C.ink3 : C.inkColor,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      {typeof children === 'string' ? (
        <Text style={[Typography.buttonLabel, styles.buttonLabel, { color: C.bg }]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, padding: 24, paddingTop: 80, paddingBottom: 40 },
  hero: {
    alignItems: 'center',
    marginBottom: 36,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  slotRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  slot: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 22,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  line: {
    flex: 1,
    height: 1,
  },
  oauth: {
    minHeight: 56,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleButton: {
    height: 48,
    width: '100%',
  },
  primary: {
    minHeight: 56,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    width: '100%',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
