import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { setActiveColors } from '@/src/constants/colors';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = '@coupl/theme-mode';

interface ThemeContextType {
  mode: ThemeMode;
  toggle: () => void;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  toggle: () => {},
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'dark' || stored === 'light') {
        setModeState(stored);
        setActiveColors(stored);
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
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      setActiveColors(next);
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, toggle, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
