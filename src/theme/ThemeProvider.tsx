import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useFonts } from 'expo-font';
import { basePalette, type BasePalette } from './palettes';
import { ACCENTS, accentTriple, DEFAULT_ACCENT, type AccentKey } from './accents';

export type ThemePref = 'light' | 'dark' | 'system';

export type Colors = BasePalette & {
  accent: string;
  accentSoft: string;
  onAccent: string;
  good: string;
};

type ThemeContextValue = {
  C: Colors;
  isDark: boolean;
  themePref: ThemePref;
  accentKey: AccentKey;
  setThemePref: (p: ThemePref) => void;
  setAccentKey: (k: AccentKey) => void;
  fontsLoaded: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const PREF_KEY = 'pacto.themePref';
const ACCENT_PREF_KEY = 'pacto.accent';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [themePref, setThemePrefState] = useState<ThemePref>('system');
  const [accentKey, setAccentKeyState] = useState<AccentKey>(DEFAULT_ACCENT);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    InstrumentSerif_400Regular: require('../../assets/fonts/InstrumentSerif_400Regular.ttf'),
    SchibstedGrotesk_400Regular: require('../../assets/fonts/SchibstedGrotesk_400Regular.ttf'),
    SchibstedGrotesk_500Medium: require('../../assets/fonts/SchibstedGrotesk_500Medium.ttf'),
    SchibstedGrotesk_600SemiBold: require('../../assets/fonts/SchibstedGrotesk_600SemiBold.ttf'),
    SchibstedGrotesk_700Bold: require('../../assets/fonts/SchibstedGrotesk_700Bold.ttf'),
  });

  // Hydrate persisted prefs once.
  useEffect(() => {
    (async () => {
      try {
        const [p, a] = await Promise.all([
          SecureStore.getItemAsync(PREF_KEY),
          SecureStore.getItemAsync(ACCENT_PREF_KEY),
        ]);
        if (p === 'light' || p === 'dark' || p === 'system') setThemePrefState(p);
        if (a && Object.prototype.hasOwnProperty.call(ACCENTS, a)) setAccentKeyState(a as AccentKey);
      } catch {
        // SecureStore unavailable (e.g. web) — fall back to defaults.
      } finally {
        setPrefsLoaded(true);
      }
    })();
  }, []);

  const setThemePref = useCallback((p: ThemePref) => {
    setThemePrefState(p);
    SecureStore.setItemAsync(PREF_KEY, p).catch(() => {});
  }, []);

  const setAccentKey = useCallback((k: AccentKey) => {
    setAccentKeyState(k);
    SecureStore.setItemAsync(ACCENT_PREF_KEY, k).catch(() => {});
  }, []);

  const isDark = themePref === 'system' ? system === 'dark' : themePref === 'dark';

  const C = useMemo<Colors>(() => {
    const base = basePalette(isDark);
    const acc = accentTriple(accentKey, isDark);
    return { ...base, ...acc, good: acc.accent };
  }, [isDark, accentKey]);

  const ready = (fontsLoaded || !!fontError) && prefsLoaded;

  const value = useMemo<ThemeContextValue>(
    () => ({ C, isDark, themePref, accentKey, setThemePref, setAccentKey, fontsLoaded: ready }),
    [C, isDark, themePref, accentKey, setThemePref, setAccentKey, ready],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

export const useColors = () => useTheme().C;
