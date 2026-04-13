import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';
import { PALETTE_OPTIONS, type PaletteKey } from '@/src/constants/colors';
import { GlassSection } from '@/src/components/ui';

const PALETTE_SWATCHES: Record<PaletteKey, { dark: string[]; light: string[] }> = {
  classic:       { dark: ['#D4A054', '#221E1A', '#C4977A', '#7BA0AF'], light: ['#B85A42', '#F5F2ED', '#A87258', '#5A7A8A'] },
  midnightHoney: { dark: ['#E2B052', '#181C28', '#C8A070', '#6898B8'], light: ['#B8862A', '#ECEEF4', '#907048', '#3E6E90'] },
  deepRose:      { dark: ['#D4868E', '#231A1C', '#C4A07A', '#7B96AF'], light: ['#B85868', '#F5EFED', '#A08058', '#5A7088'] },
  sageWalnut:    { dark: ['#8AAF7B', '#1C2218', '#B89878', '#7BA0A8'], light: ['#5A7A50', '#EEF2E8', '#907050', '#507078'] },
};

export default function ThemeScreen() {
  const C = useColors();
  const { mode, toggle, setMode, palette, setPalette } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); router.back(); }}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-left" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.text }]}>Theme</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Appearance */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <GlassSection header="Appearance">
              <View style={styles.modeRow}>
                {(['light', 'dark'] as const).map((m) => {
                  const active = mode === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (m !== mode) { Haptics.selectionAsync(); setMode(m); }
                      }}
                      style={[
                        styles.modeCard,
                        { backgroundColor: C.card, borderColor: active ? C.primary : C.border },
                        active && styles.modeCardActive,
                      ]}
                    >
                      <View style={[styles.modePreview, { backgroundColor: m === 'dark' ? '#0F0D0B' : '#FFFFFF' }]}>
                        <View style={[styles.previewLine, { backgroundColor: m === 'dark' ? '#3D362E' : '#E0D8CE', width: '70%' }]} />
                        <View style={[styles.previewLine, { backgroundColor: m === 'dark' ? '#3D362E' : '#E0D8CE', width: '50%' }]} />
                        <View style={[styles.previewLine, { backgroundColor: m === 'dark' ? '#3D362E' : '#E0D8CE', width: '60%' }]} />
                      </View>
                      <View style={styles.modeLabel}>
                        <Text style={[styles.modeName, { color: active ? C.primary : C.text }]}>
                          {m === 'light' ? 'Light' : 'Dark'}
                        </Text>
                        {active && <Feather name="check-circle" size={14} color={C.primary} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </GlassSection>
          </Animated.View>

          {/* Color palette */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <GlassSection header="Color Palette">
              <View style={styles.paletteGrid}>
                {PALETTE_OPTIONS.map((opt) => {
                  const active = palette === opt.value;
                  const swatches = PALETTE_SWATCHES[opt.value][mode];
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (opt.value !== palette) { Haptics.selectionAsync(); setPalette(opt.value); }
                      }}
                      style={[
                        styles.paletteCard,
                        { backgroundColor: C.card, borderColor: active ? C.primary : C.border },
                        active && styles.paletteCardActive,
                      ]}
                    >
                      <View style={styles.swatchRow}>
                        {swatches.map((color, i) => (
                          <View
                            key={i}
                            style={[
                              styles.swatch,
                              { backgroundColor: color },
                              i === 0 && styles.swatchPrimary,
                            ]}
                          />
                        ))}
                      </View>
                      <View style={styles.paletteLabel}>
                        <Text style={[styles.paletteName, { color: active ? C.primary : C.text }]}>
                          {opt.label}
                        </Text>
                        {active && <Feather name="check-circle" size={14} color={C.primary} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </GlassSection>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 32 },
  headerTitle: { ...Typography.subheading },
  content: {
    padding: Spacing.xl,
    gap: Spacing['2xl'],
    paddingBottom: 60,
  },

  modeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  modeCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  modeCardActive: {
    borderWidth: 2,
  },
  modePreview: {
    padding: Spacing.md,
    gap: Spacing.sm,
    height: 80,
    justifyContent: 'center',
  },
  previewLine: {
    height: 6,
    borderRadius: 3,
  },
  modeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  modeName: {
    ...Typography.captionMedium,
  },

  paletteGrid: {
    gap: Spacing.md,
    padding: Spacing.md,
  },
  paletteCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  paletteCardActive: {
    borderWidth: 2,
  },
  swatchRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  swatch: {
    flex: 1,
    height: 32,
    borderRadius: 8,
  },
  swatchPrimary: {
    flex: 2,
  },
  paletteLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  paletteName: {
    ...Typography.captionMedium,
  },
});
