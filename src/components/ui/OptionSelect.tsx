/**
 * OptionSelect — compact option picker for bottom sheets.
 *
 * Two layout modes:
 *   "grid"    — 3-column grid of quiet, borderless cells (for 4+ options).
 *   "segment" — single-row segmented bar (for 2–3 options).
 *
 * Both modes use background-colour shifts instead of borders to indicate
 * selection, keeping the visual footprint small and the feel editorial.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface OptionItem {
  value: string;
  label: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
}

interface Props {
  options: OptionItem[];
  selected: string;
  onSelect: (value: string) => void;
  /** Accent colour for the selected state. */
  accentColor: string;
  /** Light-opacity accent for the selected cell background. */
  accentBg?: string;
  /** Allow deselecting (tapping the active option clears it). Default true. */
  allowDeselect?: boolean;
  /** Force a layout: "grid" or "segment". Auto-detected if omitted. */
  mode?: 'grid' | 'segment';
  /** Number of grid columns (default 3). Only applies in grid mode. */
  columns?: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function OptionSelect({
  options,
  selected,
  onSelect,
  accentColor,
  accentBg,
  allowDeselect = true,
  mode: forceMode,
  columns = 3,
}: Props) {
  const C = useColors();
  const { mode: themeMode } = useTheme();

  const layout = forceMode ?? (options.length <= 3 ? 'segment' : 'grid');
  const restBg =
    themeMode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const activeBg = accentBg ?? `${accentColor}18`;

  const handlePress = (value: string) => {
    Haptics.selectionAsync();
    if (allowDeselect && value === selected) {
      onSelect('');
    } else {
      onSelect(value);
    }
  };

  /* ── Segment layout ── */
  if (layout === 'segment') {
    const containerBg =
      themeMode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

    return (
      <View style={[styles.segmentContainer, { backgroundColor: containerBg }]}>
        {options.map((opt) => {
          const active = selected === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              activeOpacity={0.7}
              onPress={() => handlePress(opt.value)}
              style={[
                styles.segmentCell,
                active && { backgroundColor: activeBg },
              ]}
            >
              {opt.icon ? (
                <Feather
                  name={opt.icon}
                  size={14}
                  color={active ? accentColor : C.textTertiary}
                />
              ) : null}
              <Text
                style={[
                  styles.segmentLabel,
                  { color: active ? accentColor : C.textSecondary },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  /* ── Grid layout ── */
  return (
    <View style={[styles.grid, { gap: Spacing.sm }]}>
      {options.map((opt) => {
        const active = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.7}
            onPress={() => handlePress(opt.value)}
            style={[
              styles.gridCell,
              {
                width: `${(100 / columns) - 2}%` as any,
                backgroundColor: active ? activeBg : restBg,
              },
            ]}
          >
            <Text style={styles.gridEmoji}>
              {opt.label.match(/^\p{Emoji}/u)?.[0] ?? ''}
            </Text>
            <Text
              style={[
                styles.gridLabel,
                { color: active ? accentColor : C.textSecondary },
              ]}
              numberOfLines={1}
            >
              {opt.label.replace(/^\p{Emoji}\uFE0F?\s*/u, '')}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  /* ── Segment ── */
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  segmentCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentLabel: {
    fontFamily: Typography.sansMedium,
    fontSize: 13,
    letterSpacing: 0.2,
  },

  /* ── Grid ── */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.xs,
    borderRadius: 10,
    gap: 2,
  },
  gridEmoji: {
    fontSize: 18,
    lineHeight: 24,
  },
  gridLabel: {
    fontFamily: Typography.sansMedium,
    fontSize: 11,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
