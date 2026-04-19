import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CouplRings, Display, Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { GoldRule } from '@/src/components/ui/WarmBlock';
import { Icon } from '@/src/components/ui/Icon';
import { useTheme } from '@/src/lib/theme';

export default function SignIn() {
  const router = useRouter();
  const { C, F } = useTheme();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);

  return (
    <View style={[styles.root, { backgroundColor: C.ink }]}>
      <View style={styles.hero}>
        <CouplRings size={54} a={C.peach} b={C.lavender} />
        <Display size={52} style={{ marginTop: 20 }}>
          coupl<Text style={{ color: C.gold }}>.</Text>
        </Display>
        <GoldRule width={32} />
        <Text style={{ fontFamily: F.serif, fontStyle: 'italic', fontSize: 18, color: C.mist, lineHeight: 25, marginTop: 16, maxWidth: 260 }}>
          Your quiet place, together.
        </Text>
      </View>

      <View style={{ gap: 28, marginBottom: 36 }}>
        <View>
          <Overline style={{ marginBottom: 10 }}>Email</Overline>
          <View style={[styles.field, { borderBottomColor: C.ash }]}>
            <Icon name="mail" size={16} color={C.fog} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@coupl.app"
              placeholderTextColor={C.fog}
              autoCapitalize="none"
              keyboardType="email-address"
              style={{ flex: 1, color: C.bone, fontFamily: F.body, fontSize: 15 }}
            />
          </View>
        </View>

        <View>
          <Overline style={{ marginBottom: 10 }}>Password</Overline>
          <View style={[styles.field, { borderBottomColor: C.gold, borderBottomWidth: 2 }]}>
            <Icon name="lock" size={16} color={C.gold} />
            <TextInput
              value={pw}
              onChangeText={setPw}
              secureTextEntry={!showPw}
              placeholder="••••••••"
              placeholderTextColor={C.fog}
              style={{ flex: 1, color: C.bone, fontFamily: F.body, fontSize: 15 }}
            />
            <Pressable onPress={() => setShowPw((s) => !s)}>
              <Icon name="eye" size={16} color={C.fog} />
            </Pressable>
          </View>
        </View>
      </View>

      <PrimaryButton onPress={() => router.replace('/(tabs)/home' as any)}>Sign in</PrimaryButton>

      <Pressable onPress={() => router.push('/(auth)/onboarding' as any)} style={{ marginTop: 28, alignSelf: 'center' }}>
        <Text style={{ color: C.mist, fontFamily: F.body, fontSize: 13 }}>
          New here? <Text style={{ color: C.gold, fontWeight: '600' }}>Create an account</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40, justifyContent: 'center' },
  hero: { marginBottom: 60 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 10, borderBottomWidth: 1 },
});
