/**
 * ScreenHeader — unified header pattern across all tabs/subscreens.
 *
 * Eyebrow ("02 · TASKS")
 * Big Display title (Bricolage)
 * Optional WavyUnderline or GoldRule accent
 * Optional meta row (subtitle / count / date)
 * Optional right-side action
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';
import { GoldRule, WavyUnderline, Overline } from './WarmBlock';
import { Pastels } from '@/src/constants/pastels';

type Accent = 'gold' | 'wavy' | 'none';

type BackBtn =
  | { onPress: () => void; icon?: keyof typeof Feather.glyphMap }
  | false
  | undefined;

type ActionBtn = {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  color?: string;
};

export function ScreenHeader({
  eyebrow,
  title,
  meta,
  accent = 'gold',
  back,
  action,
  style,
}: {
  /** Uppercase label, e.g. "02 · TASKS" */
  eyebrow?: string;
  /** Big display title, e.g. "Tasks" */
  title: string;
  /** Optional meta row (subtitle, count, date). */
  meta?: React.ReactNode;
  /** Accent under the title. Default 'gold'. */
  accent?: Accent;
  /** Back button config. false to hide. */
  back?: BackBtn;
  /** Right-side action. */
  action?: ActionBtn;
  style?: StyleProp<ViewStyle>;
}) {
  const { C } = useTheme();
  return (
    <View style={[styles.root, style]}>
      <View style={styles.topRow}>
        {back ? (
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              back.onPress();
            }}
            hitSlop={10}
            style={styles.backBtn}
          >
            <Feather name={back.icon ?? 'arrow-left'} size={22} color={C.bone} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backSpacer} />
        )}

        <View style={styles.titleBlock}>
          {eyebrow && <Overline style={styles.eyebrow}>{eyebrow}</Overline>}
          <Text style={[styles.title, { color: C.bone }]}>{title}</Text>
          {accent === 'gold' && <GoldRule width={28} style={{ marginTop: 6 }} />}
          {accent === 'wavy' && (
            <View style={{ marginTop: 4 }}>
              <WavyUnderline width={100} color={Pastels.gold} opacity={0.85} />
            </View>
          )}
          {meta && <View style={styles.meta}>{meta}</View>}
        </View>

        {action ? (
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              action.onPress();
            }}
            hitSlop={10}
            style={styles.actionBtn}
          >
            <Feather
              name={action.icon}
              size={22}
              color={action.color ?? C.bone}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.backSpacer} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backSpacer: {
    width: 32,
    height: 32,
  },
  actionBtn: {
    width: 32,
    height: 32,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  eyebrow: {
    marginBottom: 6,
  },
  title: {
    fontFamily: Typography.displayFont,
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: -0.8,
  },
  meta: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
