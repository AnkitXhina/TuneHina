import type { LyricsProviderInterface } from '../../types/provider';
import type { LyricsResult } from '../../types/lyrics';
import { API_CONFIG } from '../../config/constants';
import { parseLrc } from './parsers/lrc-parser';

/**
 * JioSaavn-based lyrics provider.
 * Uses the JioSaavn API to fetch plain and (when available) synced lyrics by song ID.
 */
class JioSaavnLyricsProvider implements LyricsProviderInterface {
  name = 'jiosaavn' as const;
  private baseUrl = API_CONFIG.JIOSAAVN_BASE_URL;

  /**
   * Fetch lyrics using a JioSaavn song ID passed via the `songName` parameter.
   *
   * The LyricsProviderInterface expects (songName, artistName, albumName, duration)
   * but JioSaavn lyrics are fetched by song ID. We use songName as the ID here —
   * the LyricsManager is responsible for passing the correct value.
   */
  async getLyrics(
    songName: string,
    _artistName: string,
    _albumName?: string,
    _duration?: number,
  ): Promise<LyricsResult | null> {
    const songId = songName; // Convention: songName carries the JioSaavn ID

    // Try synced lyrics first
    const synced = await this.fetchSyncedLyrics(songId);
    const plain = await this.fetchPlainLyrics(songId);

    if (!synced && !plain) return null;

    return {
      synced: synced
        ? {
            lines: synced,
            source: 'jiosaavn',
            hasWordSync: false,
          }
        : null,
      plain: plain
        ? {
            text: plain,
            source: 'jiosaavn',
          }
        : null,
      source: 'jiosaavn',
    };
  }

  /**
   * Fetch synced lyrics from JioSaavn.
   * Returns parsed LRC lines, or null on failure.
   */
  private async fetchSyncedLyrics(songId: string) {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/lyrics/${encodeURIComponent(songId)}/sync`,
      );
      if (!response.ok) return null;

      const json = await response.json();
      const lrcText: unknown = json.data?.lyrics ?? json.data?.syncedLyrics ?? json.data;

      if (typeof lrcText !== 'string' || !lrcText.trim()) return null;

      const lines = parseLrc(lrcText);
      return lines.length > 0 ? lines : null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch plain-text lyrics from JioSaavn.
   */
  private async fetchPlainLyrics(songId: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/lyrics/${encodeURIComponent(songId)}`,
      );
      if (!response.ok) return null;

      const json = await response.json();
      const text: unknown = json.data?.lyrics ?? json.data;

      if (typeof text !== 'string' || !text.trim()) return null;
      return text;
    } catch {
      return null;
    }
  }
}

export const jiosaavnLyricsProvider = new JioSaavnLyricsProvider();
