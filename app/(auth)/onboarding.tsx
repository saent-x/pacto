import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlockCard, Display, GoldRule, Overline } from '@/src/components/ui/WarmBlock';
import { CouplRings } from '@/src/components/ui/atoms';
import { Icon } from '@/src/components/ui/Icon';
import { useTheme } from '@/src/lib/theme';

export default function Onboarding() {
  const router = useRouter();
  const { C, F } = useTheme();

  return (
    <ScrollView contentContainerStyle={[styles.root, { backgroundColor: C.ink }]}>
      <CouplRings size={48} a={C.peach} b={C.lavender} />
      <Display size={40} style={{ marginTop: 18 }}>Welcome<Text style={{ color: C.gold }}>.</Text></Display>
      <GoldRule width={32} />
      <Text style={{ fontFamily: F.serif, fontStyle: 'italic', color: C.mist, fontSize: 16, marginTop: 14, maxWidth: 280 }}>
        A quiet place for two. Start a new one, or join your partner's.
      </Text>

      <View style={{ marginTop: 40, gap: 16 }}>
        <Pressable onPress={() => router.push('/(tabs)/home' as any)}>
          <BlockCard bg={C.peach} ink={C.peachInk}>
            <Overline>New couple</Overline>
            <Text style={{ fontFamily: F.display, fontSize: 26, color: C.peachInk, marginTop: 6, fontWeight: '700' }}>
              Create a space
            </Text>
            <Text style={{ fontFamily: F.body, color: C.peachInk, opacity: 0.7, fontSize: 13, marginTop: 6 }}>
              Set up your profile, then invite your partner.
            </Text>
            <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: C.peachInk, fontFamily: F.bodyBold, fontSize: 12 }}>BEGIN</Text>
              <Icon name="arrowRight" size={14} color={C.peachInk} />
            </View>
          </BlockCard>
        </Pressable>

        <Pressable onPress={() => router.push('/(auth)/invite' as any)}>
          <BlockCard bg={C.lavender} ink={C.lavenderInk}>
            <Overline>Invited</Overline>
            <Text style={{ fontFamily: F.display, fontSize: 26, color: C.lavenderInk, marginTop: 6, fontWeight: '700' }}>
              I have a code
            </Text>
            <Text style={{ fontFamily: F.body, color: C.lavenderInk, opacity: 0.7, fontSize: 13, marginTop: 6 }}>
              Enter the 6-character code your partner shared.
            </Text>
            <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: C.lavenderInk, fontFamily: F.bodyBold, fontSize: 12 }}>ENTER CODE</Text>
              <Icon name="arrowRight" size={14} color={C.lavenderInk} />
            </View>
          </BlockCard>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 24, paddingTop: 80, paddingBottom: 60 },
});
