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
import Svg, { Path } from 'react-native-svg';
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
const AUTH_CONTROL_RADIUS = 999;
const AUTH_BUTTON_BLACK = '#000000';
const AUTH_BUTTON_TEXT = '#FFFFFF';

type Stage = 'email' | 'code';

export default function SignIn() {
  const { C } = useTheme();
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slotRefs = useRef<Array<TextInput | null>>([]);
  const authBusyRef = useRef(false);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (stage === 'code') {
      focusTimerRef.current = setTimeout(() => slotRefs.current[0]?.focus(), 50);
    }
    return () => {
      if (focusTimerRef.current !== null) {
        clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
    };
  }, [stage]);

  function updateEmail(nextEmail: string) {
    setEmail(nextEmail);
    if (error) setError(null);
  }

  async function runAuthAction(action: () => Promise<void>, fallbackMessage: string) {
    if (authBusyRef.current) return;
    authBusyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e: any) {
      setError(e?.message ?? fallbackMessage);
    } finally {
      authBusyRef.current = false;
      setBusy(false);
    }
  }

  async function sendCode() {
    if (!email.includes('@')) {
      setError('Enter a valid email');
      return;
    }
    await runAuthAction(async () => {
      await db.auth.sendMagicCode({ email });
      setStage('code');
    }, 'Could not send code');
  }

  async function submitCode() {
    const joined = code.join('');
    if (joined.length !== CODE_LENGTH) return;
    await runAuthAction(async () => {
      await db.auth.signInWithMagicCode({ email, code: joined });
    }, 'Invalid code');
  }

  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  async function doOAuth(provider: 'apple' | 'google') {
    await runAuthAction(async () => {
      await signInWithOAuth(provider);
    }, 'Sign-in cancelled');
  }

  async function doGoogleNative() {
    await runAuthAction(async () => {
      await signInWithGoogle();
    }, 'Google sign-in failed');
  }

  async function doAppleNative() {
    await runAuthAction(async () => {
      await signInWithApple();
    }, 'Apple sign-in failed');
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
          Coordinate daily life without the admin.
        </Text>
      </View>

      <View style={{ gap: 18 }}>
        <View>
          <Text style={[Typography.eyebrow, { color: C.ink3, marginBottom: 8, marginLeft: 4 }]}>
            Email
          </Text>
          <Card
            style={[
              styles.emailCard,
              { borderColor: stage === 'email' ? C.accent : C.lineColor },
            ]}
          >
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
              {busy ? <ActivityIndicator color={AUTH_BUTTON_TEXT} /> : 'Verify'}
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
              <AppleNativeButton onPress={doAppleNative} />
            ) : (
              <SocialAuthButton
                provider="apple"
                label="Continue with Apple"
                onPress={() => doOAuth('apple')}
                disabled={busy}
              />
            )}
            <SocialAuthButton
              provider="google"
              label="Continue with Google"
              onPress={doGoogleNative}
              disabled={busy}
            />
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

function AppleNativeButton({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.nativeAppleWrap}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={AUTH_CONTROL_RADIUS}
        style={styles.appleButton}
        onPress={onPress}
      />
    </View>
  );
}

function SocialAuthButton({
  provider,
  label,
  onPress,
  disabled,
}: {
  provider: 'apple' | 'google';
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { C } = useTheme();
  const isApple = provider === 'apple';
  const foreground = isApple ? AUTH_BUTTON_TEXT : C.inkColor;
  const background = isApple ? AUTH_BUTTON_BLACK : C.bgCard;

  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.oauth,
        {
          backgroundColor: background,
          borderColor: isApple ? background : C.lineColor,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <View
        style={styles.socialIconSlot}
      >
        {isApple ? (
          <AppleLogo color={foreground} />
        ) : (
          <GoogleLogo />
        )}
      </View>
      <Text style={[Typography.buttonLabel, styles.oauthLabel, { color: foreground }]}>
        {label}
      </Text>
    </PressScale>
  );
}

function AppleLogo({ color }: { color: string }) {
  return (
    <Svg width={18} height={22} viewBox="0 0 24 28">
      <Path
        fill={color}
        d="M19.7 14.8c0-3.1 2.5-4.6 2.6-4.7-1.4-2.1-3.7-2.4-4.5-2.4-1.9-.2-3.7 1.1-4.6 1.1-1 0-2.4-1.1-4-1.1-2 0-3.9 1.2-5 3-2.1 3.7-.5 9.2 1.5 12.2 1 1.5 2.2 3.1 3.8 3.1 1.5-.1 2.1-1 4-1s2.4 1 4 1c1.6 0 2.7-1.5 3.7-3 1.2-1.7 1.7-3.4 1.7-3.5-.1 0-3.2-1.2-3.2-4.8ZM16.5 5.7c.8-1 1.4-2.4 1.2-3.8-1.2.1-2.7.8-3.6 1.8-.8.9-1.4 2.3-1.2 3.7 1.4.1 2.8-.7 3.6-1.7Z"
      />
    </Svg>
  );
}

function GoogleLogo() {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.4-1.1 2.7-2.4 3.5v2.9h3.8c2.2-2 3.6-5 3.6-8.5Z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-3.2l-3.8-2.9c-1.1.7-2.4 1.1-4.1 1.1-3.1 0-5.7-2.1-6.6-4.9H1.5v3C3.5 21.2 7.5 24 12 24Z"
      />
      <Path
        fill="#FBBC05"
        d="M5.4 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.5.4-2.1v-3H1.5C.6 8.5 0 10.2 0 12s.6 3.5 1.5 5.1l3.9-3Z"
      />
      <Path
        fill="#EA4335"
        d="M12 5c1.7 0 3.3.6 4.5 1.8L19.9 3C17.9 1.1 15.2 0 12 0 7.5 0 3.5 2.8 1.5 6.9l3.9 3C6.3 7.1 8.9 5 12 5Z"
      />
    </Svg>
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
          backgroundColor: disabled ? C.ink3 : AUTH_BUTTON_BLACK,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      {typeof children === 'string' ? (
        <Text style={[Typography.buttonLabel, styles.buttonLabel, { color: AUTH_BUTTON_TEXT }]}>
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
    minHeight: 58,
    paddingHorizontal: 18,
    paddingVertical: 0,
  },
  emailCard: {
    padding: 0,
    borderRadius: AUTH_CONTROL_RADIUS,
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
    minHeight: 58,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: AUTH_CONTROL_RADIUS,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    position: 'relative',
    overflow: 'hidden',
  },
  appleButton: {
    height: 58,
    width: '100%',
  },
  nativeAppleWrap: {
    borderRadius: AUTH_CONTROL_RADIUS,
    overflow: 'hidden',
  },
  socialIconSlot: {
    position: 'absolute',
    left: 14,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oauthLabel: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  primary: {
    minHeight: 56,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: AUTH_CONTROL_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonLabel: {
    width: '100%',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
