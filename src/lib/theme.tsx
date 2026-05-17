import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fonts, getTokens, type ThemeMode, type Tokens } from './tokens';

type ThemeCtx = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  C: Tokens;
  F: typeof fonts;
};

const Ctx = createContext<ThemeCtx | null>(null);
const STORAGE_KEY = 'pacto:theme-mode';

function isThemeMode(v: unknown): v is ThemeMode {
  return v === 'light' || v === 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const sys = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(
    sys === 'light' ? 'light' : 'dark',
  );
  const [hydrated, setHydrated] = useState(false);

  // Hydrate persisted mode once on mount.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (isThemeMode(stored)) setModeState(stored);
        setHydrated(true);
      })
      .catch(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Track system changes only until the user picks a mode.
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!stored && isThemeMode(sys)) setModeState(sys);
    });
  }, [sys, hydrated]);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => undefined);
  };

  const value = useMemo<ThemeCtx>(
    () => ({ mode, setMode, C: getTokens(mode), F: fonts }),
    [mode],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const fallback: ThemeCtx = {
  mode: 'dark',
  setMode: () => undefined,
  C: getTokens('dark'),
  F: fonts,
};

export function useTheme(): ThemeCtx {
  return useContext(Ctx) ?? fallback;
}
