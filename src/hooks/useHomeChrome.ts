import { useMemo } from 'react';
import { alphaColor } from '@/src/lib/color';
import { useTheme } from '@/src/lib/theme';

type ThemeColors = ReturnType<typeof useTheme>['C'];

export function useHomeChrome(C: ThemeColors, isDarkTheme: boolean) {
  return useMemo(() => {
    const lightLine = alphaColor(C.skyInk, 0.24);
    const lightHairline = alphaColor(C.skyInk, 0.16);
    const quietHalo = isDarkTheme ? alphaColor(C.bgSoft, 0.42) : alphaColor(C.skyInk, 0.07);
    const sideOrb = isDarkTheme ? alphaColor(C.bgSoft, 0.24) : alphaColor(C.skyInk, 0.055);
    const panelBg = C.bgCard;
    const panelBorder = isDarkTheme ? C.lineColor : lightLine;
    const panelHairline = isDarkTheme ? C.lineColor : lightHairline;
    const chrome = {
      heroBg: isDarkTheme ? C.bgCard : C.inkColor,
      heroBorder: isDarkTheme ? C.lineColor : alphaColor(C.inkColor, 0.9),
      sideBg: panelBg,
      sideBorder: panelBorder,
      sideInk: C.inkColor,
      sideMuted: C.ink3,
      sideIconBg: isDarkTheme ? C.bgSoft : alphaColor(C.inkColor, 0.075),
      activityPalette: [
        isDarkTheme ? alphaColor(C.bgSoft, 0.34) : alphaColor(C.inkColor, 0.045),
        alphaColor(C.accent2, isDarkTheme ? 0.24 : 0.16),
        alphaColor(C.accent2, isDarkTheme ? 0.42 : 0.32),
        alphaColor(C.accent, isDarkTheme ? 0.58 : 0.48),
      ] as [string, string, string, string],
    };
    const mood = {
      wrapBg: panelBg,
      cardBg: panelBg,
      border: panelBorder,
      pillBg: isDarkTheme ? C.bgSoft : C.bgSoft,
      imageBg: isDarkTheme ? C.bgSoft : C.accentSoft,
      ink: C.inkColor,
      muted: C.ink2,
    };
    const heatmapPalette: [string, string, string, string] = isDarkTheme
      ? [C.lineColor, C.accent2Soft, C.accent2, C.accent]
      : [panelHairline, C.accent2Soft, C.accent2, C.peach];
    const ticket = {
      cardBg: panelBg,
      border: panelBorder,
      notchBg: isDarkTheme ? C.accentSoft : C.peach,
      notchInk: isDarkTheme ? C.accent : C.peachInk,
      heatmapBg: 'transparent',
      ink: C.inkColor,
      muted: C.ink2,
      heatmapPalette,
    };
    return {
      homeLightLine: lightLine,
      homeLightHairline: lightHairline,
      homeQuietHalo: quietHalo,
      homeSideOrb: sideOrb,
      homePanelBg: panelBg,
      homePanelBorder: panelBorder,
      homePanelHairline: panelHairline,
      homeChrome: chrome,
      moodSignal: mood,
      aheadHeatmapPalette: heatmapPalette,
      aheadTicket: ticket,
    };
  }, [C, isDarkTheme]);
}
