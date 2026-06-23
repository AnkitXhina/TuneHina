import type { LyricsProviderInterface } from '../../types/provider';
import type { LyricsResult, LyricLine } from '../../types/lyrics';
import { parseTtml } from './parsers/ttml-parser';
import { API_CONFIG } from '../../config/constants';

class BoiduLyricsProvider implements LyricsProviderInterface {
  name = 'boidu';
  private baseUrl = API_CONFIG.BOIDU_BASE_URL;

  async getLyrics(
    songName: string,
    artistName: string,
    _albumName?: string,
    duration?: number,
  ): Promise<LyricsResult | null> {
    try {
      const params = new URLSearchParams({ s: songName, a: artistName });
      if (duration) params.set('d', String(Math.round(duration)));

      const response = await fetch(`${this.baseUrl}/getLyrics?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 404 || response.status === 401 || response.status === 429) {
          return null;
        }
        throw new Error(`Boidu API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.ttml || typeof data.ttml !== 'string') return null;

      const lines = parseTtml(data.ttml);
      if (lines.length === 0) return null;

      const hasWordSync = lines.some((l: LyricLine) => l.words && l.words.length > 0);

      return {
        synced: { lines, source: 'boidu', hasWordSync },
        plain: {
          text: lines.map((l: LyricLine) => l.text).join('\n'),
          source: 'boidu',
        },
        source: 'boidu',
      };
    } catch (error) {
      console.error('[Boidu] getLyrics failed:', error);
      return null;
    }
  }
}

export const boiduLyricsProvider = new BoiduLyricsProvider();
