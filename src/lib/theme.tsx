import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { fonts, getTokens, type ThemeMode, type Tokens } from './tokens';

type ThemeCtx = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  C: Tokens;
  F: typeof fonts;
};

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const sys = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(sys === 'light' ? 'light' : 'dark');
  const value = useMemo<ThemeCtx>(
    () => ({ mode, setMode, C: getTokens(mode), F: fonts }),
    [mode]
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
