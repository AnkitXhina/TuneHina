import type { LyricsResult } from '../../types/lyrics';
import type { Song } from '../../types/music';
import { jiosaavnProvider } from '../music/JioSaavnProvider';
import { lrcLibProvider } from './LrcLibProvider';
import { boiduLyricsProvider } from './BoiduLyricsProvider';
import { parseLrc } from './parsers/lrc-parser';
import { getArtistNames } from '../../lib/utils';

class LyricsManager {
  private cache = new Map<string, LyricsResult | null>();

  async getLyrics(song: Song, onProgress?: (status: string) => void): Promise<LyricsResult | null> {
    const cacheKey = `${song.id}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) ?? null;
    }

    const artistName = getArtistNames(song.artists);
    const albumName = song.album?.name;
    const duration = song.duration;

    // Strategy 1: JioSaavn synced lyrics (best match since we have song ID)
    try {
      onProgress?.('Searching for lyrics...');
      const syncedRaw = await jiosaavnProvider.getSyncedLyrics(song.id);
      if (syncedRaw) {
        onProgress?.('Preparing synchronized lyrics...');
        const lines = parseLrc(syncedRaw);
        if (lines.length > 0) {
          const result: LyricsResult = {
            synced: { lines, source: 'jiosaavn', hasWordSync: false },
            plain: { text: lines.map(l => l.text).join('\n'), source: 'jiosaavn' },
            source: 'jiosaavn-synced',
          };
          this.cache.set(cacheKey, result);
          return result;
        }
      }
    } catch {
      // Continue to next provider
    }

    // Strategy 2: LRCLIB (free, no auth, good coverage)
    try {
      onProgress?.('Trying fallback provider...');
      const lrcResult = await lrcLibProvider.getLyrics(song.name, artistName, albumName, duration);
      if (lrcResult && (lrcResult.synced || lrcResult.plain)) {
        onProgress?.('Preparing synchronized lyrics...');
        this.cache.set(cacheKey, lrcResult);
        return lrcResult;
      }
    } catch {
      // Continue to next provider
    }

    // Strategy 3: Boidu/Better Lyrics (TTML with word-level sync)
    try {
      onProgress?.('Trying Better Lyrics...');
      const boiduResult = await boiduLyricsProvider.getLyrics(song.name, artistName, albumName, duration);
      if (boiduResult && (boiduResult.synced || boiduResult.plain)) {
        onProgress?.('Preparing synchronized lyrics...');
        this.cache.set(cacheKey, boiduResult);
        return boiduResult;
      }
    } catch {
      // Continue to next provider
    }

    // Strategy 4: JioSaavn plain lyrics
    try {
      const plainRaw = await jiosaavnProvider.getLyrics(song.id);
      if (plainRaw) {
        const result: LyricsResult = {
          synced: null,
          plain: { text: plainRaw, source: 'jiosaavn' },
          source: 'jiosaavn-plain',
        };
        this.cache.set(cacheKey, result);
        return result;
      }
    } catch {
      // All providers failed
    }

    // No lyrics found
    this.cache.set(cacheKey, null);
    return null;
  }

  clearCache(): void {
    this.cache.clear();
  }

  removeCacheEntry(songId: string): void {
    this.cache.delete(songId);
  }
}

export const lyricsManager = new LyricsManager();
