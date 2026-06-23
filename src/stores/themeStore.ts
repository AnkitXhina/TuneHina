import { create } from 'zustand';
import type { ThemeColors } from '../types/theme';
import { DEFAULT_THEME } from '../types/theme';
import { themeEngine } from '../services/themeEngine';

interface ThemeState {
  colors: ThemeColors;
  isExtracting: boolean;
  artworkUrl: string | null;

  extractFromArtwork: (imageUrl: string) => Promise<void>;
  resetTheme: () => void;
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  colors: DEFAULT_THEME,
  isExtracting: false,
  artworkUrl: null,

  extractFromArtwork: async (imageUrl: string) => {
    if (get().artworkUrl === imageUrl) return; // Already extracted

    set({ isExtracting: true, artworkUrl: imageUrl });
    try {
      const colors = await themeEngine.extractColors(imageUrl);
      themeEngine.applyTheme(colors);
      set({ colors, isExtracting: false });
    } catch (error) {
      console.error('[Theme] extraction failed:', error);
      themeEngine.applyTheme(DEFAULT_THEME);
      set({ colors: DEFAULT_THEME, isExtracting: false });
    }
  },

  resetTheme: () => {
    themeEngine.applyTheme(DEFAULT_THEME);
    set({ colors: DEFAULT_THEME, artworkUrl: null });
  },
}));
