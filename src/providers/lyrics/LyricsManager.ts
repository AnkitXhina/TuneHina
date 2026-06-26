import type { LyricsResult } from '../../types/lyrics';
import type { Song } from '../../types/music';
import { jiosaavnProvider } from '../music/JioSaavnProvider';
import { lrcLibProvider } from './LrcLibProvider';
import { getArtistNames } from '../../lib/utils';
import { offlineDetector } from '../../services/offlineDetector';

class LyricsManager {
  private cache = new Map<string, LyricsResult>();
  private currentSongId: string | null = null;
  private lastFailedSong: Song | null = null;

  constructor() {
    offlineDetector.subscribe((isOnline) => {
      if (isOnline && this.lastFailedSong) {
        this.getLyrics(this.lastFailedSong);
      }
    });
  }

  async getLyrics(song: Song, onProgress?: (status: string) => void): Promise<LyricsResult | null> {
    this.currentSongId = song.id;
    const cacheKey = song.id;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const artistName = getArtistNames(song.artists);
    const albumName = song.album?.name;
    const duration = song.duration;

    onProgress?.('Searching for lyrics...');

    // Fire LrcLib and JioSaavn plain simultaneously to eliminate serial latency
    const [lrcResult, jioPlainRaw] = await Promise.all([
      lrcLibProvider.getLyrics(song.name, artistName, albumName, duration).catch(() => null),
      jiosaavnProvider.getLyrics(song.id).catch(() => null)
    ]);

    if (this.currentSongId !== song.id) return null;

    // Strategy 1: LrcLib synced (highest quality)
    if (lrcResult?.synced) {
      this.cache.set(cacheKey, lrcResult);
      this.lastFailedSong = null;
      return lrcResult;
    }

    // Strategy 2: JioSaavn plain
    if (jioPlainRaw) {
      const result: LyricsResult = {
        synced: null,
        plain: { text: jioPlainRaw, source: 'jiosaavn' },
        source: 'jiosaavn-plain',
      };
      this.cache.set(cacheKey, result);
      this.lastFailedSong = null;
      return result;
    }

    // Strategy 3: LrcLib plain
    if (lrcResult?.plain) {
      this.cache.set(cacheKey, lrcResult);
      this.lastFailedSong = null;
      return lrcResult;
    }

    // All failed
    this.lastFailedSong = song;
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
