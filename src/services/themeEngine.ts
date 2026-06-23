// @ts-ignore
import { getColor, getPalette } from 'colorthief';
import type { ThemeColors } from '../types/theme';
import { DEFAULT_THEME } from '../types/theme';

type RGB = [number, number, number];
type HSL = [number, number, number];

class ThemeEngine {
  private currentArtworkUrl: string | null = null;
  private cache: Map<string, ThemeColors> = new Map();
  private maxCacheSize = 50;

  constructor() {
    // No initialization needed for colorthief v3
  }

  // ── Public API ──────────────────────────────────────────────

  async extractColors(imageUrl: string): Promise<ThemeColors> {
    if (!imageUrl) return DEFAULT_THEME;

    // Return from cache if available
    if (this.cache.has(imageUrl)) {
      this.currentArtworkUrl = imageUrl;
      return this.cache.get(imageUrl)!;
    }

    try {
      const img = await this.loadImage(imageUrl);
      const dominantColor = await getColor(img);
      const paletteColors = await getPalette(img, { colorCount: 8 });

      const dominant = dominantColor ? (dominantColor.rgb() as unknown as RGB) : ([0, 0, 0] as RGB);
      const palette = paletteColors ? (paletteColors.map(c => c.rgb() as unknown as RGB) as RGB[]) : [];

      const colors = this.generateThemeColors(dominant, palette);

      // Manage cache size
      if (this.cache.size >= this.maxCacheSize) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey !== undefined) {
          this.cache.delete(firstKey);
        }
      }
      this.cache.set(imageUrl, colors);
      this.currentArtworkUrl = imageUrl;

