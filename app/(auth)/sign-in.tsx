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
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useColors } from '@/src/hooks/useColors';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';
import { Button, Input, OrbitalRings } from '@/src/components/ui';
import { useAuthActions } from '@/src/hooks/useAuthActions';

export default function SignInScreen() {
  const C = useColors();
  const router = useRouter();
  const { sendMagicCode, signInWithMagicCode } = useAuthActions();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const compact = height < 780;

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Enter your email to continue.');
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

  const handleSignIn = async () => {
    if (!code.trim()) {
      Alert.alert('Missing code', 'Enter the code sent to your email.');
      return;
    }
    try {
      setLoading(true);
      await signInWithMagicCode({ email, code });
      router.replace('/(tabs)/home');
    } catch (error) {
      setLoading(false);
      Alert.alert(
        'Sign in failed',
        error instanceof Error ? error.message : 'Unable to sign in.',
      );
    }
  };

  const handleSubmit = step === 'email' ? handleSendCode : handleSignIn;

  return (
    <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
      {/* Enhanced ambient glows */}
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
            {/* Hero rings */}
            <Animated.View
              entering={FadeIn.duration(800).delay(200)}
              style={compact ? styles.heroCompact : styles.hero}
            >
              <OrbitalRings variant="orbiting" />
            </Animated.View>

            <Animated.View
              entering={FadeIn.duration(1000).delay(400)}
              style={[styles.brand, compact ? styles.brandCompact : undefined]}
            >
              <Text style={[styles.wordmark, compact ? styles.wordmarkCompact : undefined, { color: C.cream }]}>
                Coupl
              </Text>
              <View style={[styles.goldRule, { backgroundColor: C.primary }]} />
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(700).delay(700)}>
              <Text style={[styles.tagline, compact ? styles.taglineCompact : undefined, { color: C.haze }]}>
                Your quiet place,{'\n'}together.
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInUp.duration(600).delay(900)}
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
                title={step === 'email' ? 'Send Magic Code' : 'Sign In'}
                onPress={handleSubmit}
                loading={loading}
                size="lg"
                style={styles.signInBtn}
                disabled={step === 'email' ? !email.trim() : !code.trim()}
              />
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(500).delay(1200)} style={styles.footer}>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/sign-up')}
                activeOpacity={0.7}
                style={styles.switchLink}
              >
                <Text style={[styles.switchLabel, { color: C.fog }]}>No account yet?</Text>
                <Text style={[styles.switchAction, { color: C.primary }]}>Create one</Text>
                <Feather name="arrow-right" size={14} color={C.primary} />
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

  // Enhanced ambient glows
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
    paddingTop: Spacing.lg,
  },
  scrollContentCompact: {
    paddingTop: Spacing.sm,
  },

  // Hero
  hero: {
    marginTop: Spacing['2xl'],
  },
  heroCompact: {
    marginTop: Spacing.lg,
  },

  // Brand
  brand: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  brandCompact: {
    marginBottom: Spacing.lg,
  },
  wordmark: {
    ...Typography.display,
    fontSize: 56,
    lineHeight: 60,
  },
  wordmarkCompact: {
    fontSize: 48,
    lineHeight: 52,
  },
  goldRule: {
    width: 24,
    height: 2,
    marginTop: Spacing.lg,
    borderRadius: 1,
  },

  // Tagline
  tagline: {
    ...Typography.title,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
    fontWeight: '300',
  },
  taglineCompact: {
    marginBottom: Spacing.xl,
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
  signInBtn: {
    marginTop: Spacing.sm,
  },

  // Footer
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  switchLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  switchLabel: {
    ...Typography.caption,
  },
  switchAction: {
    ...Typography.captionMedium,
  },
});
