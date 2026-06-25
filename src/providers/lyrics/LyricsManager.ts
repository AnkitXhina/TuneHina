import type { LyricsResult } from '../../types/lyrics';
import type { Song } from '../../types/music';
import { jiosaavnProvider } from '../music/JioSaavnProvider';
import { lrcLibProvider } from './LrcLibProvider';
import { parseLrc } from './parsers/lrc-parser';
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

    // Strategy 1: JioSaavn synced lyrics
    try {
      onProgress?.('Searching for lyrics...');
      const syncedRaw = await jiosaavnProvider.getSyncedLyrics(song.id);
      if (this.currentSongId !== song.id) return null;
      if (syncedRaw) {
        const lines = parseLrc(syncedRaw);
        if (lines.length > 0) {
          const result: LyricsResult = {
            synced: { lines, source: 'jiosaavn', hasWordSync: false },
            plain: { text: lines.map(l => l.text).join('\n'), source: 'jiosaavn' },
            source: 'jiosaavn-synced',
          };
          this.cache.set(cacheKey, result);
          this.lastFailedSong = null;
          return result;
        }
      }
    } catch { /* continue */ }

    // Strategy 2: LrcLib synced
    try {
      onProgress?.('Trying LrcLib...');
      const lrcResult = await lrcLibProvider.getLyrics(song.name, artistName, albumName, duration);
      if (this.currentSongId !== song.id) return null;
      if (lrcResult?.synced) {
        this.cache.set(cacheKey, lrcResult);
        this.lastFailedSong = null;
        return lrcResult;
      }
    } catch { /* continue */ }

    // Strategy 3: JioSaavn plain lyrics
    try {
      onProgress?.('Trying plain lyrics...');
      const plainRaw = await jiosaavnProvider.getLyrics(song.id);
      if (this.currentSongId !== song.id) return null;
      if (plainRaw) {
        const result: LyricsResult = {
          synced: null,
          plain: { text: plainRaw, source: 'jiosaavn' },
          source: 'jiosaavn-plain',
        };
        this.cache.set(cacheKey, result);
        this.lastFailedSong = null;
        return result;
      }
    } catch { /* continue */ }

    // Strategy 4: LrcLib plain lyrics
    try {
      onProgress?.('Trying LrcLib plain lyrics...');
      const lrcResult = await lrcLibProvider.getLyrics(song.name, artistName, albumName, duration);
      if (this.currentSongId !== song.id) return null;
      if (lrcResult?.plain) {
        this.cache.set(cacheKey, lrcResult);
        this.lastFailedSong = null;
        return lrcResult;
      }
    } catch { /* continue */ }

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
