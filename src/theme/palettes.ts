// Pacto · Quiet — two themes only: light = "cloud", dark = "ink".
// Accent tokens (accent / accentSoft / onAccent) are supplied separately by the
// accent picker (see accents.ts) so the user can recolor independently of light/dark.

export type BasePalette = {
  bg: string;
  surface: string;
  surface2: string;
  sunk: string;
  ink: string;
  ink2: string;
  ink3: string;
  ink4: string;
  line: string;
  hair: string;
  /** Destructive/error color — distinct from every accent in both themes. */
  danger: string;
};

export const CLOUD: BasePalette = {
  bg: '#EEEEEA',
  surface: '#FFFFFF',
  surface2: '#F6F6F2',
  sunk: '#EAEAE5',
  ink: '#16171A',
  ink2: '#6A6C71',
  // 3.9:1 on bg / 4.5:1 on surface — the old #9C9EA3 sat at 2.3:1, below even
  // the large-text floor, and this is the default color of all Kick metadata.
  ink3: '#74767C',
  ink4: '#BFC0C5',
  line: '#E3E3DD',
  hair: '#ECECE6',
  danger: '#B84F43',
};

export const INK: BasePalette = {
  bg: '#0C0D0F',
  surface: '#161719',
  surface2: '#1E1F22',
  sunk: '#0A0B0D',
  ink: '#F2F2F0',
  ink2: '#A4A6AB',
  ink3: '#6C6F74',
  ink4: '#4A4D52',
  line: '#26272B',
  hair: '#1D1E21',
  // Not terracotta's dark accent (#E07A5A) — errors must stay distinguishable
  // from accent text when the terracotta accent is selected.
  danger: '#D96B5C',
};

export const basePalette = (isDark: boolean): BasePalette => (isDark ? INK : CLOUD);
