export interface LyricLine {
  timeMs: number;
  text: string;
  endTimeMs?: number;
  words?: WordTiming[];
}

export interface WordTiming {
  startMs: number;
  endMs: number;
  word: string;
}

export interface SyncedLyrics {
  lines: LyricLine[];
  source: 'jiosaavn' | 'lrclib' | 'boidu';
  hasWordSync: boolean;
}

export interface PlainLyrics {
  text: string;
  source: 'jiosaavn' | 'lrclib' | 'boidu';
}

export interface LyricsResult {
  synced: SyncedLyrics | null;
  plain: PlainLyrics | null;
  source: string;
}

export interface LrcLibResponse {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

export interface BoiduResponse {
  ttml: string;
  score: number;
}
