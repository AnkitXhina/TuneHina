export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  background: string;
  backgroundLight: string;
  surface: string;
  surfaceLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
}

export interface DynamicTheme {
  colors: ThemeColors;
  isExtracting: boolean;
  artworkUrl: string | null;
}

export const DEFAULT_THEME: ThemeColors = {
  primary: '#8b5cf6',
  primaryLight: '#a78bfa',
  primaryDark: '#7c3aed',
  secondary: '#6366f1',
  accent: '#ec4899',
  background: '#0a0a0f',
  backgroundLight: '#121218',
  surface: '#1a1a24',
  surfaceLight: '#252532',
  text: '#f1f1f6',
  textSecondary: '#a0a0b4',
  textMuted: '#5a5a72',
};
