import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, useTheme } from '@/theme';
import { FONTS } from '@/theme/tokens';
import { Serif, T, Kick, PrimaryBtn, Press, Glass } from '@/ui';
import { PactoMark } from '@/brand/marks';
import { SocialMark } from '@/brand/social';
import { useAuth, type OAuthProvider, type PasswordFlow } from '@/features/auth/useAuth';

function SocialButton({
  provider,
  busy,
  disabled,
  onPress,
}: {
  provider: OAuthProvider;
  busy: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const C = useColors();
  return (
    <Press
      onPress={onPress}
      haptic
      scale={0.94}
      disabled={disabled}
      accessibilityLabel={provider === 'github' ? 'Continue with GitHub' : 'Continue with Google'}
      accessibilityState={{ busy, disabled }}
      style={{ flex: 1, borderRadius: 999 }}
    >
      <Glass
        interactive
        fallbackStyle={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line }}
        style={{
          height: 58,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {busy ? (
          <ActivityIndicator color={C.accent} />
        ) : (
          <SocialMark name={provider} size={24} color={C.ink} />
        )}
      </Glass>
    </Press>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address' | 'default';
  autoCapitalize?: 'none' | 'words';
  textContentType?: any;
}) {
  const C = useColors();
  return (
    <View style={{ marginBottom: 18 }}>
      <Kick style={{ marginBottom: 8 }}>{props.label}</Kick>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={C.ink2}
        secureTextEntry={props.secureTextEntry}
        keyboardType={props.keyboardType ?? 'default'}
        autoCapitalize={props.autoCapitalize ?? 'none'}
        autoCorrect={false}
        textContentType={props.textContentType}
        style={{
          fontFamily: FONTS.sans500,
          fontSize: 17,
          color: C.ink,
          paddingBottom: 10,
          borderBottomWidth: 1.5,
          borderBottomColor: props.value ? C.accent : C.line,
        }}
      />
    </View>
  );
}

export default function SignIn() {
  const C = useColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { oauth, appleNative, withPassword } = useAuth();

  const [mode, setMode] = useState<PasswordFlow>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const submit = async () => {
    if (busy) return;
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setBusy('password');
    try {
      await withPassword(
        email.trim().toLowerCase(),
        password,
        mode,
        mode === 'signUp' ? name.trim() || undefined : undefined,
      );
    } catch {
      setError(
        mode === 'signUp'
          ? 'Could not create that account — try a stronger password or another email.'
          : 'Wrong email or password.',
      );
    } finally {
      setBusy(null);
    }
  };

  const social = async (provider: OAuthProvider) => {
    if (busy) return;
    setError(null);
    setBusy(provider);
    try {
      await oauth(provider);
    } catch {
      setError('That sign-in was cancelled or is not configured yet.');
    } finally {
      setBusy(null);
    }
  };

  const onApple = async () => {
    // The native Apple button can't be disabled, so the guard lives here.
    if (busy) return;
    setError(null);
    setBusy('apple');
    try {
      await appleNative();
    } catch (e: any) {
      // The user dismissing the Apple sheet is not an error worth surfacing.
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        setError('Apple sign-in failed. Please try again.');
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: C.bg }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 28,
          minHeight: '100%',
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <PactoMark size={80} />
          <Kick color={C.accent} style={{ marginTop: 12 }}>
            Welcome to Pacto
          </Kick>
          <View style={{ marginTop: 6, alignItems: 'center' }}>
            <Serif size={44} lh={1.05}>
              keep what
            </Serif>
            <Serif size={44} lh={1.05}>
              matters.
            </Serif>
          </View>
          <T size={15} weight={450} color={C.ink2} style={{ marginTop: 8, textAlign: 'center', maxWidth: 280 }}>
            {mode === 'signUp'
              ? 'Create your account to start keeping small pacts.'
              : 'Sign in to pick up your pacts where you left them.'}
          </T>
        </View>

        <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
          {mode === 'signUp' && (
            <Field
              label="Display name"
              value={name}
              onChangeText={setName}
              placeholder="What should we call you?"
              autoCapitalize="words"
              textContentType="name"
            />
          )}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
          />

          {error && (
            <T size={13.5} weight={500} color={C.danger} style={{ marginTop: 2, marginBottom: 8 }}>
              {error}
            </T>
          )}

          <Press onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
            <T size={13.5} weight={600} color={C.ink2}>
              {mode === 'signIn' ? 'New here? Create an account →' : 'Have an account? Sign in →'}
            </T>
          </Press>
        </View>

        <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', gap: 10, marginTop: 18 }}>
          <PrimaryBtn icon="arrowRight" onPress={submit} disabled={!!busy}>
            {busy === 'password' ? '…' : mode === 'signUp' ? 'Create account' : 'Sign in'}
          </PrimaryBtn>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 2 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
            <Kick color={C.ink4}>or continue with</Kick>
            <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {(['github', 'google'] as OAuthProvider[]).map((p) => (
              <SocialButton key={p} provider={p} busy={busy === p} disabled={!!busy} onPress={() => social(p)} />
            ))}
          </View>

          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={
                isDark
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={999}
              style={{ height: 58, width: '100%' }}
              onPress={onApple}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
