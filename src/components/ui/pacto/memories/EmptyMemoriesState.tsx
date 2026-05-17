import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { alphaColor } from '@/src/lib/color';
import { useTheme } from '@/src/lib/theme';

export function EmptyMemoriesState() {
  const { C } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.panel, { backgroundColor: C.bgCard, borderColor: C.lineColor }]}>
        <View style={[styles.icon, { backgroundColor: alphaColor(C.accent, 0.14), borderColor: alphaColor(C.accent, 0.34) }]}>
          <Icon name="feather" size={20} color={C.accent} />
        </View>
        <Text style={[Typography.eyebrow, { color: C.accent, marginTop: 12 }]}>NO MEMORIES YET</Text>
        <Text style={[Typography.pixelHeroSm, { color: C.inkColor, textAlign: 'center', marginTop: 6 }]}>
          Start the thread.
      </Text>
      <PressScale
        onPress={() => router.push('/sheets/memory-composer' as any)}
          style={[styles.cta, { backgroundColor: C.inkColor }]}
      >
          <Text style={[Typography.buttonLabel, { color: C.bg }]}>New memory</Text>
      </PressScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 18, paddingTop: 28 },
  panel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 34,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderRadius: 22,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: { marginTop: 18, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
});