      return colors;
    } catch (err) {
      console.warn('[ThemeEngine] Failed to extract colors:', err);
      return DEFAULT_THEME;
    }
  }

  applyTheme(colors: ThemeColors): void {
    const root = document.documentElement;

    // Map theme colors to CSS custom properties using RGB triplets
    // to work with Tailwind's opacity modifier syntax
    const colorMap: Array<[string, string]> = [
      ['--theme-primary', colors.primary],
      ['--theme-primary-light', colors.primaryLight],
      ['--theme-secondary', colors.secondary],
      ['--theme-accent', colors.accent],
      ['--background', colors.background],
      ['--background-light', colors.backgroundLight],
      ['--surface', colors.surface],
      ['--surface-light', colors.surfaceLight],
    ];

    colorMap.forEach(([prop, hex]) => {
      const rgb = this.hexToRgb(hex);
      root.style.setProperty(prop, `${rgb[0]} ${rgb[1]} ${rgb[2]}`);
    });
  }

  resetTheme(): void {
    this.applyTheme(DEFAULT_THEME);
    this.currentArtworkUrl = null;
  }

  getCurrentArtworkUrl(): string | null {
    return this.currentArtworkUrl;
  }

  clearCache(): void {
    this.cache.clear();
  }

  // ── Theme Generation ────────────────────────────────────────

  private generateThemeColors(dominant: RGB, palette: RGB[]): ThemeColors {
    const vibrant = this.findMostVibrant(palette);
    const secondVibrant = this.findMostVibrant(
      palette.filter((c) => c !== vibrant)
    );
    const saturated = this.findMostSaturated(palette);

    // Primary: most vibrant — push saturation hard, keep lightness mid-range
    const vibrantArray: RGB = Array.isArray(vibrant) ? vibrant : [(vibrant as any).r, (vibrant as any).g, (vibrant as any).b];
    const primaryHsl = this.rgbToHsl(vibrantArray);
    const primary = this.hslToRgb([
      primaryHsl[0],
      Math.max(primaryHsl[1], 0.7),
      Math.max(Math.min(primaryHsl[2], 0.70), 0.52), // bright & glowing: 52%–70%
    ]);

    console.log('[ThemeEngine] vibrant RGB:', vibrant);
    console.log('[ThemeEngine] primary HSL before clamp:', primaryHsl);
    console.log('[ThemeEngine] primary RGB after clamp:', primary);

    // Primary light / dark variants
    const primaryLight = this.adjustBrightness(primary, 0.18);
    const primaryDark = this.adjustBrightness(primary, -0.1);

    // Secondary: second vibrant — keep its own hue, boost saturation
    const secondaryHsl = this.rgbToHsl(secondVibrant);
    const secondary = this.hslToRgb([
      secondaryHsl[0],
      Math.max(secondaryHsl[1], 0.6),
      Math.max(Math.min(secondaryHsl[2], 0.5), 0.35),
    ]);

    // Accent: most saturated — maximise punch
    const accentHsl = this.rgbToHsl(saturated);
    const accent = this.hslToRgb([
      accentHsl[0],
      Math.max(accentHsl[1], 0.75),
      Math.max(Math.min(accentHsl[2], 0.55), 0.4),
    ]);

    // ── Background ───────────────────────────────────────────
    // Background must always stay very dark
    const dominantArray: RGB = Array.isArray(dominant) ? dominant : [(dominant as any).r, (dominant as any).g, (dominant as any).b];
    const bgHsl = this.rgbToHsl(dominantArray);
    const bgClamped = this.hslToRgb([
      bgHsl[0],
      Math.min(bgHsl[1], 0.4),  // not too saturated
      Math.min(bgHsl[2], 0.18), // never brighter than 18% lightness
    ]);

    console.log('[ThemeEngine] dominant RGB:', dominant);
    console.log('[ThemeEngine] background HSL before clamp:', bgHsl);
    console.log('[ThemeEngine] background RGB after clamp:', bgClamped);

    // Background light: slightly lighter
    const backgroundLight = this.adjustBrightness(bgClamped, 0.06);

    // Surface: slightly lighter than background but still very dark
    const surfaceHsl = this.rgbToHsl(dominantArray);
    const surface = this.hslToRgb([
      surfaceHsl[0],
      Math.min(surfaceHsl[1], 0.35),
      Math.min(surfaceHsl[2], 0.22), // max 22% lightness
    ]);

    // Surface light: just a touch lighter
    const surfaceLightHsl = this.rgbToHsl(dominantArray);
    const surfaceLight = this.hslToRgb([
      surfaceLightHsl[0],
      Math.min(surfaceLightHsl[1], 0.30),
      Math.min(surfaceLightHsl[2], 0.26), // max 26% lightness
    ]);

    console.log('[ThemeEngine] surface RGB:', surface);
    console.log('[ThemeEngine] surfaceLight RGB:', surfaceLight);

    // Text colors: ensure readability but keep it simple — white is always safe on these darks
    const text = this.ensureContrast(bgClamped, [255, 255, 255], 4.5);
    const textSecondary = this.ensureContrast(bgClamped, [200, 200, 215], 3);
    const textMuted = this.ensureContrast(bgClamped, [140, 140, 160], 2);

    return {
      primary: this.rgbToHex(primary),
      primaryLight: this.rgbToHex(primaryLight),
      primaryDark: this.rgbToHex(primaryDark),
      secondary: this.rgbToHex(secondary),
      accent: this.rgbToHex(accent),
      background: this.rgbToHex(bgClamped),
      backgroundLight: this.rgbToHex(backgroundLight),
      surface: this.rgbToHex(surface),
      surfaceLight: this.rgbToHex(surfaceLight),
      text: this.rgbToHex(text),
      textSecondary: this.rgbToHex(textSecondary),
      textMuted: this.rgbToHex(textMuted),
    };
  }

  // ── Color Analysis ──────────────────────────────────────────

  private findMostVibrant(palette: RGB[]): RGB {
    if (palette.length === 0) return [139, 92, 246]; // Fallback purple

    let maxVibrancy = -1;
    let result: RGB = palette[0];

    for (const color of palette) {
      const hsl = this.rgbToHsl(color);
      // Vibrancy = saturation × (distance from extreme lightness)
      const lightnessScore = 1 - Math.abs(hsl[2] - 0.5) * 2;
      const vibrancy = hsl[1] * lightnessScore;

      if (vibrancy > maxVibrancy) {
        maxVibrancy = vibrancy;
        result = color;
      }
    }

    return result;
  }

  private findMostSaturated(palette: RGB[]): RGB {
    if (palette.length === 0) return [236, 72, 153]; // Fallback pink

    let maxSaturation = -1;
    let result: RGB = palette[0];

    for (const color of palette) {
      const hsl = this.rgbToHsl(color);
      if (hsl[1] > maxSaturation) {
        maxSaturation = hsl[1];
        result = color;
      }
    }

    return result;
  }

  // ── Contrast Helpers ────────────────────────────────────────

  private getContrastRatio(fg: RGB, bg: RGB): number {
    const lum1 = this.getRelativeLuminance(fg);
    const lum2 = this.getRelativeLuminance(bg);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  private getRelativeLuminance(rgb: RGB): number {
    const [r, g, b] = rgb.map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private ensureContrast(bg: RGB, fg: RGB, minRatio: number): RGB {
    let current: RGB = [...fg];
    const contrast = this.getContrastRatio(current, bg);

    if (contrast >= minRatio) return current;

    // Progressively lighten the foreground to meet contrast
    const hsl = this.rgbToHsl(current);
    for (let l = hsl[2]; l <= 1; l += 0.02) {
      const candidate = this.hslToRgb([hsl[0], hsl[1], l]);
      if (this.getContrastRatio(candidate, bg) >= minRatio) {
        return candidate;
      }
    }

    // If still not enough, return white-ish
    return current;
  }

  // ── Color Conversion ───────────────────────────────────────

  rgbToHsl(rgb: RGB): HSL {
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) {
      return [0, 0, l];
    }

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h: number;
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }

    return [h, s, l];
  }

  hslToRgb(hsl: HSL): RGB {
    const [h, s, l] = hsl;

    if (s === 0) {
      const v = Math.round(l * 255);
      return [v, v, v];
    }

    const hue2rgb = (p: number, q: number, t: number): number => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return [
      Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      Math.round(hue2rgb(p, q, h) * 255),
      Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    ];
  }

  hexToRgb(hex: string): RGB {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    return [
      (bigint >> 16) & 255,
      (bigint >> 8) & 255,
      bigint & 255,
    ];
  }

  rgbToHex(rgb: RGB): string {
    const toHex = (c: number) =>
      Math.max(0, Math.min(255, Math.round(c)))
        .toString(16)
        .padStart(2, '0');
    return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
  }

  // ── Color Manipulation ─────────────────────────────────────

  adjustBrightness(rgb: RGB, amount: number): RGB {
    const hsl = this.rgbToHsl(rgb);
    hsl[2] = Math.max(0, Math.min(1, hsl[2] + amount));
    return this.hslToRgb(hsl);
  }

  adjustSaturation(rgb: RGB, amount: number): RGB {
    const hsl = this.rgbToHsl(rgb);
    hsl[1] = Math.max(0, Math.min(1, hsl[1] + amount));
    return this.hslToRgb(hsl);
  }

  isColorDark(rgb: RGB): boolean {
    return this.getRelativeLuminance(rgb) < 0.179;
  }

  // ── Image Loading ───────────────────────────────────────────

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));

      // Append cache-bust only if no query params exist (helps avoid CORS issues with some CDNs)
      img.src = url;
    });
  }
}

export const themeEngine = new ThemeEngine();
