import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { setActiveColors, setActivePalette, getActivePalette, type PaletteKey } from '@/src/constants/colors';

export type ThemeMode = 'dark' | 'light';

const MODE_KEY = '@coupl/theme-mode';
const PALETTE_KEY = '@coupl/palette';

interface ThemeContextType {
  mode: ThemeMode;
  palette: PaletteKey;
  toggle: () => void;
  setMode: (m: ThemeMode) => void;
  setPalette: (p: PaletteKey) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  palette: 'classic',
  toggle: () => {},
  setMode: () => {},
  setPalette: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [palette, setPaletteState] = useState<PaletteKey>('classic');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(MODE_KEY),
      AsyncStorage.getItem(PALETTE_KEY),
    ]).then(([storedMode, storedPalette]) => {
      const p = (storedPalette as PaletteKey) || 'classic';
      setPaletteState(p);
      setActivePalette(p);

      if (storedMode === 'dark' || storedMode === 'light') {
        setModeState(storedMode);
        setActiveColors(storedMode);
      } else if (systemScheme === 'light' || systemScheme === 'dark') {
        setModeState(systemScheme);
        setActiveColors(systemScheme);
      }
      setLoaded(true);
    });
  }, [systemScheme]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    setActiveColors(m);
    AsyncStorage.setItem(MODE_KEY, m).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      setActiveColors(next);
      AsyncStorage.setItem(MODE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const setPaletteWrapped = useCallback((p: PaletteKey) => {
    setPaletteState(p);
    setActivePalette(p);
    setActiveColors(mode);
    AsyncStorage.setItem(PALETTE_KEY, p).catch(() => {});
  }, [mode]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, palette, toggle, setMode, setPalette: setPaletteWrapped }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
