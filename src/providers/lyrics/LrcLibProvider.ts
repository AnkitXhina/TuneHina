import type { LyricsProviderInterface } from '../../types/provider';
import type { LyricsResult } from '../../types/lyrics';
import { parseLrc } from './parsers/lrc-parser';
import { API_CONFIG, LRCLIB_USER_AGENT } from '../../config/constants';

class LrcLibProvider implements LyricsProviderInterface {
  name = 'lrclib';
  private baseUrl = API_CONFIG.LRCLIB_BASE_URL;

  private async fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 1500));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw err;
    }
  }

  async getLyrics(
    songName: string,
    artistName: string,
    albumName?: string,
    duration?: number,
  ): Promise<LyricsResult | null> {
    try {
      const params = new URLSearchParams({
        track_name: songName,
        artist_name: artistName,
      });
      if (albumName) params.set('album_name', albumName);
      if (duration) params.set('duration', String(Math.round(duration)));

      const response = await this.fetchWithRetry(`${this.baseUrl}/api/get?${params.toString()}`, {
        headers: { 'Lrclib-Client': LRCLIB_USER_AGENT },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`LRCLIB error: ${response.status}`);
      }

      const data = await response.json();

      const result: LyricsResult = {
        synced: null,
        plain: null,
        source: 'lrclib',
      };

      if (data.syncedLyrics && typeof data.syncedLyrics === 'string') {
        const lines = parseLrc(data.syncedLyrics);
        if (lines.length > 0) {
          result.synced = { lines, source: 'lrclib', hasWordSync: false };
        }
      }

      if (data.plainLyrics && typeof data.plainLyrics === 'string') {
        result.plain = { text: data.plainLyrics, source: 'lrclib' };
      }

      if (!result.synced && !result.plain) return null;
      return result;
    } catch (error) {
      console.error('[LrcLib] getLyrics failed:', error);
      return null;
    }
  }
}

export const lrcLibProvider = new LrcLibProvider();
