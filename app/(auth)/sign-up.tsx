import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useColors } from '@/src/hooks/useColors';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';
import { Button, Input, OrbitalRings } from '@/src/components/ui';
import { useAuthActions } from '@/src/hooks/useAuthActions';

export default function SignUpScreen() {
  const C = useColors();
  const router = useRouter();
  const { sendMagicCode, signInWithMagicCode } = useAuthActions();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const compact = height < 820;

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Enter your email to get started.');
      return;
    }
    try {
      setLoading(true);
      await sendMagicCode(email);
      setStep('code');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unable to send code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!code.trim()) {
      Alert.alert('Missing code', 'Enter the code sent to your email.');
      return;
    }
    try {
      setLoading(true);
      await signInWithMagicCode({ email, code });
      router.replace('/(auth)/onboarding');
    } catch (error) {
      setLoading(false);
      Alert.alert(
        'Sign up failed',
        error instanceof Error ? error.message : 'Unable to create your account.',
      );
    }
  };

  const handleSubmit = step === 'email' ? handleSendCode : handleSignUp;

  return (
    <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
      {/* Ambient glows matching sign-in */}
      <View style={[styles.glowTopRight, { backgroundColor: C.primary }]} />
      <View style={[styles.glowBottomLeft, { backgroundColor: C.primary }]} />

      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              compact ? styles.scrollContentCompact : undefined,
              { paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.xl },
            ]}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.duration(400)}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={[styles.backBtn, compact ? styles.backBtnCompact : undefined, { backgroundColor: C.dim }]}
                activeOpacity={0.7}
              >
                <Feather name="arrow-left" size={20} color={C.cream} />
              </TouchableOpacity>
            </Animated.View>

            {/* Hero rings — approaching variant */}
            <Animated.View entering={FadeInDown.duration(800).delay(150)} style={compact ? styles.heroCompact : styles.hero}>
              <OrbitalRings variant="approaching" />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(700).delay(350)}
              style={[styles.header, compact ? styles.headerCompact : undefined]}
            >
              <Text style={[styles.title, compact ? styles.titleCompact : undefined, { color: C.cream }]}>
                Create account
              </Text>
              <View style={[styles.goldRule, { backgroundColor: C.primary }]} />
              <Text style={[styles.subtitle, { color: C.fog }]}>
                The first step toward your shared rhythm.
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInUp.duration(600).delay(550)}
              style={[styles.form, compact ? styles.formCompact : undefined]}
            >
              <View style={[styles.fieldGroup, compact ? styles.fieldGroupCompact : undefined]}>
                <Input
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType={step === 'email' ? 'done' : 'next'}
                  editable={step === 'email'}
                  leftIcon={<Feather name="mail" size={16} color={C.fog} />}
                />
                {step === 'code' && (
                  <Input
                    label="Magic Code"
                    value={code}
                    onChangeText={setCode}
                    placeholder="Enter the code from your email"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    keyboardType="default"
                    returnKeyType="done"
                    leftIcon={<Feather name="key" size={16} color={C.fog} />}
                  />
                )}
              </View>

              <Button
                title={step === 'email' ? 'Send Magic Code' : 'Create Account'}
                onPress={handleSubmit}
                loading={loading}
                size="lg"
                style={styles.submitBtn}
                disabled={step === 'email' ? !email.trim() : !code.trim()}
              />
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(500).delay(700)} style={styles.footer}>
              <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                <Text style={[styles.footerText, { color: C.fog }]}>
                  Already have an account? <Text style={{ color: C.primary, fontWeight: '500' }}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: { flex: 1 },

  // Ambient glows
  glowTopRight: {
    position: 'absolute',
    top: -60,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.08,
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: 100,
    left: -100,
    width: 340,
    height: 340,
    borderRadius: 170,
    opacity: 0.05,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.sm,
  },
  scrollContentCompact: {
    paddingTop: 0,
  },

  backBtn: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnCompact: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },

  // Hero
  hero: {
    marginBottom: Spacing.sm,
  },
  heroCompact: {
    marginBottom: 0,
  },

  header: {
    marginBottom: Spacing['2xl'],
  },
  headerCompact: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.largeTitle,
    fontSize: 40,
  },
  titleCompact: {
    fontSize: 34,
  },
  goldRule: {
    width: 24,
    height: 2,
    marginVertical: Spacing.xl,
    borderRadius: 1,
  },
  subtitle: {
    ...Typography.body,
  },

  // Form
  form: {
    gap: Spacing['2xl'],
    marginBottom: Spacing['2xl'],
  },
  formCompact: {
    gap: Spacing.xl,
  },
  fieldGroup: {
    gap: Spacing.xl,
  },
  fieldGroupCompact: {
    gap: Spacing.lg,
  },
  submitBtn: {
    marginTop: Spacing.sm,
  },

  // Footer
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  footerText: {
    ...Typography.caption,
  },
});
