import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { Colors } from '@/src/constants/colors';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { Button } from '@/src/components/ui';

const CODE_LENGTH = 8;

export default function InviteScreen() {
  const router = useRouter();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [code, setCode] = useState<string[]>(new Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const fullCode = code.join('');

  const handleCharChange = (text: string, index: number) => {
    const char = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!char) return;
    const newCode = [...code];
    newCode[index] = char.charAt(0);
    setCode(newCode);
    if (index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace') {
      if (code[index]) {
        const newCode = [...code]; newCode[index] = ''; setCode(newCode);
      } else if (index > 0) {
        const newCode = [...code]; newCode[index - 1] = ''; setCode(newCode);
        inputRefs.current[index - 1]?.focus(); setActiveIndex(index - 1);
      }
    }
  };

  const handleJoin = async () => {
    if (fullCode.length !== CODE_LENGTH) return;
    setLoading(true);
    const { error } = await supabase.rpc('join_couple' as any, { code: fullCode } as any);
    setLoading(false);
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Invalid code', 'Check the code and try again.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setJoined(true);
    await fetchProfile();
  };

  if (joined) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.successWrap}>
          <Animated.View entering={ZoomIn.duration(500)} style={styles.successRing}>
            <Feather name="heart" size={32} color={Colors.primary} />
          </Animated.View>
          <Animated.Text entering={FadeInUp.duration(500).delay(300)} style={styles.successTitle}>
            Connected
          </Animated.Text>
          <Animated.Text entering={FadeInUp.duration(500).delay(450)} style={styles.successSub}>
            Your shared space is ready.{'\n'}Everything here, you do together.
          </Animated.Text>
          <Animated.View entering={FadeInUp.duration(500).delay(600)} style={styles.successBtn}>
            <Button title="Begin" onPress={() => fetchProfile()} size="lg" style={{ width: '100%' }} />
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <View style={styles.content}>
            <Animated.View entering={FadeInDown.duration(400)}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                <Feather name="arrow-left" size={20} color={Colors.cream} />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.header}>
              <Text style={styles.title}>Enter invite code</Text>
              <View style={styles.goldRule} />
              <Text style={styles.subtitle}>
                The 8-character code your partner shared.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.codeRow}>
              {code.map((char, index) => (
                <View key={index} style={styles.charWrap}>
                  <TextInput
                    ref={(ref) => { inputRefs.current[index] = ref; }}
                    style={[
                      styles.charInput,
                      activeIndex === index && styles.charActive,
                      char && styles.charFilled,
                    ]}
                    value={char}
                    onChangeText={(t) => handleCharChange(t, index)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                    onFocus={() => setActiveIndex(index)}
                    maxLength={1}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    selectTextOnFocus
                  />
                  {index === 3 && <View style={styles.codeDash} />}
                </View>
              ))}
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(500).delay(500)} style={styles.footer}>
              <Button
                title="Join"
                onPress={handleJoin}
                loading={loading}
                size="lg"
                disabled={fullCode.length !== CODE_LENGTH}
                style={{ width: '100%' }}
              />
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: Spacing['2xl'] },

  backBtn: {
    marginTop: Spacing.lg, marginBottom: Spacing['2xl'],
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.dim, alignItems: 'center', justifyContent: 'center',
  },
  goldRule: { width: 24, height: 2, backgroundColor: Colors.primary, marginVertical: Spacing.xl, borderRadius: 1 },

  header: { alignItems: 'center', marginBottom: Spacing['4xl'] },
  title: { ...Typography.title, color: Colors.cream, textAlign: 'center' },
  subtitle: { ...Typography.caption, color: Colors.fog, textAlign: 'center' },

  codeRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing['4xl'] },
  charWrap: { flexDirection: 'row', alignItems: 'center' },
  charInput: {
    width: 36, height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1, borderColor: Colors.dusk,
    backgroundColor: Colors.dark,
    textAlign: 'center',
    fontSize: 17, fontWeight: '700',
    color: Colors.cream,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'Courier New' }),
  },
  charActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  charFilled: { borderColor: Colors.muted, backgroundColor: Colors.dim },
  codeDash: { width: 8, height: 1.5, backgroundColor: Colors.dusk, borderRadius: 1, marginLeft: Spacing.sm },

  footer: { marginTop: 'auto', paddingBottom: Spacing['3xl'] },

  // Success
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing['3xl'] },
  successRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 1, borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  successTitle: { ...Typography.title, color: Colors.cream, marginBottom: Spacing.md },
  successSub: { ...Typography.body, color: Colors.fog, textAlign: 'center' },
  successBtn: { width: '100%', marginTop: Spacing['4xl'] },
});
