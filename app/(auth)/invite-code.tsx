import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { CouplRings, Display, Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { GoldRule } from '@/src/components/ui/WarmBlock';
import { Icon } from '@/src/components/ui/Icon';
import { useTheme } from '@/src/lib/theme';

export default function InviteCodeScreen() {
  const { C, F } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = params.code ?? '';
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function onShare() {
    await Share.share({
      message: `Join me on Coupl. Here's the code: ${code}`,
    });
  }

  return (
    <View style={[styles.root, { backgroundColor: C.ink }]}>
      <CouplRings size={48} a={C.peach} b={C.lavender} />
      <Display size={36} style={{ marginTop: 18 }}>
        Share the code<Text style={{ color: C.gold }}>.</Text>
      </Display>
      <GoldRule width={32} />
      <Text style={{ fontFamily: F.serif, fontStyle: 'italic', color: C.mist, fontSize: 15, marginTop: 14, maxWidth: 300 }}>
        Send this to your partner. Six characters — case doesn\u2019t matter.
      </Text>

      <View style={{ marginTop: 40 }}>
        <Overline style={{ marginBottom: 14, textAlign: 'center' }}>Your code</Overline>
        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
          {code.split('').map((ch, i) => (
            <View key={i} style={[styles.slot, { borderColor: C.gold, backgroundColor: C.card }]}>
              <Text style={{ color: C.bone, fontFamily: F.display, fontSize: 24, fontWeight: '700' }}>
                {ch}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 28, justifyContent: 'center' }}>
        <Pressable onPress={onCopy} style={[styles.btn, { borderColor: C.line }]}>
          <Icon name="copy" size={14} color={copied ? C.gold : C.mist} />
          <Text style={{ color: copied ? C.gold : C.mist, fontFamily: F.bodyBold, fontSize: 12 }}>
            {copied ? 'COPIED' : 'COPY'}
          </Text>
        </Pressable>
        <Pressable onPress={onShare} style={[styles.btn, { borderColor: C.line }]}>
          <Icon name="send" size={14} color={C.mist} />
          <Text style={{ color: C.mist, fontFamily: F.bodyBold, fontSize: 12 }}>SHARE</Text>
        </Pressable>
      </View>

      <View style={{ marginTop: 'auto', gap: 10 }}>
        <PrimaryButton onPress={() => router.replace('/(tabs)/home' as any)}>
          I&apos;ll do this later
        </PrimaryButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, paddingTop: 60, paddingBottom: 40 },
  slot: {
    width: 48, height: 56, borderWidth: 1, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1,
  },
});
