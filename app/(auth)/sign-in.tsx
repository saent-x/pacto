import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

import { supabase } from '@/src/lib/supabase';
import { Colors } from '@/src/constants/colors';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { Button, Input } from '@/src/components/ui';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Enter a valid email';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validate()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) Alert.alert('Sign in failed', error.message);
  };

  return (
    <View style={styles.screen}>
      {/* Warm glow in top-right — a subtle radial feel */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Brand — dramatic serif wordmark */}
            <Animated.View entering={FadeIn.duration(1000).delay(200)} style={styles.brand}>
              <Text style={styles.wordmark}>Coupl</Text>
              <View style={styles.goldRule} />
            </Animated.View>

            {/* Tagline */}
            <Animated.View entering={FadeInDown.duration(700).delay(600)}>
              <Text style={styles.tagline}>
                Your quiet place,{'\n'}together.
              </Text>
            </Animated.View>

            {/* Form */}
            <Animated.View entering={FadeInDown.duration(600).delay(900)} style={styles.form}>
              <Input
                label="Email"
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email}
                leftIcon={<Feather name="at-sign" size={16} color={Colors.fog} />}
              />

              <Input
                label="Password"
                placeholder="Enter password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                error={errors.password}
                leftIcon={<Feather name="lock" size={16} color={Colors.fog} />}
                rightIcon={
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={16}
                    color={Colors.fog}
                  />
                }
                onRightIconPress={() => setShowPassword(!showPassword)}
              />

              <Button
                title="Sign In"
                onPress={handleSignIn}
                loading={loading}
                size="lg"
                style={styles.signInBtn}
              />
            </Animated.View>

            {/* Footer */}
            <Animated.View entering={FadeInUp.duration(500).delay(1200)} style={styles.footer}>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/sign-up')}
                activeOpacity={0.7}
                style={styles.switchLink}
              >
                <Text style={styles.switchLabel}>No account yet?</Text>
                <Text style={styles.switchAction}>Create one</Text>
                <Feather name="arrow-right" size={14} color={Colors.primary} />
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
    backgroundColor: Colors.background,
  },
  flex: { flex: 1 },

  // Ambient glows
  glowTopRight: {
    position: 'absolute',
    top: -60,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: Colors.primary,
    opacity: 0.04,
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: 100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.primary,
    opacity: 0.025,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['3xl'],
  },

  // Brand
  brand: {
    alignItems: 'center',
    marginTop: Spacing['6xl'],
    marginBottom: Spacing['4xl'],
  },
  wordmark: {
    ...Typography.display,
    color: Colors.cream,
    fontSize: 52,
    lineHeight: 56,
  },
  goldRule: {
    width: 24,
    height: 2,
    backgroundColor: Colors.primary,
    marginTop: Spacing.lg,
    borderRadius: 1,
  },

  // Tagline
  tagline: {
    ...Typography.title,
    color: Colors.haze,
    textAlign: 'center',
    marginBottom: Spacing['5xl'],
    fontWeight: '300',
  },

  // Form
  form: {
    gap: Spacing['3xl'],
    marginBottom: Spacing['4xl'],
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
    color: Colors.fog,
  },
  switchAction: {
    ...Typography.captionMedium,
    color: Colors.primary,
  },
});
